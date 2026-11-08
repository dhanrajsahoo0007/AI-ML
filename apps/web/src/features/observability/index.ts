// Server-side API of the observability feature (plan §10): the web-vitals beacon schema and the server Sentry
// init (instrumentation.ts loads it lazily, only with SENTRY_DSN). No JSX: app/api/vitals/route.ts imports this
// index and its test is server-only. The root-layout component (observability.tsx) is imported by path for that
// reason; it is not client-safe enough for public.ts either way (see FEATURES_WITHOUT_ENTRY in eslint.config.mjs).
// Client-safe exports (error capture, the public env names, the CSP hosts) are in public.ts.
export { initSentryServer } from "./sentry.server";
export { VITALS_MAX_BYTES, vitalsPayload } from "./vitals-schema";
