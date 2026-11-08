import { z } from "zod";
import { authConfig, authFor, route, TEST_LOGIN_HEADER, TEST_USER_KEYS } from "@/features/auth";
import { notFound, notFoundRoute } from "@/server/http";

// Local test accounts for the sign-in page, `next dev` only (APP_ENV=local, inlined at build, so every deployed
// build exports the plain 404). The browser never holds TEST_LOGIN_KEY: this route adds it on the server and
// forwards to the test-login provider (plan §12.3), which sets the real session cookies for a seeded user.
export const POST =
  process.env.APP_ENV !== "local"
    ? notFoundRoute
    : route({
        rateLimit: { name: "test", by: "ip" },
        body: z.object({ userKey: z.enum(TEST_USER_KEYS) }),
        handler: async ({ request, body, db }) => {
          const testLogin = authConfig().testLogin;
          if (!testLogin) throw notFound();
          const headers = new Headers({ "content-type": "application/json", [TEST_LOGIN_HEADER]: testLogin.key });
          const origin = request.headers.get("origin");
          if (origin) headers.set("origin", origin);
          const forwarded = new Request(new URL("/api/auth/test/login", request.url), {
            method: "POST",
            headers,
            body: JSON.stringify({ userKey: body.userKey }),
          });
          return authFor(request, db).handler(forwarded);
        },
      });
