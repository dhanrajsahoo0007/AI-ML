import { z } from "zod";
import {
  CURRENT_CONSENT_VERSION,
  isConsentVersion,
  errorResponse,
  newsletterRoute,
  clientIp,
  newsletterDeps,
  newsletterHref,
  subscribe,
  TURNSTILE_TOKEN_MAX,
} from "@/features/newsletter";
import { HttpError } from "@/server/http";

// POST /api/newsletter/subscribe: zod body, rate limit (5/h/IP), Turnstile (when TURNSTILE_SECRET_KEY is set),
// honeypot, store pending, send the double opt-in email (plan §15.2). The answer never says whether the address
// was already known.

export const dynamic = "force-dynamic";

const body = z.object({
  email: z.string().trim().max(254).pipe(z.email()),
  consentVersion: z
    .string()
    .max(32)
    .refine(isConsentVersion, "unknown consent version")
    .default(CURRENT_CONSENT_VERSION),
  source: z.enum(["archive", "issue"]).default("archive"),
  /** Honeypot: hidden from people, filled in by naive bots. */
  website: z.string().max(200).default(""),
  /** The Turnstile widget's token, when the widget is on. */
  turnstileToken: z.string().max(TURNSTILE_TOKEN_MAX).optional(),
});

export const POST = newsletterRoute({
  body,
  handler: async ({ body, db, request, requestId }) => {
    const result = await subscribe(newsletterDeps(newsletterHref()!, db), {
      ...body,
      ip: clientIp(request.headers),
      country: request.headers.get("cf-ipcountry"),
    });
    switch (result.kind) {
      case "rate-limited":
        return errorResponse(requestId, 429, "rate_limited", "Too many sign-ups, try again later", {
          "Retry-After": String(result.retryAfterSeconds),
        });
      case "captcha-failed":
        if (result.reason === "unavailable") {
          throw new HttpError(503, "captcha_unavailable", "The bot check is unavailable, try again shortly");
        }
        throw new HttpError(400, "captcha_failed", "The bot check failed, try again");
      default:
        return Response.json({ ok: true }, { status: 202 });
    }
  },
});
