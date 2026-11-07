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

export const serverEnvSchema = edgeEnvSchema.extend({
  // Phase 4+ (names only; values come from `wrangler secret put` / GitHub environment secrets):
  // BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, DODO_API_KEY, DODO_WEBHOOK_SECRET,
  // SENTRY_DSN. Add each here as it is introduced.
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function serverEnv(): ServerEnv {
  return serverEnvSchema.parse({
    APP_ENV: process.env.APP_ENV,
    NEXT_PUBLIC_GIT_SHA: process.env.NEXT_PUBLIC_GIT_SHA,
    SECTIONS_KILL: process.env.SECTIONS_KILL,
    ENTITLEMENT_SECRET: process.env.ENTITLEMENT_SECRET,
    ENTITLEMENT_SECRET_PREVIOUS: process.env.ENTITLEMENT_SECRET_PREVIOUS,
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
