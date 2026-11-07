// Browser security headers for every response (plan §11.4). Loaded by next.config.ts, so relative imports
// only and no `server-only`. The middleware (Phase 3) will set the HTML-specific ones (Cache-Control, Vary)
// on top of these; the list here is the baseline for every route, static files included.

import { observabilityCspHosts, type ObservabilityCspHosts } from "../observability/csp-hosts";
import { pinPublicObservabilityEnv, type PublicObservabilityEnv } from "../observability/public-env";

// Unset observability variables become "" before Next reads the environment, so their client code is dropped at
// build (see pinPublicObservabilityEnv). Must run when next.config.ts loads this module.
pinPublicObservabilityEnv();

/**
 * Where browsers send CSP violation reports: our own endpoint (src/app/api/csp-report/route.ts), which logs each
 * one (security review M3). Same-origin and relative, so it works on every host and environment.
 */
export const CSP_REPORT_ENDPOINT = "/api/csp-report";

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
  /**
   * The DSA runner workers (plan §15.1 stage B): user code runs with `new Function` (JS) and Pyodide WebAssembly
   * (Python, from the pinned jsDelivr build). A worker's CSP comes from its own script response, so this relaxed
   * policy is applied only to the runner chunks, never to pages.
   */
  dsaRunner?: boolean;
}

const PYODIDE_CDN = "https://cdn.jsdelivr.net";

/**
 * The Content-Security-Policy from §11.4. `'unsafe-inline'` scripts are a known trade-off: nonces would force
 * dynamic rendering and break edge caching (see the compensating controls in §11.4).
 *
 * Not included while the policy is Report-Only, to be added when it is enforced (Phase 7):
 * - `upgrade-insecure-requests`: browsers ignore it in a report-only policy and log a console error for it.
 */
export function contentSecurityPolicy({
  dev = false,
  reportEndpoint = CSP_REPORT_ENDPOINT,
  observability = observabilityCspHosts(process.env as PublicObservabilityEnv),
  dsaRunner = false,
}: CspOptions = {}): string {
  const h = CSP_HOSTS;
  const o = observability;
  const directives: [string, ...string[]][] = [
    ["default-src", "'self'"],
    [
      "script-src",
      "'self'",
      "'unsafe-inline'",
      ...(dev || dsaRunner ? ["'unsafe-eval'"] : []),
      ...(dsaRunner ? ["'wasm-unsafe-eval'", PYODIDE_CDN] : []),
      ...o.scriptSrc,
    ],
    ["connect-src", "'self'", ...o.connectSrc, ...(dsaRunner ? [PYODIDE_CDN] : [])],
    ["worker-src", "'self'", "blob:"],
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
      value: contentSecurityPolicy({
        dev: options.dev,
        reportEndpoint,
        observability: options.observability,
        dsaRunner: options.dsaRunner,
      }),
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

/** The DSA runner worker chunks (`new Worker(..., { name })` in features/dsa/runner/run.ts), as webpack names them. */
export const DSA_RUNNER_CHUNKS = ["dsa-js-runner", "dsa-python-runner"] as const;

/**
 * A Cloudflare Workers Static Assets `_headers` file (written into .open-next/assets by scripts/static-headers.ts
 * at `cf:build`). On Cloudflare, /_next/static/* and public files are served by the assets binding without
 * running the Worker, so next.config.ts `headers()` never applies to them: without this file the runner workers
 * would get no CSP at all, and static files no HSTS or nosniff. Every asset gets the baseline headers; the
 * runner chunks swap the page CSP (detached with `!`) for the relaxed runner policy.
 */
export function staticAssetHeadersFile(options: Pick<SecurityHeaderOptions, "indexable" | "enforceCsp"> = {}): string {
  const lines = (headers: { key: string; value: string }[]) => headers.map((h) => `  ${h.key}: ${h.value}`);
  const page = securityHeaders(options);
  const runner = securityHeaders({ ...options, dsaRunner: true });
  const cspKey = page.find((h) => h.key.startsWith("Content-Security-Policy"))!.key;
  const out = [
    "# Generated by scripts/static-headers.ts from src/features/seo/security-headers.ts. Do not edit.",
    "/*",
    ...lines(page),
  ];
  for (const chunk of DSA_RUNNER_CHUNKS) {
    out.push(`/_next/static/chunks/${chunk}.*`, `  ! ${cspKey}`, ...lines(runner.filter((h) => h.key === cspKey)));
  }
  return `${out.join("\n")}\n`;
}
