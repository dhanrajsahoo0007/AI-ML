import { describe, expect, it } from "vitest";
import type { BillingEvent, SubscriptionSnapshot } from "./events";
import {
  GRACE_PERIOD_DAYS,
  RENEWAL_LEEWAY_MS,
  entitlementFor,
  isLive,
  paymentStatusAfter,
  revokesAccess,
  subscriptionTransition,
  targetStatus,
  type PaymentStatus,
  type StoredEntitlementRow,
  type StoredSubscription,
} from "./state-machine";

const now = new Date("2026-11-07T12:00:00Z");
const DAY = 86_400_000;
const at = (days: number) => new Date(now.getTime() + days * DAY);

const snap = (over: Partial<SubscriptionSnapshot> = {}): SubscriptionSnapshot => ({
  providerSubscriptionId: "sub_1",
  providerCustomerId: "cus_1",
  userId: "u1",
  plan: "pro_monthly",
  providerPriceId: "pdt_m",
  status: "active",
  currentPeriodEnd: at(30),
  cancelAtPeriodEnd: false,
  currency: "USD",
  amountMinor: 900,
  country: "US",
  ...over,
});

type SubEvent = Extract<BillingEvent, { kind: "subscription" }>;
const ev = (type: SubEvent["type"], s: Partial<SubscriptionSnapshot> = {}, occurredAt = now): SubEvent => ({
  kind: "subscription",
  type,
  id: `evt_${type}`,
  occurredAt,
  subscription: snap(s),
});

const stored = (over: Partial<StoredSubscription> = {}): StoredSubscription => ({
  id: "s1",
  userId: "u1",
  status: "active",
  plan: "pro_monthly",
  currentPeriodEnd: at(30),
  cancelAtPeriodEnd: false,
  ...over,
});

const ent = (over: Partial<StoredEntitlementRow> = {}): StoredEntitlementRow => ({
  tier: "pro",
  validUntil: at(31),
  subscriptionId: "s1",
  version: 1,
  ...over,
});

const run = (event: SubEvent, o: Partial<Parameters<typeof subscriptionTransition>[0]> = {}) =>
  subscriptionTransition({ event, current: null, entitlement: null, lastAppliedAt: null, otherLive: false, now, ...o });

describe("targetStatus", () => {
  it("takes lifecycle types over the snapshot and the snapshot otherwise", () => {
    expect(targetStatus(ev("on_hold", { status: "active" }))).toBe("on_hold");
    expect(targetStatus(ev("cancelled", { status: "active" }))).toBe("cancelled");
    expect(targetStatus(ev("expired"))).toBe("expired");
    expect(targetStatus(ev("failed"))).toBe("failed");
    expect(targetStatus(ev("renewed"))).toBe("active");
    expect(targetStatus(ev("plan_changed", { status: "on_hold" }))).toBe("on_hold");
    expect(targetStatus(ev("active", { status: "pending" }))).toBe("pending");
  });
});

describe("entitlementFor", () => {
  const base = { heldUntil: null, occurredAt: now, now };
  it("active: Pro until period end plus the renewal leeway, exactly the end when cancelling", () => {
    expect(entitlementFor({ ...base, status: "active", snapshot: { currentPeriodEnd: at(30), cancelAtPeriodEnd: false } })).toEqual({
      tier: "pro",
      validUntil: new Date(at(30).getTime() + RENEWAL_LEEWAY_MS),
    });
    expect(entitlementFor({ ...base, status: "active", snapshot: { currentPeriodEnd: at(30), cancelAtPeriodEnd: true } })).toEqual({
      tier: "pro",
      validUntil: at(30),
    });
    expect(entitlementFor({ ...base, status: "active", snapshot: { currentPeriodEnd: null, cancelAtPeriodEnd: false } })).toEqual({
      tier: "pro",
      validUntil: new Date(now.getTime() + RENEWAL_LEEWAY_MS),
    });
  });
  it("on_hold: a 7-day grace period from when the hold began, kept on repeats", () => {
    const s = { currentPeriodEnd: at(-1), cancelAtPeriodEnd: false };
    expect(entitlementFor({ ...base, status: "on_hold", snapshot: s })).toEqual({ tier: "pro", validUntil: at(GRACE_PERIOD_DAYS) });
    expect(entitlementFor({ ...base, status: "on_hold", snapshot: s, heldUntil: at(3) })).toEqual({ tier: "pro", validUntil: at(3) });
  });
  it("cancelled: Pro until the paid period ends, free once it has", () => {
    expect(entitlementFor({ ...base, status: "cancelled", snapshot: { currentPeriodEnd: at(5), cancelAtPeriodEnd: true } })).toEqual({
      tier: "pro",
      validUntil: at(5),
    });
    expect(entitlementFor({ ...base, status: "cancelled", snapshot: { currentPeriodEnd: at(-1), cancelAtPeriodEnd: true } })).toEqual({
      tier: "free",
      validUntil: now,
    });
    expect(entitlementFor({ ...base, status: "cancelled", snapshot: { currentPeriodEnd: null, cancelAtPeriodEnd: false } })).toEqual({
      tier: "free",
      validUntil: now,
    });
  });
  it.each(["expired", "failed"] as const)("%s: free now", (status) => {
    expect(entitlementFor({ ...base, status, snapshot: { currentPeriodEnd: at(5), cancelAtPeriodEnd: false } })).toEqual({
      tier: "free",
      validUntil: now,
    });
  });
});

