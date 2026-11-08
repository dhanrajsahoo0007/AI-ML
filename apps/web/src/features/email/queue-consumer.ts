import { maskEmail } from "./dev-sender";
import { buildEmail, emailJobSchema } from "./jobs";
import { EmailSendError, type EmailMessage, type EmailSender } from "./sender";
import { emailSenderFor } from "./senders";

// The EMAIL_QUEUE consumer: wired as the Worker's `queue()` handler in the custom Worker entry, which wraps
// OpenNext's fetch handler. Per message:
//
//   body doesn't parse as an EmailJob   → log (masked recipient) and ack: retrying can't fix it
//   rendering throws                     → log and ack (a bug, not an outage; fix and replay from the DLQ)
//   send ok                              → ack
//   send fails, retryable (429, 5xx,     → retry with exponential backoff (Retry-After respected); after the
//     network, no RESEND_API_KEY yet)      consumer's max_retries Cloudflare moves it to the dead-letter queue
//   send fails, permanent (other 4xx)    → log and ack
//
// Each job carries an idempotency key that the sender passes to Resend, so a message retried after a send that
// did go through (a timeout, a lost ack) is not delivered twice.
//
// This module and everything it imports must not import `server-only` (or `@/server/*`, which does): the Worker
// entry is bundled by wrangler, outside Next's react-server build, where `server-only` throws on import.
// queue-consumer.test.ts checks the import graph.

const BASE_DELAY_SECONDS = 30;
const MAX_BACKOFF_SECONDS = 60 * 60;
/** Cloudflare's limit for `retry({ delaySeconds })`. */
const MAX_DELAY_SECONDS = 12 * 60 * 60;

/**
 * Delay before the next attempt: 30 s, 1 min, 2 min, 4 min… capped at an hour, or the provider's Retry-After when
 * that is longer. `attempts` is the message's attempt count, 1 on its first delivery.
 */
export function retryDelaySeconds(attempts: number, retryAfterSeconds?: number): number {
  const backoff = Math.min(BASE_DELAY_SECONDS * 2 ** (Math.max(attempts, 1) - 1), MAX_BACKOFF_SECONDS);
  return Math.min(Math.max(backoff, retryAfterSeconds ?? 0), MAX_DELAY_SECONDS);
}

type Level = "info" | "warn" | "error";
type Log = (level: Level, msg: string, fields: Record<string, unknown>) => void;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/** One JSON line, like server/log.ts (which can't be imported here); strings are scrubbed of addresses. */
const consoleLog: Log = (level, msg, fields) => {
  const line = { ts: new Date().toISOString(), level, msg, ...fields };
  console[level](JSON.stringify(line, (_key, v: unknown) => (typeof v === "string" ? v.replace(EMAIL, "[email]") : v)));
};

export interface EmailConsumerDeps {
  /** Built at most once per batch, on the first send. */
  sender: () => EmailSender;
  log?: Log;
}

/** Retryable unless the sender said otherwise: unknown errors are most likely network trouble. */
function classify(error: unknown): { retryable: boolean; status?: number; retryAfterSeconds?: number } {
  if (error instanceof EmailSendError) {
    return { retryable: error.retryable, status: error.status, retryAfterSeconds: error.retryAfterSeconds };
  }
  // Anything else: most likely network trouble, or EmailNotConfiguredError (no RESEND_API_KEY in production yet),
  // which setting the secret fixes; until then the retries and the dead-letter queue keep the mail.
  return { retryable: true };
}

/** An error for a log line, with any address in it masked (provider and render errors can quote the recipient). */
const errorText = (error: unknown) =>
  (error instanceof Error ? `${error.name}: ${error.message}` : String(error)).replace(EMAIL, "[email]");

function maskedRecipient(body: unknown): string | undefined {
  const to = typeof body === "object" && body !== null ? (body as { to?: unknown }).to : undefined;
  return typeof to === "string" ? maskEmail(to) : undefined;
}

/** Handles every message of a batch; each one is acked or retried on its own, never the whole batch. */
export async function processEmailBatch(batch: MessageBatch<unknown>, deps: EmailConsumerDeps): Promise<void> {
  const log = deps.log ?? consoleLog;
  let sender: EmailSender | undefined;
  for (const message of batch.messages) {
    const base = { queue: batch.queue, message_id: message.id, attempts: message.attempts };
    const parsed = emailJobSchema.safeParse(message.body);
    if (!parsed.success) {
      log("error", "email_job_invalid", {
        ...base,
        to: maskedRecipient(message.body),
        // Paths and codes only: zod messages can quote the input.
        issues: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.code}`),
      });
      message.ack();
      continue;
    }
    const job = parsed.data;
    const fields = { ...base, kind: job.kind, to: maskEmail(job.to), idempotency_key: job.idempotencyKey };

    let email: EmailMessage;
    try {
      email = await buildEmail(job);
    } catch (e) {
      log("error", "email_render_failed", { ...fields, error: errorText(e) });
      message.ack();
      continue;
    }

    try {
      sender ??= deps.sender();
      const sent = await sender.send(email);
      log("info", "email_sent", { ...fields, provider_id: sent.id });
      message.ack();
    } catch (e) {
      const failure = classify(e);
      if (failure.retryable) {
        const delaySeconds = retryDelaySeconds(message.attempts, failure.retryAfterSeconds);
        log("warn", "email_send_retry", { ...fields, status: failure.status, delay_s: delaySeconds, error: errorText(e) });
        message.retry({ delaySeconds });
      } else {
        log("error", "email_send_failed", { ...fields, status: failure.status, error: errorText(e) });
        message.ack();
      }
    }
  }
}

/**
 * The Worker's `queue()` handler for EMAIL_QUEUE (and only that queue: route by `batch.queue` in the entry if
 * more consumers are added). Reads RESEND_API_KEY and APP_ENV from the Worker env, falling back to process.env.
 */
export async function handleEmailQueue(
  batch: MessageBatch<unknown>,
  env: CloudflareEnv,
  ctx: ExecutionContext
): Promise<void> {
  void ctx; // Nothing outlives the batch: every message is acked or retried before this returns.
  const appEnv = env.APP_ENV ?? process.env.APP_ENV ?? "production";
  await processEmailBatch(batch, {
    sender: () => emailSenderFor({ RESEND_API_KEY: env.RESEND_API_KEY ?? process.env.RESEND_API_KEY }, appEnv),
  });
}
