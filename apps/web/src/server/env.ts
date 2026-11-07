import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import { edgeEnvSchema } from "./edge/env";

// Server env for /api/* route handlers and server actions (plan §3, §7.2). Middleware uses
// ./edge/env.ts instead and must not import this file.
//
// Two sources:
// - variables and secrets (strings): validated with zod, read from process.env (OpenNext copies the
//   Worker's vars and secrets into it; `next start` gets them from the shell)
// - bindings (R2, Hyperdrive, Rate Limiting, Analytics Engine): only on Cloudflare, typed by
//   `CloudflareEnv` in cloudflare-env.d.ts (`npm run cf-typegen -w web` after editing wrangler.jsonc)
//
// The build never needs any of these (AGENTS.md rule 1): read them inside handlers, not at module load.

const optional = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

const serverEnvSchema = edgeEnvSchema.extend({
  // Billing (plan §9.3, §9.6). Names only; values come from `wrangler secret put` / GitHub environment secrets.
  //   BILLING_PRIMARY            var     provider for new checkouts (`dodo`; the standby is added later)
  //   DODO_API_KEY               secret  (in edgeEnvSchema) Dodo Payments API key
  //   DODO_WEBHOOK_SECRET        secret  `whsec_…` Standard Webhooks signing secret of the Dodo webhook endpoint
  //   DODO_ENVIRONMENT           var     `test_mode` (default) or `live_mode`: picks the API host
  //   DODO_API_BASE_URL          var     overrides the API host (local stub servers in tests only)
  //   DODO_PRODUCT_PRO_MONTHLY   var     Dodo product ID of the monthly plan
  //   DODO_PRODUCT_PRO_YEARLY    var     Dodo product ID of the yearly plan
  BILLING_PRIMARY: z.enum(["dodo"]).catch("dodo"),
  DODO_WEBHOOK_SECRET: optional,
  DODO_ENVIRONMENT: z.enum(["test_mode", "live_mode"]).catch("test_mode"),
  DODO_API_BASE_URL: z.url({ protocol: /^https?$/ }).optional().catch(undefined),
  DODO_PRODUCT_PRO_MONTHLY: optional,
  DODO_PRODUCT_PRO_YEARLY: optional,
  // Phase 4+ (names only): BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SENTRY_DSN.
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function serverEnv(): ServerEnv {
  return serverEnvSchema.parse({
    APP_ENV: process.env.APP_ENV,
    NEXT_PUBLIC_GIT_SHA: process.env.NEXT_PUBLIC_GIT_SHA,
    SECTIONS_KILL: process.env.SECTIONS_KILL,
    ENTITLEMENT_SECRET: process.env.ENTITLEMENT_SECRET,
    ENTITLEMENT_SECRET_PREVIOUS: process.env.ENTITLEMENT_SECRET_PREVIOUS,
    DODO_API_KEY: process.env.DODO_API_KEY,
    BILLING_PRIMARY: process.env.BILLING_PRIMARY,
    DODO_WEBHOOK_SECRET: process.env.DODO_WEBHOOK_SECRET,
    DODO_ENVIRONMENT: process.env.DODO_ENVIRONMENT,
    DODO_API_BASE_URL: process.env.DODO_API_BASE_URL || undefined,
    DODO_PRODUCT_PRO_MONTHLY: process.env.DODO_PRODUCT_PRO_MONTHLY,
    DODO_PRODUCT_PRO_YEARLY: process.env.DODO_PRODUCT_PRO_YEARLY,
  });
}

/**
 * The Worker's bindings for the current request, or null outside Cloudflare (`next dev` without
 * `initOpenNextCloudflareForDev()`, `next start`, unit tests). Callers must handle null.
 */
export function cloudflareBindings(): CloudflareEnv | null {
  try {
    return getCloudflareContext().env;
  } catch {
    return null;
  }
}
