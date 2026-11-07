import { and, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { auditLog, customer, entitlement, fxRate, payment, subscription, user, webhookEvent } from "@/server/db/schema";
import type { BillingEvent, Plan, ProviderId, SubscriptionSnapshot, SubscriptionStatus } from "./events";
import { priceTierFor } from "./plans";
import {
  paymentStatusAfter,
  revokesAccess,
  subscriptionTransition,
  type PaymentStatus,
  type StoredEntitlementRow,
} from "./state-machine";

// Applies provider-neutral billing events to the database (plan §9.3, K's guidance for billing writes):
//
//   1. INSERT webhook_event … ON CONFLICT (provider, event_id) DO NOTHING; an already processed event is a
//      duplicate (200). A concurrent delivery of the same event waits on the row lock, then sees it processed.
//   2. one transaction per event, serialised per subscription and per user with advisory locks
//   3. upsert subscription on (provider, provider_subscription_id); a new live subscription first moves the
//      user's previous live one to cancelled (the one-live-per-user partial unique index)
//   4. upsert payment on (provider, provider_payment_id)
//   5. upsert entitlement (tier, valid_until), bumping `version` on cancel / refund / dispute lost
//   6. audit_log, actor `webhook:<provider>` (or the caller's actor for reconciliation)
//   7. processed_at, or the error stored (outside the rolled-back transaction) and rethrown, so the route answers
//      500 and the provider retries

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Exec = Db | Tx;

export type ProcessResult = "processed" | "duplicate";

/** What webhook_event.payload keeps: the normalised event (no names, emails or card data). */
export function storedPayload(event: BillingEvent) {
  const ref =
    event.kind === "subscription"
      ? { subscriptionId: event.subscription.providerSubscriptionId }
      : event.kind === "payment"
        ? { paymentId: event.payment.providerPaymentId, subscriptionId: event.payment.providerSubscriptionId }
        : event.kind === "refund"
          ? { paymentId: event.refund.providerPaymentId }
          : event.kind === "dispute"
            ? { paymentId: event.dispute.providerPaymentId }
            : {};
  return JSON.parse(JSON.stringify({ ...event, ...ref })) as Record<string, unknown>;
}

async function lock(tx: Exec, key: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
}

async function audit(tx: Exec, actor: string, action: string, target: string | null, meta: Record<string, unknown>) {
  await tx.insert(auditLog).values({ actor, action, target, meta });
}

async function userExists(tx: Exec, userId: string) {
  const [row] = await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1);
  return Boolean(row);
}

async function loadEntitlement(tx: Exec, userId: string): Promise<StoredEntitlementRow | null> {
  const [row] = await tx
    .select({
      tier: entitlement.tier,
      validUntil: entitlement.validUntil,
      subscriptionId: entitlement.subscriptionId,
      version: entitlement.version,
    })
    .from(entitlement)
    .where(eq(entitlement.userId, userId))
    .limit(1);
  return row ?? null;
}

async function writeEntitlement(
  tx: Exec,
  userId: string,
  change: { tier: "free" | "pro"; validUntil: Date | null; subscriptionId?: string | null },
  bump: boolean
) {
  const set = {
    tier: change.tier,
    validUntil: change.validUntil,
    ...(change.subscriptionId !== undefined ? { subscriptionId: change.subscriptionId } : {}),
    ...(bump ? { version: sql`${entitlement.version} + 1` } : {}),
    updatedAt: new Date(),
  };
  await tx
    .insert(entitlement)
    .values({ userId, tier: change.tier, validUntil: change.validUntil, subscriptionId: change.subscriptionId ?? null })
    .onConflictDoUpdate({ target: entitlement.userId, set });
}

/** occurredAt of the newest processed subscription event for this subscription (ordering guard). */
async function lastAppliedAt(tx: Exec, provider: ProviderId, providerSubscriptionId: string): Promise<Date | null> {
  const [row] = await tx
    .select({ at: sql<string | null>`max((${webhookEvent.payload}->>'occurredAt')::timestamptz)` })
    .from(webhookEvent)
    .where(
      and(
        eq(webhookEvent.provider, provider),
        isNotNull(webhookEvent.processedAt),
        sql`${webhookEvent.payload}->>'kind' = 'subscription'`,
        sql`${webhookEvent.payload}->>'subscriptionId' = ${providerSubscriptionId}`
      )
    );
  return row?.at ? new Date(row.at) : null;
}

export interface ApplyContext {
  provider: ProviderId;
  /** `webhook:dodo`, or `system:reconcile`. */
  actor: string;
  now: Date;
  /** Reconciliation applies snapshots that have no event of their own: skip the ordering guard. */
  ignoreOrdering?: boolean;
}

