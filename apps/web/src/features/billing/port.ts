import type { BillingEvent, Plan, ProviderId, SubscriptionSnapshot } from "./events";

// The payment-provider port (plan §9.3). Dodo Payments is the primary adapter (providers/dodo.ts); the standby
// merchant of record (§9.6) becomes a second adapter behind the same interface and BILLING_PRIMARY switch.

export interface CheckoutInput {
  /** Our user ID; the adapter puts it in the provider's metadata, from the server session only. */
  userId: string;
  email: string;
  name: string;
  plan: Plan;
  /** ISO country (Cloudflare `cf-ipcountry`), editable by the buyer at checkout. */
  country: string | null;
  currency?: string;
  locale?: string;
  /** Existing provider customer, reused so the buyer keeps one customer record. */
  customerId?: string;
  discountCode?: string;
  returnUrl: string;
}

export interface WebhookRequest {
  headers: Headers;
  /** The raw body, exactly as received: the signature covers these bytes. */
  body: string;
}

export interface PaymentProvider {
  id: ProviderId;
  createCheckout(input: CheckoutInput): Promise<{ url: string; sessionId: string }>;
  createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }>;
  /** Cancels immediately (account deletion). */
  cancel(subscriptionId: string): Promise<void>;
  getSubscription(subscriptionId: string): Promise<SubscriptionSnapshot>;
  /** One page of live subscriptions; `next` is the cursor of the following page. */
  listActiveSubscriptions(cursor?: string): Promise<{ items: SubscriptionSnapshot[]; next?: string }>;
  /** Checks the signature and timestamp; returns the event ID. Throws WebhookVerificationError. */
  verifyWebhook(request: WebhookRequest, now?: Date): Promise<{ eventId: string }>;
  parseEvent(body: string, eventId: string): BillingEvent;
}

export class WebhookVerificationError extends Error {
  override name = "WebhookVerificationError";
}

export class ProviderError extends Error {
  override name = "ProviderError";
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}
