# AGENTS.md

Instructions for coding agents working in this repo. Humans start with `README.md`. Keep this file short and true:
`npm run check:agents-md` (run in CI) fails if a backticked path or npm script in any `AGENTS.md` or
`.claude/skills/*/SKILL.md` doesn't exist. Things not built yet go under a **Planned** heading, which the check skips.

Deeper guides live next to the code: `apps/web/content/AGENTS.md`, `apps/web/assets/AGENTS.md`,
`apps/web/src/server/db/AGENTS.md`, `apps/web/src/server/edge/AGENTS.md` and `apps/web/src/features/<x>/AGENTS.md`.
Step-by-step skills are in `.claude/skills/` (`add-article`, `add-section`, `release-section`, `add-asset`,
`add-api-route`, `add-migration`, `add-dsa-problem`, `write-newsletter-issue`, `review-before-merge`).

## Product

**TokensToScale** teaches GenAI & LLM systems, classic system design and cloud architecture, with interview
practice on top. Goal: the fastest, clearest place to learn how real systems are built, and to pass the interview.

**Audiences:** all ages (free content needs no account; under-18 accounts need a parent's or guardian's permission,
confirmed at sign-up; purchases by adults), interview candidates, working engineers, and **international buyers,
the primary source of income**.

| Section (key)                            | Kind            | What it is for                                                                            |
| ---------------------------------------- | --------------- | ----------------------------------------------------------------------------------------- |
| GenAI & LLM Systems (`ai-system-design`) | `docs`          | One GenAI hub in twelve groups: foundations, RAG, agents, evaluation, serving, safety     |
| ML System Design (`ml-system-design`)    | `docs`          | Classic ML systems: feature pipelines, serving, recommendations, search ranking and fraud |
| Classic System Design (`system-design`)  | `docs`          | Fundamentals, databases, patterns and case studies                                        |
| Behavioral & Leadership (`behavioral`)   | `docs`          | STAR+L, Amazon LPs, FAANG & frontier AI loops, core competencies and leveling tracks      |
| Cloud (`cloud`)                          | `docs`          | AWS / Google Cloud / Azure services by job, mapped across clouds                          |
| Interview Practice (`interviews`)        | `question-bank` | Question library by category, answers, company tags                                       |
| Company Questions (`companies`)          | `directory`     | Aggregates company tags from Interview Practice and DSA                                   |
| DSA (`dsa`)                              | `problems`      | Topics and problems with an in-browser runner (public tests only)                         |
| Newsletter (`newsletter`)                | `newsletter`    | Issues as MDX: web archive plus double opt-in email                                       |

Release states per environment are in `apps/web/content/sections.yaml` (today Cloud is `hidden` in production;
ML System Design, Behavioral, DSA and Newsletter are `off`; no hub is parked with `hubRelease` at the moment).

**Business model:** freemium per article (hubs, outlines and chosen articles free; premium articles show a preview
and a paywall), Pro as a monthly or yearly subscription, regional purchasing-power price tiers A/B/C (100% / ~70% /
~40–50%), a **7-day money-back guarantee** (first payment and yearly renewals, once per customer). Sold through a
**merchant of record**: Dodo Payments primary; a standby MoR is still to be chosen (Paddle is ruled out because it
needs ≥ 14-day refunds). Prices are an open owner decision.

**What good looks like:** article first-load JS ≤ 150 kB (`npm run size -w web`); p75 free-page TTFB ≤ 100 ms,
LCP ≤ 1.5 s, INP ≤ 100 ms, CLS ≤ 0.05; 99.9% availability; zero premium bytes in non-entitled responses; WCAG 2.2 AA.

## Golden rules

1. **No database in page renders or middleware.** Content pages are prerendered; database access is allowed only
   in `/api/*` route handlers and the account pages. `npm run build` must succeed with **no environment variables**.
2. **Premium content never reaches a non-entitled response**: not in HTML, RSC payloads, JSON, sitemaps, search
   indexes, OG images, emails, RSS or logs. The server decides; never trust a client flag or a checkout redirect.
