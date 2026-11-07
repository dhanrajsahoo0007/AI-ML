import { z } from "zod";
import { TURNSTILE_ACTION } from "./turnstile-config";

// Cloudflare Turnstile for the anonymous sign-up (plan §15.2 step 1, §11.6). Off unless configured:
//   TURNSTILE_SECRET_KEY            server: the subscribe API verifies a token with Siteverify
//   NEXT_PUBLIC_TURNSTILE_SITE_KEY  build: the sign-up form lazy-loads the widget (signup-form.client.tsx)
// Set both or neither. With only the secret, every anonymous sign-up fails the check.

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Turnstile tokens are at most 2048 characters. */
export const TURNSTILE_TOKEN_MAX = 2048;

export type CaptchaResult = { ok: true } | { ok: false; reason: "missing" | "rejected" | "unavailable" };

export interface CaptchaVerifier {
  verify(token: string | undefined, ip: string): Promise<CaptchaResult>;
}

const siteverifySchema = z.object({
  success: z.boolean(),
  action: z.string().optional(),
  "error-codes": z.array(z.string()).optional(),
});

export class TurnstileVerifier implements CaptchaVerifier {
  constructor(
    private readonly secret: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = 5_000
  ) {}

  async verify(token: string | undefined, ip: string): Promise<CaptchaResult> {
    if (!token) return { ok: false, reason: "missing" };
    const form = new FormData();
    form.set("secret", this.secret);
    form.set("response", token);
    if (ip && ip !== "unknown") form.set("remoteip", ip);
    let body: unknown;
    try {
      const res = await this.fetchImpl(SITEVERIFY, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!res.ok) return { ok: false, reason: "unavailable" };
      body = await res.json();
    } catch {
      return { ok: false, reason: "unavailable" };
    }
    const parsed = siteverifySchema.safeParse(body);
    if (!parsed.success) return { ok: false, reason: "unavailable" };
    if (!parsed.data.success) return { ok: false, reason: "rejected" };
    if (parsed.data.action !== undefined && parsed.data.action !== TURNSTILE_ACTION) {
      return { ok: false, reason: "rejected" };
    }
    return { ok: true };
  }
}

/** The verifier when TURNSTILE_SECRET_KEY is set; null (no check) otherwise. */
export function turnstileFromEnv(env: NodeJS.ProcessEnv = process.env): CaptchaVerifier | null {
  const secret = z.string().min(1).safeParse(env.TURNSTILE_SECRET_KEY);
  return secret.success ? new TurnstileVerifier(secret.data) : null;
}
