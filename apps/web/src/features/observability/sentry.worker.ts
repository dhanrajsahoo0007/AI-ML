import { DATA_COLLECTION, TRACES_SAMPLE_RATE, scrubEvent } from "./sentry-options";

// Server-side Sentry on Cloudflare Workers (plan §10.1), applied by the Worker entry (apps/web/worker.mjs) to
// OpenNext's handler. Per request: without the SENTRY_DSN secret the request goes straight to the handler and the
// SDK is never even loaded (no import, no client, no spans). With it, `withSentry` from `@sentry/nextjs/cloudflare`
// is loaded once per isolate and starts Sentry for each request; `onRequestError` in apps/web/src/instrumentation.ts
// then reports through that client (its `register` does nothing on Workers, so there is never a second client).
// A failure to load the SDK is logged once and the Worker keeps serving without it.

/** The part of the Workers ExecutionContext the handlers use. */
interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

type Method<I, R> = (input: I, env: CloudflareEnv, ctx: WorkerContext) => R;

/** The Worker handlers Sentry can instrument; the entry fills in the ones it has. */
export interface WorkerHandler {
  fetch?: Method<Request, Response | Promise<Response>>;
  queue?: Method<unknown, void | Promise<void>>;
  scheduled?: Method<unknown, void | Promise<void>>;
}

const METHODS = ["fetch", "queue", "scheduled"] as const satisfies readonly (keyof WorkerHandler)[];

type SentryCloudflare = {
  withSentry: (options: (env: CloudflareEnv) => object | undefined, handler: WorkerHandler) => WorkerHandler;
};

/** Sentry options for one request's env; the same privacy settings as the browser and `next start`. */
export function sentryWorkerOptions(env: CloudflareEnv) {
  return {
    dsn: env.SENTRY_DSN,
    release: env.SENTRY_RELEASE || undefined,
    environment: env.APP_ENV,
    dataCollection: DATA_COLLECTION,
    tracesSampleRate: TRACES_SAMPLE_RATE,
    // Transactions, not streamed spans (the Cloudflare SDK's default), so `beforeSendTransaction` runs and scrubs
    // them like on `next start`; with streaming it would be ignored.
    traceLifecycle: "static" as const,
    beforeSend: scrubEvent,
    beforeSendTransaction: scrubEvent,
  };
}

/**
 * `handler` with Sentry started per request when `env.SENTRY_DSN` is set, untouched otherwise. `load` is for tests.
 */
export function withWorkerSentry(
  handler: WorkerHandler,
  load: () => Promise<SentryCloudflare> = () =>
    import("@sentry/nextjs/cloudflare") as unknown as Promise<SentryCloudflare>
): WorkerHandler {
  let instrumented: Promise<WorkerHandler> | undefined;
  const sentry = () =>
    (instrumented ??= load().then(
      // A copy: withSentry patches the object it is given, and the DSN-less path must stay the plain handler.
      ({ withSentry }) => withSentry((env) => sentryWorkerOptions(env), { ...handler }),
      (err: unknown) => {
        console.error(JSON.stringify({ level: "error", msg: "sentry_worker_load_failed", error: String(err) }));
        return handler;
      }
    ));

  const out: WorkerHandler = {};
  for (const name of METHODS) {
    const plain = handler[name] as Method<unknown, unknown> | undefined;
    if (!plain) continue;
    const wrapped: Method<unknown, Promise<unknown>> = async (input, env, ctx) => {
      if (!env?.SENTRY_DSN) return plain.call(handler, input, env, ctx);
      const instrumentedHandler = await sentry();
      const method = (instrumentedHandler[name] ?? plain) as Method<unknown, unknown>;
      return method.call(instrumentedHandler, input, env, ctx);
    };
    (out as Record<string, unknown>)[name] = wrapped;
  }
  return out;
}
