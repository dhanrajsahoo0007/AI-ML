// Provider-neutral billing events (plan §9.3). Every adapter maps its webhooks to these; the state machine,
// entitlements, emails and reconciliation only ever see these shapes, so adding the standby provider touches
// only an adapter. No personal data: users are referenced by our own ID (from checkout metadata), never by
// email or name. Money is in minor units with ISO 4217 currency and ISO 3166-1 alpha-2 country codes.

export type Plan = "pro_monthly" | "pro_yearly";
export type ProviderId = "dodo";
export type SubscriptionStatus = "active" | "on_hold" | "cancelled" | "expired" | "failed";

export interface SubscriptionSnapshot {
  providerSubscriptionId: string;
  providerCustomerId: string | null;
  /** Our user ID, set by the server in checkout metadata (never by the client). Null when missing/invalid. */
  userId: string | null;
  /** Null when the provider product is not one of ours (config/plans). */
  plan: Plan | null;
  providerPriceId: string | null;
  /** `pending` is a checkout that hasn't been paid yet: nothing to store. */
  status: SubscriptionStatus | "pending";
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  currency: string;
  amountMinor: number;
  country: string | null;
}

export interface PaymentSnapshot {
  providerPaymentId: string;
  providerSubscriptionId: string | null;
  providerCustomerId: string | null;
  userId: string | null;
  status: "succeeded" | "failed";
  currency: string;
  amountMinor: number;
  taxMinor: number;
  country: string | null;
  method: string | null;
}

export interface RefundSnapshot {
  providerRefundId: string;
  providerPaymentId: string;
  currency: string;
  amountMinor: number;
  partial: boolean;
}

export interface DisputeSnapshot {
  providerDisputeId: string;
  providerPaymentId: string;
  currency: string;
  amountMinor: number;
}

export const SUBSCRIPTION_EVENT_TYPES = [
  "active",
  "renewed",
  "plan_changed",
  "on_hold",
  "cancelled",
  "expired",
  "failed",
] as const;
export type SubscriptionEventType = (typeof SUBSCRIPTION_EVENT_TYPES)[number];

interface Base {
  /** The provider's event/message ID: the idempotency key (webhook_event.event_id). */
  id: string;
  occurredAt: Date;
}

export type BillingEvent =
  | (Base & { kind: "subscription"; type: SubscriptionEventType; subscription: SubscriptionSnapshot })
  | (Base & { kind: "payment"; type: "succeeded" | "failed"; payment: PaymentSnapshot })
  | (Base & { kind: "refund"; type: "succeeded"; refund: RefundSnapshot })
  | (Base & { kind: "dispute"; type: "opened" | "won" | "lost"; dispute: DisputeSnapshot })
  /** Events we receive but don't act on (license keys, processing payments, …): recorded, then 200. */
  | (Base & { kind: "ignored"; type: string });
