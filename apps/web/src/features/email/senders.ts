import { z } from "zod";
import { DevEmailSender } from "./dev-sender";
import { ResendEmailSender } from "./resend-sender";
import type { EmailSender } from "./sender";

// Picks the sender for an environment: Resend when RESEND_API_KEY is set, otherwise the dev sender (logs + .eml
// outbox), never the dev sender in production. Shared by the API routes (through newsletterDeps()) and the queue
// consumer, which reads the Worker's env directly. No `server-only` import: the consumer is bundled into the
// Worker entry outside Next (see queue-consumer.ts).

/** No sender can be built for this environment (production without RESEND_API_KEY). */
export class EmailNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailNotConfiguredError";
  }
}

const envSchema = z.object({ RESEND_API_KEY: z.string().min(1).optional() });

export function emailSenderFor(env: { RESEND_API_KEY?: string }, appEnv: string): EmailSender {
  const parsed = envSchema.parse({ RESEND_API_KEY: env.RESEND_API_KEY || undefined });
  if (parsed.RESEND_API_KEY) return new ResendEmailSender(parsed.RESEND_API_KEY);
  if (appEnv === "production") throw new EmailNotConfiguredError("RESEND_API_KEY is not set in production");
  return new DevEmailSender();
}
