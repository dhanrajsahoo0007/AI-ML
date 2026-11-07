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
  /** Workers Rate Limiting, one per named limit (src/server/rate-limit.ts, wrangler.jsonc `ratelimits`). */
  RL_AUTH?: WorkersRateLimitBinding;
  RL_SESSION?: WorkersRateLimitBinding;
  RL_ACCOUNT?: WorkersRateLimitBinding;
  RL_PROGRESS?: WorkersRateLimitBinding;
  RL_CHECKOUT?: WorkersRateLimitBinding;
  RL_PORTAL?: WorkersRateLimitBinding;
  RL_ENTITLEMENTS?: WorkersRateLimitBinding;
  RL_TEST?: WorkersRateLimitBinding;
  RL_NEWSLETTER?: WorkersRateLimitBinding;
  RL_NEWSLETTER_EMAIL?: WorkersRateLimitBinding;
  RL_NEWSLETTER_TOKEN?: WorkersRateLimitBinding;
  RL_CSP?: WorkersRateLimitBinding;
  RL_VITALS?: WorkersRateLimitBinding;
  // TODO(account): uncomment with the bindings in wrangler.jsonc.
  // MEDIA_PUBLIC: R2Bucket;
  // MEDIA_PRIVATE: R2Bucket;
  // HYPERDRIVE: Hyperdrive;
  // ANALYTICS: AnalyticsEngineDataset;
}

/** The Workers Rate Limiting binding's runtime API (`ratelimits` in wrangler.jsonc). */
interface WorkersRateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}