3. **Content lives in `apps/web/content/` only; reusable media lives in `apps/web/assets/` only**, referenced by ID
   (`<Img id>`, `<Figure id>`, `<Mermaid ref>`, `<TechIcon id>`, `<Download id>`). Never paste files into
   `apps/web/public/`.
4. **Sections exist only through `apps/web/content/sections.yaml`.** Shared code loops over the registry
   (`apps/web/src/features/sections/`); `apps/web/src/features/sections/literals.test.ts` fails on section-key
   string literals outside the registry and kind modules.
5. **Separate project.** Never use, copy or reference anything from Mythical (`/Users/dhanraj/Workspace/mythical-*`):
   no accounts, infrastructure, code, config, workflows or secrets.
6. **All third-party accounts belong to `dhanrajsahoo.work@gmail.com`.** Agents never create accounts, sign up,
   enter passwords or add secrets; ask the owner. Secret names may be documented, values never.
7. **No copying features.** No "Copy for LLM", raw-markdown endpoints, copy buttons or full-text feeds. Copy
   protection (`apps/web/src/features/content-protection/`) stays on for content areas (owner decision 2026-11-07).
8. **Zod at every trust boundary** (env, frontmatter, request bodies, webhook payloads); no `any`. Every API route
   goes through the `route()` wrapper (`apps/web/src/server/http.ts`, bound to sessions as `route` in
   `apps/web/src/features/auth/index.ts`): zod body, auth/role, Origin check, rate limit, `no-store`, uniform
   errors.
9. **Every bug fix lands with a test that would have caught it.**
10. Keep the dependency surface small: `npm run knip` must stay clean; add a dependency only when it's used.
11. **Production data safety:** the DB boot guard refuses non-local hosts outside known `APP_ENV`s; never seed,
    truncate or run destructive SQL against a remote database; migrations are additive (expand/contract).

## Decision log (owner decisions)

| Date       | Decision                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| 2026-11-07 | International buyers are the primary income; sell through a merchant of record (Dodo primary)                 |
| 2026-11-07 | Standby MoR to be chosen; Paddle ruled out (needs ≥ 14-day refunds)                                           |
| 2026-11-07 | Freemium per article; Pro monthly and yearly; regional price tiers A/B/C; prices still open                   |
| 2026-11-07 | Refunds: 7-day money-back guarantee, once per customer; EU/UK withdrawal waiver still captured at checkout    |
| 2026-11-07 | All ages; under-18 accounts need parental permission (logged in `consent_log`); under-13 supervised           |
| 2026-11-07 | No copying: browser deterrents, AI-crawler blocking, watermarks, takedowns; Copy for LLM removed              |
| 2026-11-07 | Founder email `dhanrajsahoo.work@gmail.com` on Contact, Refund, Terms and Privacy pages                       |
| 2026-11-07 | Monitoring on free tiers: Sentry, Cloudflare Web Analytics + Workers Observability, PostHog, Better Stack     |
| 2026-11-07 | Hosting: Cloudflare Workers via OpenNext; Neon Postgres via Hyperdrive; Google-only sign-in (Better Auth)     |
| 2026-11-07 | Separate from Mythical; every account owned by `dhanrajsahoo.work@gmail.com`                                  |
| 2026-11-07 | Fonts 3 → 2: keep Inter, drop Plus Jakarta Sans                                                               |
| 2026-11-07 | Docs rule: `README.md` for humans, `AGENTS.md` files for agents, no other prose docs                          |
| 2026-11-07 | Copy protection stays on for content areas; legal, pricing and contact pages stay copyable                    |
| Later      | Razorpay for India, i18n, a standby merchant of record (not started). Email (Resend + queue) and search exist |

Open: domain and brand, prices, which articles are free, seller entity, Neon region, GitHub org, launch sections.

## Glossary

- **Section kind**: the module that implements a section shape (`docs`, `question-bank`, `directory`, `problems`,
  `newsletter`) against the `SectionKind` contract in `apps/web/src/features/sections/kind.ts`.
