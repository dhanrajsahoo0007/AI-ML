import { authConfig, authFor, authRateLimit, route } from "@/features/auth";
import { clearEntitlementCookies } from "@/features/entitlements";

// Better Auth (Google sign-in, sessions, sign-out). Its own origin and CSRF checks (and its per-isolate limiter)
// run in addition to the wrapper's. Sign-in paths get the strict `auth` limit, the rest the `session` one.
// Signing out also clears the entitlement cookies (`oa_ent` and its hint), so a shared browser stops reading as Pro
// at once instead of for up to 15 minutes (plan §11.3).
const handler = route({
  rateLimit: authRateLimit,
  handler: async ({ request, db, setCookies }) => {
    const response = await authFor(request, db).handler(request);
    if (new URL(request.url).pathname === "/api/auth/sign-out" && response.ok) {
      setCookies.push(...clearEntitlementCookies(authConfig().secureCookies));
    }
    return response;
  },
});

export const GET = handler;
export const POST = handler;