describe("subscriptionTransition", () => {
  it("activates a new subscription for the user in the metadata", () => {
    expect(run(ev("active"))).toEqual({
      apply: true,
      userId: "u1",
      plan: "pro_monthly",
      status: "active",
      entitlement: { tier: "pro", validUntil: new Date(at(30).getTime() + RENEWAL_LEEWAY_MS) },
      bumpVersion: false,
    });
  });

  it("skips pending checkouts, unknown users and products that aren't ours", () => {
    expect(run(ev("active", { status: "pending" }))).toEqual({ apply: false, reason: "pending" });
    expect(run(ev("active", { userId: null }))).toEqual({ apply: false, reason: "no_user" });
    expect(run(ev("active", { plan: null }))).toEqual({ apply: false, reason: "unknown_plan" });
  });

  it("keeps the stored user and plan when a later snapshot lacks them", () => {
    const t = run(ev("renewed", { userId: null, plan: null }), { current: stored(), entitlement: ent() });
    expect(t).toMatchObject({ apply: true, userId: "u1", plan: "pro_monthly" });
  });

  it("ignores events older than the newest applied one (out-of-order delivery)", () => {
    expect(run(ev("active", {}, at(-1)), { current: stored(), lastAppliedAt: now })).toEqual({ apply: false, reason: "stale" });
    // Same instant is not stale (replays of the newest event are idempotent).
    expect(run(ev("renewed"), { current: stored(), lastAppliedAt: now }).apply).toBe(true);
  });

  it.each(["cancelled", "expired", "failed"] as const)("never revives a %s subscription", (status) => {
    expect(run(ev("active", {}, at(1)), { current: stored({ status }) })).toEqual({ apply: false, reason: "terminal" });
    expect(run(ev("on_hold", {}, at(1)), { current: stored({ status }) })).toEqual({ apply: false, reason: "terminal" });
  });

  it("cancel-at-period-end keeps Pro to the period end and bumps the version once", () => {
    const t = run(ev("renewed", { cancelAtPeriodEnd: true }), { current: stored(), entitlement: ent() });
    expect(t).toMatchObject({ apply: true, status: "active", entitlement: { tier: "pro", validUntil: at(30) }, bumpVersion: true });
    const again = run(ev("renewed", { cancelAtPeriodEnd: true }), { current: stored({ cancelAtPeriodEnd: true }), entitlement: ent() });
    expect(again).toMatchObject({ bumpVersion: false });
  });

  it("on_hold keeps the original grace end across repeated holds", () => {
    const first = run(ev("on_hold", { currentPeriodEnd: at(-1) }), { current: stored(), entitlement: ent() });
    expect(first).toMatchObject({ status: "on_hold", entitlement: { tier: "pro", validUntil: at(7) }, bumpVersion: false });
    const repeat = run(ev("on_hold", {}, at(2)), {
      current: stored({ status: "on_hold" }),
      entitlement: ent({ validUntil: at(7) }),
    });
    expect(repeat).toMatchObject({ entitlement: { validUntil: at(7) } });
    // A hold whose entitlement belongs to another subscription starts its own grace period.
    const other = run(ev("on_hold"), { current: stored({ status: "on_hold" }), entitlement: ent({ subscriptionId: "s9" }) });
    expect(other).toMatchObject({ entitlement: { validUntil: at(7) } });
  });

  it("recovers from on_hold to active", () => {
    const t = run(ev("renewed", {}, at(1)), { current: stored({ status: "on_hold" }), entitlement: ent({ validUntil: at(7) }) });
    expect(t).toMatchObject({ status: "active", entitlement: { tier: "pro" } });
  });

  it.each(["expired", "failed"] as const)("%s ends access and bumps the version", (type) => {
    expect(run(ev(type), { current: stored(), entitlement: ent() })).toMatchObject({
      apply: true,
      status: type,
      entitlement: { tier: "free", validUntil: now },
      bumpVersion: true,
    });
  });

  it("leaves the entitlement alone when another live subscription owns it", () => {
    const t = run(ev("expired"), { current: stored({ id: "old" }), otherLive: true, entitlement: ent({ subscriptionId: "new" }) });
    expect(t).toMatchObject({ apply: true, status: "expired", entitlement: null, bumpVersion: false });
    // But a live one always takes it over.
    expect(run(ev("active"), { otherLive: true })).toMatchObject({ entitlement: { tier: "pro" } });
  });

  it("knows which statuses are live", () => {
    expect(["active", "on_hold", "cancelled", "expired", "failed"].map((s) => isLive(s as never))).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
  });
});