- **Release state**: per section per environment. `on` built and listed; `hidden` built, unlisted, `noindex`, 404
  for everyone but admins; `off` not built (404).
- **Build profile**: a build for one `APP_ENV`. Section states are resolved at build, so CI builds both the preview
  and the production profile.
- **Kill switch**: the `SECTIONS_KILL` Worker secret (e.g. `dsa,cloud`); middleware answers 503 for those sections
  at once, no rebuild.
- **`tts_ent`**: the signed entitlement cookie (HS256 JWT, 15 minutes, `{sub, tier, role, v}`, key chosen by the
  `kid` header). Middleware verifies it without a database (`apps/web/src/server/edge/entitlement.ts`).
- **Entitlement**: what a user may read (`tier` free/pro); the source of truth is the `entitlement` table, written
  only from verified billing events.
- **Preview route**: the public cut-down version of a premium article that non-entitled requests are rewritten to.
- **Merchant of record (MoR)**: the seller of record to the buyer (Dodo); it charges, handles worldwide tax and
  refunds, and pays us out.
- **Asset ID**: an asset's path under `apps/web/assets/` without its extension, e.g. `<Img id="logos/companies/google" />`.
- **content-check**: `npm run content-check -w web`, the validator for registry, frontmatter, nav indexes,
  questions, links and assets; also runs inside every production build.
- **Test-login**: a non-production sign-in (`/api/test/login`, `x-test-login-key` header) for seeded users,
  because Google blocks automated sign-in. Production builds compile it to a plain 404.

## Architecture

```
Browser ─► Cloudflare edge ─► static assets (/_next/static, fonts, /_a/* optimised media)
                          └─► Worker (OpenNext): src/middleware.ts (SECTIONS_KILL → 503, off → 404,
                                 hidden → 404 unless tts_ent role=admin, x-app-version; NO database)
                                 ├─ free / entitled page ─► prerendered HTML (no database)
                                 ├─ premium, not entitled ─► rewrite to the public preview   (Planned, stream L)
                                 └─ /api/* (auth, account, progress, newsletter, test, vitals, health) ─► Postgres
```

Security headers and the report-only CSP come from `apps/web/next.config.ts` via
`apps/web/src/features/seo/security-headers.ts`, not from middleware.

**Build pipeline** (`npm run build`; `prebuild` runs first): `apps/web/scripts/content-dates.mjs` (last-updated
dates from git) → `apps/web/scripts/render-mermaid.mjs` (every Mermaid fence to light + dark SVG in headless
Chromium, cached) → `apps/web/scripts/build-assets.ts` (asset manifest, AVIF/WebP, SVGO, public vs private output)
→ `next build`, whose config writes the hidden-routes manifest for middleware and runs
`apps/web/scripts/content-check.ts` before rendering → `npm run cf:build -w web` (OpenNext Worker bundle; deploy
only). Build outputs (src/generated/, .build-cache/, public/\_a/) are gitignored.

**Data model at a glance** (Postgres, `apps/web/src/server/db/schema/`): auth `user`, `session`, `account`,
`verification`; billing `customer`, `subscription`, `entitlement`, `payment`, `fx_rate`, `webhook_event`, view
`current_entitlement`; account data `consent_log`, `progress`, `bookmark`, `audit_log`; newsletter
`newsletter_subscriber`, `newsletter_event`. IDs are UUIDv7 made in the app.

**Where logic lives:**

