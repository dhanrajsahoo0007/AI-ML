// The email port (plan §15.3: features/email). Everything that sends mail (newsletter double opt-in, welcome,
// later renewal reminders and dunning) builds an EmailMessage and hands it to an EmailSender. Implementations:
// DevEmailSender (logs and writes .eml files, local and tests) and ResendEmailSender (HTTP API, once the account
// exists). A Queue-backed sender (plan §15.2 step 3) will implement the same interface.

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
}

export interface SentEmail {
  id: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<SentEmail>;
}
