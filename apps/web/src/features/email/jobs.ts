import { z } from "zod";
import { renewalReminderEmail } from "../billing/emails/renewal-reminder";
import { confirmationEmail, welcomeEmail } from "../newsletter/emails";
import type { EmailMessage } from "./sender";

// The email job: what goes on the EMAIL_QUEUE Cloudflare Queue (and what enqueueEmail() builds inline without
// one). It carries the template's data, not rendered HTML, so messages stay small (Queues cap a message at
// 128 KB) and the consumer renders with the code it ships with. Validated with zod on both sides: the producer
// refuses a bad job at the call site, the consumer drops (and logs) one that doesn't parse.
//
// Jobs hold links with signed tokens (confirm, unsubscribe) and a recipient address: never log a job, only its
// kind, masked recipient and idempotency key.
//
// New kind: a schema below, a builder next to its caller that returns an EmailMessage, a case in buildEmail().
// Changing a kind's data in a way old messages don't parse needs a new kind name (messages in flight, and in the
// dead-letter queue, still have the old shape).

/** Bump only with a consumer that still understands the previous version. */
export const EMAIL_JOB_VERSION = 1;

const link = z.url({ protocol: /^https?$/ });

/** Deliberately loose: the address came from Google sign-in or the double opt-in form, both already checked. */
const recipient = z
  .string()
  .max(320)
  .regex(/^[^\s@]+@[^\s@]+$/, "not an email address");

/**
 * Same key, same email: the provider sends it once (Resend keeps keys for 24 hours). Never contains the address
 * (it is logged). Resend allows up to 256 characters.
 */
const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9._:/-]{1,256}$/, "invalid idempotency key");

const job = <K extends string, D extends z.ZodRawShape>(kind: K, data: D) =>
  z.object({
    v: z.literal(EMAIL_JOB_VERSION),
    kind: z.literal(kind),
    to: recipient,
    idempotencyKey: idempotencyKeySchema,
    data: z.object(data),
  });

export const emailJobSchema = z.discriminatedUnion("kind", [
  // Double opt-in (features/newsletter/service.ts subscribe()).
  job("newsletter.confirm", { confirmUrl: link, unsubscribeUrl: link }),
  // After confirming or a signed-in one-click subscribe; carries the RFC 8058 one-click URL.
  job("newsletter.welcome", { archiveUrl: link, unsubscribeUrl: link, oneClickUrl: link }),
  // T-7 yearly renewal reminder (features/billing/reminders.ts).
  job("billing.renewal-reminder", {
    name: z.string().max(200),
    renewsOn: z.string().min(1).max(100),
    price: z.string().min(1).max(50),
    manageUrl: link,
  }),
]);

export type EmailJob = z.infer<typeof emailJobSchema>;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** What callers pass to enqueueEmail(): the version is filled in, and a random idempotency key if none is given. */
export type EmailJobInput = DistributiveOmit<EmailJob, "v" | "idempotencyKey"> & { idempotencyKey?: string };

function messageFor(job: EmailJob): Promise<EmailMessage> {
  switch (job.kind) {
    case "newsletter.confirm":
      return confirmationEmail(job.to, job.data);
    case "newsletter.welcome":
      return welcomeEmail(job.to, job.data);
    case "billing.renewal-reminder":
      return renewalReminderEmail(job.to, job.data);
  }
}

/** Renders a job into the message a sender delivers, with the job's idempotency key. */
export async function buildEmail(job: EmailJob): Promise<EmailMessage> {
  return { ...(await messageFor(job)), idempotencyKey: job.idempotencyKey };
}