| Kind of logic                             | Where                                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Routing only (thin pages)                 | `apps/web/src/app/`                                                                                |
| Section registry, kinds, nav              | `apps/web/src/features/sections/`, `apps/web/src/features/docs/`                                   |
| Kind modules with own routes              | `apps/web/src/features/dsa/`, `apps/web/src/features/newsletter/`                                  |
| Interview Practice page views and SEO     | `apps/web/src/features/interviews/`, `apps/web/src/lib/question-bank.ts`                           |
| MDX compile, loaders, icons               | `apps/web/src/lib/mdx-doc.tsx`, `apps/web/src/lib/icons.ts`                                        |
| Edge (middleware imports only this)       | `apps/web/src/server/edge/`                                                                        |
| API wrapper, env, logs                    | `apps/web/src/server/http.ts`, `apps/web/src/server/env.ts`, `apps/web/src/server/log.ts`          |
| Database client, schema, migrations       | `apps/web/src/server/db/`, `apps/web/drizzle/`                                                     |
| Sign-in, sessions, account, progress      | `apps/web/src/features/auth/`, `apps/web/src/features/account/`, `apps/web/src/features/progress/` |
| Practice ratings and interview stories    | `apps/web/src/features/practice/`, `apps/web/src/lib/practice-sync.ts`                             |
| SEO, headers, OG, JSON-LD                 | `apps/web/src/features/seo/`                                                                       |
| Monitoring and analytics (off by default) | `apps/web/src/features/observability/`, `apps/web/src/features/analytics/`                         |
| Business placeholders, crawler list       | `apps/web/src/config/business.ts`, `apps/web/src/config/crawlers.ts`                               |
| Regional price tiers (country → A/B/C)    | `apps/web/src/config/pricing-tiers.ts` (pricing page, middleware, billing reporting)               |
| UI components                             | `apps/web/src/components/` (mdx, article, diagrams, teach, cloud, db, ui)                          |

## Repo map

```
AGENTS.md · CLAUDE.md (@AGENTS.md) · README.md · knip.ts · .claude/skills/
.github/workflows/      ci.yml (checks, two build profiles, E2E with Postgres, visual, a11y, leak, size,
                        Lighthouse, gitleaks, semgrep, osv), deploy.yml, preview.yml (unprivileged PR build) +
                        preview-deploy.yml (trusted workflow_run upload), newsletter-send.yml (main only)
apps/web/
  content/              sections.yaml, features.yaml, one folder per section, question-bank, companies, pages
  assets/               asset library (brand, images, diagrams, logos, icons, og, downloads, LICENSES.yaml)
  src/app/ · src/features/ · src/server/ · src/components/ · src/lib/ · src/config/ · src/middleware.ts
  scripts/              content-check.ts, build-assets.ts, render-mermaid.mjs, check-agents-md.ts
  drizzle/              SQL migrations · tests/unit/ · tests/e2e/ · tests/fixtures/
  wrangler.jsonc · worker.mjs (Worker entry: OpenNext's handler + Sentry) · open-next.config.ts · next.config.ts
  docker-compose.dev.yml (local Postgres only)
```

## Commands

Run from the repo root (Node 22, see `.nvmrc`; npm only, `npm ci` with the committed lockfile). App scripts take
`-w web`.

| Command                                                            | What it does                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `npm run dev`                                                      | Dev server on http://localhost:3001                                      |
| `npm run build`                                                    | Production build (no env vars needed; `APP_ENV` picks section states)    |
| `npm run typecheck` · `npm run lint`                               | `tsc --noEmit` · ESLint                                                  |
| `npm run format` / `npm run format:check`                          | Prettier write / check                                                   |
| `npm test`                                                         | Vitest unit + integration (DB tests skip without Docker)                 |
| `npm run content-check -w web`                                     | Validates registry, frontmatter, nav index, questions, assets, links     |
| `npm run e2e:chromium -w web`                                      | Playwright on Chromium (what CI runs); needs a build first               |
| `npm run size -w web`                                              | First-load JS budgets per route type                                     |
| `npm run db:up -w web` · `npm run db:migrate -w web`               | Local Postgres (Docker) · apply migrations (local/preview only)          |
| `npm run db:generate -w web` · `npm run db:seed:test -w web`       | New migration from the schema diff · seed test users (local only)        |
| `npm run asset:new -w web` · `npm run asset:find -w web`           | Scaffold an asset with its sidecar · search the library                  |
| `npm run preview -w web`                                           | Cloudflare Workers build + local preview (no account needed)             |
| `npm run knip` · `npm run check:agents-md` · `npm run check:brand` | Unused code/deps · checks every agent doc · blocks the former brand name |

