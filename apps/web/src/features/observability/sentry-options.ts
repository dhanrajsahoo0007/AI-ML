import type { BrowserOptions, Event } from "@sentry/nextjs";

// Sentry settings shared by the browser and the server (plan §10.1, §11.8), as plain data and pure functions so
// they can be tested without starting the SDK. The import above is type-only and adds nothing to any bundle.

/** Sample rate for performance traces (plan §10.1). */
export const TRACES_SAMPLE_RATE = 0.1;

/**
 * What the SDK may collect (plan §11.8). Sentry 11 replaced `sendDefaultPii: false` with this object; it is set to
 * the strictest values: no user fields, cookies, bodies, query strings or local variables, and of the headers only
 * the user agent (for browser and OS grouping). `scrubEvent` removes the same things again as a second layer.
 */
export const DATA_COLLECTION: NonNullable<BrowserOptions["dataCollection"]> = {
  userInfo: false,
  cookies: false,
  httpHeaders: { request: { allow: ["user-agent"] }, response: false },
  httpBodies: [],
  urlQueryParams: false,
  stackFrameVariables: false,
  databaseQueryData: false,
  queues: false,
  genAI: { inputs: false, outputs: false },
  mcp: { inputs: false, outputs: false },
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"]);

/** True for development hosts, whose errors are never sent (plan §10.1: "drop localhost"). */
export function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname) || hostname.endsWith(".localhost") || hostname.endsWith(".test");
}

const SENSITIVE_HEADER =
  /^(cookie|set-cookie|authorization|proxy-authorization|x-api-key|cf-connecting-ip|x-forwarded-for|x-real-ip|true-client-ip)$/i;

function stripQuery(url: string): string {
  const i = url.search(/[?#]/);
  return i === -1 ? url : url.slice(0, i);
}

/**
 * Server-side scrubbing rules (plan §11.8), run in `beforeSend` on both runtimes on top of `DATA_COLLECTION`:
 * drops events from local hosts, keeps only the user ID, and removes cookies, auth and IP headers, query strings
 * and request bodies.
 */
export function scrubEvent<E extends Event>(event: E): E | null {
  const url = event.request?.url;
  if (url) {
    try {
      if (isLocalHost(new URL(url).hostname)) return null;
    } catch {
      // Not an absolute URL: keep the event.
    }
  }
  if (event.user) event.user = event.user.id === undefined ? {} : { id: event.user.id };
  if (event.request) {
    const request = { ...event.request };
    delete request.cookies;
    delete request.query_string;
    delete request.data;
    if (request.url) request.url = stripQuery(request.url);
    if (request.headers) {
      request.headers = Object.fromEntries(Object.entries(request.headers).filter(([k]) => !SENSITIVE_HEADER.test(k)));
    }
    event.request = request;
  }
  return event;
}
