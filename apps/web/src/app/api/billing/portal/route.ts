import { authConfig, route } from "@/features/auth";
import { portalCustomer, providerFor } from "@/features/billing";
import { serverEnv } from "@/server/env";
import { HttpError } from "@/server/http";

// Opens the provider's customer portal (manage plan, payment method, invoices, cancel) for the signed-in user's
// provider (plan §9.3): users stay with the provider they subscribed through. 10/min per user.
export const GET = route({
  auth: "user",
  rateLimit: { name: "portal", by: "user" },
  handler: async ({ auth, db }) => {
    const found = await portalCustomer(db(), auth.user.id);
    if (!found) throw new HttpError(404, "no_customer", "There is no subscription to manage yet");
    const provider = providerFor(found.provider, serverEnv());
    if (!provider) throw new HttpError(503, "billing_unavailable", "Billing is not available right now");
    const { url } = await provider.createPortalSession(found.customerId, `${authConfig().baseURL}/account/billing`);
    return Response.redirect(url, 303);
  },
});
