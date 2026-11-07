// Browser security headers for every response (plan §11.4). Loaded by next.config.ts, so relative imports
// only and no `server-only`. The middleware (Phase 3) will set the HTML-specific ones (Cache-Control, Vary)
// on top of these; the list here is the baseline for every route, static files included.

import { observabilityCspHosts, type ObservabilityCspHosts } from "../observability/csp-hosts";
import { pinPublicObservabilityEnv, type PublicObservabilityEnv } from "../observability/public-env";

// Unset observability variables become "" before Next reads the environment, so their client code is dropped at
// build (see pinPublicObservabilityEnv). Must run when next.config.ts loads this module.
pinPublicObservabilityEnv();

/**
 * Where browsers send CSP violation reports. TODO(Phase 6): set to the Sentry security endpoint (or our own
 * `/api/csp-report`) once Sentry exists. While it is null the policy has no `report-to`/`report-uri`, and
 * violations only show in the browser console.
 */
const CSP_REPORT_ENDPOINT: string | null = null;

/**
 * Third-party origins the CSP allows. Each one is empty until its account exists (plan §0.1): add the host
 * here, not in the policy string, when an embedded Dodo checkout is wired up. Sentry, PostHog and Cloudflare Web
 * Analytics add theirs only when their variables are set (features/observability/csp-hosts.ts).
 */
const CSP_HOSTS = {
  /** Google profile pictures after sign-in (plan §8.3). */
  googleAvatars: "https://lh3.googleusercontent.com",
  /** Google OAuth form posts (plan §8.3). */
  googleAccounts: "https://accounts.google.com",
  /** TODO(Phase 5): Dodo checkout origin (form-action; frame-src only if the checkout is embedded). */
  dodoCheckout: [] as string[],
  dodoCheckoutEmbedded: [] as string[],
};

interface CspOptions {
  /** `next dev` needs eval for React's debugging tools and Fast Refresh. */
  dev?: boolean;
  reportEndpoint?: string | null;
  /** Hosts of the observability tools that are on. Default: read from the build environment. */
  observability?: ObservabilityCspHosts;
}

/**
 * The Content-Security-Policy from §11.4. `'unsafe-inline'` scripts are a known trade-off: nonces would force
 * dynamic rendering and break edge caching (see the compensating controls in §11.4).
 *
 * Not included while the policy is Report-Only, to be added when it is enforced (Phase 7):
 * - `upgrade-insecure-requests`: browsers ignore it in a report-only policy and log a console error for it.
 * - `report-to csp`: only once CSP_REPORT_ENDPOINT is set (it then also needs the Reporting-Endpoints header).
 */
export function contentSecurityPolicy({
  dev = false,
  reportEndpoint = CSP_REPORT_ENDPOINT,
  observability = observabilityCspHosts(process.env as PublicObservabilityEnv),
}: CspOptions = {}): string {
  const h = CSP_HOSTS;
  const o = observability;
  const directives: [string, ...string[]][] = [
    ["default-src", "'self'"],
    [
      "script-src",
      "'self'",
      "'unsafe-inline'",
      ...(dev ? ["'unsafe-eval'"] : []),
      ...o.scriptSrc,
    ],
    ["connect-src", "'self'", ...o.connectSrc],
    ["img-src", "'self'", "data:", h.googleAvatars],
    ["style-src", "'self'", "'unsafe-inline'"],
    ["font-src", "'self'"],
    ...(h.dodoCheckoutEmbedded.length > 0 ? [["frame-src", ...h.dodoCheckoutEmbedded] as [string, ...string[]]] : []),
    ["form-action", "'self'", h.googleAccounts, ...h.dodoCheckout],
    ["base-uri", "'self'"],
    ["object-src", "'none'"],
    ["frame-ancestors", "'none'"],
    ...(reportEndpoint
      ? [["report-uri", reportEndpoint] as [string, ...string[]], ["report-to", "csp"] as [string, ...string[]]]
      : []),
  ];
  return directives.map((d) => d.join(" ")).join("; ");
}

interface SecurityHeaderOptions extends CspOptions {
  /**
   * Environments other than production (preview, staging, local) are also kept out of search engines, so a
   * staging copy never competes with the real site.
   */
  indexable?: boolean;
  /** Switch to `true` in Phase 7, after 7 days of reports with no unexplained violations (§11.4). */
  enforceCsp?: boolean;
}

export function securityHeaders(options: SecurityHeaderOptions = {}): { key: string; value: string }[] {
  const { indexable = true, enforceCsp = false } = options;
  const reportEndpoint = options.reportEndpoint === undefined ? CSP_REPORT_ENDPOINT : options.reportEndpoint;
  return [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    {
      key: enforceCsp ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
      value: contentSecurityPolicy({ dev: options.dev, reportEndpoint, observability: options.observability }),
    },
    ...(reportEndpoint ? [{ key: "Reporting-Endpoints", value: `csp="${reportEndpoint}"` }] : []),
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-site" },
    { key: "X-Frame-Options", value: "DENY" },
    // Text-and-data-mining opt-out (plan §11.10, layer 2).
    { key: "X-Robots-Tag", value: indexable ? "noai, noimageai" : "noindex, nofollow, noai, noimageai" },
  ];
}
