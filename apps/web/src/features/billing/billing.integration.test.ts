import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { POST as webhookPOST } from "@/app/api/billing/webhook/[provider]/route";
import { POST as checkoutPOST } from "@/app/api/billing/checkout/route";
import { POST as refreshPOST } from "@/app/api/entitlements/refresh/route";
import { call, cookieHeader, setupAuthTestEnv, testLoginAs } from "@/features/auth/test-helpers";
import { createDb, type Db } from "@/server/db/client";
import { auditLog, consentLog, customer, entitlement, payment, subscription, webhookEvent } from "@/server/db/schema";
import { testDatabaseAvailable } from "@/server/db/testing";
import { keyringFromEnv, verifyEntitlement } from "@/server/edge/entitlement";
import {
  TEST_PRODUCTS,
  dodoDispute,
  dodoPayment,
  dodoRefund,
  dodoSubscription,
  envelope,
  signedHeaders,
  testWebhookSecret,
} from "../../../tests/fixtures/billing/dodo";
import { processBillingEvent } from "./apply";
import { CHECKOUT_CONSENTS } from "./consent";
import type { BillingEvent } from "./events";
import { parseDodoEvent } from "./providers/dodo";
import { reconcile } from "./reconcile";
import { sendRenewalReminders } from "./reminders";
import type { PaymentProvider } from "./port";

// Billing against a real Postgres (Docker, `npm run db:up -w web`): idempotency, ordering, concurrency, the
// state machine's writes, the webhook / checkout / refresh routes, reconciliation and reminders.

const available = await testDatabaseAvailable();
const DAY = 86_400_000;
const WEBHOOK_SECRET = testWebhookSecret();
const ENT_SECRET = `k1:${btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "")}`;

