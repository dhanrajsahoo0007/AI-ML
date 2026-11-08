// Public API of the email feature: the queue producer, the senders, the renderer and the shared templates. No
// server-only module and no JSX: this index is bundled into the Worker entry (apps/web/worker.mjs → queue-consumer.ts
// → jobs.ts → the newsletter and billing templates) and loaded by the scripts with plain Node.
export { DEFAULT_DEV_MAIL_DIR } from "./dev-sender";
export { toEml } from "./eml";
export { enqueueEmail, type EmailQueueProducer } from "./queue";
export { renderEmail, type RenderedEmail } from "./render";
export type { EmailMessage, EmailSender } from "./sender";
export { EmailNotConfiguredError, emailSenderFor } from "./senders";
export { ConfirmSubscriptionEmail } from "./templates/confirm-subscription";
export { IssueEmail } from "./templates/issue";
export { s } from "./templates/styles";
export { WelcomeEmail } from "./templates/welcome";
export { verifyWebhookSignature } from "./webhook-signature";
