# features/email: the email port and templates

Everything that sends mail (newsletter double opt-in, welcome, issues; later renewal reminders and dunning) builds
an `EmailMessage` and hands it to an `EmailSender`. No account exists yet, so nothing is delivered outside
production.

## Public API

No index file; import the files directly.

- `sender.ts`: `EmailMessage`, `EmailSender`, `SentEmail` (the port).
- `dev-sender.ts`: `DevEmailSender` logs a masked line and writes an .eml file to the dev outbox
  (`DEV_MAIL_DIR`, default `.build/mail` under `apps/web`, gitignored); on a Worker it only logs. `maskEmail()`.
- `resend-sender.ts`: `ResendEmailSender` (Resend HTTP API), used once `RESEND_API_KEY` exists.
- `render.ts`: `renderEmail()` turns a React Email element into HTML + plain text (every message has both).
- `eml.ts`: `toEml()` serialises a message (RFC 5322, multipart/alternative) for the outbox and E2E tests.
- `templates/`: `templates/layout.ts` (frame, footer with postal address, unsubscribe and privacy links),
  `templates/styles.ts`, `templates/confirm-subscription.ts`, `templates/welcome.ts`, `templates/issue.ts`.

## Data flow

Caller (e.g. `apps/web/src/features/newsletter/emails.ts`) → template element → `renderEmail()` → `EmailMessage` →
the sender chosen in `apps/web/src/features/newsletter/server.ts` (Resend when keyed, dev sender otherwise, never the
dev sender in production). Bulk issues go through Resend Broadcasts from the send workflow instead.

## Invariants and gotchas

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

New email: a template in `templates/` (props in, element out), a builder next to its caller that returns an
`EmailMessage` with `template` set, a test in `templates.test.ts`. A Queue-backed sender (plan §15.2) would
implement `EmailSender` too.

## Tests

`templates.test.ts`, `eml.test.ts`; the newsletter E2E reads .eml files from the dev outbox
(`apps/web/tests/e2e/newsletter.spec.ts`).
