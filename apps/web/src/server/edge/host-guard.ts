// Production answers on its canonical host only (security review M2). The Worker is also reachable on
// `<worker>.<subdomain>.workers.dev` (the deploy smoke tests use it, because Bot Fight Mode on the custom domain
// blocks CI runners), and that hostname skips everything set on the zone: WAF, Bot Fight Mode, AI Crawl Control,
// zone rate-limit rules. So in production a page request on any other host is redirected to the canonical one,
// except for requests that carry the deploy smoke key (`x-smoke-key` = the SMOKE_KEY secret), which pass with
// `noindex`. API routes aren't matched by middleware; on another host they get no session cookie (cookies are
// host-only) and state-changing calls fail the Origin check.
//
// The canonical host is BETTER_AUTH_URL's (required in production). While that is the workers.dev URL itself
// (before the domain exists), nothing changes. Edge-safe: no Node APIs.

export const SMOKE_KEY_HEADER = "x-smoke-key";

export type HostDecision = { action: "pass" } | { action: "pass-noindex" } | { action: "redirect"; location: string };

interface HostInput {
  appEnv: string;
  url: URL;
  /** BETTER_AUTH_URL: the public origin. */
  canonicalUrl?: string;
  /** SMOKE_KEY secret (≥ 32 characters, else ignored). */
  smokeKey?: string;
  /** The request's x-smoke-key header. */
  presentedKey?: string | null;
}

function constantTimeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}

export function decideHost({ appEnv, url, canonicalUrl, smokeKey, presentedKey }: HostInput): HostDecision {
  if (appEnv !== "production" || !canonicalUrl) return { action: "pass" };
  let canonical: URL;
  try {
    canonical = new URL(canonicalUrl);
  } catch {
    return { action: "pass" };
  }
  if (url.host === canonical.host) return { action: "pass" };
  if (smokeKey && smokeKey.length >= 32 && presentedKey && constantTimeEqual(presentedKey, smokeKey)) {
    return { action: "pass-noindex" };
  }
  return { action: "redirect", location: `${canonical.origin}${url.pathname}${url.search}` };
}
