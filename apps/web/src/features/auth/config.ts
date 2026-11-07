import { z } from "zod";
import { readAppEnv, type AppEnv } from "@/server/db/config";

// Auth configuration from the environment, validated with zod. Read per request (Workers vars arrive through
// OpenNext's `process.env`), never at module load, so `next build` needs no env vars. Stream G's
// `server/env.ts` replaces the raw `process.env` reads at integration.
//
//   BETTER_AUTH_SECRET    ≥ 32 chars; signs session cookies. Required in preview, staging, production.
//   BETTER_AUTH_URL       Public origin, e.g. https://example.com. Required in preview, staging, production.
//   TRUSTED_ORIGINS       Extra allowed origins, comma separated; `*` matches one host label
//                         (e.g. https://*-origins.example.workers.dev for previews).
//   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET   Google sign-in; when either is missing Google is disabled.
//   ENABLE_TEST_LOGIN=1 + TEST_LOGIN_KEY      Test-login provider (plan §12.3); never in production.

const LOCAL_ENVS: ReadonlySet<AppEnv> = new Set(["local", "test"]);
const TEST_LOGIN_ENVS: ReadonlySet<AppEnv> = new Set(["local", "test", "preview", "staging"]);

/** Only for local and test runs without a secret; anything deployed must set BETTER_AUTH_SECRET. */
const LOCAL_DEV_SECRET = "local-dev-only-secret-never-used-when-deployed-000";

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : undefined));

const envSchema = z.object({
  BETTER_AUTH_SECRET: optionalString.pipe(z.string().min(32, "must be at least 32 characters").optional()),
  BETTER_AUTH_URL: optionalString.pipe(z.url({ protocol: /^https?$/ }).optional()),
  TRUSTED_ORIGINS: optionalString,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  ENABLE_TEST_LOGIN: optionalString,
  TEST_LOGIN_KEY: optionalString.pipe(z.string().min(16, "must be at least 16 characters").optional()),
});

export interface AuthConfig {
  appEnv: AppEnv;
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  secureCookies: boolean;
  google: { clientId: string; clientSecret: string } | null;
  testLogin: { key: string } | null;
}

export class AuthConfigError extends Error {
  override name = "AuthConfigError";
}

type EnvLike = Record<string, string | undefined>;

export function authConfig(env: EnvLike = process.env, appEnv: AppEnv = readAppEnv()): AuthConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new AuthConfigError(`Invalid auth configuration: ${problems}`);
  }
  const e = parsed.data;
  const local = LOCAL_ENVS.has(appEnv);

  if (!local && !e.BETTER_AUTH_SECRET)
    throw new AuthConfigError(`BETTER_AUTH_SECRET is required for APP_ENV=${appEnv}`);
  if (!local && !e.BETTER_AUTH_URL) throw new AuthConfigError(`BETTER_AUTH_URL is required for APP_ENV=${appEnv}`);

  const base = new URL(e.BETTER_AUTH_URL ?? "http://localhost:3001");
  if (appEnv === "production" && base.protocol !== "https:") {
    throw new AuthConfigError("BETTER_AUTH_URL must be https in production");
  }

  const extra = (e.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  const testLogin =
    TEST_LOGIN_ENVS.has(appEnv) && e.ENABLE_TEST_LOGIN === "1" && e.TEST_LOGIN_KEY ? { key: e.TEST_LOGIN_KEY } : null;

  return {
    appEnv,
    secret: e.BETTER_AUTH_SECRET ?? LOCAL_DEV_SECRET,
    baseURL: base.origin,
    trustedOrigins: [...new Set([base.origin, ...extra])],
    // Secure cookies everywhere except plain-http local and test runs (browsers drop `Secure` cookies there).
    secureCookies: !local || base.protocol === "https:",
    google:
      e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET
        ? { clientId: e.GOOGLE_CLIENT_ID, clientSecret: e.GOOGLE_CLIENT_SECRET }
        : null,
    testLogin,
  };
}

/** For pages: whether "Continue with Google" can work. Never throws. */
export function isGoogleConfigured(env: EnvLike = process.env): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID?.trim() && env.GOOGLE_CLIENT_SECRET?.trim());
}