describe("payments, refunds and disputes", () => {
  const pay = (type: "succeeded" | "failed"): Extract<BillingEvent, { kind: "payment" }> => ({
    kind: "payment",
    type,
    id: "p",
    occurredAt: now,
    payment: {
      providerPaymentId: "pay_1",
      providerSubscriptionId: "sub_1",
      providerCustomerId: null,
      userId: "u1",
      status: type,
      currency: "USD",
      amountMinor: 900,
      taxMinor: 0,
      country: "US",
      method: "card",
    },
  });
  const refund = (partial: boolean): Extract<BillingEvent, { kind: "refund" }> => ({
    kind: "refund",
    type: "succeeded",
    id: "r",
    occurredAt: now,
    refund: { providerRefundId: "re_1", providerPaymentId: "pay_1", currency: "USD", amountMinor: 900, partial },
  });
  const dispute = (type: "opened" | "won" | "lost"): Extract<BillingEvent, { kind: "dispute" }> => ({
    kind: "dispute",
    type,
    id: "d",
    occurredAt: now,
    dispute: { providerDisputeId: "dp_1", providerPaymentId: "pay_1", currency: "USD", amountMinor: 900 },
  });

  it.each<[PaymentStatus | null, BillingEvent & { kind: "payment" | "refund" | "dispute" }, PaymentStatus]>([
    [null, pay("succeeded"), "succeeded"],
    ["failed", pay("succeeded"), "succeeded"],
    ["succeeded", pay("failed"), "failed"],
    ["refunded", pay("succeeded"), "refunded"],
    ["disputed", pay("succeeded"), "disputed"],
    [null, refund(false), "refunded"],
    ["succeeded", refund(true), "partially_refunded"],
    ["partially_refunded", refund(false), "refunded"],
    ["refunded", refund(true), "refunded"],
    ["dispute_lost", refund(false), "dispute_lost"],
    ["succeeded", dispute("opened"), "disputed"],
    ["dispute_won", dispute("opened"), "dispute_won"],
    ["disputed", dispute("won"), "dispute_won"],
    ["disputed", dispute("lost"), "dispute_lost"],
    ["refunded", dispute("lost"), "refunded"],
    ["dispute_lost", dispute("won"), "dispute_lost"],
  ])("%s + %o → %s", (current, event, expected) => {
    expect(paymentStatusAfter(current, event)).toBe(expected);
  });

  it("revokes access on a full refund or a lost dispute only", () => {
    expect(revokesAccess("refunded")).toBe(true);
    expect(revokesAccess("dispute_lost")).toBe(true);
    for (const s of ["succeeded", "failed", "partially_refunded", "disputed", "dispute_won"] as const) {
      expect(revokesAccess(s)).toBe(false);
    }
  });
});
