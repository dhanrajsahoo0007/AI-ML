import { z } from "zod";
import { EmailSendError, type EmailMessage, type EmailSender, type SentEmail } from "./sender";

// Sends through Resend's HTTP API (POST /emails). Used once RESEND_API_KEY exists (the account belongs to the
// owner; agents never create it). Bulk issues go through Resend Broadcasts from .github/workflows/newsletter-send.yml
// instead, which add their own unsubscribe headers.
//
// Failures are thrown as EmailSendError so the queue consumer can tell them apart: 429, 5xx, network errors and a
// concurrent request with the same idempotency key are retryable; any other 4xx (validation, unverified domain,
// bad key, the same idempotency key with a different body) is permanent.

const RESEND_API = "https://api.resend.com/emails";
const responseSchema = z.object({ id: z.string() });
const errorSchema = z.object({ name: z.string().optional() }).catch({});

/** Resend's error name while the first request with the same Idempotency-Key is still being processed. */
const CONCURRENT_IDEMPOTENT = "concurrent_idempotent_requests";

function retryAfterSeconds(res: Response): number | undefined {
  const value = Number(res.headers.get("retry-after"));
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : undefined;
}

export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async send(message: EmailMessage): Promise<SentEmail> {
    // Called unbound: on Workers, fetch invoked as a method of another object throws "Illegal invocation".
    const fetchImpl = this.fetchImpl;
    let res: Response;
    try {
      res = await fetchImpl(RESEND_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...(message.idempotencyKey ? { "Idempotency-Key": message.idempotencyKey } : {}),
        },
        body: JSON.stringify({
          from: message.from,
          to: [message.to],
          reply_to: message.replyTo,
          subject: message.subject,
          html: message.html,
          text: message.text,
          headers: message.headers,
          tags: [{ name: "template", value: message.template }],
        }),
      });
    } catch (e) {
      throw new EmailSendError("Resend request failed (network)", { retryable: true, cause: e });
    }
    if (!res.ok) {
      // Only the error's name is kept: Resend's messages can repeat the recipient's address.
      const { name } = errorSchema.parse(await res.json().catch(() => ({})));
      const retryable = res.status === 429 || res.status >= 500 || name === CONCURRENT_IDEMPOTENT;
      throw new EmailSendError(`Resend responded ${res.status}${name ? ` (${name})` : ""}`, {
        retryable,
        status: res.status,
        retryAfterSeconds: retryAfterSeconds(res),
      });
    }
    return responseSchema.parse(await res.json());
  }
}
