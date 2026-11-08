import { z } from "zod";
import { authConfig, authFor, isFreshSession, route } from "@/features/auth";
import { clearEntitlementCookies } from "@/features/entitlements";
import { deleteAccount, LiveSubscriptionError } from "@/features/account";
import { HttpError } from "@/server/http";
// Registers the provider-backed canceller (features/billing/register.ts, loaded by the billing index): live
// subscriptions are cancelled at the provider first.
import "@/features/billing";

// Deletes the signed-in user's account and everything linked to it. Needs a sign-in within the last 10
// minutes and the typed confirmation.
export const POST = route({
  auth: "user",
  body: z.object({ confirm: z.literal("DELETE") }),
  rateLimit: { name: "account", by: "user" },
  handler: async ({ auth, request, db, setCookies }) => {
    if (!isFreshSession(auth.session.createdAt)) {
      throw new HttpError(403, "reauth_required", "Sign in again to delete your account");
    }
    try {
      // Sessions, accounts, progress and the rest cascade.
      await deleteAccount(db(), auth.user.id);
    } catch (err) {
      if (err instanceof LiveSubscriptionError) throw new HttpError(409, "live_subscription", err.message);
      throw err;
    }
    // Clear this browser's auth cookies (Better Auth's sign-out; the session row is already gone).
    const { headers } = await authFor(request, db).api.signOut({ headers: request.headers, returnHeaders: true });
    setCookies.push(...headers.getSetCookie(), ...clearEntitlementCookies(authConfig().secureCookies));
    return { deleted: true };
  },
});
