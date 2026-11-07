import type { Instrumentation } from "next";

// Server-side Sentry (plan §10.1). Without SENTRY_DSN both hooks return at once and the SDK is never loaded.
// On Cloudflare Workers (OpenNext) the Worker entry is wrapped with `withSentry` from `@sentry/nextjs/cloudflare`,
// which starts the SDK per request; `register` must not start a second client there, but `onRequestError` still
// reports through the one the wrapper started.

const onWorkers = () => globalThis.navigator?.userAgent === "Cloudflare-Workers";

export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || onWorkers()) return;
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    const { initSentryServer } = await import("./features/observability/sentry.server");
    initSentryServer(dsn);
  }
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!process.env.SENTRY_DSN) return;
  const { captureRequestError } = await import("@sentry/nextjs");
  captureRequestError(...args);
};
