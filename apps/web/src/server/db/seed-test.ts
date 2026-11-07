import { pathToFileURL } from "node:url";
import { inArray, sql } from "drizzle-orm";
import { createDb, type Db } from "./client";
import { assertLocalDatabase } from "./config";
import { CONSENT_VERSIONS } from "./consent";
import { consentLog, entitlement, subscription, user } from "./schema";
import { daysFromNow, TEST_USER_KEYS, TEST_USERS, testUserEmail, type TestUserKey } from "./test-users";

// `npm run db:seed:test -w web`: (re)creates the seeded test users with their subscription and entitlement
// rows. Local databases only (plan §8.1: no seed scripts against non-local hosts). Re-running resets them.
// Pass user keys to reset only those: `npm run db:seed:test -w web -- free admin`.

export async function seedTestUsers(
  db: Db,
  keys: readonly TestUserKey[] = TEST_USER_KEYS,
  now = Date.now()
): Promise<Record<TestUserKey, string>> {
  const emails = keys.map(testUserEmail);
  const ids = {} as Record<TestUserKey, string>;
  await db.transaction(async (tx) => {
    // Concurrent seeds (parallel test workers) take turns instead of racing on the unique emails.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('origins:seed-test-users'))`);
    // Cascades to sessions, subscriptions, entitlements, progress, consent.
    await tx.delete(user).where(inArray(user.email, emails));
    for (const key of keys) {
      const spec = TEST_USERS[key];
      const [row] = await tx
        .insert(user)
        .values({ name: spec.name, email: testUserEmail(key), emailVerified: true, role: spec.role })
        .returning({ id: user.id });
      const userId = row!.id;
      ids[key] = userId;
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
    console.error("db:seed:test: set DATABASE_URL (local: postgres://origins:origins@127.0.0.1:54329/origins_dev)");
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
