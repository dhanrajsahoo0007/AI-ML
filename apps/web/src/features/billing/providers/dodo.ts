import { z } from "zod";
import {
  SUBSCRIPTION_EVENT_TYPES,
  type BillingEvent,
  type SubscriptionEventType,
  type SubscriptionSnapshot,
} from "../events";
import { planForProduct, productIdFor, type ProductIds } from "../plans";
import { ProviderError, WebhookVerificationError, type PaymentProvider } from "../port";
import { verifyStandardWebhook } from "../standard-webhooks";

// Dodo Payments adapter (merchant of record, plan §9.3, §9.6), built against Dodo's REST API shape: Bearer API
// key, test and live hosts, Checkout Sessions, customer portal sessions, subscriptions, and Standard Webhooks.
// No account exists yet, so nothing here has run against Dodo: tests use signed fixture webhooks and a stubbed
// fetch. Confirm the field names below against Dodo's current API reference before launch (plan §19).
//
// Every response and webhook body is parsed with zod (AGENTS.md rule 8); unknown fields are ignored.

export const DODO_HOSTS = {
  test_mode: "https://test.dodopayments.com",
  live_mode: "https://live.dodopayments.com",
} as const;

export interface DodoConfig extends ProductIds {
  apiKey?: string;
  webhookSecret?: string;
  environment: keyof typeof DODO_HOSTS;
  /** Overrides the host (a local stub server in tests). */
  baseUrl?: string;
  fetch?: typeof fetch;
}

// ── Payloads ─────────────────────────────────────────────────────────────────────────────────────────────────

const minor = z.union([z.number(), z.string().regex(/^\d+$/)]).transform(Number);
const iso = z.string().transform((s, ctx) => {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    ctx.addIssue({ code: "custom", message: "invalid date" });
    return z.NEVER;
  }
  return d;
});
const currency = z.string().regex(/^[A-Za-z]{3}$/).transform((c) => c.toUpperCase());
const country = z
  .string()
  .regex(/^[A-Za-z]{2}$/)
  .transform((c) => c.toUpperCase())
  .nullish()
  .catch(null);
const uuid = z.string().uuid();
const metadata = z.record(z.string(), z.unknown()).nullish();
const customer = z.looseObject({ customer_id: z.string() }).nullish();
const billing = z.looseObject({ country }).nullish();

const subscriptionSchema = z.looseObject({
  subscription_id: z.string().min(1),
  status: z.enum(["pending", "active", "on_hold", "cancelled", "failed", "expired", "paused"]),
  product_id: z.string().nullish(),
  customer,
  metadata,
  recurring_pre_tax_amount: minor,
  currency,
  next_billing_date: iso.nullish(),
  cancel_at_next_billing_date: z.boolean().nullish(),
  billing,
});

const paymentSchema = z.looseObject({
  payment_id: z.string().min(1),
  subscription_id: z.string().nullish(),
  customer,
  metadata,
  total_amount: minor,
  tax: minor.nullish(),
  currency,
  payment_method_type: z.string().nullish(),
  payment_method: z.string().nullish(),
  billing,
});

const refundSchema = z.looseObject({
  refund_id: z.string().min(1),
  payment_id: z.string().min(1),
  amount: minor,
  currency,
  is_partial: z.boolean().nullish(),
});

const disputeSchema = z.looseObject({
  dispute_id: z.string().min(1),
  payment_id: z.string().min(1),
  amount: minor,
  currency,
});

const envelopeSchema = z.looseObject({
  type: z.string().min(1),
  timestamp: iso,
  data: z.unknown(),
});

function userIdFrom(meta: Record<string, unknown> | null | undefined): string | null {
  const parsed = uuid.safeParse(meta?.user_id);
  return parsed.success ? parsed.data : null;
}

export function toSubscriptionSnapshot(raw: unknown, products: ProductIds): SubscriptionSnapshot {
  const s = subscriptionSchema.parse(raw);
  return {
    providerSubscriptionId: s.subscription_id,
    providerCustomerId: s.customer?.customer_id ?? null,
    userId: userIdFrom(s.metadata),
    plan: planForProduct(s.product_id, products),
    providerPriceId: s.product_id ?? null,
    // Paused subscriptions don't grant access; treat them as on hold until they resume or end.
    status: s.status === "paused" ? "on_hold" : s.status,
    currentPeriodEnd: s.next_billing_date ?? null,
    cancelAtPeriodEnd: s.cancel_at_next_billing_date ?? false,
    currency: s.currency,
    amountMinor: s.recurring_pre_tax_amount,
    country: s.billing?.country ?? null,
  };
}

const SUBSCRIPTION_TYPES = new Set<string>(SUBSCRIPTION_EVENT_TYPES);

