import { TIER_SLUGS, normalizeCountry, tierForCountry, type PriceTier } from "@/config/pricing-tiers";
import { pricingRewrite } from "./paywall-gate";
import { normalizePath } from "./sections-gate";

// Which prerendered pricing page middleware serves at /pricing (plan §9.3 × §9.5). Pure: no Next.js, no env, no I/O.
//
// Two switches compose, giving six prerendered pages:
//   checkout   launching soon (default) | live (paywall on and DODO_API_KEY set, paywall-gate.ts pricingRewrite)
//   tier       A (base) | B | C, from the `oa_region` cookie (region switcher) first, then the visitor's country
//              (`cf-ipcountry`, set by Cloudflare from request.cf.country), default A
//
//                 tier A          tier B             tier C
//   soon          /pricing        /pricing/b         /pricing/c
//   live          /pricing/live   /pricing/live/b    /pricing/live/c
//
// /pricing itself is then per visitor, so its response is `private, no-cache` with `Vary: Cookie, CF-IPCountry`:
// no shared cache may store one region's page for another (Cloudflare ignores Vary for HTML, `private` is what keeps
// it out). The variant pages are still prerendered and cached in the server-side incremental cache. Direct requests
// to a variant URL pass, single-content and cacheable, but `noindex`: the canonical URL is /pricing.

/** Set by Cloudflare on every request through the zone (IP geolocation); a client can't override it there. */
export const COUNTRY_HEADER = "cf-ipcountry";

const NOINDEX = "noindex, noai, noimageai";
const PRICING_PATH = "/pricing";
const LIVE_PATH = "/pricing/live";

/** Every variant URL other than /pricing itself. */
const VARIANT_PATHS: ReadonlySet<string> = new Set([
  LIVE_PATH,
  ...Object.values(TIER_SLUGS).flatMap((slug) => [`${PRICING_PATH}/${slug}`, `${LIVE_PATH}/${slug}`]),
]);

interface PricingDecision {
  /** The visitor's tier at /pricing; null for a variant URL requested directly (its tier is in the URL). */
  tier: PriceTier | null;
  /** The variant to rewrite to, or null to serve the requested page as it is. */
  rewrite: string | null;
  /** Headers middleware sets on the response. */
  headers: Record<string, string>;
}

/** The visitor's tier: a valid override cookie wins, then the IP country, then A. */
function pricingTier(input: { regionCookie?: string | null; country?: string | null }): PriceTier {
  const override = normalizeCountry(input.regionCookie);
  return tierForCountry(override ?? input.country);
}

/** The pricing decision for a request, or null when the path isn't a pricing page. */
export function decidePricing(input: {
  pathname: string;
  paywall: boolean;
  billingConfigured: boolean;
  regionCookie?: string | null;
  country?: string | null;
}): PricingDecision | null {
  const path = normalizePath(input.pathname);
  // Keeps the AI-crawler opt-out that next.config.ts sends (middleware's X-Robots-Tag replaces it).
  if (VARIANT_PATHS.has(path)) return { tier: null, rewrite: null, headers: { "X-Robots-Tag": NOINDEX } };
  if (path !== PRICING_PATH) return null;

  const tier = pricingTier(input);
  const base = pricingRewrite(path, input) ?? PRICING_PATH;
  const to = tier === "A" ? base : `${base}/${TIER_SLUGS[tier]}`;
  return {
    tier,
    rewrite: to === PRICING_PATH ? null : to,
    headers: { "Cache-Control": "private, no-cache", Vary: "Cookie, CF-IPCountry" },
  };
}
