import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import { TEST_USER_KEYS, testUserEmail } from "@/server/db/test-users";
import { safeEqual } from "./safe-equal";

// Test-login provider (plan §12.3). Google blocks automated sign-in, so e2e tests sign in as a seeded user
// through `POST /api/test/login {userKey}` with the `x-test-login-key` header. It creates a real session (same
// cookies, same session hooks, including the 3-session limit) for a user that `npm run db:seed:test` created.
//
// Registered only when authConfig().testLogin is set: APP_ENV local/test/preview/staging AND
// ENABLE_TEST_LOGIN=1 AND TEST_LOGIN_KEY. Production builds can't register it (APP_ENV is inlined at build).
// Any failure answers 404 so the endpoint can't be discovered.

export const TEST_LOGIN_HEADER = "x-test-login-key";

const bodySchema = z.strictObject({ userKey: z.enum(TEST_USER_KEYS) });

export function testLogin(options: { key: string }) {
  return {
    id: "test-login",
    endpoints: {
      testLogin: createAuthEndpoint(
        "/test/login",
        { method: "POST", body: bodySchema, requireHeaders: true },
        async (ctx) => {
          const key = ctx.headers?.get(TEST_LOGIN_HEADER) ?? "";
          if (!safeEqual(key, options.key)) throw new APIError("NOT_FOUND");
          const found = await ctx.context.internalAdapter.findUserByEmail(testUserEmail(ctx.body.userKey));
          if (!found) {
            throw new APIError("NOT_FOUND", { message: "Seed users missing: run npm run db:seed:test -w web" });
          }
          const session = await ctx.context.internalAdapter.createSession(found.user.id);
          await setSessionCookie(ctx, { session, user: found.user });
          return ctx.json({ userId: found.user.id, email: found.user.email });
        }
      ),
    },
  } satisfies BetterAuthPlugin;
}
