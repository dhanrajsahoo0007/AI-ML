import { isFreshSession, route } from "@/features/auth";
import { exportUserData } from "@/features/account";
import { HttpError } from "@/server/http";

// "Export my data": the signed-in user's own rows as JSON. Needs a sign-in within the last 10 minutes.
export const GET = route({
  auth: "user",
  rateLimit: { name: "account", by: "user" },
  handler: async ({ auth, db }) => {
    if (!isFreshSession(auth.session.createdAt)) {
      throw new HttpError(403, "reauth_required", "Sign in again to export your data");
    }
    const data = await exportUserData(db(), auth.user.id);
    if (!data) throw new HttpError(404, "not_found", "Account not found");
    const day = data.exportedAt.slice(0, 10);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="origins-ai-learn-export-${day}.json"`,
      },
    });
  },
});