export async function applySubscriptionSnapshot(
  tx: Exec,
  ctx: ApplyContext,
  event: Extract<BillingEvent, { kind: "subscription" }>
): Promise<{ applied: boolean; reason?: string }> {
  const snap = event.subscription;
  await lock(tx, `${ctx.provider}:subscription:${snap.providerSubscriptionId}`);
  const [current] = await tx
    .select()
    .from(subscription)
    .where(and(eq(subscription.provider, ctx.provider), eq(subscription.providerSubscriptionId, snap.providerSubscriptionId)))
    .limit(1);
  const userId = current?.userId ?? snap.userId;
  const target = `subscription:${ctx.provider}:${snap.providerSubscriptionId}`;
  if (userId && !(await userExists(tx, userId))) {
    await audit(tx, ctx.actor, "billing.event_ignored", target, { reason: "unknown_user", event: event.id });
    return { applied: false, reason: "unknown_user" };
  }
  if (userId) await lock(tx, `user:${userId}`);

  const others = userId
    ? await tx
        .select({ id: subscription.id })
        .from(subscription)
        .where(
          and(
            eq(subscription.userId, userId),
            inArray(subscription.status, ["active", "on_hold"]),
            current ? ne(subscription.id, current.id) : sql`true`
          )
        )
    : [];
  const ent = userId ? await loadEntitlement(tx, userId) : null;
  const t = subscriptionTransition({
    event,
    current: current ?? null,
    entitlement: ent,
    lastAppliedAt: ctx.ignoreOrdering ? null : await lastAppliedAt(tx, ctx.provider, snap.providerSubscriptionId),
    otherLive: others.length > 0,
    now: ctx.now,
  });
  if (!t.apply) {
    await audit(tx, ctx.actor, "billing.event_ignored", target, { reason: t.reason, event: event.id, type: event.type });
    return { applied: false, reason: t.reason };
  }

  if (t.status === "active" || t.status === "on_hold") {
    for (const other of others) {
      await tx.update(subscription).set({ status: "cancelled", updatedAt: ctx.now }).where(eq(subscription.id, other.id));
      await audit(tx, ctx.actor, "billing.subscription_superseded", `subscription:${other.id}`, { by: target });
    }
  }

  const values = rowValues(snap, t.status, t.plan);
  const [row] = await tx
    .insert(subscription)
    .values({ ...values, userId: t.userId, provider: ctx.provider, providerSubscriptionId: snap.providerSubscriptionId })
    .onConflictDoUpdate({
      target: [subscription.provider, subscription.providerSubscriptionId],
      set: { ...values, updatedAt: ctx.now },
    })
    .returning({ id: subscription.id });

  if (snap.providerCustomerId) {
    await tx
      .insert(customer)
      .values({ userId: t.userId, provider: ctx.provider, providerCustomerId: snap.providerCustomerId })
      .onConflictDoUpdate({
        target: [customer.userId, customer.provider],
        set: { providerCustomerId: snap.providerCustomerId, updatedAt: ctx.now },
      });
  }

  if (t.entitlement) {
    await writeEntitlement(tx, t.userId, { ...t.entitlement, subscriptionId: row.id }, t.bumpVersion);
  }
  await audit(tx, ctx.actor, `billing.subscription.${event.type}`, `subscription:${row.id}`, {
    event: event.id,
    from: current?.status ?? null,
    to: t.status,
    plan: t.plan,
    tier: t.entitlement?.tier ?? null,
    validUntil: t.entitlement?.validUntil?.toISOString() ?? null,
    versionBumped: t.bumpVersion,
  });
  return { applied: true };
}

function rowValues(snap: SubscriptionSnapshot, status: SubscriptionStatus, plan: Plan) {
  return {
    plan,
    status,
    currentPeriodEnd: snap.currentPeriodEnd,
    cancelAtPeriodEnd: snap.cancelAtPeriodEnd,
    currency: snap.currency,
    amountMinor: snap.amountMinor,
    country: snap.country,
    priceTier: priceTierFor(snap.country),
    providerPriceId: snap.providerPriceId,
  };
}

async function usdMinor(tx: Exec, currency: string, amountMinor: number, on: Date): Promise<number | null> {
  if (currency === "USD") return amountMinor;
  const [rate] = await tx
    .select({ usdRate: fxRate.usdRate })
    .from(fxRate)
    .where(and(eq(fxRate.currency, currency), eq(fxRate.date, on.toISOString().slice(0, 10))))
    .limit(1);
  return rate ? Math.round(amountMinor * Number(rate.usdRate)) : null;
}

async function revoke(tx: Exec, ctx: ApplyContext, userId: string, reason: string, target: string) {
  await lock(tx, `user:${userId}`);
  await writeEntitlement(tx, userId, { tier: "free", validUntil: ctx.now }, true);
  await audit(tx, ctx.actor, "billing.access_revoked", `user:${userId}`, { reason, payment: target });
}

