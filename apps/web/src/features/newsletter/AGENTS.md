# features/newsletter: the `newsletter` section kind

Issues written as MDX become a web archive (`apps/web/src/app/newsletter/`) and an email. Sign-up is double opt-in
through `/api/newsletter/*`. Off in production until released. Stream S is finishing the Postgres store, consent
logging, Turnstile and bounce webhooks; check its branch before large changes here.

## Public API

No index file; import the files directly.

- `kind.ts`: `newsletterKind` (`SectionKind<Issue>`). `source.ts`: `loadIssues()`, `readIssueFile()`.
- `schema.ts`: issue frontmatter (`title`, `date`, `summary`, `access`, `status` draft/scheduled/sent, `sendAt`,
  `audience` all/pro); `SUMMARY_MAX` (200).
- `service.ts`: `subscribe()`, confirm and unsubscribe flows over ports (`NewsletterDeps`).
- `server.ts`: `newsletterDeps(href)`, `newsletterHref()` wire the ports for the API routes only.
- `store.ts` (port + `MemoryNewsletterStore`), `token.ts` (HMAC tokens), `rate-limit.ts`, `consent.ts`,
  `http.ts` (small JSON helpers), `unsubscribe-headers.ts` (RFC 8058).
- `email-issue.ts` + `emails.ts`: issue, confirmation and welcome emails via `apps/web/src/features/email/`.
- `send/send-issue.ts` + `send/plan.ts`: the send script run by `.github/workflows/newsletter-send.yml`.
- `rss.ts`, `seo.ts`, `issue-body.tsx`, `links.ts`; islands `signup-form.client.tsx`, `token-action.client.tsx`.

## Data flow

Sign-up form → `POST /api/newsletter/subscribe` (zod, honeypot, 5/h/IP) → store `pending` → confirmation email with
a 48 h `confirm` token → static confirm page posts the token on click → `active` → welcome email. Unsubscribe links
carry a non-expiring `unsubscribe` token; mail providers POST `List-Unsubscribe=One-Click`.

## Invariants and gotchas

- **RSS and search carry titles and summaries only, never the body** (no full-text feeds, plan §11.10). Keep it so
  even for free issues.
- Every API route returns 404 while the section isn't `on` (`sectionOff()`).
- The subscribe answer is identical for new, known, suppressed and honeypot addresses, so it can't probe emails.
- GET never changes state (link scanners open links); confirm and unsubscribe happen on POST after a click.
- Tokens carry the subscriber id, never the email. **`NEWSLETTER_TOKEN_SECRET` has a single key**: rotating it breaks
  every unsubscribe link already sent. A fixed dev secret is allowed only with `APP_ENV=local`.
- Today the store and rate limiter are in memory (per isolate) and the API routes use the helpers in `http.ts`, not
  the shared `route()` wrapper; moving them onto `route` and Postgres is stream S's job.
- Issues are plain Markdown (no JSX components) so one file renders to the web and to email; email images must be
  PNG with absolute URLs. A premium issue sent to everyone carries only its summary and a link.
- Drafts and scheduled issues get a `noindex` review page outside production only.
- A broadcast needs `status: scheduled`; marking an issue `sent` is a follow-up PR (the workflow can't push).

## Extend it

Write an issue: `.claude/skills/write-newsletter-issue/SKILL.md`. New consent wording: add a version in
`consent.ts`, never edit an old one. New email: build it in `emails.ts` from the shared templates.

## Tests

`kind.test.ts`, `service.test.ts`, `store.test.ts`, `token.test.ts`, `rss.test.ts`, `send-plan.test.ts`,
`server.test.ts`, `unsubscribe-headers.test.ts`; E2E `apps/web/tests/e2e/newsletter.spec.ts` (subscribe → .eml →
confirm → one-click unsubscribe).
