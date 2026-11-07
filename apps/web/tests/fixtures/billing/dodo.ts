import { signStandardWebhook } from "../../../src/features/billing/standard-webhooks";

// Dodo Payments webhook fixtures (plan §12.2): payloads in Dodo's shape (Standard Webhooks envelope
// `{ business_id, type, timestamp, data }`), signed with a throwaway test secret. Used by the unit, integration
// and e2e tests; nothing here talks to Dodo.

/** A per-run test secret in Standard Webhooks form. Not a real secret. */
export function testWebhookSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `whsec_${btoa(String.fromCharCode(...bytes))}`;
}

export const TEST_PRODUCTS = {
  DODO_PRODUCT_PRO_MONTHLY: "pdt_test_monthly",
  DODO_PRODUCT_PRO_YEARLY: "pdt_test_yearly",
};

const DAY = 86_400_000;

export interface SubscriptionFixture {
  subscriptionId: string;
  userId: string | null;
  status?: "pending" | "active" | "on_hold" | "cancelled" | "failed" | "expired";
  plan?: "pro_monthly" | "pro_yearly";
  /** Days from `now` to next_billing_date. */
  periodEndDays?: number;
  cancelAtPeriodEnd?: boolean;
  customerId?: string;
  currency?: string;
  amount?: number;
  country?: string;
  now?: Date;
}

export function dodoSubscription(f: SubscriptionFixture) {
  const now = f.now ?? new Date();
  return {
    payload_type: "Subscription",
    subscription_id: f.subscriptionId,
    status: f.status ?? "active",
    product_id:
      f.plan === "pro_yearly" ? TEST_PRODUCTS.DODO_PRODUCT_PRO_YEARLY : TEST_PRODUCTS.DODO_PRODUCT_PRO_MONTHLY,
    quantity: 1,
    customer: {
      customer_id: f.customerId ?? `cus_${f.subscriptionId}`,
      email: "buyer@users.origins.test",
      name: "Test Buyer",
    },
    metadata: f.userId ? { user_id: f.userId } : {},
    recurring_pre_tax_amount: f.amount ?? 900,
    currency: f.currency ?? "USD",
    next_billing_date: new Date(now.getTime() + (f.periodEndDays ?? 30) * DAY).toISOString(),
    previous_billing_date: now.toISOString(),
    cancel_at_next_billing_date: f.cancelAtPeriodEnd ?? false,
    billing: { country: f.country ?? "US", city: "Test", state: "TS", street: "1 Test St", zipcode: "00000" },
    created_at: now.toISOString(),
  };
}

export function dodoPayment(f: {
  paymentId: string;
  subscriptionId?: string;
  userId?: string;
  status?: "succeeded" | "failed";
  amount?: number;
  tax?: number;
  currency?: string;
}) {
  return {
    payload_type: "Payment",
    payment_id: f.paymentId,
    subscription_id: f.subscriptionId ?? null,
    customer: { customer_id: "cus_x", email: "buyer@users.origins.test", name: "Test Buyer" },
    metadata: f.userId ? { user_id: f.userId } : {},
    total_amount: f.amount ?? 900,
    tax: f.tax ?? 0,
    currency: f.currency ?? "USD",
    status: f.status ?? "succeeded",
    payment_method_type: "card",
    billing: { country: "US" },
    created_at: new Date().toISOString(),
  };
}

export const dodoRefund = (f: { refundId: string; paymentId: string; amount?: number; partial?: boolean }) => ({
  payload_type: "Refund",
  refund_id: f.refundId,
  payment_id: f.paymentId,
  amount: f.amount ?? 900,
  currency: "USD",
  is_partial: f.partial ?? false,
  status: "succeeded",
  reason: "duplicate charge",
  created_at: new Date().toISOString(),
});

export const dodoDispute = (f: { disputeId: string; paymentId: string }) => ({
  payload_type: "Dispute",
  dispute_id: f.disputeId,
  payment_id: f.paymentId,
  amount: "900",
  currency: "USD",
  dispute_status: "dispute_opened",
  dispute_stage: "dispute",
  created_at: new Date().toISOString(),
});

export function envelope(type: string, data: unknown, at: Date = new Date()) {
  return JSON.stringify({ business_id: "bus_test", type, timestamp: at.toISOString(), data });
}

let counter = 0;

/** Signed Standard Webhooks headers for `body`. */
export async function signedHeaders(
  secret: string,
  body: string,
  options: { id?: string; timestamp?: number } = {}
): Promise<Record<string, string>> {
  const id = options.id ?? `msg_${Date.now()}_${counter++}`;
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
  return {
    "content-type": "application/json",
    "webhook-id": id,
    "webhook-timestamp": String(timestamp),
    "webhook-signature": await signStandardWebhook(secret, id, timestamp, body),
  };
}
