import { and, count, desc, eq, gte, inArray, isNotNull, isNull, max, min, sql } from "drizzle-orm";
import type { Db } from "./client";
import { auditLog, newsletterSubscriber, payment, subscription, user, webhookEvent } from "./schema";

// Read-only queries for the /admin dashboards (plan §10.5), plus the one write the dashboards make: their own
// audit entries. Every result is a plain typed row; the KPI math (MRR normalisation, churn and rates) lives in
// features/admin/kpi.ts so it can be unit-tested without a database. Billing tables are written only by the
// billing feature; nothing here changes them.

// ── Subscriptions ─────────────────────────────────────────────────────────────────────────────────────────────

export type SubscriptionStatus = (typeof subscription.status.enumValues)[number];
export type PaymentStatus = (typeof payment.status.enumValues)[number];

/** A live (active or on_hold) subscription with what's needed to convert its price to USD. */
export interface LiveSubscriptionRow {
  id: string;
  provider: string;
  plan: "pro_monthly" | "pro_yearly";
  status: "active" | "on_hold";
  currency: string;
  amountMinor: number;
  country: string | null;
  priceTier: "A" | "B" | "C" | null;
  /**
   * USD minor units per currency minor unit, from the subscription's latest payment in the same currency that
   * carries `amount_usd_minor` (the rate the provider actually settled at). Null when there is none.
   */
  paymentUsdPerMinor: number | null;
  /** USD per one major unit from the latest `fx_rate` on or before today. Null when the table has none. */
  fxUsdRate: number | null;
}

// Outer-row references for the correlated subqueries below. Written out in full because drizzle renders
// columns unqualified in a single-table select, and an unqualified "id" or "currency" inside the subquery would
// bind to the subquery's own table.
const outerSub = { id: sql.raw(`"subscription"."id"`), currency: sql.raw(`"subscription"."currency"`) };

export async function liveSubscriptions(db: Db): Promise<LiveSubscriptionRow[]> {
  const rows = await db
    .select({
      id: subscription.id,
      provider: subscription.provider,
      plan: subscription.plan,
      status: subscription.status,
      currency: subscription.currency,
      amountMinor: subscription.amountMinor,
      country: subscription.country,
      priceTier: subscription.priceTier,
      paymentUsdPerMinor: sql<number | null>`(
        select p.amount_usd_minor::float8 / p.amount_minor
        from ${payment} p
        where p.subscription_id = ${outerSub.id}
          and p.currency = ${outerSub.currency}
          and p.amount_usd_minor is not null
          and p.amount_minor > 0
        order by p.created_at desc
        limit 1
      )`,
      fxUsdRate: sql<number | null>`(
        select f.usd_rate::float8 from fx_rate f
        where f.currency = ${outerSub.currency} and f.date <= current_date
        order by f.date desc
        limit 1
      )`,
    })
    .from(subscription)
    .where(inArray(subscription.status, ["active", "on_hold"]));
  return rows.map((r) => ({
    ...r,
    status: r.status as LiveSubscriptionRow["status"],
    paymentUsdPerMinor: r.paymentUsdPerMinor === null ? null : Number(r.paymentUsdPerMinor),
    fxUsdRate: r.fxUsdRate === null ? null : Number(r.fxUsdRate),
  }));
}

export interface SubscriptionMovement {
  /** Subscriptions created since `since`, whatever their status now. */
  created: number;
  /** Subscriptions that ended since `since` (by `updated_at`), by their final status. */
  ended: Record<"cancelled" | "expired" | "failed", number>;
}

export async function subscriptionMovement(db: Db, since: Date): Promise<SubscriptionMovement> {
  const [created] = await db
    .select({ n: count() })
    .from(subscription)
    .where(gte(subscription.createdAt, since));
  const ended = await db
    .select({ status: subscription.status, n: count() })
    .from(subscription)
    .where(
      and(inArray(subscription.status, ["cancelled", "expired", "failed"]), gte(subscription.updatedAt, since))
    )
    .groupBy(subscription.status);
  const by = Object.fromEntries(ended.map((r) => [r.status, r.n]));
  return {
    created: created?.n ?? 0,
    ended: { cancelled: by.cancelled ?? 0, expired: by.expired ?? 0, failed: by.failed ?? 0 },
  };
}

