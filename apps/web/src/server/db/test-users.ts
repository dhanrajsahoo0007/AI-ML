// Seeded users per role for tests and the test-login provider (plan §12.3). Local, test and preview databases
// only: `npm run db:seed:test -w web` refuses any non-local host. Emails use the reserved `.test` TLD.

export const TEST_USER_KEYS = ["free", "pro_monthly", "pro_yearly", "pro_expired", "on_hold", "admin"] as const;
export type TestUserKey = (typeof TEST_USER_KEYS)[number];

export const testUserEmail = (key: TestUserKey) => `${key.replace(/_/g, "-")}@users.tokenstoscale.test`;

const DAY = 86_400_000;

export interface TestUserSpec {
  name: string;
  role: "user" | "admin";
  /** The `entitlement` row; `validUntilDays` is relative to the seed time. */
  entitlement: { tier: "free" | "pro"; validUntilDays: number | null };
  subscription?: {
    plan: "pro_monthly" | "pro_yearly";
    status: "active" | "on_hold" | "expired";
    periodEndDays: number;
    currency: string;
    amountMinor: number;
    country: string;
    priceTier: "A" | "B" | "C";
  };
}

export const TEST_USERS: Record<TestUserKey, TestUserSpec> = {
  free: { name: "Free Learner", role: "user", entitlement: { tier: "free", validUntilDays: null } },
  pro_monthly: {
    name: "Monthly Pro",
    role: "user",
    entitlement: { tier: "pro", validUntilDays: 30 },
    subscription: {
      plan: "pro_monthly",
      status: "active",
      periodEndDays: 30,
      currency: "USD",
      amountMinor: 900,
      country: "US",
      priceTier: "A",
    },
  },
  pro_yearly: {
    name: "Yearly Pro",
    role: "user",
    entitlement: { tier: "pro", validUntilDays: 365 },
    subscription: {
      plan: "pro_yearly",
      status: "active",
      periodEndDays: 365,
      currency: "INR",
      amountMinor: 299900,
      country: "IN",
      priceTier: "C",
    },
  },
  pro_expired: {
    name: "Lapsed Pro",
    role: "user",
    entitlement: { tier: "free", validUntilDays: -10 },
    subscription: {
      plan: "pro_monthly",
      status: "expired",
      periodEndDays: -10,
      currency: "EUR",
      amountMinor: 900,
      country: "DE",
      priceTier: "A",
    },
  },
  // Renewal failed; the 7-day grace period (plan §9.3) keeps Pro until it ends.
  on_hold: {
    name: "On-hold Pro",
    role: "user",
    entitlement: { tier: "pro", validUntilDays: 5 },
    subscription: {
      plan: "pro_monthly",
      status: "on_hold",
      periodEndDays: -2,
      currency: "BRL",
      amountMinor: 2490,
      country: "BR",
      priceTier: "B",
    },
  },
  admin: { name: "Site Admin", role: "admin", entitlement: { tier: "pro", validUntilDays: null } },
};

export const daysFromNow = (days: number, now = Date.now()) => new Date(now + days * DAY);
