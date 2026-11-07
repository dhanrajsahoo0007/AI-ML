import { authConfig, authFor, route } from "@/features/auth";
import { notFound } from "@/server/http";

// Test-login provider (plan §12.3), non-production only: POST {userKey} with the x-test-login-key header
// creates a real session for a seeded user. Production builds inline APP_ENV, so the body below is dead code
// there and every request is a 404 (asserted by tests/e2e/auth.spec.ts).
export const POST = route({
  rateLimit: { name: "test", by: "ip" },
  handler: async ({ request, db }) => {
    if (process.env.APP_ENV === "production") throw notFound();
    if (!authConfig().testLogin) throw notFound();
    // Forward to the Better Auth plugin endpoint, which checks the key and sets the session cookies.
    const forwarded = new Request(new URL("/api/auth/test/login", request.url), {
      method: "POST",
      headers: request.headers,
      body: await request.text(),
    });
    return authFor(request, db).handler(forwarded);
  },
});
