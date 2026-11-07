import { z } from "zod";
import { ageCookie, authConfig, route } from "@/features/auth";

// Step 1 of sign-in: the age / parental-consent confirmation (plan §8.3). Sets a short-lived cookie that
// Better Auth requires before redirecting to Google and records in consent_log once the account exists.
export const POST = route({
  rateLimit: { name: "auth", by: "ip" },
  body: z.object({ ageConfirmed: z.literal(true) }),
  handler: ({ setCookies }) => {
    setCookies.push(ageCookie(authConfig().secureCookies));
    return { ok: true };
  },
});