/** Maps a verified Dodo webhook body to a provider-neutral BillingEvent. */
export function parseDodoEvent(body: string, eventId: string, products: ProductIds): BillingEvent {
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    throw new WebhookVerificationError("webhook body is not JSON");
  }
  const env = envelopeSchema.parse(json);
  const base = { id: eventId, occurredAt: env.timestamp };
  const [group, action] = env.type.split(".", 2);

  if (group === "subscription" && SUBSCRIPTION_TYPES.has(action)) {
    return {
      ...base,
      kind: "subscription",
      type: action as SubscriptionEventType,
      subscription: toSubscriptionSnapshot(env.data, products),
    };
  }
  if (env.type === "payment.succeeded" || env.type === "payment.failed") {
    const p = paymentSchema.parse(env.data);
    return {
      ...base,
      kind: "payment",
      type: env.type === "payment.succeeded" ? "succeeded" : "failed",
      payment: {
        providerPaymentId: p.payment_id,
        providerSubscriptionId: p.subscription_id ?? null,
        providerCustomerId: p.customer?.customer_id ?? null,
        userId: userIdFrom(p.metadata),
        status: env.type === "payment.succeeded" ? "succeeded" : "failed",
        currency: p.currency,
        amountMinor: p.total_amount,
        taxMinor: p.tax ?? 0,
        country: p.billing?.country ?? null,
        method: p.payment_method_type ?? p.payment_method ?? null,
      },
    };
  }
  if (env.type === "refund.succeeded") {
    const r = refundSchema.parse(env.data);
    return {
      ...base,
      kind: "refund",
      type: "succeeded",
      refund: {
        providerRefundId: r.refund_id,
        providerPaymentId: r.payment_id,
        currency: r.currency,
        amountMinor: r.amount,
        partial: r.is_partial ?? false,
      },
    };
  }
  if (env.type === "dispute.opened" || env.type === "dispute.won" || env.type === "dispute.lost") {
    const d = disputeSchema.parse(env.data);
    return {
      ...base,
      kind: "dispute",
      type: action as "opened" | "won" | "lost",
      dispute: {
        providerDisputeId: d.dispute_id,
        providerPaymentId: d.payment_id,
        currency: d.currency,
        amountMinor: d.amount,
      },
    };
  }
  return { ...base, kind: "ignored", type: env.type };
}

// ── API client ───────────────────────────────────────────────────────────────────────────────────────────────

const checkoutResponse = z.looseObject({ session_id: z.string(), checkout_url: z.url() });
const portalResponse = z.looseObject({ link: z.url() });
const listResponse = z.looseObject({ items: z.array(z.unknown()) });

const PAGE_SIZE = 100;

export function dodoProvider(config: DodoConfig): PaymentProvider {
  const base = (config.baseUrl ?? DODO_HOSTS[config.environment]).replace(/\/+$/, "");
  const doFetch = config.fetch ?? fetch;

  async function api<T>(method: string, path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
    if (!config.apiKey) throw new ProviderError("DODO_API_KEY is not set");
    const res = await doFetch(`${base}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      // Never echo the provider's body (it may hold customer data); the status is enough to act on.
      throw new ProviderError(`Dodo ${method} ${path.split("?")[0]} failed with ${res.status}`, res.status);
    }
    const text = await res.text();
    return schema.parse(text ? JSON.parse(text) : {});
  }

  return {
    id: "dodo",

    async createCheckout(input) {
      const productId = productIdFor(input.plan, config);
      if (!productId) throw new ProviderError(`No Dodo product configured for ${input.plan}`);
      const res = await api("POST", "/checkouts", checkoutResponse, {
        product_cart: [{ product_id: productId, quantity: 1 }],
        customer: input.customerId ? { customer_id: input.customerId } : { email: input.email, name: input.name },
        ...(input.country ? { billing_address: { country: input.country } } : {}),
        ...(input.currency ? { billing_currency: input.currency } : {}),
        ...(input.discountCode ? { discount_code: input.discountCode } : {}),
        // The buyer may change the country (it decides the price and tax), and pay in local currency.
        feature_flags: { allow_currency_selection: true },
        return_url: input.returnUrl,
        // Set here on the server from the session, never from the request body (plan §9.3).
        metadata: { user_id: input.userId, plan: input.plan, ...(input.locale ? { locale: input.locale } : {}) },
      });
      return { url: res.checkout_url, sessionId: res.session_id };
    },

    async createPortalSession(customerId) {
      const res = await api(
        "POST",
        `/customers/${encodeURIComponent(customerId)}/customer-portal/session`,
        portalResponse,
        {}
      );
      return { url: res.link };
    },

    async cancel(subscriptionId) {
      await api("PATCH", `/subscriptions/${encodeURIComponent(subscriptionId)}`, z.unknown(), { status: "cancelled" });
    },

    async getSubscription(subscriptionId) {
      const raw = await api("GET", `/subscriptions/${encodeURIComponent(subscriptionId)}`, z.unknown());
      return toSubscriptionSnapshot(raw, config);
    },

    async listActiveSubscriptions(cursor) {
      const page = cursor ? Number(cursor) : 0;
      const res = await api(
        "GET",
        `/subscriptions?status=active&page_size=${PAGE_SIZE}&page_number=${page}`,
        listResponse
      );
      const items = res.items.map((raw) => toSubscriptionSnapshot(raw, config));
      return { items, next: res.items.length === PAGE_SIZE ? String(page + 1) : undefined };
    },

    async verifyWebhook({ headers, body }, now) {
      if (!config.webhookSecret) throw new WebhookVerificationError("DODO_WEBHOOK_SECRET is not set");
      const { id } = await verifyStandardWebhook(config.webhookSecret, headers, body, now);
      return { eventId: id };
    },

    parseEvent(body, eventId) {
      return parseDodoEvent(body, eventId, config);
    },
  };
}
