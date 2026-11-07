import { business, SITE_URL } from "../../config/business";

// Shared SEO constants. Relative imports only, so the unit tests and scripts can load it with plain Node.

export const SITE_NAME = business.BRAND;

/**
 * Class of the element that wraps the premium part of an article (everything after the free preview).
 * The JSON-LD paywall markup (`hasPart.cssSelector`, plan §9.2) points at it, so the Phase 5 `<Paywall/>`
 * container MUST use exactly this class, or Google may treat the hidden part as cloaking.
 */
export const PAYWALL_CONTAINER_CLASS = "oa-paywalled";

/** Absolute URL for a site path ("/" → the origin itself). */
export function absoluteUrl(path: string, origin: string = SITE_URL): string {
  if (/^https?:\/\//.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return p === "/" ? origin : `${origin}${p.replace(/\/$/, "")}`;
}
