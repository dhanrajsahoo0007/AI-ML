import * as Sentry from "@sentry/nextjs";
import { DATA_COLLECTION, TRACES_SAMPLE_RATE, isLocalHost, scrubEvent } from "./sentry-options";

// The Sentry browser SDK (plan §10.1). This module is its own chunk, loaded only through a dynamic import that sits
// behind `if (process.env.NEXT_PUBLIC_SENTRY_DSN)`: with no DSN the import is dead code and the chunk isn't built.

let started = false;

/** Starts Sentry once. Does nothing on local hosts (their errors are never sent). */
export function initSentryBrowser(): boolean {
  if (started) return true;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn || isLocalHost(location.hostname)) return false;
  started = true;
  Sentry.init({
    dsn,
    release: process.env.NEXT_PUBLIC_GIT_SHA || undefined,
    environment: process.env.APP_ENV,
    dataCollection: DATA_COLLECTION,
    tracesSampleRate: TRACES_SAMPLE_RATE,
    // Replay only the minute before an error, never whole sessions; every text node and input is masked.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true }),
    ],
    // Browser extensions and injected scripts are noise.
    denyUrls: [/^chrome(-extension)?:\/\//i, /^moz-extension:\/\//i, /^safari(-web)?-extension:\/\//i],
    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: (event) => scrubEvent(event),
  });
  return true;
}

/** Reports an error caught by an error boundary, starting the SDK first if the lazy start hasn't run yet. */
export function captureException(error: unknown, digest?: string): void {
  if (!initSentryBrowser()) return;
  Sentry.captureException(error, digest ? { tags: { digest } } : undefined);
}
