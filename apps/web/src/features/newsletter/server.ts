import "server-only";
import { z } from "zod";
import { SITE_URL } from "../../config/business";
import { DevEmailSender } from "../email/dev-sender";
import { ResendEmailSender } from "../email/resend-sender";
import type { EmailSender } from "../email/sender";
import { publicNav, SUBSCRIBE_KIND as NEWSLETTER_KIND } from "../sections/public";
import { APP_ENVS, type AppEnv } from "../sections/schema";
import type { Db } from "@/server/db/client";
import { databaseUrl } from "@/server/db/config";
import { MemoryRateLimiter, type RateLimiter } from "./rate-limit";
import type { NewsletterDeps } from "./service";
import { MemoryNewsletterStore, type NewsletterStore } from "./store";
import { PostgresNewsletterStore } from "./store-postgres";
import { turnstileFromEnv } from "./turnstile";

// Wires the newsletter ports for the API routes and the email-preferences page:
//   store    Postgres (PostgresNewsletterStore) whenever a database is configured (DATABASE_URL or the
//            Hyperdrive binding); otherwise in-memory, per process (local runs without Docker, unit tests)
//   sender   Resend when RESEND_API_KEY is set, otherwise the dev sender (logs + .eml outbox) outside production
//   limiter  in-memory until the route() wrapper brings the Workers Rate Limiting binding
//   captcha  Turnstile when TURNSTILE_SECRET_KEY is set, otherwise none
//   secret   NEWSLETTER_TOKEN_SECRET; a fixed dev secret is allowed only when APP_ENV=local
//
// Nothing here runs during a content page render: only app/api/** and the account pages import it.

export class NotConfiguredError extends Error {}

/** Site path of the API routes (app/api/newsletter). */
const API_BASE = "/api/newsletter";

/**
 * The environment this build was made for. next.config.ts inlines APP_ENV into the server bundles; the registry
 * (which reads YAML from disk) is not imported here, so the API routes carry no file-system code.
 */
function currentAppEnv(): AppEnv {
  const env = process.env.APP_ENV;
  return (APP_ENVS as readonly string[]).includes(env ?? "") ? (env as AppEnv) : "production";
}

const DEV_SECRET = "local-dev-only-newsletter-token-secret-0000";

const envSchema = z.object({
  NEWSLETTER_TOKEN_SECRET: z.string().min(32, "NEWSLETTER_TOKEN_SECRET must be at least 32 characters").optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_WEBHOOK_SECRET: z.string().startsWith("whsec_", "RESEND_WEBHOOK_SECRET must start with whsec_").optional(),
});

/** The section's href when it is `on` in this build (next.config.ts inlines the public nav), else null. */
export function newsletterHref(): string | null {
  return publicNav().find((l) => l.kind === NEWSLETTER_KIND)?.href ?? null;
}

export function tokenSecret(env: NodeJS.ProcessEnv = process.env, appEnv = currentAppEnv()): string {
  const parsed = envSchema.parse({ NEWSLETTER_TOKEN_SECRET: env.NEWSLETTER_TOKEN_SECRET || undefined });
  if (parsed.NEWSLETTER_TOKEN_SECRET) return parsed.NEWSLETTER_TOKEN_SECRET;
  if (appEnv === "local") return DEV_SECRET;
  throw new NotConfiguredError(`NEWSLETTER_TOKEN_SECRET is not set (APP_ENV=${appEnv})`);
}

/** The signing secret of the Resend webhook endpoint (`whsec_…`, from the Resend dashboard). */
export function resendWebhookSecret(env: NodeJS.ProcessEnv = process.env): string {
  const parsed = envSchema.parse({ RESEND_WEBHOOK_SECRET: env.RESEND_WEBHOOK_SECRET || undefined });
  if (!parsed.RESEND_WEBHOOK_SECRET) throw new NotConfiguredError("RESEND_WEBHOOK_SECRET is not set");
  return parsed.RESEND_WEBHOOK_SECRET;
}

export function emailSender(env: NodeJS.ProcessEnv = process.env, appEnv = currentAppEnv()): EmailSender {
  const parsed = envSchema.parse({ RESEND_API_KEY: env.RESEND_API_KEY || undefined });
  if (parsed.RESEND_API_KEY) return new ResendEmailSender(parsed.RESEND_API_KEY);
  if (appEnv === "production") throw new NotConfiguredError("RESEND_API_KEY is not set in production");
  return new DevEmailSender();
}

// One store and limiter per process. Kept on globalThis because Next can load a module once per route bundle.
const globalPorts = globalThis as typeof globalThis & {
  __newsletterPorts?: { store: NewsletterStore; limiter: RateLimiter };
};

function processPorts() {
  globalPorts.__newsletterPorts ??= { store: new MemoryNewsletterStore(), limiter: new MemoryRateLimiter() };
  return globalPorts.__newsletterPorts;
}

/** True when this request can reach a database. */
export function hasDatabase(): boolean {
  try {
    databaseUrl();
    return true;
  } catch {
    return false;
  }
}

/** The subscriber store: Postgres over the request's handle when a database is configured, else in-memory. */
export function newsletterStore(db?: () => Db): NewsletterStore {
  return db && hasDatabase() ? new PostgresNewsletterStore(db()) : processPorts().store;
}

export function newsletterDeps(href: string, db?: () => Db): NewsletterDeps {
  const { limiter } = processPorts();
  return {
    store: newsletterStore(db),
    limiter,
    captcha: turnstileFromEnv(),
    // Built on first use, so unsubscribing works even where no sender is configured.
    get sender() {
      return emailSender();
    },
    secret: tokenSecret(),
    links: ({ confirm, unsubscribe }) => {
      const page = (p: string, token: string) => `${SITE_URL}${href}/${p}?token=${encodeURIComponent(token)}`;
      return {
        confirmUrl: page("confirm", confirm),
        unsubscribeUrl: page("unsubscribe", unsubscribe),
        oneClickUrl: `${SITE_URL}${API_BASE}/unsubscribe?token=${encodeURIComponent(unsubscribe)}`,
        archiveUrl: `${SITE_URL}${href}`,
      };
    },
  };
}
