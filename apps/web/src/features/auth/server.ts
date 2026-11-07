import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import type { Db } from "@/server/db/client";
import { recordConsentOnce } from "@/server/db/consent";
import { account, session, user, verification } from "@/server/db/schema";
import { uuidv7 } from "@/server/db/uuid";
import { cloudflareBindings } from "@/server/env";
import { AGE_TEXT_VERSION, ageCookieName, requestCountry } from "./age-consent";
import { authConfig, type AuthConfig } from "./config";
import { enforceSessionLimit } from "./sessions";
import { testLogin } from "./test-login";

// Better Auth (plan §8.3, §11.2). Built per request around that request's database handle (Workers can't
// share a pool between requests). Google is the only way in; there are no passwords.

const DAY = 60 * 60 * 24;

/**
 * Better Auth's limiter keys by the client IP. On Cloudflare `cf-connecting-ip` is set by the edge and can't be
 * spoofed; elsewhere (`next start`, tests) there is no trusted IP and every request would share one bucket, so
 * it is on only where the Worker runs, unless a caller (a test) says otherwise.
 */
const onCloudflare = () => cloudflareBindings() !== null;

export function createAuth(db: Db, config: AuthConfig = authConfig(), options: { rateLimit?: boolean } = {}) {
  return betterAuth({
    appName: "Origins AI Learn",
    baseURL: config.baseURL,
    basePath: "/api/auth",
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    database: drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification } }),

    socialProviders: config.google
      ? {
          google: {
            clientId: config.google.clientId,
            clientSecret: config.google.clientSecret,
            // Exactly these scopes (plan §11.2); PKCE and `state` are Better Auth defaults.
            disableDefaultScope: true,
            scope: ["openid", "email", "profile"],
            accessType: "online",
            prompt: "select_account",
            includeGrantedScopes: false,
          },
        }
      : {},

    user: {
      additionalFields: {
        // Never settable from a request; admins are promoted in the database.
        role: { type: "string", required: false, defaultValue: "user", input: false },
      },
      // Google must vouch for the email address (`email_verified`), on sign-up and on every sign-in.
      validateUserInfo: ({ source }) => {
        if (source.method !== "oauth") return;
        if (source.oauth?.profile?.email_verified !== true) {
          return { error: "email_not_verified", errorDescription: "Your Google email address isn't verified" };
        }
      },
    },

    session: {
      expiresIn: 30 * DAY,
      updateAge: DAY,
      // Re-auth window for Better Auth's own sensitive endpoints; ours check it in features/account.
      freshAge: 10 * 60,
      // Encrypted (JWE), not just signed: the cached session carries the name, email and role (security review L2).
      cookieCache: { enabled: true, maxAge: 5 * 60, strategy: "jwe" },
    },

    account: {
      encryptOAuthTokens: true,
      accountLinking: { enabled: true, trustedProviders: ["google"] },
    },

    // Endpoints we don't offer: account changes go through our own routes (features/account). Session listing and
    // revocation ("sign out everywhere" is /api/account/sessions) and the Google token endpoints are off too, so
    // no script on the page can read session tokens or OAuth tokens (security review L1).
    disabledPaths: [
      "/update-user",
      "/change-email",
      "/delete-user",
      "/link-social",
      "/unlink-account",
      "/list-sessions",
      "/revoke-session",
      "/revoke-sessions",
      "/revoke-other-sessions",
      "/get-access-token",
      "/refresh-token",
      "/account-info",
      "/list-accounts",
    ],

    advanced: {
      useSecureCookies: config.secureCookies,
      // Better Auth skips its origin and callbackURL checks when NODE_ENV=test; we want them in every run.
      disableOriginCheck: false,
      cookiePrefix: "oa",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
      database: { generateId: () => uuidv7() },
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },

    // The main limits are the route() wrapper's (the Workers Rate Limiting binding, plan §11.6) and Cloudflare
    // zone rules. Better Auth's in-memory limiter is per isolate, so it is only a second layer here.
    rateLimit: {
      enabled: options.rateLimit ?? onCloudflare(),
      storage: "memory",
      window: 60,
      max: 120,
      customRules: {
        "/sign-in/*": { window: 60, max: 10 },
        "/callback/*": { window: 60, max: 10 },
      },
    },
    telemetry: { enabled: false },

    databaseHooks: {
      session: {
        create: {
          after: async (created, ctx) => {
            await enforceSessionLimit(db, created.userId);
            // Record the age confirmation the user ticked on /sign-in (cookie set by /api/account/consent).
            const confirmed = ctx?.getCookie(ageCookieName(config.secureCookies)) === AGE_TEXT_VERSION;
            if (confirmed) {
              await recordConsentOnce(db, {
                userId: created.userId,
                kind: "age_confirmation",
                textVersion: AGE_TEXT_VERSION,
                country: requestCountry(ctx?.headers),
              });
            }
          },
        },
      },
    },

    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        // The age / parental-consent box is required before anyone is sent to Google (plan §8.3).
        if (ctx.path === "/sign-in/social" && ctx.getCookie(ageCookieName(config.secureCookies)) !== AGE_TEXT_VERSION) {
          throw new APIError("FORBIDDEN", {
            code: "AGE_CONFIRMATION_REQUIRED",
            message: "Confirm your age (or your parent's permission) before signing in",
          });
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        // Rotate on sign-in: a new session always gets a new token; also revoke the session this browser
        // had before, so a planted (fixated) session can't survive a sign-in.
        const fresh = ctx.context.newSession;
        if (!fresh) return;
        const previous = await ctx.getSignedCookie(ctx.context.authCookies.sessionToken.name, ctx.context.secret);
        if (previous && previous !== fresh.session.token) {
          await ctx.context.internalAdapter.deleteSession(previous);
        }
      }),
    },

    plugins: config.testLogin ? [testLogin(config.testLogin)] : [],
  });
}

export type Auth = ReturnType<typeof createAuth>;
