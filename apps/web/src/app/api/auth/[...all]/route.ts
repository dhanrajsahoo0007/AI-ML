import { authFor, route } from "@/features/auth";

// Better Auth (Google sign-in, sessions, sign-out). Its own origin and CSRF checks run in addition to the
// wrapper's.
const handler = route({
  rateLimit: { name: "auth", by: "ip" },
  handler: ({ request, db }) => authFor(request, db).handler(request),
});

export const GET = handler;
export const POST = handler;
