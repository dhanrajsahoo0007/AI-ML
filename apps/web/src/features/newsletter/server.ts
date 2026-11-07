import "server-only";
import { z } from "zod";
import { SITE_URL } from "../../config/business";
import { DevEmailSender } from "../email/dev-sender";
import { ResendEmailSender } from "../email/resend-sender";
import type { EmailSender } from "../email/sender";
import { publicNav, SUBSCRIBE_KIND as NEWSLETTER_KIND } from "../sections/public";
import { APP_ENVS, type AppEnv } from "../sections/schema";
import { MemoryRateLimiter, type RateLimiter } from "./rate-limit";
import type { NewsletterDeps } from "./service";
import { MemoryNewsletterStore, type NewsletterStore } from "./store";

// Wires the newsletter ports for the API routes. No accounts exist yet, so:
//   store    in-memory (MemoryNewsletterStore) until the data layer provides a Neon-backed NewsletterStore
//   sender   Resend when RESEND_API_KEY is set, otherwise the dev sender (logs + .eml outbox) outside production
//   limiter  in-memory until the route() wrapper brings the Workers Rate Limiting binding
//   secret   NEWSLETTER_TOKEN_SECRET; a fixed dev secret is allowed only when APP_ENV=local
//
// Nothing here runs during a page render: only app/api/newsletter/** imports it.

export class NotConfiguredError extends Error {}

/** Site path of the API routes (app/api/newsletter). */
export const API_BASE = "/api/newsletter";

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

export function newsletterDeps(href: string): NewsletterDeps {
  const { store, limiter } = processPorts();
  return {
    store,
    limiter,
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
