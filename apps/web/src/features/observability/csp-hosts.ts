import { DEFAULT_POSTHOG_HOST, type PublicObservabilityEnv } from "./public-env";

// Third-party origins the CSP needs for the observability tools that are switched on (plan §11.4). A tool whose
// variable is unset adds nothing. Loaded by next.config.ts (through features/seo), so relative imports only.

export interface ObservabilityCspHosts {
  scriptSrc: string[];
  connectSrc: string[];
}

function origin(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.origin : null;
  } catch {
    return null;
  }
}

export function observabilityCspHosts(env: PublicObservabilityEnv): ObservabilityCspHosts {
  const scriptSrc: string[] = [];
  const connectSrc: string[] = [];

  // A DSN `https://<key>@o1.ingest.us.sentry.io/2` sends to `https://o1.ingest.us.sentry.io`.
  const sentry = origin(env.NEXT_PUBLIC_SENTRY_DSN);
  if (sentry) connectSrc.push(sentry);

  // posthog-js is bundled (no-external build), so PostHog needs connect-src only, no script-src.
  if (env.NEXT_PUBLIC_POSTHOG_KEY) {
    const posthog = origin(env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_POSTHOG_HOST);
    if (posthog) connectSrc.push(posthog);
  }

  if (env.NEXT_PUBLIC_CF_BEACON_TOKEN) {
    scriptSrc.push("https://static.cloudflareinsights.com");
    connectSrc.push("https://cloudflareinsights.com");
  }

  return { scriptSrc, connectSrc };
}
