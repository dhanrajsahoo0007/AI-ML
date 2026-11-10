import { pathToFileURL } from "node:url";
import { inArray, sql } from "drizzle-orm";
import { createDb, type Db } from "./client";
import { assertLocalDatabase } from "./config";
import { CONSENT_VERSIONS } from "./consent";
import { bookmark, consentLog, customer, entitlement, payment, progress, subscription, user } from "./schema";
import { daysFromNow, TEST_USER_KEYS, TEST_USERS, testUserEmail, type TestUserKey } from "./test-users";

// `npm run db:seed:test -w web`: creates the seeded test users with their subscription and entitlement rows, or
// resets them to that state. Local databases only (plan §8.1: no seed scripts against non-local hosts).
// Pass user keys to reset only those: `npm run db:seed:test -w web -- free admin`.
//
// A reset keeps the `user` row (same id) and its sessions. Browser specs run in parallel and share these users:
// deleting and re-inserting a user while another spec is signing in as them made that sign-in's session insert
// fail its foreign key, and changed the id other specs had just read. Only what a test can change is reset:
// billing rows, the entitlement, progress, bookmarks and consent.

export async function seedTestUsers(
  db: Db,
  keys: readonly TestUserKey[] = TEST_USER_KEYS,
  now = Date.now()
): Promise<Record<TestUserKey, string>> {
  const ids = {} as Record<TestUserKey, string>;
  await db.transaction(async (tx) => {
    // Concurrent seeds (parallel test workers) take turns instead of racing on the unique emails.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('tts:seed-test-users'))`);
    for (const key of keys) {
      const spec = TEST_USERS[key];
      const [row] = await tx
        .insert(user)
        .values({ name: spec.name, email: testUserEmail(key), emailVerified: true, role: spec.role })
        .onConflictDoUpdate({
          target: user.email,
          set: { name: spec.name, emailVerified: true, role: spec.role, image: null, updatedAt: new Date(now) },
        })
        .returning({ id: user.id });
      ids[key] = row!.id;
    }
    const userIds = keys.map((key) => ids[key]);
    // Child rows a test can change, in dependency order (entitlement and payment reference subscription).
    await tx.delete(entitlement).where(inArray(entitlement.userId, userIds));
    await tx.delete(payment).where(inArray(payment.userId, userIds));
    await tx.delete(subscription).where(inArray(subscription.userId, userIds));
    await tx.delete(customer).where(inArray(customer.userId, userIds));
    await tx.delete(progress).where(inArray(progress.userId, userIds));
    await tx.delete(bookmark).where(inArray(bookmark.userId, userIds));
    await tx.delete(consentLog).where(inArray(consentLog.userId, userIds));

    for (const key of keys) {
      const spec = TEST_USERS[key];
      const userId = ids[key];
      await tx
        .insert(consentLog)
        .values({ userId, kind: "age_confirmation", textVersion: CONSENT_VERSIONS.age_confirmation });

      let subscriptionId: string | null = null;
      if (spec.subscription) {
        const s = spec.subscription;
        const [created] = await tx
          .insert(subscription)
          .values({
            userId,
            provider: "dodo",
            providerSubscriptionId: `sub_test_${key}`,
            plan: s.plan,
            status: s.status,
            currentPeriodEnd: daysFromNow(s.periodEndDays, now),
            currency: s.currency,
            amountMinor: s.amountMinor,
            country: s.country,
            priceTier: s.priceTier,
            providerPriceId: `price_test_${s.plan}_${s.priceTier}`,
          })
          .returning({ id: subscription.id });
        subscriptionId = created!.id;
      }
      await tx.insert(entitlement).values({
        userId,
        tier: spec.entitlement.tier,
        validUntil: spec.entitlement.validUntilDays === null ? null : daysFromNow(spec.entitlement.validUntilDays, now),
        subscriptionId,
      });
    }
  });
  return ids;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("db:seed:test: set DATABASE_URL (local: postgres://tts:tts@127.0.0.1:54329/tts_dev)");
    process.exit(1);
  }
  assertLocalDatabase(url, "seed test users");
  const requested = process.argv.slice(2);
  const unknown = requested.filter((k) => !(TEST_USER_KEYS as readonly string[]).includes(k));
  if (unknown.length) {
    console.error(`db:seed:test: unknown user keys ${unknown.join(", ")} (known: ${TEST_USER_KEYS.join(", ")})`);
    process.exit(1);
  }
  const keys = requested.length ? (requested as TestUserKey[]) : TEST_USER_KEYS;
  const handle = createDb({ connectionString: url, appEnv: "test" });
  seedTestUsers(handle.db, keys)
    .then((ids) => console.log(`db:seed:test: seeded ${Object.keys(ids).join(", ")}`))
    .catch((err: unknown) => {
      console.error("db:seed:test failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => handle.close());
}
