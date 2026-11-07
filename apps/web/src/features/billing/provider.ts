import type { ServerEnv } from "@/server/env";
import type { PaymentProvider } from "./port";
import { dodoProvider } from "./providers/dodo";

// Picks a provider adapter from the environment (plan §9.6). BILLING_PRIMARY chooses where new checkouts go;
// webhooks, portal sessions and cancellations use the provider a subscription belongs to.

type BillingEnv = Pick<
  ServerEnv,
  | "BILLING_PRIMARY"
  | "DODO_API_KEY"
  | "DODO_WEBHOOK_SECRET"
  | "DODO_ENVIRONMENT"
  | "DODO_API_BASE_URL"
  | "DODO_PRODUCT_PRO_MONTHLY"
  | "DODO_PRODUCT_PRO_YEARLY"
>;

export function providerFor(id: string, env: BillingEnv, fetchImpl?: typeof fetch): PaymentProvider | null {
  if (id !== "dodo") return null;
  return dodoProvider({
    apiKey: env.DODO_API_KEY,
    webhookSecret: env.DODO_WEBHOOK_SECRET,
    environment: env.DODO_ENVIRONMENT,
    baseUrl: env.DODO_API_BASE_URL,
    DODO_PRODUCT_PRO_MONTHLY: env.DODO_PRODUCT_PRO_MONTHLY,
    DODO_PRODUCT_PRO_YEARLY: env.DODO_PRODUCT_PRO_YEARLY,
    fetch: fetchImpl,
  });
}

export function primaryProvider(env: BillingEnv, fetchImpl?: typeof fetch): PaymentProvider {
  return providerFor(env.BILLING_PRIMARY, env, fetchImpl)!;
}

/** Checkout can start: an API key and both products are configured. */
export function checkoutConfigured(env: BillingEnv): boolean {
  return Boolean(env.DODO_API_KEY && env.DODO_PRODUCT_PRO_MONTHLY && env.DODO_PRODUCT_PRO_YEARLY);
}
