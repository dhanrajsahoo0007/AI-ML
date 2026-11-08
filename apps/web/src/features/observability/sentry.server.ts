import * as Sentry from "@sentry/nextjs";
import { DATA_COLLECTION, TRACES_SAMPLE_RATE, scrubEvent } from "./sentry-options";

// Sentry for `next start` and `next dev` (Node.js) and the edge runtime, started from instrumentation.ts when
// SENTRY_DSN is set. On Cloudflare Workers the Worker entry is wrapped with `withSentry` from
// `@sentry/nextjs/cloudflare` instead (sentry.worker.ts, applied by apps/web/worker.mjs), and this is not called.

export function initSentryServer(dsn: string): void {
  Sentry.init({
    dsn,
    release: process.env.SENTRY_RELEASE || process.env.NEXT_PUBLIC_GIT_SHA || undefined,
    environment: process.env.APP_ENV,
    dataCollection: DATA_COLLECTION,
    tracesSampleRate: TRACES_SAMPLE_RATE,
    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: (event) => scrubEvent(event),
  });
}
