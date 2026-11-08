import { buildEmail, EMAIL_JOB_VERSION, emailJobSchema, type EmailJob, type EmailJobInput } from "./jobs";
import type { EmailSender } from "./sender";

// The producer: every transactional email goes through enqueueEmail(). With the EMAIL_QUEUE binding (a
// Cloudflare Queue, wrangler.jsonc) the job is put on the queue and the request returns without waiting on the
// email provider; queue-consumer.ts renders and sends it. Without the binding (`next dev`, `next start`, CI, the
// billing scripts, and every environment until the owner creates the queues) the email is built and sent inline,
// exactly as before: the dev sender still writes the .eml outbox the E2E tests read.

/** The part of the Queue producer binding this uses (`EMAIL_QUEUE`, typed in cloudflare-env.d.ts). */
export interface EmailQueueProducer {
  send(body: EmailJob, options?: { contentType?: "json" }): Promise<void>;
}

interface EnqueueDeps {
  /** The EMAIL_QUEUE binding; null or absent sends inline. */
  queue?: EmailQueueProducer | null;
  /** The inline path's sender. A function is called only when it is needed, so a queued send never builds one. */
  sender: EmailSender | (() => EmailSender);
}

interface Enqueued {
  via: "queue" | "inline";
  idempotencyKey: string;
}

/**
 * Validates the job (a bad one throws here, at the call site, not later in the consumer), then queues it or
 * sends it inline. Errors propagate either way: a failed `queue.send` or inline send is the caller's to handle,
 * as a failed send was before the queue.
 */
export async function enqueueEmail(input: EmailJobInput, deps: EnqueueDeps): Promise<Enqueued> {
  const job = emailJobSchema.parse({
    ...input,
    v: EMAIL_JOB_VERSION,
    // A random key still makes queue retries safe: it is fixed here, once, and travels with the message.
    idempotencyKey: input.idempotencyKey ?? `${input.kind}:${crypto.randomUUID()}`,
  });
  if (deps.queue) {
    await deps.queue.send(job, { contentType: "json" });
    return { via: "queue", idempotencyKey: job.idempotencyKey };
  }
  const sender = typeof deps.sender === "function" ? deps.sender() : deps.sender;
  await sender.send(await buildEmail(job));
  return { via: "inline", idempotencyKey: job.idempotencyKey };
}
