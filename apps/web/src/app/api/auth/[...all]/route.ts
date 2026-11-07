import { authFor, authRateLimit, route } from "@/features/auth";

// Better Auth (Google sign-in, sessions, sign-out). Its own origin and CSRF checks (and its per-isolate limiter)
// run in addition to the wrapper's. Sign-in paths get the strict `auth` limit, the rest the `session` one.
const handler = route({
  rateLimit: authRateLimit,
  handler: ({ request, db }) => authFor(request, db).handler(request),
});

export const GET = handler;
export const POST = handler;