// ── Payments ──────────────────────────────────────────────────────────────────────────────────────────────────

export interface PaymentWindowStats {
  /** Payments created since `since`, by current status (refunds and disputes are status changes). */
  byStatus: Partial<Record<PaymentStatus, number>>;
  /** Refunds whose status changed within 7 days of the payment: the money-back guarantee window. */
  guaranteeRefunds: number;
  /** Most recent succeeded payment (any time), for the "no payments in 6 hours" alert. */
  lastSucceededAt: Date | null;
}

export const GUARANTEE_DAYS = 7;

export async function paymentWindowStats(db: Db, since: Date): Promise<PaymentWindowStats> {
  const rows = await db
    .select({ status: payment.status, n: count() })
    .from(payment)
    .where(gte(payment.createdAt, since))
    .groupBy(payment.status);
  const [guarantee] = await db
    .select({ n: count() })
    .from(payment)
    .where(
      and(
        inArray(payment.status, ["refunded", "partially_refunded"]),
        gte(payment.createdAt, since),
        sql`${payment.updatedAt} - ${payment.createdAt} <= make_interval(days => ${GUARANTEE_DAYS})`
      )
    );
  const [last] = await db
    .select({ at: max(payment.createdAt) })
    .from(payment)
    .where(eq(payment.status, "succeeded"));
  return {
    byStatus: Object.fromEntries(rows.map((r) => [r.status, r.n])),
    guaranteeRefunds: guarantee?.n ?? 0,
    lastSucceededAt: last?.at ?? null,
  };
}

export interface DailyRevenueRow {
  /** YYYY-MM-DD (UTC). */
  day: string;
  usdMinor: number;
  payments: number;
  /** Payments that day without `amount_usd_minor` (left out of `usdMinor`). */
  unconverted: number;
}

