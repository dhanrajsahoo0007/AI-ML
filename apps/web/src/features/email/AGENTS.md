# features/email: the email port, the email queue and templates

Every transactional email (newsletter double opt-in, welcome, the yearly renewal reminder; later dunning) is an
`EmailJob` handed to `enqueueEmail()`. With the `EMAIL_QUEUE` binding (a Cloudflare Queue) the job goes on the
queue and the API request returns without waiting on Resend; without it, the email is built and sent inline,
exactly as before the queue. No Resend or Cloudflare account exists yet, so nothing is delivered and every
environment sends inline today. Newsletter issues are not jobs: they go out as Resend Broadcasts from the send
workflow (`apps/web/src/features/newsletter/AGENTS.md`).

## Public API

`index.ts` exports the producer, the senders, the renderer, the templates and the webhook check for the other
features (no server-only module, no JSX: it is bundled into the Worker entry and loaded by the scripts).
`queue-consumer.ts` is imported by `apps/web/worker.mjs` by path; `jobs.ts` imports the newsletter and billing
template builders by path (their indexes are server-only, which throws in the Worker bundle).

- `jobs.ts`: `emailJobSchema` (zod, discriminated on `kind`), `EmailJob`, `EmailJobInput`, `buildEmail()`
  (job → `EmailMessage`), `EMAIL_JOB_VERSION`.
- `queue.ts`: `enqueueEmail(input, { queue, sender })`, the producer; `EmailQueueProducer`.
- `queue-consumer.ts`: `handleEmailQueue(batch, env, ctx)`, the Worker's `queue()` handler;
  `processEmailBatch()` (the same with injected sender and log, for tests); `retryDelaySeconds()`.
- `sender.ts`: `EmailMessage`, `EmailSender`, `SentEmail` (the port); `EmailSendError` (`retryable`, `status`,
  `retryAfterSeconds`).
- `senders.ts`: `emailSenderFor(env, appEnv)` (Resend when `RESEND_API_KEY` is set, the dev sender otherwise,
  never the dev sender in production: `EmailNotConfiguredError`).
- `dev-sender.ts`: `DevEmailSender` logs a masked line and writes an .eml file to the dev outbox
  (`DEV_MAIL_DIR`, default `.build/mail` under `apps/web`, gitignored); on a Worker it only logs. `maskEmail()`.
- `resend-sender.ts`: `ResendEmailSender` (Resend HTTP API): sends `Idempotency-Key`, throws `EmailSendError`.
- `render.ts`: `renderEmail()` turns a React Email element into HTML + plain text (every message has both).
- `eml.ts`: `toEml()` serialises a message (RFC 5322, multipart/alternative) for the outbox and E2E tests.
- `webhook-signature.ts`: Svix-style signature check for the Resend webhook.
- `templates/`: `templates/layout.ts` (frame, footer with postal address, unsubscribe and privacy links),
  `templates/styles.ts`, `templates/confirm-subscription.ts`, `templates/welcome.ts`, `templates/issue.ts`.

## Data flow

```
caller (newsletter/service.ts, billing/reminders.ts)
  └─ enqueueEmail({ kind, to, data, idempotencyKey? }, { queue, sender })   zod-validates the job
       ├─ queue binding present ─► EMAIL_QUEUE.send(job) ─► handleEmailQueue(batch)
       │                              per message: parse → buildEmail() → sender.send() → ack / retry / ack+log
       └─ no binding (local, next start, CI, scripts) ─► buildEmail(job) ─► sender.send() inline
```

`buildEmail()` dispatches on `kind` to the builder next to the caller (`apps/web/src/features/newsletter/emails.ts`,
`apps/web/src/features/billing/emails/renewal-reminder.ts`): template element → `renderEmail()` → `EmailMessage`.
The API routes get `queue` and `sender` from `newsletterDeps()` (`apps/web/src/features/newsletter/server.ts`:
`emailQueue()` reads the binding, `emailSender()` wraps `emailSenderFor()`); the consumer builds its sender from
the Worker env. `apps/web/scripts/billing-jobs.ts` has no binding and sends inline.

