import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq, sql } from "drizzle-orm";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as t from "./schema";
import { createTestDatabase, testDatabaseAvailable, type TestDatabase } from "./testing";

// Schema constraints against a real, freshly migrated Postgres 17 (plan §8.2).
const available = await testDatabaseAvailable();

describe.skipIf(!available)("database schema", () => {
  let tdb: TestDatabase;
  beforeAll(async () => {
    tdb = await createTestDatabase();
  });
  afterAll(async () => {
    await tdb?.drop();
  });

  async function newUser(email = `u-${crypto.randomUUID()}@example.test`) {
    const [row] = await tdb.db.insert(t.user).values({ name: "Test", email, emailVerified: true }).returning();
    return row!;
  }

  // Postgres errors come wrapped by drizzle; the SQLSTATE and constraint name are on the cause.
  async function pgError(p: Promise<unknown>): Promise<{ code?: string; constraint?: string }> {
    try {
      await p;
    } catch (err) {
      const e = err as { cause?: { code?: string; constraint?: string }; code?: string; constraint?: string };
      return e.cause ?? e;
    }
    throw new Error("expected the statement to fail");
  }

  const sub = (userId: string, overrides: Partial<typeof t.subscription.$inferInsert> = {}) => ({
    userId,
    provider: "dodo" as const,
    providerSubscriptionId: `sub_${crypto.randomUUID()}`,
    plan: "pro_monthly" as const,
    status: "active" as const,
    currency: "USD",
    amountMinor: 900,
    ...overrides,
  });

  it("generates UUIDv7 primary keys and timestamptz columns", async () => {
    const u = await newUser();
    expect(u.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
    const { rows } = await tdb.db.execute<{ data_type: string }>(
      sql`select distinct data_type from information_schema.columns where table_schema = 'public' and data_type like 'timestamp%'`
    );
    expect(rows.map((r) => r.data_type)).toEqual(["timestamp with time zone"]);
  });

  it("has an index on every foreign key column", async () => {
    // Every FK's columns must be a prefix of some index on that table.
    const { rows } = await tdb.db.execute<{ fk: string; covered: boolean }>(sql`
      select c.conname as fk,
        exists (
          select 1 from pg_index i
          where i.indrelid = c.conrelid
            and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] @> c.conkey
            and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] <@ c.conkey
        ) as covered
      from pg_constraint c where c.contype = 'f' and c.connamespace = 'public'::regnamespace`);
    expect(rows.length).toBeGreaterThan(10);
    expect(rows.filter((r) => !r.covered).map((r) => r.fk)).toEqual([]);
  });

  it("rejects a duplicate email", async () => {
    await newUser("dup@example.test");
    expect((await pgError(newUser("dup@example.test"))).constraint).toBe("user_email_key");
  });

  it("allows one live (active or on_hold) subscription per user, any number of ended ones", async () => {
    const u = await newUser();
    await tdb.db.insert(t.subscription).values(sub(u.id, { status: "expired" }));
    await tdb.db.insert(t.subscription).values(sub(u.id, { status: "cancelled" }));
    await tdb.db.insert(t.subscription).values(sub(u.id, { status: "active" }));
    const err = await pgError(tdb.db.insert(t.subscription).values(sub(u.id, { status: "on_hold" })));
    expect(err.constraint).toBe("subscription_one_live_per_user");
    // A second user is unaffected.
    const other = await newUser();
    await tdb.db.insert(t.subscription).values(sub(other.id));
  });

  it("keeps provider subscription ids unique per provider", async () => {
    const u = await newUser();
    const s = sub(u.id, { status: "expired" });
    await tdb.db.insert(t.subscription).values(s);
    const err = await pgError(tdb.db.insert(t.subscription).values({ ...s, userId: (await newUser()).id }));
    expect(err.constraint).toBe("subscription_provider_subscription_key");
  });

  it("checks currency and country codes", async () => {
    const u = await newUser();
    expect((await pgError(tdb.db.insert(t.subscription).values(sub(u.id, { currency: "usd" })))).constraint).toBe(
      "subscription_currency_check"
    );
    expect((await pgError(tdb.db.insert(t.subscription).values(sub(u.id, { country: "in" })))).constraint).toBe(
      "subscription_country_check"
    );
  });

  it("records each webhook event once per provider (idempotency)", async () => {
    const event = { provider: "dodo", eventId: "evt_1", type: "subscription.active", payload: { a: 1 } };
    const first = await tdb.db.insert(t.webhookEvent).values(event).onConflictDoNothing().returning();
    const again = await tdb.db.insert(t.webhookEvent).values(event).onConflictDoNothing().returning();
    expect(first).toHaveLength(1);
    expect(again).toHaveLength(0);
    // Same event id from another provider is a different event.
    await tdb.db.insert(t.webhookEvent).values({ ...event, provider: "resend" });
  });

  it("requires a subject on consent records and well-formed content keys", async () => {
    expect(
      (await pgError(tdb.db.insert(t.consentLog).values({ kind: "age_confirmation", textVersion: "v1" }))).constraint
    ).toBe("consent_log_subject_check");
    const u = await newUser();
    expect(
      (await pgError(tdb.db.insert(t.progress).values({ userId: u.id, contentKey: "../etc/passwd" }))).constraint
    ).toBe("progress_content_key_check");
    await tdb.db.insert(t.progress).values({ userId: u.id, contentKey: "system-design/caching/cdn" });
    const dup = await pgError(
      tdb.db.insert(t.progress).values({ userId: u.id, contentKey: "system-design/caching/cdn" })
    );
    expect(dup.constraint).toBe("progress_pkey");
  });

  it("stores newsletter emails lower-cased", async () => {
    const err = await pgError(tdb.db.insert(t.newsletterSubscriber).values({ email: "Someone@Example.test" }));
    expect(err.constraint).toBe("newsletter_subscriber_email_lower_check");
  });

  it("current_entitlement downgrades an expired Pro entitlement to free", async () => {
    const live = await newUser();
    const lapsed = await newUser();
    await tdb.db.insert(t.entitlement).values([
      { userId: live.id, tier: "pro", validUntil: new Date(Date.now() + 86_400_000) },
      { userId: lapsed.id, tier: "pro", validUntil: new Date(Date.now() - 1_000) },
    ]);
    const rows = await tdb.db.select().from(t.currentEntitlement);
    const tierOf = (id: string) => rows.find((r) => r.userId === id)?.tier;
    expect(tierOf(live.id)).toBe("pro");
    expect(tierOf(lapsed.id)).toBe("free");
  });

  it("deleting a user cascades to their rows and anonymises payments", async () => {
    const u = await newUser();
    const [s] = await tdb.db.insert(t.subscription).values(sub(u.id)).returning();
    await tdb.db.insert(t.entitlement).values({ userId: u.id, tier: "pro", subscriptionId: s!.id });
    await tdb.db.insert(t.customer).values({ userId: u.id, provider: "dodo", providerCustomerId: `cus_${u.id}` });
    await tdb.db.insert(t.payment).values({
      provider: "dodo",
      providerPaymentId: `pay_${u.id}`,
      userId: u.id,
      subscriptionId: s!.id,
      status: "succeeded",
      currency: "USD",
      amountMinor: 900,
    });
    await tdb.db.insert(t.bookmark).values({ userId: u.id, contentKey: "cloud/aws/s3" });
    await tdb.db.insert(t.consentLog).values({ userId: u.id, kind: "age_confirmation", textVersion: "v1" });

    await tdb.db.delete(t.user).where(eq(t.user.id, u.id));

    for (const table of [t.subscription, t.entitlement, t.customer, t.bookmark, t.consentLog]) {
      expect(await tdb.db.select().from(table).where(eq(table.userId, u.id))).toEqual([]);
    }
    const [p] = await tdb.db
      .select()
      .from(t.payment)
      .where(eq(t.payment.providerPaymentId, `pay_${u.id}`));
    expect(p).toMatchObject({ userId: null, subscriptionId: null, amountMinor: 900 });
  });

  it("roles.sql gives app_rw data access only and keeps audit_log append-only", async () => {
    const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "sql", "roles.sql");
    const client = new Client({ connectionString: tdb.url });
    await client.connect();
    try {
      await client.query(fs.readFileSync(file, "utf8"));
      const check = async (role: string, object: string, privilege: string, kind = "table") => {
        const fn = kind === "schema" ? "has_schema_privilege" : "has_table_privilege";
        const { rows } = await client.query<{ ok: boolean }>(`select ${fn}($1, $2, $3) as ok`, [
          role,
          object,
          privilege,
        ]);
        return rows[0]!.ok;
      };
      expect(await check("app_rw", "public.subscription", "INSERT")).toBe(true);
      expect(await check("app_rw", "public.audit_log", "INSERT")).toBe(true);
      expect(await check("app_rw", "public.audit_log", "DELETE")).toBe(false);
      expect(await check("app_rw", "public", "CREATE", "schema")).toBe(false);
      expect(await check("migrator", "public", "CREATE", "schema")).toBe(true);
      expect(await check("readonly", "public.current_entitlement", "SELECT")).toBe(true);
      expect(await check("readonly", "public.user", "SELECT")).toBe(false);
      expect(await check("backup", "public.user", "SELECT")).toBe(true);
      expect(await check("backup", "public.user", "INSERT")).toBe(false);
    } finally {
      await client.end();
    }
  });
});
