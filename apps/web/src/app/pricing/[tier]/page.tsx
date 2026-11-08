import { notFound } from "next/navigation";
import { tierFromSlug } from "@/config/pricing-tiers";
import { PricingView, pricingMetadata, pricingTierParams } from "../pricing-view";

// Regional price tiers B and C of /pricing, "Go Pro" launching soon (plan §9.5). Middleware serves these at /pricing
// by the visitor's region (server/edge/pricing-variant.ts); requested directly they are noindex, canonical /pricing.
export const dynamic = "force-static";
export const dynamicParams = false;
export const generateStaticParams = pricingTierParams;

export const metadata = pricingMetadata;

export default async function PricingTierPage({ params }: { params: Promise<{ tier: string }> }) {
  const tier = tierFromSlug((await params).tier);
  if (!tier) notFound();
  return <PricingView tier={tier} />;
}
