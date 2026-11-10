import { authConfig, route } from "@/features/auth";
import { refreshEntitlementCookie } from "@/features/entitlements";
import { serverEnv } from "@/server/env";

// Re-issues the `tts_ent` entitlement cookie from the database (plan §9.2, §11.3). Called after sign-in, after
// checkout success and by the client islands shortly before the cookie expires. Signed-out callers get 401 and
// both entitlement cookies cleared. One small read through Hyperdrive per active reader every ~13 minutes.
export const POST = route({
  auth: "optional",
  rateLimit: { name: "entitlements", by: "user" },
  handler: async ({ request, db, auth, requestId, setCookies }) => {
    const result = await refreshEntitlementCookie({
      request,
      db: db(),
      user: auth ? { id: auth.user.id, role: auth.user.role } : null,
      env: serverEnv(),
      secure: authConfig().secureCookies,
    });
    setCookies.push(...result.setCookies);
    if (result.ok) return result.body;
    const { status, code, message } = result.error;
    return Response.json({ error: { code, message }, requestId }, { status });
  },
});
