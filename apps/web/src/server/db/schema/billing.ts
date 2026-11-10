import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { createdAt, id, tz, updatedAt } from "./columns";

// Billing tables (plan §8.2, §9.3). Written only by the billing feature (stream L) inside a transaction per
// webhook; the paywall reads only `entitlement`. Money is stored in minor units (cents, paise) as bigint.

// The standby provider (plan §9.6) is added with an additive `ALTER TYPE … ADD VALUE` migration once chosen.
export const billingProvider = pgEnum("billing_provider", ["dodo"]);
export const plan = pgEnum("plan", ["pro_monthly", "pro_yearly"]);
export const subscriptionStatus = pgEnum("subscription_status", [
  "active",
  "on_hold",
  "cancelled",
  "expired",
  "failed",
]);
export const priceTier = pgEnum("price_tier", ["A", "B", "C"]);
export const paymentStatus = pgEnum("payment_status", [
  "succeeded",
  "failed",
  "refunded",
  "partially_refunded",
  "disputed",
  "dispute_won",
  "dispute_lost",
]);
export const tier = pgEnum("tier", ["free", "pro"]);

/** ISO 4217 upper-case code and ISO 3166-1 alpha-2 country, checked in the database too. */
const currencyCheck = (col: string) => sql.raw(`${col} ~ '^[A-Z]{3}$'`);
const countryCheck = (col: string) => sql.raw(`${col} IS NULL OR ${col} ~ '^[A-Z]{2}$'`);

// One row per (user, provider): a user who moves to the standby provider gets a second customer record and
// stays with the provider they subscribed through (plan §9.3). (The plan sketch had `user_id` alone as the key.)
export const customer = pgTable(
  "customer",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: billingProvider("provider").notNull(),
    providerCustomerId: text("provider_customer_id").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ name: "customer_pkey", columns: [t.userId, t.provider] }),
    uniqueIndex("customer_provider_customer_key").on(t.provider, t.providerCustomerId),
  ]
);

export const subscription = pgTable(
  "subscription",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: billingProvider("provider").notNull(),
    providerSubscriptionId: text("provider_subscription_id").notNull(),
    plan: plan("plan").notNull(),
    status: subscriptionStatus("status").notNull(),
    currentPeriodEnd: tz("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    currency: char("currency", { length: 3 }).notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    country: char("country", { length: 2 }),
    priceTier: priceTier("price_tier"),
    providerPriceId: text("provider_price_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("subscription_provider_subscription_key").on(t.provider, t.providerSubscriptionId),
    index("subscription_user_status_idx").on(t.userId, t.status),
    // At most one live subscription per user (on_hold is the dunning grace period, still live). The billing
    // code checks this too; the index is the backstop against races between two webhooks.
    uniqueIndex("subscription_one_live_per_user")
      .on(t.userId)
      .where(sql`${t.status} in ('active', 'on_hold')`),
    check("subscription_currency_check", currencyCheck("currency")),
    check("subscription_country_check", countryCheck("country")),
    check("subscription_amount_check", sql`${t.amountMinor} >= 0`),
  ]
);

// Derived from `subscription` by the billing code in the same transaction (plan §9.2). `version` is the `v`
// claim of the `tts_ent` cookie (plan §11.3): bumped on cancel, refund or dispute so older cookies stop being
// re-issued.
export const entitlement = pgTable(
  "entitlement",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    tier: tier("tier").notNull().default("free"),
    validUntil: tz("valid_until"),
    subscriptionId: uuid("subscription_id").references(() => subscription.id, { onDelete: "set null" }),
    version: integer("version").notNull().default(1),
    updatedAt: updatedAt(),
  },
  (t) => [index("entitlement_subscription_id_idx").on(t.subscriptionId)]
);

// Payments keep revenue reporting intact after an account is deleted: `user_id` is set to NULL (anonymised)
// instead of deleting the row. Invoices themselves live with the merchant of record.
export const payment = pgTable(
  "payment",
  {
    id: id(),
    provider: billingProvider("provider").notNull(),
    providerPaymentId: text("provider_payment_id").notNull(),
    userId: uuid("user_id").references(() => user.id, { onDelete: "set null" }),
    subscriptionId: uuid("subscription_id").references(() => subscription.id, { onDelete: "set null" }),
    status: paymentStatus("status").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    taxMinor: bigint("tax_minor", { mode: "number" }).notNull().default(0),
    amountUsdMinor: bigint("amount_usd_minor", { mode: "number" }),
    country: char("country", { length: 2 }),
    method: text("method"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("payment_provider_payment_key").on(t.provider, t.providerPaymentId),
    index("payment_user_id_idx").on(t.userId),
    index("payment_subscription_id_idx").on(t.subscriptionId),
    index("payment_created_at_idx").on(t.createdAt),
    check("payment_currency_check", currencyCheck("currency")),
    check("payment_country_check", countryCheck("country")),
  ]
);

export const fxRate = pgTable(
  "fx_rate",
  {
    date: date("date", { mode: "string" }).notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    usdRate: numeric("usd_rate", { precision: 20, scale: 10 }).notNull(),
  },
  (t) => [
    primaryKey({ name: "fx_rate_pkey", columns: [t.date, t.currency] }),
    check("fx_rate_currency_check", currencyCheck("currency")),
    check("fx_rate_positive_check", sql`${t.usdRate} > 0`),
  ]
);

// Webhook idempotency and audit (plan §9.3 step 3): `INSERT … ON CONFLICT (provider, event_id) DO NOTHING`.
// Billing (dodo, later the standby) and email (resend) events share it, so `provider` is free text; `payload` is trimmed of personal fields.
export const webhookEvent = pgTable(
  "webhook_event",
  {
    id: id(),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    type: text("type").notNull(),
    receivedAt: tz("received_at").notNull().defaultNow(),
    processedAt: tz("processed_at"),
    payload: jsonb("payload").notNull(),
    error: text("error"),
  },
  (t) => [
    uniqueIndex("webhook_event_provider_event_key").on(t.provider, t.eventId),
    index("webhook_event_unprocessed_idx")
      .on(t.receivedAt)
      .where(sql`${t.processedAt} is null`),
  ]
);
