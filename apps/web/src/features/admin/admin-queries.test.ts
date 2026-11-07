import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { recentAudit, writeAudit } from "@/server/db/admin-queries";
import * as t from "@/server/db/schema";
import { seedTestUsers } from "@/server/db/seed-test";
import { createTestDatabase, testDatabaseAvailable, type TestDatabase } from "@/server/db/testing";
import { loadKpis, loadWebhooks } from "./dashboard";

// The admin queries against Docker Postgres with seeded billing rows (plan §10.5). Skipped without a local
// database (`npm run db:up -w web`), required in CI (REQUIRE_DB=1).
const available = await testDatabaseAvailable();

const MIN = 60_000;
const DAY = 86_400_000;

describe.skipIf(!available)("admin queries (integration)", () => {
  let tdb: TestDatabase;
  let ids: Awaited<ReturnType<typeof seedTestUsers>>;
  const now = Date.now();
  const ago = (ms: number) => new Date(now - ms);
  const isoDay = (ms: number) => ago(ms).toISOString().slice(0, 10);

  beforeAll(async () => {
    tdb = await createTestDatabase();
    const db = tdb.db;
    // Seeded: pro_monthly (USD 9.00, US, A, active), pro_yearly (INR 2,999.00/yr, IN, C, active),
    // pro_expired (EUR, expired), on_hold (BRL 24.90, BR, B), plus free and admin without subscriptions.
    ids = await seedTestUsers(db, undefined, now);
    const subOf = async (userId: string) =>
      (await db.select().from(t.subscription).where(eq(t.subscription.userId, userId)))[0]!;
    const yearly = await subOf(ids.pro_yearly);
    const expired = await subOf(ids.pro_expired);
    // The expired one started long ago, so it is not "new" in the window.
    await db.update(t.subscription).set({ createdAt: ago(200 * DAY) }).where(eq(t.subscription.id, expired.id));

    // A subscription whose renewal failed after on_hold: involuntary churn.
    const [lapsed] = await db
      .insert(t.user)
      .values({ name: "Lapsed card", email: "lapsed-card@users.origins.test", emailVerified: true })
      .returning({ id: t.user.id });
    await db.insert(t.subscription).values({
      userId: lapsed!.id,
      provider: "dodo",
      providerSubscriptionId: "sub_it_failed",
      plan: "pro_monthly",
      status: "failed",
      currency: "USD",
      amountMinor: 900,
      country: "US",
      priceTier: "A",
      createdAt: ago(100 * DAY),
    });

    await db.insert(t.fxRate).values([
      { date: isoDay(10 * DAY), currency: "INR", usdRate: "0.5" }, // older: ignored
      { date: isoDay(0), currency: "INR", usdRate: "0.012" },
      { date: isoDay(1 * DAY), currency: "BRL", usdRate: "0.2" },
      { date: isoDay(-3 * DAY), currency: "BRL", usdRate: "99" }, // future-dated: ignored
    ]);

    const pay = ({ id, ...p }: Partial<typeof t.payment.$inferInsert> & { id: string }) => ({
      provider: "dodo" as const,
      providerPaymentId: id,
      status: "succeeded" as const,
      currency: "USD",
      amountMinor: 900,
      amountUsdMinor: 900,
      country: "US",
      ...p,
    });
    await db.insert(t.payment).values([
      pay({ id: "pay_monthly", userId: ids.pro_monthly, createdAt: ago(1 * DAY) }),
      // Settled by the provider at 0.0119 USD/INR: this rate wins over fx_rate for the yearly MRR.
      pay({
        id: "pay_yearly",
        userId: ids.pro_yearly,
        subscriptionId: yearly.id,
        currency: "INR",
        amountMinor: 299900,
        amountUsdMinor: 3569,
        country: "IN",
        createdAt: ago(2 * DAY),
      }),
      // Refunded within the 7-day guarantee.
      pay({ id: "pay_refund_fast", status: "refunded", createdAt: ago(5 * DAY), updatedAt: ago(2 * DAY) }),
      // Refunded later than 7 days after the payment.
      pay({ id: "pay_refund_late", status: "refunded", createdAt: ago(20 * DAY), updatedAt: ago(5 * DAY) }),
      pay({ id: "pay_disputed", status: "disputed", createdAt: ago(3 * DAY) }),
      pay({ id: "pay_failed", status: "failed", amountUsdMinor: null, createdAt: ago(1 * DAY) }),
      // Outside the 30-day window.
      pay({ id: "pay_old", createdAt: ago(40 * DAY), updatedAt: ago(40 * DAY) }),
    ]);

    await db.insert(t.newsletterSubscriber).values([
      { email: "a@list.origins.test", status: "active" },
      { email: "b@list.origins.test", status: "active" },
      { email: "c@list.origins.test", status: "pending" },
      { email: "d@list.origins.test", status: "unsubscribed" },
      { email: "e@list.origins.test", status: "bounced" },
    ]);

    await db.insert(t.webhookEvent).values([
      { provider: "dodo", eventId: "evt_ok", type: "payment.succeeded", payload: {}, receivedAt: ago(10 * MIN), processedAt: ago(9 * MIN) },
      { provider: "dodo", eventId: "evt_backlog", type: "subscription.renewed", payload: {}, receivedAt: ago(5 * MIN) },
      { provider: "dodo", eventId: "evt_fail", type: "refund.succeeded", payload: { secret: "never shown" }, receivedAt: ago(2 * MIN), error: "boom: unknown subscription" },
      { provider: "resend", eventId: "evt_mail", type: "email.bounced", payload: {}, receivedAt: ago(1 * DAY), processedAt: ago(1 * DAY) },
    ]);
  });

  afterAll(async () => {
    await tdb?.drop();
  });

  it("computes MRR and ARR in USD, split four ways", async () => {
    const k = await loadKpis(tdb.db, now);
    // $9.00 + ₹2,999.00/12 at the settled 3569/299900 = $2.974…
    const yearlyMonthly = (299900 / 12) * (3569 / 299900);
    expect(k.mrr.mrrUsdMinor).toBe(Math.round(900 + yearlyMonthly));
    expect(k.mrr.arrUsdMinor).toBe(Math.round((900 + yearlyMonthly) * 12));
    expect(k.mrr.subscribers).toBe(2);
    // on_hold BRL 24.90 at the latest non-future rate 0.2.
    expect(k.mrr.atRisk).toEqual({ subscribers: 1, mrrUsdMinor: 498 });
    expect(k.mrr.unconverted.subscribers).toBe(0);
    expect(k.mrr.by.country.map((b) => b.key)).toEqual(["US", "IN"]);
    expect(k.mrr.by.currency.map((b) => b.key)).toEqual(["USD", "INR"]);
    expect(k.mrr.by.priceTier.map((b) => b.key)).toEqual(["A", "C"]);
    expect(k.mrr.by.provider).toMatchObject([{ key: "dodo", subscribers: 2 }]);
  });

  it("falls back to fx_rate when there is no settled payment", async () => {
    await tdb.db.delete(t.payment).where(eq(t.payment.providerPaymentId, "pay_yearly"));
    try {
      const k = await loadKpis(tdb.db, now);
      expect(k.mrr.mrrUsdMinor).toBe(Math.round(900 + (2999 / 12) * 0.012 * 100));
    } finally {
      await tdb.db.insert(t.payment).values({
        provider: "dodo",
        providerPaymentId: "pay_yearly",
        userId: ids.pro_yearly,
        subscriptionId: (await tdb.db.select().from(t.subscription).where(eq(t.subscription.userId, ids.pro_yearly)))[0]!.id,
        status: "succeeded",
        currency: "INR",
        amountMinor: 299900,
        amountUsdMinor: 3569,
        country: "IN",
        createdAt: ago(2 * DAY),
      });
    }
  });

  it("counts new and churned subscribers, voluntary vs involuntary", async () => {
    const k = await loadKpis(tdb.db, now);
    // New: the three seeded live ones (pro_monthly, pro_yearly, on_hold); expired and failed started long ago.
    expect(k.churn).toMatchObject({ created: 3, churned: 2, voluntary: 1, involuntary: 1 });
    // At the start: 3 live + 2 churned − 3 new = 2.
    expect(k.churn.rate).toBe(1);
  });

  it("computes refund, dispute and guarantee numbers over the window", async () => {
    const k = await loadKpis(tdb.db, now);
    expect(k.payments).toMatchObject({ charged: 5, failed: 1, refunds: 2, disputes: 1, guaranteeRefunds: 1 });
    expect(k.payments.refundRate).toBeCloseTo(0.4, 10);
    expect(k.payments.disputeRate).toBeCloseTo(0.2, 10);
    expect(k.payments.disputeAlert).toBe(true);
    // The latest succeeded payment is a day old while two people pay: the 6-hour alert is on.
    expect(k.payments.noRecentPayments).toBe(true);
    expect(k.revenue.payments).toBe(2);
    expect(k.revenue.totalUsdMinor).toBe(900 + 3569);
    expect(k.revenue.series).toHaveLength(30);
    expect(k.revenue.series.reduce((n, d) => n + d.value, 0)).toBe(900 + 3569);
  });

  it("counts the mailing list by status", async () => {
    const k = await loadKpis(tdb.db, now);
    expect(k.mailingList).toEqual({ active: 2, pending: 1, unsubscribed: 1, bounced: 1 });
  });

  it("reports webhook backlog, failures and errors per provider without payloads", async () => {
    const w = await loadWebhooks(tdb.db, now);
    expect(w.providers.map((p) => [p.provider, p.received, p.backlog, p.failed])).toEqual([
      ["dodo", 3, 1, 1],
      ["resend", 1, 0, 0],
    ]);
    expect(w.providers[0]!.oldestBacklogAt?.getTime()).toBeCloseTo(now - 5 * MIN, -3);
    expect(w.providers[0]!.lastProcessedAt?.getTime()).toBeCloseTo(now - 9 * MIN, -3);
    expect(w.stale).toBe(2);
    expect(w.errors).toHaveLength(1);
    expect(w.errors[0]).toMatchObject({ eventId: "evt_fail", error: "boom: unknown subscription" });
    expect(JSON.stringify(w)).not.toContain("never shown");
  });

  it("shows no data on an empty database", async () => {
    const empty = await createTestDatabase();
    try {
      const k = await loadKpis(empty.db, now);
      expect(k.mrr.subscribers).toBe(0);
      expect(k.churn.rate).toBeNull();
      expect(k.payments.refundRate).toBeNull();
      expect(k.payments.lastSucceededAt).toBeNull();
      expect(k.revenue.payments).toBe(0);
      const w = await loadWebhooks(empty.db, now);
      expect(w.providers).toEqual([]);
    } finally {
      await empty.drop();
    }
  });

  it("writes and reads the audit log with the actor's email", async () => {
    await writeAudit(tdb.db, { actor: ids.admin, action: "admin.view", target: "/admin", meta: { session: "s" } });
    await writeAudit(tdb.db, { actor: "system", action: "billing.reconcile" });
    const rows = await recentAudit(tdb.db, 10);
    expect(rows.map((r) => [r.action, r.actorEmail])).toEqual([
      ["billing.reconcile", null],
      ["admin.view", "admin@users.origins.test"],
    ]);
    expect(rows[1]).toMatchObject({ target: "/admin", meta: { session: "s" } });
  });
});
