import { notFound } from "next/navigation";
import { tierFromSlug } from "@/config/pricing-tiers";
import { PricingView, pricingMetadata, pricingTierParams } from "../../pricing-view";

// Regional price tiers B and C of /pricing/live (checkout open). Served at /pricing by middleware when the paywall is
// on, DODO_API_KEY is set and the visitor's region is tier B or C; requested directly they are noindex.
export const dynamic = "force-static";
export const dynamicParams = false;
export const generateStaticParams = pricingTierParams;

export const metadata = pricingMetadata;

export default async function PricingLiveTierPage({ params }: { params: Promise<{ tier: string }> }) {
  const tier = tierFromSlug((await params).tier);
  if (!tier) notFound();
  return <PricingView live tier={tier} />;
}
