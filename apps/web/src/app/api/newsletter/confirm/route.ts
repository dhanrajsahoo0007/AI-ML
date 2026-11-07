import { z } from "zod";
import { error, guarded, isJson, json, parseJson, readBody, sectionOff } from "@/features/newsletter/http";
import { newsletterDeps, newsletterHref } from "@/features/newsletter/server";
import { confirmSubscription } from "@/features/newsletter/service";

// POST /api/newsletter/confirm {token}: the confirm page posts the token from the email link after a click, so a
// mail scanner that only opens links (GET) can't confirm a subscription on its own.

export const dynamic = "force-dynamic";

const bodySchema = z.object({ token: z.string().min(1).max(1024) }).strict();

export async function POST(request: Request) {
  const href = newsletterHref();
  if (!href) return sectionOff();
  return guarded("confirm", async () => {
    if (!isJson(request)) return error(415, "unsupported_media_type");
    const text = await readBody(request);
    if (text === null) return error(413, "payload_too_large");
    const parsed = bodySchema.safeParse(parseJson(text));
    if (!parsed.success) return error(400, "invalid_request");
    const result = await confirmSubscription(newsletterDeps(href), parsed.data.token);
    switch (result.kind) {
      case "active":
        return json(200, { status: "active" });
      case "expired":
        return error(410, "expired");
      case "not-pending":
        return error(409, "not_pending");
      default:
        return error(400, "invalid_token");
    }
  });
}
