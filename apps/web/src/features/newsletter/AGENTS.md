# features/newsletter: the `newsletter` section kind

Issues written as MDX become a web archive (`apps/web/src/app/newsletter/`) and an email. Sign-up is double opt-in
through `/api/newsletter/*`. Off in production until released. Stream S is finishing the Postgres store, consent
logging, Turnstile and bounce webhooks; check its branch before large changes here.

## Public API

`index.ts` (no JSX: the API routes' integration test imports it) exports the kind, the route wrappers and services
and the archive pages' data and SEO; `public.ts` exports the client-safe `SignupBox`. `issue-body.tsx` (server-only
JSX) and the client islands are imported by path, and so are `kind.ts` (from `apps/web/src/features/sections/kinds.ts`,
plain Node) and `emails.ts` (from `apps/web/src/features/email/jobs.ts`, bundled into the Worker).

- `kind.ts`: `newsletterKind` (`SectionKind<Issue>`). `source.ts`: `loadIssues()`, `readIssueFile()`.
- `schema.ts`: issue frontmatter (`title`, `issue` number, `date`, `summary`, `format`, `series`, `tags`, `level`,
  `readingTime`, `cover`, `takeaways`, `related`, `share.hook`, `access`, `status` draft/scheduled/sent, `sendAt`,
  `audience` all/pro); `SUMMARY_MAX` (200); `FORMATS`, the per-format shape rules (deep-dive, digest).
- `catalog.ts`: the closed tag and series lists in `content/newsletter/catalog.yaml`.
- `cover/`: generative covers. `cover/catalog.ts` (motif and palette names the frontmatter may use),
  `cover/rng.ts` (seeded), `cover/palettes.ts`, `cover/motifs.ts`, `cover/render.ts` (`renderCover(spec,
variant)` → SVG string, pure, runs in Node and the browser), `cover/social-card.tsx` (`coverPng()`: og, email,
  portrait and square PNGs through next/og), `cover/cover-gallery.client.tsx` (the gallery island). Routes:
  `apps/web/src/app/newsletter/[slug]/opengraph-image.tsx`,
  `apps/web/src/app/newsletter/[slug]/share/[file]/route.ts` (`email.png`, `portrait.png`, `square.png`) and
  `apps/web/src/app/newsletter/covers/page.tsx` (the gallery; not built in production, noindex).
- `links.ts` (links, images, `asset:` figure sources, callout markers), `figures.ts` (figure checks against the
  asset source files; manifest lookup for rendering), `figure.tsx` (the web figure), `callouts.ts` (callout types
  and the remark plugin), `body-stats.ts` (words, figures, headings, reading time).
- `service.ts`: `subscribe()`, confirm and unsubscribe flows over ports (`NewsletterDeps`).
- `server.ts`: `newsletterDeps(href)`, `newsletterHref()` wire the ports for the API routes only; `emailQueue()`
  (the `EMAIL_QUEUE` binding or null), `emailSender()`.
- `store.ts` (port + `MemoryNewsletterStore`), `token.ts` (HMAC tokens), `rate-limit.ts`, `consent.ts`,
  `http.ts` (small JSON helpers), `unsubscribe-headers.ts` (RFC 8058).
- `email-issue.ts` + `emails.ts`: issue, confirmation and welcome emails via `apps/web/src/features/email/`.
  Confirmation and welcome are email jobs (`newsletter.confirm`, `newsletter.welcome`) sent with `enqueueEmail()`:
  on the email queue when the Worker has the binding, inline otherwise (`apps/web/src/features/email/AGENTS.md`).
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
- **No email-bombing (security review H2):** sign-up is limited per IP (`signup`) and per hashed address
  (`signupEmail`) on the shared limiter (`apps/web/src/server/rate-limit.ts`), Turnstile is required when
  `TURNSTILE_SECRET_KEY` is set, and the store sends at most one confirmation per address per 15 minutes and 3 a
  day (`nextConfirmation()`, columns `confirmation_sent_at` / `confirmation_count`). Suppressed addresses get nothing.
  Every answer is the same 202, so none of this reveals an address.
- The memory store is for `APP_ENV=local` only; elsewhere a missing database is a 503 `not_configured`, because the
  cool-down has to survive isolates. Routes go through `newsletterRoute()` / `serverToServerRoute()` (`route()`
  behind the section gate; the second with `origin: false` for mail systems).
- Issues are plain Markdown (no JSX components) so one file renders to the web and to email. Rich content uses
  Markdown-native syntax both renderers understand:
  - **Figures:** `![alt](asset:<id>)`. A build-up SVG (layers marked `data-step`, see
    `apps/web/src/lib/svg-steps.ts`) goes in as `#steps`: one figure the reader steps through on the web
    (`step-figure.client.tsx`) and the complete figure in email; `#step=<n>` shows a single step. The web inlines
    the SVG as a numbered figure, with a "View full size" PNG link on phones; email gets the asset's PNG (a PNG
    per step, made by the asset build). The asset needs `alt` and `caption`, must be free, and is counted as used
    by the issue page, so it ships wherever the page is built.
  - **Callouts:** GitHub alerts `> [!NOTE]` (In plain English), `[!IMPORTANT]` (Key idea), `[!WARNING]` (Common
    trap), `[!TIP]` (Try it); other types are errors.
  - Any other image must be a PNG with an absolute URL. A premium issue sent to everyone carries only its summary
    and a link.
- A new motif or palette is a name in `cover/catalog.ts` plus its drawing; `cover/cover.test.ts` checks every name is
  drawn, ids are prefixed, and title text keeps WCAG contrast on every palette. Same seed, same cover: never use
  `Math.random` in a motif. Issue slugs can't be a fixed route name of the section (`covers`, `confirm`, …).
- Format rules (`FORMATS`: required sections, figure count, length, words between visuals, sentence length,
  takeaways) are **warnings**, so a draft can be unfinished. Issue numbers are unique (error) and gapless
  (warning); a scheduled or sent issue needs `issue` and `cover`.
- Drafts and scheduled issues get a `noindex` review page outside production only.
- A broadcast needs `status: scheduled`; marking an issue `sent` is a follow-up PR (the workflow can't push).
- **Issues don't use the email queue.** They are Resend Broadcasts to a segment, `audience: pro` included (to
  `RESEND_PRO_SEGMENT_ID`), so there are no per-recipient sends. If per-recipient issue mail is ever needed (e.g.
  per-reader content), it would be a new email kind whose job carries the issue slug, not its HTML, fanned out in
  batches with `idempotencyKey` `newsletter.issue:<slug>:<subscriber id>`; Resend's rate limit makes that a
  queue job, never a request.

## Extend it

Write an issue: `.claude/skills/write-newsletter-issue/SKILL.md`. New consent wording: add a version in
`consent.ts`, never edit an old one. New email: build it in `emails.ts` from the shared templates and register it
as an email kind (`apps/web/src/features/email/AGENTS.md`, "Extend it").

## Tests

`kind.test.ts`, `content-model.test.ts`, `cover/cover.test.ts`, `service.test.ts`, `store.test.ts`, `token.test.ts`, `rss.test.ts`, `send-plan.test.ts`,
`server.test.ts`, `unsubscribe-headers.test.ts`; E2E `apps/web/tests/e2e/newsletter.spec.ts` (subscribe → .eml →
confirm → one-click unsubscribe).
