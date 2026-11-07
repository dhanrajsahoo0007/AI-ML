import { authConfig, authFor, revokeAllSessions, route } from "@/features/auth";
import { clearEntitlementCookies } from "@/features/entitlements/cookies";

// "Sign out everywhere": revokes every session of the user, including this one.
export const DELETE = route({
  auth: "user",
  rateLimit: { name: "account", by: "user" },
  handler: async ({ auth, request, db, setCookies }) => {
    const revoked = await revokeAllSessions(db(), auth.user.id);
    // Clears this browser's auth cookies (the session row is already gone).
    const { headers } = await authFor(request, db).api.signOut({ headers: request.headers, returnHeaders: true });
    setCookies.push(...headers.getSetCookie(), ...clearEntitlementCookies(authConfig().secureCookies));
    return { revoked };
  },
});
