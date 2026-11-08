import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entitlement, session, subscription, user } from "./schema";
import { seedTestUsers } from "./seed-test";
import { testUserEmail } from "./test-users";
import { createTestDatabase, type TestDatabase } from "./testing";

// Browser specs share the seeded users and reseed them while other specs are signed in as them, so a reseed
// must reset what tests change without touching the user row or its sessions.

describe("seedTestUsers", () => {
  let tdb: TestDatabase;
  beforeAll(async () => {
    tdb = await createTestDatabase();
  });
  afterAll(() => tdb.drop());

  it("keeps the user id and sessions across a reseed, and resets the billing rows", async () => {
    const first = await seedTestUsers(tdb.db, ["pro_monthly", "free"]);
    await tdb.db.insert(session).values({
      userId: first.pro_monthly,
      token: "tok_reseed_test",
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    // A test changed the subscription (a cancel) and the role (should never persist).
    await tdb.db.update(subscription).set({ status: "cancelled" }).where(eq(subscription.userId, first.pro_monthly));
    await tdb.db.update(user).set({ role: "admin", name: "Changed" }).where(eq(user.id, first.pro_monthly));

    const second = await seedTestUsers(tdb.db, ["pro_monthly"]);
    expect(second.pro_monthly).toBe(first.pro_monthly);

    const [u] = await tdb.db.select().from(user).where(eq(user.id, first.pro_monthly));
    expect(u).toMatchObject({ email: testUserEmail("pro_monthly"), role: "user", name: "Monthly Pro" });
    const sessions = await tdb.db.select().from(session).where(eq(session.userId, first.pro_monthly));
    expect(sessions.map((s) => s.token)).toEqual(["tok_reseed_test"]);
    const subs = await tdb.db.select().from(subscription).where(eq(subscription.userId, first.pro_monthly));
    expect(subs.map((s) => s.status)).toEqual(["active"]);
    const [ent] = await tdb.db.select().from(entitlement).where(eq(entitlement.userId, first.pro_monthly));
    expect(ent).toMatchObject({ tier: "pro", subscriptionId: subs[0]!.id });

    // Users not named in the reseed are left alone.
    const [free] = await tdb.db.select().from(user).where(eq(user.id, first.free));
    expect(free?.email).toBe(testUserEmail("free"));
  });

  it("recreates a deleted user", async () => {
    const before = await seedTestUsers(tdb.db, ["pro_expired"]);
    await tdb.db.delete(user).where(eq(user.id, before.pro_expired));
    const after = await seedTestUsers(tdb.db, ["pro_expired"]);
    expect(after.pro_expired).not.toBe(before.pro_expired);
    const subs = await tdb.db.select().from(subscription).where(eq(subscription.userId, after.pro_expired));
    expect(subs.map((s) => s.status)).toEqual(["expired"]);
  });
});
