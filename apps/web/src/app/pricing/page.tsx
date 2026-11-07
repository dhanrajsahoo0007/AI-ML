import { PricingView, pricingMetadata } from "./pricing-view";

// "Go Pro" says "Launching soon" here. Middleware serves /pricing/live at this URL instead once the paywall is on
// and the payment provider is configured (plan §9.3).
export const dynamic = "force-static";

export const metadata = pricingMetadata;

export default function PricingPage() {
  return <PricingView />;
}
