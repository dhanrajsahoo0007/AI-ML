import { z } from "zod";

// Variables the edge (middleware) reads, validated with zod (AGENTS.md rule 8). Edge-safe: no Node
// APIs. On Cloudflare, OpenNext copies the Worker's vars and secrets into process.env per request;
// under `next start` they come from the shell.
//
// Names only (values are never committed):
//   ENTITLEMENT_SECRET           secret  `<kid>:<base64url 256-bit key>`, signs and verifies `oa_ent`
//   ENTITLEMENT_SECRET_PREVIOUS  secret  the previous key, verify-only during rotation (plan §11.3)
//   SECTIONS_KILL                secret  comma-separated section keys → 503 maintenance (plan §5.1.1);
//                                        `wrangler secret put SECTIONS_KILL --env production` takes
//                                        effect without a rebuild, `wrangler secret delete` undoes it
//   NEXT_PUBLIC_GIT_SHA          build   commit SHA, inlined by Next.js at build (set by deploy.yml)
//   APP_ENV                      build   inlined by next.config.ts (section states are per build)

const optional = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

export const edgeEnvSchema = z.object({
  APP_ENV: z.enum(["local", "preview", "staging", "production"]).catch("local"),
  NEXT_PUBLIC_GIT_SHA: z
    .string()
    .regex(/^[0-9a-f]{7,40}$/)
    .optional()
    .catch(undefined),
  SECTIONS_KILL: optional,
  ENTITLEMENT_SECRET: optional,
  ENTITLEMENT_SECRET_PREVIOUS: optional,
});

export type EdgeEnv = z.infer<typeof edgeEnvSchema>;

/**
 * Reads the edge env. Each variable is named literally so Next.js can inline the build-time ones
 * (NEXT_PUBLIC_*, and APP_ENV from next.config.ts `env`).
 */
export function readEdgeEnv(): EdgeEnv {
  return edgeEnvSchema.parse({
    APP_ENV: process.env.APP_ENV,
    NEXT_PUBLIC_GIT_SHA: process.env.NEXT_PUBLIC_GIT_SHA,
    SECTIONS_KILL: process.env.SECTIONS_KILL,
    ENTITLEMENT_SECRET: process.env.ENTITLEMENT_SECRET,
    ENTITLEMENT_SECRET_PREVIOUS: process.env.ENTITLEMENT_SECRET_PREVIOUS,
  });
}

/** The deployed version: the commit SHA, or "dev" for local builds without one. */
export function appVersion(env: Pick<EdgeEnv, "NEXT_PUBLIC_GIT_SHA"> = readEdgeEnv()): string {
  return env.NEXT_PUBLIC_GIT_SHA ?? "dev";
}
