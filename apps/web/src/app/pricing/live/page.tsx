import type { Metadata } from "next";
import { PricingView, pricingMetadata } from "../pricing-view";

// The pricing page with checkout open (plan §9.3). Served at /pricing by middleware when the paywall is on and
// DODO_API_KEY is set; the canonical URL stays /pricing and this one is never indexed.
export const dynamic = "force-static";

export const metadata: Metadata = { ...pricingMetadata, robots: { index: false, follow: true } };

export default function PricingLivePage() {
  return <PricingView live />;
}
