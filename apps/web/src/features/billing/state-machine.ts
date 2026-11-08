import type { BillingEvent, Plan, SubscriptionSnapshot, SubscriptionStatus } from "./events";

// The billing state machine (plan §9.3). Pure: given what is stored and one provider-neutral event, it says
// what to store. The webhook handler (./apply.ts) runs it inside one transaction per event. Rules:
//
// - snapshots, not deltas: each subscription event carries the provider's full subscription, so a replay is
//   a no-op and the final state doesn't depend on delivery order
// - an event older than the newest one already applied to that subscription is stale and changes nothing
// - cancelled, expired and failed are terminal: a late `active` can't bring a subscription back
// - any refund or a lost dispute ends access (see revokesAccess)
// - entitlement: active → Pro until the period end (plus a day for the renewal webhook unless it ends);
//   on_hold → Pro for a 7-day grace period from when the hold began; cancelled → Pro until the paid period ends;
//   expired / failed → free. Cancel, refund and dispute-lost bump the entitlement version (`oa_ent` `v`)

export const GRACE_PERIOD_DAYS = 7;
export const RENEWAL_LEEWAY_MS = 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const LIVE: ReadonlySet<SubscriptionStatus> = new Set(["active", "on_hold"]);
const TERMINAL: ReadonlySet<SubscriptionStatus> = new Set(["cancelled", "expired", "failed"]);

export const isLive = (status: SubscriptionStatus) => LIVE.has(status);

export interface StoredSubscription {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  plan: Plan;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface StoredEntitlementRow {
  tier: "free" | "pro";
  validUntil: Date | null;
  subscriptionId: string | null;
  version: number;
}

export interface EntitlementChange {
  tier: "free" | "pro";
  validUntil: Date | null;
}

type SubscriptionEvent = Extract<BillingEvent, { kind: "subscription" }>;

type SubscriptionTransition =
  | { apply: false; reason: "pending" | "no_user" | "unknown_plan" | "stale" | "terminal" }
  | {
      apply: true;
      userId: string;
      plan: Plan;
      status: SubscriptionStatus;
      /** Null when another live subscription of the user owns the entitlement. */
      entitlement: EntitlementChange | null;
      bumpVersion: boolean;
    };

/** The status an event moves the subscription to: lifecycle event types win over the snapshot's status. */
export function targetStatus(event: SubscriptionEvent): SubscriptionStatus | "pending" {
  switch (event.type) {
    case "on_hold":
    case "cancelled":
    case "expired":
    case "failed":
      return event.type;
    default:
      return event.subscription.status;
  }
}

export function entitlementFor(input: {
  status: SubscriptionStatus;
  snapshot: Pick<SubscriptionSnapshot, "currentPeriodEnd" | "cancelAtPeriodEnd">;
  /** Already on hold: the grace period keeps its original end. */
  heldUntil: Date | null;
  occurredAt: Date;
  now: Date;
}): EntitlementChange {
  const { status, snapshot, heldUntil, occurredAt, now } = input;
  const end = snapshot.currentPeriodEnd;
  switch (status) {
    case "active":
      if (!end) return { tier: "pro", validUntil: new Date(now.getTime() + RENEWAL_LEEWAY_MS) };
      return {
        tier: "pro",
        validUntil: snapshot.cancelAtPeriodEnd ? end : new Date(end.getTime() + RENEWAL_LEEWAY_MS),
      };
    case "on_hold":
      return { tier: "pro", validUntil: heldUntil ?? new Date(occurredAt.getTime() + GRACE_PERIOD_DAYS * DAY_MS) };
    case "cancelled":
      return end && end > now ? { tier: "pro", validUntil: end } : { tier: "free", validUntil: now };
    case "expired":
    case "failed":
      return { tier: "free", validUntil: now };
  }
}

export function subscriptionTransition(input: {
  event: SubscriptionEvent;
  current: StoredSubscription | null;
  entitlement: StoredEntitlementRow | null;
  /** occurredAt of the newest event already applied to this subscription. */
  lastAppliedAt: Date | null;
  /** The user has another live subscription (that one keeps the entitlement unless this one goes live). */
  otherLive: boolean;
  now: Date;
}): SubscriptionTransition {
  const { event, current, entitlement, lastAppliedAt, otherLive, now } = input;
  const snap = event.subscription;
  const status = targetStatus(event);
  if (status === "pending") return { apply: false, reason: "pending" };
  const userId = current?.userId ?? snap.userId;
  if (!userId) return { apply: false, reason: "no_user" };
  const plan = snap.plan ?? current?.plan;
  if (!plan) return { apply: false, reason: "unknown_plan" };
  if (lastAppliedAt && event.occurredAt < lastAppliedAt) return { apply: false, reason: "stale" };
  if (current && TERMINAL.has(current.status) && isLive(status)) return { apply: false, reason: "terminal" };

  const heldUntil =
    current?.status === "on_hold" && entitlement?.subscriptionId === current.id ? entitlement.validUntil : null;
  // A live subscription takes the entitlement over (any older live one is superseded); a non-live one only
  // changes it when no other live subscription holds it.
  const owns = isLive(status) || !otherLive;
  const cancelling = TERMINAL.has(status) || (snap.cancelAtPeriodEnd && !current?.cancelAtPeriodEnd);
  return {
    apply: true,
    userId,
    plan,
    status,
    entitlement: owns ? entitlementFor({ status, snapshot: snap, heldUntil, occurredAt: event.occurredAt, now }) : null,
    bumpVersion: owns && cancelling,
  };
}

// ── Payments, refunds, disputes ──────────────────────────────────────────────────────────────────────────────

export type PaymentStatus =
  "succeeded" | "failed" | "refunded" | "partially_refunded" | "disputed" | "dispute_won" | "dispute_lost";

type MoneyEvent = Extract<BillingEvent, { kind: "payment" | "refund" | "dispute" }>;

/**
 * The payment row's status after an event. A payment's own success/failure never overwrites what a later
 * refund or dispute recorded (they can arrive first), and a lost dispute or full refund is final.
 */
export function paymentStatusAfter(current: PaymentStatus | null, event: MoneyEvent): PaymentStatus {
  const final = current === "refunded" || current === "dispute_lost";
  switch (event.kind) {
    case "payment":
      return current === null || current === "succeeded" || current === "failed" ? event.type : current;
    case "refund":
      if (final) return current;
      return event.refund.partial ? "partially_refunded" : "refunded";
    case "dispute":
      if (final) return current;
      if (event.type === "opened") return current === "dispute_won" ? current : "disputed";
      return event.type === "won" ? "dispute_won" : "dispute_lost";
  }
}

/**
 * Any refund (money-back guarantee, billing error, full or partial) or a lost dispute ends access at once
 * (refund policy, 2026-11-07).
 */
export function revokesAccess(status: PaymentStatus): boolean {
  return status === "refunded" || status === "partially_refunded" || status === "dispute_lost";
}
