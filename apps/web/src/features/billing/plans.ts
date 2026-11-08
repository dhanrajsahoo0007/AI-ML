import { tierForCountry, type PriceTier } from "@/config/pricing-tiers";
import type { Plan } from "./events";

// Plans and their provider products (plan §9.1). Prices live in the payment provider; here only the mapping
// from our plan to the provider's product ID, per provider and environment (env vars, see src/server/env.ts),
// and the regional price tier used for reporting (plan §9.5).

export const PLANS: Record<Plan, { tier: "pro"; interval: "month" | "year"; label: string }> = {
  pro_monthly: { tier: "pro", interval: "month", label: "Pro monthly" },
  pro_yearly: { tier: "pro", interval: "year", label: "Pro yearly" },
};

export const PLAN_IDS = Object.keys(PLANS) as Plan[];

export interface ProductIds {
  DODO_PRODUCT_PRO_MONTHLY?: string;
  DODO_PRODUCT_PRO_YEARLY?: string;
}

export function productIdFor(plan: Plan, env: ProductIds): string | undefined {
  return plan === "pro_monthly" ? env.DODO_PRODUCT_PRO_MONTHLY : env.DODO_PRODUCT_PRO_YEARLY;
}

export function planForProduct(productId: string | null | undefined, env: ProductIds): Plan | null {
  if (!productId) return null;
  if (productId === env.DODO_PRODUCT_PRO_MONTHLY) return "pro_monthly";
  if (productId === env.DODO_PRODUCT_PRO_YEARLY) return "pro_yearly";
  return null;
}

// Regional (purchasing-power) tier by billing country, for reporting only: the provider applies the actual country
// price. The country → tier map lives in config/pricing-tiers.ts (plan §9.5), shared with the pricing page.
export function priceTierFor(country: string | null): PriceTier | null {
  return country ? tierForCountry(country) : null;
}

/** "€9.00" / "₹2,999.00": the paid amount in its own currency (plan §9.5: format with Intl). */
export function formatMoney(amountMinor: number, currency: string, locale = "en"): string {
  const digits = new Intl.NumberFormat(locale, { style: "currency", currency }).resolvedOptions()
    .maximumFractionDigits ?? 2;
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amountMinor / 10 ** digits);
}