/** Collected revenue per UTC day since `since` (succeeded and partially refunded payments, gross of refunds). */
export async function dailyRevenue(db: Db, since: Date): Promise<DailyRevenueRow[]> {
  const day = sql<string>`to_char(${payment.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;
  const rows = await db
    .select({
      day,
      usdMinor: sql<string>`coalesce(sum(${payment.amountUsdMinor}), 0)`,
      payments: count(),
      unconverted: sql<number>`count(*) filter (where ${payment.amountUsdMinor} is null)::int`,
    })
    .from(payment)
    .where(and(inArray(payment.status, ["succeeded", "partially_refunded"]), gte(payment.createdAt, since)))
    .groupBy(day)
    .orderBy(day);
  return rows.map((r) => ({ ...r, usdMinor: Number(r.usdMinor), unconverted: Number(r.unconverted) }));
}

// ── Mailing list ──────────────────────────────────────────────────────────────────────────────────────────────

export type SubscriberStatus = (typeof newsletterSubscriber.status.enumValues)[number];

export async function subscriberCounts(db: Db): Promise<Partial<Record<SubscriberStatus, number>>> {
  const rows = await db
    .select({ status: newsletterSubscriber.status, n: count() })
    .from(newsletterSubscriber)
    .groupBy(newsletterSubscriber.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

// ── Webhooks ──────────────────────────────────────────────────────────────────────────────────────────────────

export interface WebhookProviderHealth {
  provider: string;
  received: number;
  /** Not processed and no error yet. */
  backlog: number;
  /** Not processed and an error recorded (retries pending or given up). */
  failed: number;
  oldestBacklogAt: Date | null;
  lastReceivedAt: Date | null;
  lastProcessedAt: Date | null;
}

export async function webhookHealth(db: Db): Promise<WebhookProviderHealth[]> {
  const rows = await db
    .select({
      provider: webhookEvent.provider,
      received: count(),
      backlog: sql<number>`count(*) filter (where ${webhookEvent.processedAt} is null and ${webhookEvent.error} is null)::int`,
      failed: sql<number>`count(*) filter (where ${webhookEvent.processedAt} is null and ${webhookEvent.error} is not null)::int`,
      oldestBacklogAt: sql<Date | null>`min(${webhookEvent.receivedAt}) filter (where ${webhookEvent.processedAt} is null)`,
      lastReceivedAt: max(webhookEvent.receivedAt),
      lastProcessedAt: max(webhookEvent.processedAt),
    })
    .from(webhookEvent)
    .groupBy(webhookEvent.provider)
    .orderBy(webhookEvent.provider);
  // Aggregates over `sql` come back as strings from pg; normalise.
  const date = (v: Date | string | null) => (v === null ? null : new Date(v));
  return rows.map((r) => ({
    provider: r.provider,
    received: r.received,
    backlog: Number(r.backlog),
    failed: Number(r.failed),
    oldestBacklogAt: date(r.oldestBacklogAt),
    lastReceivedAt: date(r.lastReceivedAt),
    lastProcessedAt: date(r.lastProcessedAt),
  }));
}

export interface WebhookErrorRow {
  id: string;
  provider: string;
  eventId: string;
  type: string;
  receivedAt: Date;
  processedAt: Date | null;
  error: string;
}

/** The latest events that recorded an error. The payload is never selected. */
export async function recentWebhookErrors(db: Db, limit = 25): Promise<WebhookErrorRow[]> {
  const rows = await db
    .select({
      id: webhookEvent.id,
      provider: webhookEvent.provider,
      eventId: webhookEvent.eventId,
      type: webhookEvent.type,
      receivedAt: webhookEvent.receivedAt,
      processedAt: webhookEvent.processedAt,
      error: webhookEvent.error,
    })
    .from(webhookEvent)
    .where(isNotNull(webhookEvent.error))
    .orderBy(desc(webhookEvent.receivedAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, error: r.error ?? "" }));
}

/** Unprocessed events older than `olderThan`: the webhook SLO is 99.9% processed within one minute (§10.6). */
export async function staleWebhookCount(db: Db, olderThan: Date): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(webhookEvent)
    .where(and(isNull(webhookEvent.processedAt), sql`${webhookEvent.receivedAt} < ${olderThan}`));
  return row?.n ?? 0;
}

// ── Audit log ─────────────────────────────────────────────────────────────────────────────────────────────────

export interface AuditEntry {
  actor: string;
  action: string;
  target?: string | null;
  meta?: Record<string, unknown> | null;
}

export async function writeAudit(db: Db, entry: AuditEntry): Promise<void> {
  await db.insert(auditLog).values({
    actor: entry.actor,
    action: entry.action,
    target: entry.target ?? null,
    meta: entry.meta ?? null,
  });
}

export interface AuditRow {
  id: string;
  at: Date;
  actor: string;
  /** The actor's email when the actor is a user id that still exists. */
  actorEmail: string | null;
  action: string;
  target: string | null;
  meta: unknown;
}

export async function recentAudit(db: Db, limit = 100): Promise<AuditRow[]> {
  return db
    .select({
      id: auditLog.id,
      at: auditLog.at,
      actor: auditLog.actor,
      actorEmail: user.email,
      action: auditLog.action,
      target: auditLog.target,
      meta: auditLog.meta,
    })
    .from(auditLog)
    .leftJoin(user, sql`${auditLog.actor} = ${user.id}::text`)
    .orderBy(desc(auditLog.at), desc(auditLog.id))
    .limit(limit);
}

/** First and last audit entry times, for the page header. */
export async function auditSpan(db: Db): Promise<{ total: number; first: Date | null }> {
  const [row] = await db.select({ total: count(), first: min(auditLog.at) }).from(auditLog);
  return { total: row?.total ?? 0, first: row?.first ?? null };
}
