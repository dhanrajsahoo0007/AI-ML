// The browser-side observability switches (plan §10). Each tool is off until its variable is set at build time;
// none of them is required (AGENTS.md rule 1: the build needs no environment variables).
//
// Loaded by next.config.ts (through features/seo/security-headers.ts), so relative imports only.

/** Every NEXT_PUBLIC_* variable the observability and analytics code reads. Names only, never values. */
export const PUBLIC_OBSERVABILITY_ENV = [
  /** Sentry browser DSN. Unset: no Sentry code is shipped. */
  "NEXT_PUBLIC_SENTRY_DSN",
  /** Release name for Sentry (the git SHA, set by the deploy workflow). */
  "NEXT_PUBLIC_GIT_SHA",
  /** PostHog project key. Unset: no PostHog code is shipped. */
  "NEXT_PUBLIC_POSTHOG_KEY",
  /** PostHog API host; defaults to the US cloud. Set to our own `/ingest` proxy later (plan §11.4). */
  "NEXT_PUBLIC_POSTHOG_HOST",
  /** Cloudflare Web Analytics site token. Unset: no beacon script tag. */
  "NEXT_PUBLIC_CF_BEACON_TOKEN",
] as const;

type PublicObservabilityEnvName = (typeof PUBLIC_OBSERVABILITY_ENV)[number];
export type PublicObservabilityEnv = Partial<Record<PublicObservabilityEnvName, string>>;

export const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

/**
 * Gives every unset variable above the value `""` in this (build) process.
 *
 * Why: Next inlines `process.env.NEXT_PUBLIC_X` into client code only when X is defined. An undefined one stays a
 * runtime lookup, so `if (process.env.NEXT_PUBLIC_SENTRY_DSN) import("…")` would still make webpack emit the Sentry
 * chunk. Defined as `""`, the condition is a constant, the branch is dead, and no Sentry or PostHog chunk is built.
 * A value from the environment or an `.env` file is never overwritten.
 *
 * Runs when next.config.ts loads security-headers.ts, before Next reads the environment for inlining. Replace with
 * `env` entries in next.config.ts when that file can be changed (see the stream M report).
 */
export function pinPublicObservabilityEnv(env: Record<string, string | undefined> = process.env): void {
  for (const name of PUBLIC_OBSERVABILITY_ENV) env[name] ??= "";
}
