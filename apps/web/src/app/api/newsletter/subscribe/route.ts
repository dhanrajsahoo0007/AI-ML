import { z } from "zod";
import { CURRENT_CONSENT_VERSION, isConsentVersion } from "@/features/newsletter/consent";
import { error, guarded, isJson, json, parseJson, readBody, sectionOff } from "@/features/newsletter/http";
import { clientIp } from "@/features/newsletter/rate-limit";
import { newsletterDeps, newsletterHref } from "@/features/newsletter/server";
import { subscribe } from "@/features/newsletter/service";

// POST /api/newsletter/subscribe: zod body, honeypot, rate limit (5/h/IP), store pending, send the double opt-in
// email (plan §15.2). The answer never says whether the address was already known. Turnstile is added here once
// the Cloudflare account exists.

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    email: z.string().trim().max(254).pipe(z.email()),
    consentVersion: z
      .string()
      .max(32)
      .refine(isConsentVersion, "unknown consent version")
      .default(CURRENT_CONSENT_VERSION),
    source: z.enum(["archive", "issue"]).default("archive"),
    /** Honeypot: hidden from people, filled in by naive bots. */
    website: z.string().max(200).default(""),
  })
  .strict();

export async function POST(request: Request) {
  const href = newsletterHref();
  if (!href) return sectionOff();
  return guarded("subscribe", async () => {
    if (!isJson(request)) return error(415, "unsupported_media_type");
    const text = await readBody(request);
    if (text === null) return error(413, "payload_too_large");
    const parsed = bodySchema.safeParse(parseJson(text));
    if (!parsed.success) return error(400, "invalid_request");
    const result = await subscribe(newsletterDeps(href), { ...parsed.data, ip: clientIp(request.headers) });
    if (result.kind === "rate-limited") {
      return error(429, "rate_limited", { "Retry-After": String(result.retryAfterSeconds) });
    }
    return json(202, { ok: true });
  });
}