Before you finish, follow `.claude/skills/review-before-merge/SKILL.md`.

## How to build a good feature here

1. **Registry first.** Anything per section reads `apps/web/content/sections.yaml` through the registry helpers;
   never write a section key in shared code.
2. **No DB on read paths.** Pages are static; data the page needs is computed at build. User state goes through
   `/api/*` from a small client island.
3. **API routes** use `route` from `apps/web/src/features/auth/index.ts` with a zod body, an `auth` level and a
   `rateLimit` name (`.claude/skills/add-api-route/SKILL.md`).
4. **Zod** for every input you didn't write: env, frontmatter, bodies, webhooks.
5. **Tests per layer:** pure logic in colocated `*.test.ts`; DB code against Docker Postgres
   (`apps/web/src/server/db/testing.ts`); pages and journeys in `apps/web/tests/e2e/` tagged `@smoke`, `@core` or
   `@full`.
6. **Budgets:** client code goes in `*.client.tsx` islands, lazy-loaded where possible; check `npm run size -w web`.
7. **Leak suite:** anything premium gets a case in `apps/web/tests/e2e/leak.spec.ts` (canary in
   `apps/web/tests/fixtures/content/system-design/leak-canary/premium-article.mdx`).
8. **Copy protection:** content areas stay protected; mark copyable UI with `data-copy-ok`.
9. **Accessibility:** keyboard, focus, contrast, alt text; `apps/web/tests/e2e/a11y.spec.ts` runs axe.
10. **Metadata:** every page sets title, description and canonical through `apps/web/src/features/seo/metadata.ts`;
    `hidden` sections get `noindex`.
11. **Release states:** new sections start `off` in production and go `off` → `hidden` → `on` by PR.
12. **Docs:** update the nearest `AGENTS.md` and any skill whose steps changed; keep `npm run check:agents-md` green.

## Runbooks

All production commands below need the owner's Cloudflare token; agents prepare the PR or the command, the owner
runs it.

- **Rollback:** `.github/workflows/deploy.yml` rolls back automatically when smoke tests fail. By hand: list versions with
  `npx wrangler deployments list --env production`, then `npx wrangler rollback <version-id> --env production
--message "<why>"` from `apps/web`. Then revert the bad commit on `main`.
- **Section kill switch:** `npx wrangler secret put SECTIONS_KILL --env production` with `dsa` (comma-separated
  keys); 503 immediately (pages through middleware; the newsletter API checks it too). Undo with `npx wrangler secret delete SECTIONS_KILL --env production`. Follow up with a PR
  setting the section's `release.production` to `off` (`.claude/skills/release-section/SKILL.md`).
- **Neon outage:** content pages, middleware and the paywall gate keep working (no database). Sign-in, account,
  progress and newsletter APIs return 5xx; Pro readers keep access until their `tts_ent` expires (≤ 15 min) and
  then see previews until the refresh endpoint can read the database again. Watch Neon status; no action in code.
- **Restore from backup:** Neon point-in-time restore into a new branch, verify with the smoke suite against it,
  then point Hyperdrive at it (owner, in the Neon and Cloudflare consoles). Never restore over production in place.
- **Secret rotation (`tts_ent`):** values are `<kid>:<base64url 32+ bytes>`. Put the current value into
  `ENTITLEMENT_SECRET_PREVIOUS`, a new kid and key into `ENTITLEMENT_SECRET`, wait ≥ 17 minutes (15 min lifetime +
  2 min skew), then delete `ENTITLEMENT_SECRET_PREVIOUS`. Nobody is signed out. Rotating `BETTER_AUTH_SECRET` signs
  everyone out. `NEWSLETTER_TOKEN_SECRET` has no previous-key slot: rotating it breaks every unsubscribe link already
  sent, so don't, until a keyring is added.