Consumer outcomes: success → `ack()`; `EmailSendError` with `retryable` (429, 5xx, network, a concurrent request
with the same idempotency key) or a missing `RESEND_API_KEY` → `retry()` after `retryDelaySeconds()` (30 s
doubling to 1 h, or Retry-After if longer); after the consumer's `max_retries` Cloudflare moves the message to the
dead-letter queue. Permanent failures (other 4xx, a body that isn't an `EmailJob`, a render error) → logged with
the masked recipient and acked, never retried.

## Invariants and gotchas

- **Idempotency**: every job has an `idempotencyKey`, fixed when it is enqueued (the caller's natural key, e.g.
  `billing.renewal-reminder:<subscription>:<period end>`, or `<kind>:<uuid>`), passed to Resend as
  `Idempotency-Key`, so a redelivered message is not sent twice. Resend keeps keys for 24 hours. Keys never contain
  an address (they are logged): the schema allows only letters, digits and `.` `_` `:` `-`, plus slashes.
- **Jobs carry data, not HTML**: the consumer renders with the code it ships with. Jobs hold signed links and an
  address: never log a job, only its kind, `maskEmail()` recipient and key. Changing a kind's data in a way old
  messages won't parse needs a new kind name (messages in flight and in the DLQ keep the old shape).
- **No `server-only` in the consumer's import graph** (nor `@/server/*`, which imports it): the Worker entry is
  bundled by wrangler outside Next's react-server build, where `server-only` throws. That is why the consumer logs
  its own JSON lines instead of using `apps/web/src/server/log.ts`. `queue-consumer.test.ts` walks the imports.
- With no binding everything behaves as before the queue: the same sender, the same errors to the caller (a
  missing sender in production is a 503 `not_configured`), the same dev outbox the E2E tests read.
- **Templates use `createElement`, not JSX**: the unit tests and the send script (`tsx`, plain Node) load them
  directly, outside Next's JSX transform. Keep new templates as .ts files with `createElement`.
- Styles are inline, colours plain hex, system fonts: email clients ignore stylesheets.
- No images in the frame; content images must be PNG (many clients don't show SVG/WebP/AVIF). Asset PNG variants
  come from the asset pipeline.
- Bulk mail needs the CAN-SPAM postal address and a one-click unsubscribe link (`templates/layout.ts`); transactional mail
  gets the same frame.
- Extra headers can't override the ones the sender controls (`eml.ts`).
- Never log a full address; use `maskEmail()`.
- From addresses come from `apps/web/src/config/business.ts` (`news@news.<domain>` for the newsletter).

## Extend it

New email kind:

1. A template in `templates/` (props in, element out), or next to its feature like the renewal reminder.
2. A builder next to its caller that returns an `EmailMessage` with `template` set, like `confirmationEmail()`.
3. In `jobs.ts`: a `job("<feature>.<name>", { …data schema… })` entry in `emailJobSchema` and a case in
   `messageFor()` (TypeScript fails the switch until you add it).
4. The caller calls `enqueueEmail({ kind, to, data, idempotencyKey }, { queue, sender })`, with a natural
   idempotency key when one exists.
5. Tests: the schema and builder in `jobs.test.ts`, the template in `templates.test.ts`.

## Tests

`jobs.test.ts` (schema, builders), `queue.test.ts` (producer: queue vs inline fallback), `queue-consumer.test.ts`
(ack / retry / permanent paths with a fake batch and sender, the Worker handler over a stubbed Resend, the import
graph), `resend-sender.test.ts` (error classification, `Idempotency-Key`), `templates.test.ts`, `eml.test.ts`,
`webhook-signature.test.ts`; the newsletter E2E reads .eml files from the dev outbox
(`apps/web/tests/e2e/newsletter.spec.ts`).

## Planned

- Wire `handleEmailQueue` as the `queue()` handler of the custom Worker entry (Cloudflare wiring stream), then
  uncomment the `queues` blocks in `wrangler.jsonc` (`EMAIL_QUEUE` producer, consumer with `max_retries` 8,
  `max_concurrency` 1 and a dead-letter queue per environment) once the owner has created the queues.
- A DLQ replay script or consumer, and an alert on DLQ depth.
- The renewal reminders on the Worker's Cron Trigger, passing `env.EMAIL_QUEUE` as `queue`.
