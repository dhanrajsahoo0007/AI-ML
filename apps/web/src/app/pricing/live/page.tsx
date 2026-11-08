import { PricingView, pricingMetadata } from "../pricing-view";

// The pricing page with checkout open (plan §9.3), tier A. Served at /pricing by middleware when the paywall is on
// and DODO_API_KEY is set; the canonical URL stays /pricing. Requested at its own URL it is noindex (middleware
// header), not by a robots meta tag, which would also de-index /pricing whenever this page is served there.
export const dynamic = "force-static";

export const metadata = pricingMetadata;

export default function PricingLivePage() {
  return <PricingView live />;
}
