import { z } from "zod";
import { normalizePath } from "./sections-gate";

// The premium gate run by middleware (plan §9.2). Pure: no Next.js, no env, no I/O. Input is the build
// manifest src/generated/premium-routes.json (written by next.config.ts from the access model in
// features/paywall/access.ts) and the verified `oa_ent` claims.
//
//   paywall off, or a free page          → pass (cacheable as before)
//   premium page, valid cookie, tier=pro → pass, never stored by shared caches (private, no-store, Vary)
//   premium page, anything else          → rewrite to the public preview `<path>/_preview`
//   the preview path itself              → pass (public), but noindex: the canonical URL is the page

/** Must equal PREVIEW_SEGMENT in src/features/paywall/constants.ts (asserted by paywall-gate.test.ts). */
export const PREVIEW_SUFFIX = "/_preview";

export const premiumManifestSchema = z.object({
  env: z.string(),
  paywall: z.boolean(),
  routes: z.array(z.string().startsWith("/")),
});

export type PremiumManifest = z.infer<typeof premiumManifestSchema>;

/** Nothing premium: what middleware uses when the manifest has not been generated (`next dev`). */
export const EMPTY_PREMIUM_MANIFEST: PremiumManifest = { env: "local", paywall: false, routes: [] };

/** The manifest as a Set of normalised paths, built once per isolate (lookups are O(1)). */
export function premiumIndex(manifest: PremiumManifest): ReadonlySet<string> {
  return new Set(manifest.paywall ? manifest.routes.map(normalizePath) : []);
}

type PaywallDecision =
  | { action: "pass" }
  | { action: "entitled" }
  | { action: "preview"; to: string }
  | { action: "preview-direct" };

export function isPremiumPath(pathname: string, premium: ReadonlySet<string>): boolean {
  return premium.has(normalizePath(pathname));
}

export function decidePaywall(input: {
  pathname: string;
  premium: ReadonlySet<string>;
  /** Verified `oa_ent` claims, or null (no cookie, forged, expired, unknown kid). */
  tier: "free" | "pro" | null;
}): PaywallDecision {
  const { pathname, premium, tier } = input;
  if (premium.size === 0) return { action: "pass" };
  const path = normalizePath(pathname);
  if (path.endsWith(PREVIEW_SUFFIX) && premium.has(path.slice(0, -PREVIEW_SUFFIX.length))) {
    return { action: "preview-direct" };
  }
  if (!premium.has(path)) return { action: "pass" };
  if (tier === "pro") return { action: "entitled" };
  return { action: "preview", to: `${path}${PREVIEW_SUFFIX}` };
}

/**
 * The pricing page has a second prerendered variant whose "Go Pro" opens checkout. Middleware serves it only
 * when the paywall is on and the payment provider is configured; otherwise "Go Pro" says "Launching soon".
 */
const PRICING_PATH = "/pricing";
const PRICING_LIVE_PATH = "/pricing/live";

export function pricingRewrite(pathname: string, input: { paywall: boolean; billingConfigured: boolean }) {
  return input.paywall && input.billingConfigured && normalizePath(pathname) === PRICING_PATH
    ? PRICING_LIVE_PATH
    : null;
}
