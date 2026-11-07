import { z } from "zod";
import type { EmailMessage, EmailSender, SentEmail } from "./sender";

// Sends through Resend's HTTP API (POST /emails). Used once RESEND_API_KEY exists (the account belongs to the
// owner; agents never create it). Bulk issues go through Resend Broadcasts from .github/workflows/newsletter-send.yml
// instead, which add their own unsubscribe headers.

const RESEND_API = "https://api.resend.com/emails";
const responseSchema = z.object({ id: z.string() });

export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async send(message: EmailMessage): Promise<SentEmail> {
    const res = await this.fetchImpl(RESEND_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
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
    if (!res.ok) throw new Error(`Resend responded ${res.status}`);
    return responseSchema.parse(await res.json());
  }
}
