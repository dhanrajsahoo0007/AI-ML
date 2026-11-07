import { z } from "zod";
import { newsletterRoute } from "@/features/newsletter/http";
import { newsletterDeps, newsletterHref } from "@/features/newsletter/server";
import { confirmSubscription } from "@/features/newsletter/service";
import { HttpError } from "@/server/http";

// POST /api/newsletter/confirm {token}: the confirm page posts the token from the email link after a click, so a
// mail scanner that only opens links (GET) can't confirm a subscription on its own. Confirming records the
// opt-in in consent_log.

export const dynamic = "force-dynamic";

const body = z.object({ token: z.string().min(1).max(1024) });

export const POST = newsletterRoute({
  body,
  rateLimit: { name: "emailLink", by: "ip" },
  handler: async ({ body, db }) => {
    const result = await confirmSubscription(newsletterDeps(newsletterHref()!, db), body.token);
    switch (result.kind) {
      case "active":
        return { status: "active" };
      case "expired":
        throw new HttpError(410, "expired", "This link has expired");
      case "not-pending":
        throw new HttpError(409, "not_pending", "This link is no longer valid");
      default:
        throw new HttpError(400, "invalid_token", "This link is not valid");
    }
  },
});