- **Incident / post-mortem:** triage → contain (kill switch, rotate secrets, revoke sessions) → assess data exposure
  → notify users and authorities within GDPR (72 h) and DPDP timelines → blameless post-mortem with dated action
  items, each a linked PR; turn lessons into rules in this file.

## Owner-only tasks (never done by agents)

Create or sign in to any account (GitHub org, Cloudflare, Neon, Google Cloud, Dodo, standby MoR, Sentry, PostHog,
Better Stack, Resend); add secrets to GitHub environments or `wrangler secret put`; buy the domain; approve
production deploys and `release.production` changes; run `apps/web/src/server/db/sql/roles.sql`; restore backups;
answer MoR KYC; set prices and free articles.

## Environments and secrets (names only)

`APP_ENV` (`local | preview | staging | production`, set per Wrangler environment). Database: `DATABASE_URL`,
`DATABASE_URL_DIRECT` (CI migrations). Auth: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `TRUSTED_ORIGINS`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; test only: `ENABLE_TEST_LOGIN`, `TEST_LOGIN_KEY`. Edge:
`ENTITLEMENT_SECRET`, `ENTITLEMENT_SECRET_PREVIOUS`, `SECTIONS_KILL`, `SMOKE_KEY` (deploy smoke tests reach
production on workers.dev; every other non-canonical host redirects to `BETTER_AUTH_URL`). Newsletter/email: `NEWSLETTER_TOKEN_SECRET`,
`RESEND_API_KEY`, `RESEND_SEGMENT_ID`, `RESEND_PRO_SEGMENT_ID`. Observability (all optional, off when unset):
`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`,
`NEXT_PUBLIC_CF_BEACON_TOKEN`, `SENTRY_AUTH_TOKEN`. Deploy: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (GitHub
environments).

## Testing expectations

- Unit: pure logic (loaders, registry, schemas, entitlement and billing state machines); billing, entitlements and
  middleware ≥ 90% line coverage. Integration tests run against Docker Postgres (`REQUIRE_DB=1` in CI).
- E2E: route crawl on both build profiles, registry contract, auth and account (test-login), DSA runner,
  newsletter double opt-in, observability off-by-default, SEO, edge gate, paywall-leak suite, axe, visual snapshots.
  CI retries 2; flaky tests get fixed or deleted.
- Known flaky: a rare React hydration error #418 under parallel load drops the font preload link
  (`apps/web/tests/e2e/fonts-prefetch.spec.ts`); investigate if it recurs.

## Branches

Work on a feature branch from `development`; PR into `development` (deploys to staging); `main` is the release
branch (deploys to production after review). Workflows, middleware, billing, entitlements, auth, the database layer
and the section registry need code-owner review (`.github/CODEOWNERS`).

## Planned

**Not built yet**; the AGENTS.md check skips this section. Move an item up when it lands.

- Paywall + billing (stream L): `apps/web/src/features/billing/`, `apps/web/src/features/entitlements/`,
  `apps/web/src/features/paywall/` (provider port, Dodo adapter, webhooks), `/api/entitlements/refresh`, premium
  previews, `/account/billing`, `/checkout` consent step, `paywall` switch in `features.yaml`, their `AGENTS.md`.
- Runbooks that need billing: **webhook backlog** (provider retries; find unprocessed or failed `webhook_event` rows,
  fix the cause, replay from the provider dashboard, let reconciliation correct drift) and **Dodo outage** (existing
  Pro access is unaffected because `tts_ent` refresh reads our database; checkout shows "try again later"; `on_hold`
  subscriptions keep a 7-day grace; switch `BILLING_PRIMARY` to the standby once one exists).
- `/admin` dashboards; nightly `pg_dump` backup workflow and restore drill; DSA stage C judge; newsletter Turnstile,
  Postgres store, bounce webhooks; `eslint-plugin-boundaries`; R2 + regional cache; creating
  the Hyperdrive configs and Analytics Engine datasets (owner; the code already reads both bindings when present).
