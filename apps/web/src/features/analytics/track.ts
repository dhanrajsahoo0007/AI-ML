import type { AnalyticsEventName, AnalyticsEvents } from "./events";

// `track()` sends a catalogue event to PostHog (plan §10.5). With no NEXT_PUBLIC_POSTHOG_KEY at build time both
// functions are empty: the branches below are dead code and webpack builds no PostHog chunk.
//
// PostHog itself loads late (after the first interaction or when the browser is idle, see the observability
// island); events tracked before that wait in a small queue.

interface Capture {
  capture(name: string, props: Record<string, unknown>): void;
}

const MAX_QUEUED = 50;
let queue: [string, Record<string, unknown>][] = [];
let client: Capture | null = null;
let loading: Promise<void> | null = null;

export function track<N extends AnalyticsEventName>(name: N, props: AnalyticsEvents[N]): void {
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    const p = props as Record<string, unknown>;
    if (client) client.capture(name, p);
    else if (queue.length < MAX_QUEUED) queue.push([name, p]);
  }
}

/** Loads and starts PostHog once, then sends the queued events. Resolves when done (or at once when off). */
export function loadAnalytics(): Promise<void> {
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    loading ??= import("./posthog.client")
      .then(({ startPostHog }) => {
        client = startPostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, process.env.NEXT_PUBLIC_POSTHOG_HOST);
        for (const [name, props] of queue) client.capture(name, props);
      })
      .catch(() => {
        // Analytics is best effort; a blocked script must not break the page.
      })
      .finally(() => {
        queue = [];
      });
    return loading;
  }
  return Promise.resolve();
}