describe.skipIf(!available)("billing (integration)", () => {
  let env: Awaited<ReturnType<typeof setupAuthTestEnv>>;
  let db: Db;
  let n = 0;
  const uid = (p: string) => `${p}_${Date.now()}_${n++}`;

  beforeAll(async () => {
    env = await setupAuthTestEnv({
      ENTITLEMENT_SECRET: ENT_SECRET,
      DODO_WEBHOOK_SECRET: WEBHOOK_SECRET,
      ...TEST_PRODUCTS,
      PAYWALL: "on",
    });
    db = env.tdb.db;
  });
  afterAll(async () => {
    vi.unstubAllGlobals();
    await env?.teardown();
  });

  const parse = (type: string, data: unknown, at = new Date(), id = uid("msg")) =>
    parseDodoEvent(envelope(type, data, at), id, TEST_PRODUCTS);
  const process = (event: BillingEvent) => processBillingEvent(db, "dodo", event);
  const sub = (id: string) =>
    db
      .select()
      .from(subscription)
      .where(eq(subscription.providerSubscriptionId, id))
      .then((r) => r[0]);
  const ent = (userId: string) =>
    db
      .select()
      .from(entitlement)
      .where(eq(entitlement.userId, userId))
      .then((r) => r[0]);
  const freshUser = async () => {
    // The free seed user has no subscription; give each test its own by re-seeding keys is slow, so reuse it
    // and cancel whatever earlier tests left live.
    await db.update(subscription).set({ status: "expired" }).where(eq(subscription.userId, env.ids.free));
    await db
      .update(entitlement)
      .set({ tier: "free", validUntil: null, subscriptionId: null })
      .where(eq(entitlement.userId, env.ids.free));
    return env.ids.free;
  };

  it("subscribe: active → Pro until the period end, customer and audit recorded", async () => {
    const userId = await freshUser();
    const id = uid("sub");
    expect(
      await process(
        parse("subscription.active", dodoSubscription({ subscriptionId: id, userId, customerId: `cus_${id}` }))
      )
    ).toBe("processed");
    const row = await sub(id);
    expect(row).toMatchObject({
      userId,
      status: "active",
      plan: "pro_monthly",
      currency: "USD",
      amountMinor: 900,
      country: "US",
      priceTier: "A",
    });
    expect(await ent(userId)).toMatchObject({ tier: "pro", subscriptionId: row.id });
    expect((await ent(userId)).validUntil!.getTime()).toBeGreaterThan(Date.now() + 30 * DAY);
    const [c] = await db.select().from(customer).where(eq(customer.userId, userId));
    expect(c.providerCustomerId).toBe(`cus_${id}`);
    const audits = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.target, `subscription:${row.id}`));
    expect(audits.map((a) => [a.actor, a.action])).toContainEqual(["webhook:dodo", "billing.subscription.active"]);
  });

  it("a replayed event is processed once", async () => {
    const userId = await freshUser();
    const event = parse("subscription.active", dodoSubscription({ subscriptionId: uid("sub"), userId }));
    expect(await process(event)).toBe("processed");
    const before = await ent(userId);
    expect(await process(event)).toBe("duplicate");
    expect(await ent(userId)).toEqual(before);
    const rows = await db.select().from(webhookEvent).where(eq(webhookEvent.eventId, event.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].processedAt).not.toBeNull();
    // The stored payload has no names or emails.
    expect(JSON.stringify(rows[0].payload)).not.toMatch(/@|Test Buyer/);
  });

  it("concurrent deliveries of the same event are processed exactly once", async () => {
    const userId = await freshUser();
    const id = uid("sub");
    const event = parse("subscription.active", dodoSubscription({ subscriptionId: id, userId }));
    const handles = Array.from({ length: 5 }, () => createDb({ connectionString: env.tdb.url, appEnv: "test" }));
    try {
      const results = await Promise.all(handles.map((h) => processBillingEvent(h.db, "dodo", event)));
      expect(results.filter((r) => r === "processed")).toHaveLength(1);
      expect(results.filter((r) => r === "duplicate")).toHaveLength(4);
    } finally {
      await Promise.all(handles.map((h) => h.close()));
    }
    const row = await sub(id);
    const audits = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.target, `subscription:${row.id}`), eq(auditLog.action, "billing.subscription.active")));
    expect(audits).toHaveLength(1);
  });

  it("out of order: renewed before active ends on the renewed period", async () => {
    const userId = await freshUser();
    const id = uid("sub");
    const t0 = new Date(Date.now() - 60_000);
    const renewed = parse(
      "subscription.renewed",
      dodoSubscription({ subscriptionId: id, userId, periodEndDays: 60 }),
      new Date(t0.getTime() + 30_000)
    );
    const active = parse(
      "subscription.active",
      dodoSubscription({ subscriptionId: id, userId, periodEndDays: 30 }),
      t0
    );
    await process(renewed);
    await process(active);
    const row = await sub(id);
    expect(row.status).toBe("active");
    expect(row.currentPeriodEnd!.getTime()).toBeGreaterThan(Date.now() + 59 * DAY);
    const ignored = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, "billing.event_ignored"), eq(auditLog.target, `subscription:dodo:${id}`)));
    expect(ignored.map((a) => (a.meta as { reason: string }).reason)).toContain("stale");
  });

  it("out of order: a late active can't revive an expired subscription", async () => {
    const userId = await freshUser();
    const id = uid("sub");
    const t0 = new Date(Date.now() - 60_000);
    await process(
      parse(
        "subscription.expired",
        dodoSubscription({ subscriptionId: id, userId, status: "expired" }),
        new Date(t0.getTime() + 10_000)
      )
    );
    await process(parse("subscription.active", dodoSubscription({ subscriptionId: id, userId }), t0));
    expect((await sub(id)).status).toBe("expired");
    expect((await ent(userId)).tier).toBe("free");
  });

  it("cancel at period end keeps Pro to the end, then cancelled in the past removes it (version bumped)", async () => {
    const userId = await freshUser();
    const id = uid("sub");
    const t = Date.now() - 60_000;
    await process(parse("subscription.active", dodoSubscription({ subscriptionId: id, userId }), new Date(t)));
    const v0 = (await ent(userId)).version;
    await process(
      parse(
        "subscription.renewed",
        dodoSubscription({ subscriptionId: id, userId, cancelAtPeriodEnd: true, periodEndDays: 10 }),
        new Date(t + 1000)
      )
    );
    let e = await ent(userId);
    expect(e.tier).toBe("pro");
    expect(e.version).toBe(v0 + 1);
    expect(Math.abs(e.validUntil!.getTime() - (Date.now() + 10 * DAY))).toBeLessThan(120_000);
    await process(
      parse(
        "subscription.cancelled",
        dodoSubscription({ subscriptionId: id, userId, status: "cancelled", periodEndDays: -1 }),
        new Date(t + 2000)
      )
    );
    e = await ent(userId);
    expect(e.tier).toBe("free");
    expect(e.version).toBe(v0 + 2);
  });

  it("on_hold keeps Pro for the 7-day grace period; a renewal ends the hold", async () => {
    const userId = await freshUser();
    const id = uid("sub");
    const t = Date.now() - 60_000;
    await process(parse("subscription.active", dodoSubscription({ subscriptionId: id, userId }), new Date(t)));
    await process(
      parse(
        "subscription.on_hold",
        dodoSubscription({ subscriptionId: id, userId, status: "on_hold", periodEndDays: -1 }),
        new Date(t + 1000)
      )
    );
    const held = await ent(userId);
    expect(held.tier).toBe("pro");
    expect(Math.abs(held.validUntil!.getTime() - (t + 1000 + 7 * DAY))).toBeLessThan(2000);
    // A second hold notice doesn't extend the grace period.
    await process(
      parse(
        "subscription.on_hold",
        dodoSubscription({ subscriptionId: id, userId, status: "on_hold" }),
        new Date(t + 5000)
      )
    );
    expect((await ent(userId)).validUntil).toEqual(held.validUntil);
    await process(
      parse(
        "subscription.renewed",
        dodoSubscription({ subscriptionId: id, userId, periodEndDays: 30 }),
        new Date(t + 9000)
      )
    );
    expect((await sub(id)).status).toBe("active");
  });

  it("a new live subscription supersedes the user's previous one", async () => {
    const userId = await freshUser();
    const a = uid("sub");
    const b = uid("sub");
    await process(parse("subscription.active", dodoSubscription({ subscriptionId: a, userId })));
    await process(
      parse(
        "subscription.active",
        dodoSubscription({ subscriptionId: b, userId, plan: "pro_yearly", periodEndDays: 365 })
      )
    );
    expect((await sub(a)).status).toBe("cancelled");
    expect((await sub(b)).status).toBe("active");
    expect((await ent(userId)).subscriptionId).toBe((await sub(b)).id);
    // A late expiry of the old one leaves the new one's entitlement alone.
    await process(parse("subscription.expired", dodoSubscription({ subscriptionId: a, userId, status: "expired" })));
    expect((await ent(userId)).tier).toBe("pro");
  });

  it("payments are recorded; any refund (guarantee or billing error, even partial) or a lost dispute ends access", async () => {
    const userId = await freshUser();
    const id = uid("sub");
    await process(parse("subscription.active", dodoSubscription({ subscriptionId: id, userId })));
    const pay = uid("pay");
    await process(parse("payment.succeeded", dodoPayment({ paymentId: pay, subscriptionId: id, tax: 81 })));
    const [p] = await db.select().from(payment).where(eq(payment.providerPaymentId, pay));
    expect(p).toMatchObject({
      status: "succeeded",
      userId,
      amountMinor: 900,
      taxMinor: 81,
      amountUsdMinor: 900,
      method: "card",
    });

    const v = (await ent(userId)).version;
    await process(
      parse("refund.succeeded", dodoRefund({ refundId: uid("re"), paymentId: pay, amount: 100, partial: true }))
    );
    expect(await ent(userId)).toMatchObject({ tier: "free", version: v + 1 });
    // A second refund on the same payment changes nothing more.
    await process(parse("refund.succeeded", dodoRefund({ refundId: uid("re"), paymentId: pay })));
    expect(await ent(userId)).toMatchObject({ tier: "free", version: v + 1 });
    expect((await db.select().from(payment).where(eq(payment.providerPaymentId, pay)))[0].status).toBe("refunded");

    // Dispute lost on a second payment after re-subscribing.
    const id2 = uid("sub");
    await process(parse("subscription.active", dodoSubscription({ subscriptionId: id2, userId })));
    const pay2 = uid("pay");
    await process(parse("payment.succeeded", dodoPayment({ paymentId: pay2, subscriptionId: id2 })));
    await process(parse("dispute.opened", dodoDispute({ disputeId: uid("dp"), paymentId: pay2 })));
    expect((await ent(userId)).tier).toBe("pro");
    await process(parse("dispute.lost", dodoDispute({ disputeId: uid("dp"), paymentId: pay2 })));
    expect((await ent(userId)).tier).toBe("free");
    const revoked = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, "billing.access_revoked"), eq(auditLog.target, `user:${userId}`)));
    expect(revoked.length).toBeGreaterThanOrEqual(2);
  });

  it("a refund that arrives before its payment keeps the refunded status", async () => {
    const pay = uid("pay");
    await process(parse("refund.succeeded", dodoRefund({ refundId: uid("re"), paymentId: pay })));
    await process(parse("payment.succeeded", dodoPayment({ paymentId: pay })));
    expect((await db.select().from(payment).where(eq(payment.providerPaymentId, pay)))[0]).toMatchObject({
      status: "refunded",
      amountMinor: 900,
    });
  });

  it("events for unknown users change nothing; errors are stored and the event is retried", async () => {
    await process(
      parse(
        "subscription.active",
        dodoSubscription({ subscriptionId: uid("sub"), userId: "0190a3b4-0000-7000-8000-00000000dead" })
      )
    );
    // A payment the database refuses (invalid currency) fails, keeps the error, and succeeds when redelivered fixed.
    const pay = uid("pay");
    const bad = parse("payment.succeeded", dodoPayment({ paymentId: pay }));
    const broken: BillingEvent = {
      ...bad,
      kind: "payment",
      type: "succeeded",
      payment: { ...(bad as Extract<BillingEvent, { kind: "payment" }>).payment, currency: "US" },
    };
    await expect(process(broken)).rejects.toThrow();
    const [row] = await db.select().from(webhookEvent).where(eq(webhookEvent.eventId, bad.id));
    expect(row.processedAt).toBeNull();
    expect(row.error).toBeTruthy();
    expect(await process(bad)).toBe("processed");
    const [after] = await db.select().from(webhookEvent).where(eq(webhookEvent.eventId, bad.id));
    expect(after).toMatchObject({ error: null });
  });

  describe("webhook route", () => {
    const post = async (body: string, headers: Record<string, string>) =>
      call(webhookPOST, "/api/billing/webhook/dodo", {
        method: "POST",
        body,
        origin: null,
        headers,
        params: { provider: "dodo" },
      });

    it("valid → 200 and state change; replay → processed once", async () => {
      const userId = await freshUser();
      const id = uid("sub");
      const body = envelope("subscription.active", dodoSubscription({ subscriptionId: id, userId }));
      const headers = await signedHeaders(WEBHOOK_SECRET, body);
      const res = await post(body, headers);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true, status: "processed" });
      expect((await sub(id)).status).toBe("active");
      expect(await (await post(body, headers)).json()).toEqual({ received: true, status: "duplicate" });
    });

    it("bad signature or stale timestamp → 401 and nothing stored", async () => {
      const id = uid("sub");
      const body = envelope("subscription.active", dodoSubscription({ subscriptionId: id, userId: env.ids.free }));
      const forged = await signedHeaders(testWebhookSecret(), body, { id: "msg_forged" });
      expect((await post(body, forged)).status).toBe(401);
      const stale = await signedHeaders(WEBHOOK_SECRET, body, {
        id: "msg_stale",
        timestamp: Math.floor(Date.now() / 1000) - 600,
      });
      expect((await post(body, stale)).status).toBe(401);
      expect(await sub(id)).toBeUndefined();
      expect(await db.select().from(webhookEvent).where(eq(webhookEvent.eventId, "msg_forged"))).toHaveLength(0);
    });

    it("unknown provider → 404", async () => {
      const res = await call(webhookPOST, "/api/billing/webhook/paddle", {
        method: "POST",
        body: "{}",
        origin: null,
        params: { provider: "paddle" },
      });
      expect(res.status).toBe(404);
    });
  });

  describe("entitlement refresh route", () => {
    const keyring = () => keyringFromEnv(ENT_SECRET, undefined);
    const tokenOf = (res: Response) =>
      res.headers
        .getSetCookie()
        .find((c) => c.startsWith("oa_ent="))!
        .split(";")[0]
        .slice(7);

    it("issues tier=pro to a Pro user, and drops to free once access is revoked", async () => {
      const cookie = await testLoginAs("pro_monthly");
      const res = await call(refreshPOST, "/api/entitlements/refresh", { method: "POST", cookie });
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ tier: "pro", hold: false, stale: false });
      const claims = await verifyEntitlement(tokenOf(res), keyring());
      expect(claims).toMatchObject({ sub: env.ids.pro_monthly, tier: "pro", role: "user" });
      expect(res.headers.getSetCookie().find((c) => c.startsWith("oa_ent="))).toMatch(/HttpOnly/);

      // Revoke (as a lost dispute would): version bump + free.
      await db
        .update(entitlement)
        .set({ tier: "free", version: claims!.v + 1 })
        .where(eq(entitlement.userId, env.ids.pro_monthly));
      const again = await call(refreshPOST, "/api/entitlements/refresh", {
        method: "POST",
        cookie: cookieHeader(res, cookie),
      });
      expect(await again.json()).toMatchObject({ tier: "free", stale: true, v: claims!.v + 1 });
    });

    it("refuses a cookie copied from another user, and a newer version than the database", async () => {
      const pro = await testLoginAs("pro_yearly");
      const proRes = await call(refreshPOST, "/api/entitlements/refresh", { method: "POST", cookie: pro });
      const stolen = `oa_ent=${tokenOf(proRes)}`;
      const free = await testLoginAs("free");
      const res = await call(refreshPOST, "/api/entitlements/refresh", {
        method: "POST",
        cookie: `${free}; ${stolen}`,
      });
      expect(res.status).toBe(409);
      expect(((await res.json()) as { error: { code: string } }).error.code).toBe("user_mismatch");
      expect(res.headers.getSetCookie().some((c) => c.startsWith("oa_ent=;") && /Max-Age=0/.test(c))).toBe(true);

      await db.update(entitlement).set({ version: 0 }).where(eq(entitlement.userId, env.ids.pro_yearly));
      const rollback = await call(refreshPOST, "/api/entitlements/refresh", {
        method: "POST",
        cookie: cookieHeader(proRes, pro),
      });
      expect(((await rollback.json()) as { error: { code: string } }).error.code).toBe("version_rollback");
    });

    it("flags the on-hold grace period, and answers 401 with cleared cookies when signed out", async () => {
      const held = await testLoginAs("on_hold");
      expect(
        await (await call(refreshPOST, "/api/entitlements/refresh", { method: "POST", cookie: held })).json()
      ).toMatchObject({ tier: "pro", hold: true });
      const anon = await call(refreshPOST, "/api/entitlements/refresh", { method: "POST" });
      expect(anon.status).toBe(401);
      expect(anon.headers.getSetCookie()).toHaveLength(2);
      const expired = await testLoginAs("pro_expired");
      expect(
        await (await call(refreshPOST, "/api/entitlements/refresh", { method: "POST", cookie: expired })).json()
      ).toMatchObject({ tier: "free" });
    });
  });

  describe("checkout route", () => {
    const consents = Object.fromEntries(Object.entries(CHECKOUT_CONSENTS).map(([k, c]) => [k, c.version]));

    it("logs the consents and returns the provider's checkout URL (stubbed provider)", async () => {
      vi.stubEnv("DODO_API_KEY", "test_key_not_real");
      vi.stubEnv("DODO_API_BASE_URL", "http://127.0.0.1:9");
      const fetchStub = vi.fn(async () =>
        Response.json({ session_id: "cks_1", checkout_url: "https://test.checkout.example/cks_1" })
      );
      vi.stubGlobal("fetch", fetchStub);
      await freshUser();
      const cookie = await testLoginAs("free");
      const res = await call(checkoutPOST, "/api/billing/checkout", {
        method: "POST",
        cookie,
        body: { plan: "pro_yearly", consents },
        headers: { "cf-ipcountry": "DE" },
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ url: "https://test.checkout.example/cks_1" });
      const sent = JSON.parse(String((fetchStub.mock.calls[0] as unknown as [string, RequestInit])[1].body));
      expect(sent.metadata.user_id).toBe(env.ids.free);
      expect(sent.billing_address).toEqual({ country: "DE" });
      const logged = await db.select().from(consentLog).where(eq(consentLog.userId, env.ids.free));
      expect(logged.map((c) => c.textVersion)).toEqual(expect.arrayContaining(Object.values(consents)));
      expect(logged.find((c) => c.kind === "eu_withdrawal_waiver")?.country).toBe("DE");
    });

    it("refuses outdated consent texts, missing consents, existing subscribers and signed-out users", async () => {
      const cookie = await testLoginAs("free");
      const outdated = await call(checkoutPOST, "/api/billing/checkout", {
        method: "POST",
        cookie,
        body: { plan: "pro_monthly", consents: { ...consents, moneyBackGuarantee: "old" } },
      });
      expect(outdated.status).toBe(409);
      const missing = await call(checkoutPOST, "/api/billing/checkout", {
        method: "POST",
        cookie,
        body: { plan: "pro_monthly", consents: { terms: consents.terms } },
      });
      expect(missing.status).toBe(400);
      const pro = await testLoginAs("pro_monthly");
      const already = await call(checkoutPOST, "/api/billing/checkout", {
        method: "POST",
        cookie: pro,
        body: { plan: "pro_monthly", consents },
      });
      expect(((await already.json()) as { error: { code: string } }).error.code).toBe("already_subscribed");
      expect(
        (await call(checkoutPOST, "/api/billing/checkout", { method: "POST", body: { plan: "pro_monthly", consents } }))
          .status
      ).toBe(401);
    });

    it("is unavailable without a provider key, and absent while the paywall is off", async () => {
      vi.stubEnv("DODO_API_KEY", "");
      const cookie = await testLoginAs("free");
      const res = await call(checkoutPOST, "/api/billing/checkout", {
        method: "POST",
        cookie,
        body: { plan: "pro_monthly", consents },
      });
      expect(res.status).toBe(503);
      vi.stubEnv("PAYWALL", "off");
      expect(
        (
          await call(checkoutPOST, "/api/billing/checkout", {
            method: "POST",
            cookie,
            body: { plan: "pro_monthly", consents },
          })
        ).status
      ).toBe(404);
      vi.stubEnv("PAYWALL", "on");
    });
  });

  it("reconciliation fixes drift from the provider and audits it", async () => {
    const userId = await freshUser();
    const id = uid("sub");
    await process(parse("subscription.active", dodoSubscription({ subscriptionId: id, userId, periodEndDays: 30 })));
    const ghost = uid("sub");
    await process(
      parse(
        "subscription.active",
        dodoSubscription({ subscriptionId: ghost, userId: env.ids.admin, periodEndDays: 30 })
      )
    );
    const truth = parseDodoEvent(
      envelope("subscription.renewed", dodoSubscription({ subscriptionId: id, userId, periodEndDays: 45 })),
      "x",
      TEST_PRODUCTS
    );
    const ghostTruth = parseDodoEvent(
      envelope(
        "subscription.expired",
        dodoSubscription({ subscriptionId: ghost, userId: env.ids.admin, status: "expired" })
      ),
      "y",
      TEST_PRODUCTS
    );
    const provider = {
      id: "dodo",
      listActiveSubscriptions: async () => ({
        items: [(truth as Extract<BillingEvent, { kind: "subscription" }>).subscription],
      }),
      getSubscription: async () => (ghostTruth as Extract<BillingEvent, { kind: "subscription" }>).subscription,
    } as unknown as PaymentProvider;
    const report = await reconcile(db, provider);
    expect(report.corrected.map((c) => c.providerSubscriptionId).sort()).toEqual([id, ghost].sort());
    expect((await sub(id)).currentPeriodEnd!.getTime()).toBeGreaterThan(Date.now() + 44 * DAY);
    expect((await sub(ghost)).status).toBe("expired");
    // A second run finds nothing to fix.
    const again = await reconcile(db, {
      ...provider,
      listActiveSubscriptions: async () => ({
        items: [(truth as Extract<BillingEvent, { kind: "subscription" }>).subscription],
      }),
    } as PaymentProvider);
    expect(again.corrected).toEqual([]);
  });

  it("sends the yearly renewal reminder 7 days ahead, once per renewal", async () => {
    const userId = await freshUser();
    await process(
      parse(
        "subscription.active",
        dodoSubscription({
          subscriptionId: uid("sub"),
          userId,
          plan: "pro_yearly",
          periodEndDays: 7.5,
          currency: "EUR",
          amount: 9000,
        })
      )
    );
    const sent: { to: string; subject: string; text: string }[] = [];
    const sender = { send: async (m: { to: string; subject: string; text: string }) => (sent.push(m), { id: "x" }) };
    expect(await sendRenewalReminders(db, sender, { siteUrl: "https://example.test" })).toEqual({ sent: 1 });
    expect(sent[0].to).toBe("free@users.origins.test");
    expect(sent[0].text).toMatch(/€90\.00/);
    expect(sent[0].text).toMatch(/example\.test\/account\/billing/);
    expect(await sendRenewalReminders(db, sender, { siteUrl: "https://example.test" })).toEqual({ sent: 0 });
  });
});
