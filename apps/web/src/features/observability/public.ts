// Client-safe exports of the observability feature (no server-only code, no JSX): the error-boundary capture
// (app/error.tsx, app/global-error.tsx), the NEXT_PUBLIC_* names and the CSP hosts they imply (features/seo
// security headers, loaded by next.config.ts with plain Node) and the PostHog default host (features/analytics).
export { captureError } from "./capture";
export { observabilityCspHosts, type ObservabilityCspHosts } from "./csp-hosts";
export { DEFAULT_POSTHOG_HOST, pinPublicObservabilityEnv, type PublicObservabilityEnv } from "./public-env";