async function applyMoneyEvent(tx: Exec, ctx: ApplyContext, event: Extract<BillingEvent, { kind: "payment" | "refund" | "dispute" }>) {
  const providerPaymentId =
    event.kind === "payment"
      ? event.payment.providerPaymentId
      : event.kind === "refund"
        ? event.refund.providerPaymentId
        : event.dispute.providerPaymentId;
  await lock(tx, `${ctx.provider}:payment:${providerPaymentId}`);
  const [existing] = await tx
    .select()
    .from(payment)
    .where(and(eq(payment.provider, ctx.provider), eq(payment.providerPaymentId, providerPaymentId)))
    .limit(1);
  const status = paymentStatusAfter((existing?.status as PaymentStatus | undefined) ?? null, event);

  let userId = existing?.userId ?? null;
  let subscriptionId = existing?.subscriptionId ?? null;
  if (event.kind === "payment") {
    const p = event.payment;
    if (p.providerSubscriptionId) {
      const [sub] = await tx
        .select({ id: subscription.id, userId: subscription.userId })
        .from(subscription)
        .where(and(eq(subscription.provider, ctx.provider), eq(subscription.providerSubscriptionId, p.providerSubscriptionId)))
        .limit(1);
      subscriptionId = sub?.id ?? subscriptionId;
      userId = sub?.userId ?? userId;
    }
    if (!userId && p.userId && (await userExists(tx, p.userId))) userId = p.userId;
    const money = {
      currency: p.currency,
      amountMinor: p.amountMinor,
      taxMinor: p.taxMinor,
      amountUsdMinor: await usdMinor(tx, p.currency, p.amountMinor, event.occurredAt),
      country: p.country,
      method: p.method,
    };
    await tx
      .insert(payment)
      .values({ provider: ctx.provider, providerPaymentId, userId, subscriptionId, status, ...money })
      .onConflictDoUpdate({
        target: [payment.provider, payment.providerPaymentId],
        set: { status, userId, subscriptionId, ...money, updatedAt: ctx.now },
      });
  } else if (existing) {
    await tx.update(payment).set({ status, updatedAt: ctx.now }).where(eq(payment.id, existing.id));
  } else {
    // The refund or dispute arrived before its payment: keep the status; the payment event fills the rest.
    const m = event.kind === "refund" ? event.refund : event.dispute;
    await tx
      .insert(payment)
      .values({ provider: ctx.provider, providerPaymentId, status, currency: m.currency, amountMinor: m.amountMinor });
  }

  const target = `payment:${ctx.provider}:${providerPaymentId}`;
  const action =
    event.kind === "payment" ? `billing.payment.${event.type}` : event.kind === "refund" ? "billing.refund" : `billing.dispute.${event.type}`;
  await audit(tx, ctx.actor, action, target, { event: event.id, from: existing?.status ?? null, to: status });
  const newlyFinal = revokesAccess(status) && !(existing && revokesAccess(existing.status as PaymentStatus));
  if (userId && (newlyFinal || (revokesAccess(status) && event.kind === "payment" && !existing?.userId))) {
    await revoke(tx, ctx, userId, status, target);
  }
}

/** Applies one event inside the caller's transaction. */
export async function applyEvent(tx: Exec, ctx: ApplyContext, event: BillingEvent): Promise<void> {
  switch (event.kind) {
    case "subscription":
      await applySubscriptionSnapshot(tx, ctx, event);
      return;
    case "payment":
    case "refund":
    case "dispute":
      await applyMoneyEvent(tx, ctx, event);
      return;
    case "ignored":
      return;
  }
}

/** The whole webhook pipeline for one verified, parsed event. */
export async function processBillingEvent(
  db: Db,
  provider: ProviderId,
  event: BillingEvent,
  now: Date = new Date()
): Promise<ProcessResult> {
  const payload = storedPayload(event);
  const type = `${event.kind}.${event.type}`;
  const ctx: ApplyContext = { provider, actor: `webhook:${provider}`, now };
  try {
    return await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(webhookEvent)
        .values({ provider, eventId: event.id, type, payload })
        .onConflictDoNothing({ target: [webhookEvent.provider, webhookEvent.eventId] })
        .returning({ id: webhookEvent.id });
      let rowId = inserted[0]?.id;
      if (!rowId) {
        const [existing] = await tx
          .select({ id: webhookEvent.id, processedAt: webhookEvent.processedAt })
          .from(webhookEvent)
          .where(and(eq(webhookEvent.provider, provider), eq(webhookEvent.eventId, event.id)))
          .for("update");
        if (existing.processedAt) return "duplicate";
        rowId = existing.id;
      }
      await applyEvent(tx, ctx, event);
      await tx.update(webhookEvent).set({ processedAt: now, error: null, payload }).where(eq(webhookEvent.id, rowId));
      return "processed";
    });
  } catch (err) {
    const message = (err instanceof Error ? `${err.name}: ${err.message}` : String(err)).slice(0, 500);
    await db
      .insert(webhookEvent)
      .values({ provider, eventId: event.id, type, payload, error: message })
      .onConflictDoUpdate({ target: [webhookEvent.provider, webhookEvent.eventId], set: { error: message } })
      .catch(() => {});
    throw err;
  }
}
