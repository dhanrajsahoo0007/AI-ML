import { z } from "zod";
import { authConfig, route } from "@/features/auth";
import {
  CHECKOUT_CONSENT_KEYS,
  PLAN_IDS,
  checkoutConfigured,
  primaryProvider,
  requestCountry,
  startCheckout,
  type Plan,
} from "@/features/billing";
import { serverEnv } from "@/server/env";
import { HttpError, notFound } from "@/server/http";

// Starts a hosted checkout at the primary provider (plan §9.3). Signed-in users only, 5/min per user. The
// body carries the plan and the consent text versions the buyer ticked on /checkout; both are re-checked here
// and the consents are logged before the provider is called. Returns `{ url }` to redirect to.
export const POST = route({
  auth: "user",
  rateLimit: { name: "checkout", by: "user" },
  body: z.object({
    plan: z.enum(PLAN_IDS as [Plan, ...Plan[]]),
    consents: z.object(Object.fromEntries(CHECKOUT_CONSENT_KEYS.map((k) => [k, z.string().max(64)]))).strict(),
  }),
  handler: async ({ auth, body, db, request }) => {
    if (process.env.PAYWALL !== "on") throw notFound();
    const env = serverEnv();
    if (!checkoutConfigured(env)) {
      throw new HttpError(503, "billing_unavailable", "Payments aren't open yet. Everything free is open now.");
    }
    const locale = request.headers.get("accept-language")?.split(",")[0]?.trim().slice(0, 35);
    return startCheckout(db(), primaryProvider(env), {
      user: { id: auth.user.id, email: auth.user.email, name: auth.user.name },
      plan: body.plan,
      consents: body.consents as Record<string, string>,
      country: requestCountry(request.headers),
      locale,
      returnUrl: `${authConfig().baseURL}/account/billing?status=success`,
    });
  },
});
