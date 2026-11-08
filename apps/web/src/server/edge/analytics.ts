import { getCloudflareContext } from "@opennextjs/cloudflare/cloudflare-context";
import { normalizePath } from "./sections-gate";

// Server-side metrics in Workers Analytics Engine (plan §10.5): the `ANALYTICS` dataset binding, one dataset per
// environment (wrangler.jsonc, commented until the account exists). Without the binding (`next dev`, `next start`,
// CI, a Worker before the account exists) every write is a no-op. Edge-safe (no Node APIs, no database), so
// middleware may call it as well as /api/* handlers.
//
// `writeDataPoint` is non-blocking: it queues the point and returns at once, and the runtime sends it after the
// response, so no `waitUntil` and no await. Writes never throw into the caller.
//
// Column layout (stable: SQL queries in the Cloudflare dashboard read columns by position). Every event has
// index1 = blob1 = the event name and double1 = 1, so `SUM(_sample_interval * double1)` counts events.
//
//   event            blob2        blob3     blob4      blob5     blob6            double2
//   paywall_preview  path         section   tier       country   -                -
//   checkout_start   plan         provider  country    outcome   -                -
//   billing_webhook  provider     type      outcome    -         -                duration ms
//   web_vital        page route   section   metric     rating    navigation type  value (ms; CLS unitless)
//
// Privacy: labels only, never a user ID, an email, a query string or article text (same rules as
// features/analytics/events.ts). Country is the edge's `cf-ipcountry`.

export type AnalyticsPoint =
  | {
      event: "paywall_preview";
      /** The premium page's path (normalised, no query). */
      path: string;
      section: string;
      /** `anonymous` = no valid entitlement cookie; `free` = signed in without Pro. */
      tier: "anonymous" | "free";
      country: string | null;
    }
  | {
      event: "checkout_start";
      plan: string;
      provider: string;
      country: string | null;
      /** `ok` when the provider returned a checkout URL, else the error code (`already_subscribed`, …). */
      outcome: string;
    }
  | {
      event: "billing_webhook";
      provider: string;
      /** `<kind>.<type>` of the parsed event, or `unknown` when it never got that far. */
      type: string;
      /** processBillingEvent's result, or the error code (`invalid_signature`, `body_too_large`, `error`). */
      outcome: string;
      durationMs: number;
    }
  | {
      event: "web_vital";
      route: string;
      section: string;
      metric: string;
      rating: string;
      navigationType: string;
      value: number;
    };

export interface AnalyticsDataPoint {
  indexes: string[];
  blobs: string[];
  doubles: number[];
}

/** The binding's runtime API (wrangler.jsonc `analytics_engine_datasets`). */
export interface AnalyticsDataset {
  writeDataPoint(point: AnalyticsDataPoint): void;
}

/** Analytics Engine allows 96 bytes per index; blobs are capped well below the 16 kB per point. */
const MAX_INDEX = 96;
const MAX_BLOB = 256;

const clip = (value: string, max: number) => (value.length > max ? value.slice(0, max) : value);

/** The point written for an event, in the column layout above. Pure. */
export function toDataPoint(point: AnalyticsPoint): AnalyticsDataPoint {
  let blobs: (string | null)[];
  let doubles: number[] = [];
  switch (point.event) {
    case "paywall_preview":
      blobs = [point.path, point.section, point.tier, point.country];
      break;
    case "checkout_start":
      blobs = [point.plan, point.provider, point.country, point.outcome];
      break;
    case "billing_webhook":
      blobs = [point.provider, point.type, point.outcome];
      doubles = [Math.max(0, point.durationMs)];
      break;
    case "web_vital":
      blobs = [point.route, point.section, point.metric, point.rating, point.navigationType];
      doubles = [point.value];
      break;
  }
  return {
    indexes: [clip(point.event, MAX_INDEX)],
    blobs: [point.event, ...blobs].map((b) => clip(b ?? "", MAX_BLOB)),
    doubles: [1, ...doubles.map((d) => (Number.isFinite(d) ? d : 0))],
  };
}

/** The request's `ANALYTICS` binding, or null without one or outside a Cloudflare request. */
export function analyticsDataset(): AnalyticsDataset | null {
  try {
    const dataset = getCloudflareContext().env.ANALYTICS as AnalyticsDataset | undefined;
    return dataset && typeof dataset.writeDataPoint === "function" ? dataset : null;
  } catch {
    return null;
  }
}

/** Writes one point when the binding exists; a no-op otherwise. Never throws, never blocks. */
export function writeAnalytics(point: AnalyticsPoint, dataset: AnalyticsDataset | null = analyticsDataset()): void {
  if (!dataset) return;
  try {
    dataset.writeDataPoint(toDataPoint(point));
  } catch {
    // Metrics must never break a request (a malformed point, a runtime hiccup).
  }
}

const COUNTRY = /^[A-Z]{2}$/;

/** `cf-ipcountry` as an ISO code, or null for unknown (`XX`), Tor (`T1`) and anything malformed. */
export function edgeCountry(headers: Headers): string | null {
  const c = headers.get("cf-ipcountry")?.toUpperCase();
  return c && COUNTRY.test(c) && c !== "XX" && c !== "T1" ? c : null;
}

/** Router prefetches and browser speculation: not a view, though they hit the page path like one. */
function isPrefetch(headers: Headers): boolean {
  return (
    headers.has("next-router-prefetch") ||
    /prefetch|prerender/i.test(headers.get("sec-purpose") ?? headers.get("purpose") ?? "")
  );
}

/**
 * The paywall_preview point for a request that middleware rewrote to a premium page's preview, or null for a
 * prefetch. Pure, so middleware's cost is this plus one non-blocking write, on the preview branch only.
 */
export function paywallPreviewPoint(input: {
  pathname: string;
  headers: Headers;
  tier: "free" | "pro" | null;
}): AnalyticsPoint | null {
  if (isPrefetch(input.headers)) return null;
  const path = normalizePath(input.pathname);
  return {
    event: "paywall_preview",
    path,
    section: path.split("/")[1] ?? "",
    tier: input.tier === "free" ? "free" : "anonymous",
    country: edgeCountry(input.headers),
  };
}
