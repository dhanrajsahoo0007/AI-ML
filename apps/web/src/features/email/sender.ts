// The email port (plan §15.3: features/email). Everything that sends mail (newsletter double opt-in, welcome,
// renewal reminders, later dunning) describes it as an EmailJob and calls enqueueEmail() (queue.ts), which either
// puts it on the EMAIL_QUEUE Cloudflare Queue or, without that binding, builds the EmailMessage and hands it to an
// EmailSender inline. Implementations: DevEmailSender (logs and writes .eml files, local and tests) and
// ResendEmailSender (HTTP API, once the account exists).

export interface EmailMessage {
  to: string;
  /** "Name <address>". */
  from: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  /** Extra headers, e.g. List-Unsubscribe (RFC 8058). */
  headers?: Record<string, string>;
  /** Which template produced it, for logs and the dev outbox file name. */
  template: string;
  /**
   * The same key on a repeated send means "this is the same email": the provider sends it once (Resend keeps
   * keys for 24 hours). Set from the EmailJob, so a queue retry of a message that was in fact delivered does not
   * reach the inbox twice.
   */
  idempotencyKey?: string;
}

export interface SentEmail {
  id: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<SentEmail>;
}

/**
 * A failed send, classified for the queue consumer: `retryable` for provider outages, rate limits and network
 * errors (try again later), not for a request the provider refused (a 4xx: retrying sends the same bad request).
 * Senders throw this; any other error from a sender is treated as retryable.
 */
export class EmailSendError extends Error {
  readonly retryable: boolean;
  readonly status?: number;
  /** From the provider's Retry-After header, when it sent one. */
  readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    options: { retryable: boolean; status?: number; retryAfterSeconds?: number; cause?: unknown }
  ) {
    super(message, { cause: options.cause });
    this.name = "EmailSendError";
    this.retryable = options.retryable;
    this.status = options.status;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}
