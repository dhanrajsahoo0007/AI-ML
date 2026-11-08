// Types for the Worker's vars, secrets and bindings (wrangler.jsonc), merged into the global
// `CloudflareEnv` that @opennextjs/cloudflare declares (ASSETS, NEXT_INC_CACHE_R2_BUCKET, …).
// Read them in /api/* handlers through `cloudflareBindings()` in src/server/env.ts.
//
// Kept by hand: `wrangler types` also augments NodeJS.ProcessEnv with every var as required, which
// breaks code and tests that treat APP_ENV as optional. After editing wrangler.jsonc, run
// `npm run cf-typegen -w web` and copy any new binding from .wrangler/types/cloudflare-env.d.ts here.
interface CloudflareEnv {
  /** `vars.APP_ENV` per environment (also inlined at build by next.config.ts). */
  APP_ENV?: "local" | "preview" | "staging" | "production";
  /** Secret: comma-separated section keys served as a 503 maintenance page (plan §5.1.1). */
  SECTIONS_KILL?: string;
  /** Secrets: `<kid>:<base64url key>` for the `oa_ent` cookie (plan §11.3). */
  ENTITLEMENT_SECRET?: string;
  ENTITLEMENT_SECRET_PREVIOUS?: string;
  /** Billing (plan §9.3, §9.6): secrets DODO_API_KEY, DODO_WEBHOOK_SECRET; vars BILLING_PRIMARY,
   *  DODO_ENVIRONMENT, DODO_PRODUCT_PRO_MONTHLY, DODO_PRODUCT_PRO_YEARLY. */
  DODO_API_KEY?: string;
  DODO_WEBHOOK_SECRET?: string;
  BILLING_PRIMARY?: string;
  DODO_ENVIRONMENT?: "test_mode" | "live_mode";
  DODO_PRODUCT_PRO_MONTHLY?: string;
  DODO_PRODUCT_PRO_YEARLY?: string;
  /** Var: the public origin; production redirects other hosts to it (src/server/edge/host-guard.ts). */
  BETTER_AUTH_URL?: string;
  /** Secret: lets the deploy smoke tests reach production on workers.dev (src/server/edge/host-guard.ts). */
  SMOKE_KEY?: string;
  /** Workers Rate Limiting, one per named limit (src/server/rate-limit.ts, wrangler.jsonc `ratelimits`). */
  RL_AUTH?: WorkersRateLimitBinding;
  RL_SESSION?: WorkersRateLimitBinding;
  RL_ACCOUNT?: WorkersRateLimitBinding;
  RL_PROGRESS?: WorkersRateLimitBinding;
  RL_CHECKOUT?: WorkersRateLimitBinding;
  RL_PORTAL?: WorkersRateLimitBinding;
  RL_ENTITLEMENTS?: WorkersRateLimitBinding;
  RL_TEST?: WorkersRateLimitBinding;
  RL_SIGNUP?: WorkersRateLimitBinding;
  RL_SIGNUP_EMAIL?: WorkersRateLimitBinding;
  RL_EMAIL_LINK?: WorkersRateLimitBinding;
  RL_CSP?: WorkersRateLimitBinding;
  RL_VITALS?: WorkersRateLimitBinding;
  /** Secret: Resend API key; the email queue consumer reads it from the Worker env (src/features/email/). */
  RESEND_API_KEY?: string;
  /** Queue producer for transactional email (src/features/email/queue.ts, wrangler.jsonc `queues`). Absent until
   *  the TODO(account) queues block is uncommented; enqueueEmail() then sends inline. Optional on purpose. */
  EMAIL_QUEUE?: Queue;
  /** Secret: server-side Sentry on the Worker (src/features/observability/sentry.worker.ts); off when unset. */
  SENTRY_DSN?: string;
  SENTRY_RELEASE?: string;
  /** Hyperdrive in front of Neon (src/server/db/client.ts); absent until the account exists (wrangler.jsonc TODO). */
  HYPERDRIVE?: HyperdriveBinding;
  /** Analytics Engine dataset (src/server/edge/analytics.ts); absent until the account exists (wrangler.jsonc TODO). */
  ANALYTICS?: AnalyticsEngineBinding;
  // TODO(account): uncomment with the bindings in wrangler.jsonc.
  // MEDIA_PUBLIC: R2Bucket;
  // MEDIA_PRIVATE: R2Bucket;
}

/** The Workers Rate Limiting binding's runtime API (`ratelimits` in wrangler.jsonc). */
interface WorkersRateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

// Cloudflare Queues and handler-context runtime types: the subset this app uses, copied from
// @cloudflare/workers-types (not a dependency; cf-typegen runs with --include-runtime=false). Delete this block if
// the runtime types are added, since these declarations merge with theirs.
interface Queue<Body = unknown> {
  send(message: Body, options?: QueueSendOptions): Promise<void>;
}
interface QueueSendOptions {
  contentType?: "text" | "bytes" | "json" | "v8";
  delaySeconds?: number;
}
interface QueueRetryOptions {
  delaySeconds?: number;
}
interface Message<Body = unknown> {
  readonly id: string;
  readonly timestamp: Date;
  readonly body: Body;
  readonly attempts: number;
  retry(options?: QueueRetryOptions): void;
  ack(): void;
}
interface MessageBatch<Body = unknown> {
  readonly queue: string;
  readonly messages: readonly Message<Body>[];
  retryAll(options?: QueueRetryOptions): void;
  ackAll(): void;
}
interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

/** The Hyperdrive binding's runtime API (`hyperdrive` in wrangler.jsonc): only the part we read. */
interface HyperdriveBinding {
  /** `postgresql://user:password@<id>.hyperdrive.local:5432/<db>`; Hyperdrive itself reaches Neon over TLS. */
  readonly connectionString: string;
}

/** The Analytics Engine binding's runtime API (`analytics_engine_datasets` in wrangler.jsonc). */
interface AnalyticsEngineBinding {
  /** Non-blocking: queues the point and returns at once; the runtime sends it after the response. */
  writeDataPoint(point?: { indexes?: string[]; blobs?: (string | null)[]; doubles?: number[] }): void;
}
