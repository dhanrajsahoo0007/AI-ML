# AGENTS.md

Instructions for coding agents working in this repo. Humans start with `README.md`. Keep this file short and true:
`npm run check:agents-md` (run in CI) fails if a backticked path or npm script below doesn't exist. Paths that are
planned but not built yet go under the **Planned** heading at the end, which the check skips.

## What this is

**Origins AI Learn**: a learning site for GenAI & LLM systems, classic system design, cloud architecture, interview
practice, company questions, DSA and a newsletter. A Next.js 15 (App Router) app in `apps/web`. Content is MDX and
YAML in `apps/web/content`, compiled at build time. It is a public, **paid** product (freemium per article,
monthly/yearly subscription, international buyers through a merchant of record) served from Cloudflare Workers
(OpenNext) with Neon Postgres used only for sign-in, billing, progress and the newsletter.

Request paths:

```
Browser ─► Cloudflare edge ─► static assets (/_next/static, fonts, /_a/* optimised media)
                          └─► Worker: src/middleware.ts (headers, hidden/off sections, kill switch,
                                 signed entitlement cookie; NO database)
                                 ├─ free / entitled page ─► prerendered HTML (no database)
                                 ├─ premium, not entitled ─► rewrite to the public preview
                                 └─ /api/* (auth, account, progress, newsletter, billing) ─► Postgres
```

## Golden rules

1. **No database in page renders or middleware.** Content pages are prerendered; database access is allowed only
   in `/api/*` route handlers and the account pages. `npm run build` must succeed with **no environment variables**.
2. **Premium content never reaches a non-entitled response**: not in HTML, RSC payloads, JSON, sitemaps, search
   indexes, OG images, emails, RSS or logs. The server decides; never trust a client flag or a checkout redirect.
3. **Content lives in `apps/web/content/` only; reusable media lives in `apps/web/assets/` only**, referenced by ID
   (`<Img id>`, `<Figure id>`, `<Mermaid ref>`, `<TechIcon id>`, `<Download id>`). Never paste files into
   `apps/web/public/`.
4. **Sections exist only through `apps/web/content/sections.yaml`.** Each has a `kind` and a `release` state per
   environment (`on | hidden | off`). Shared code loops over the registry (`apps/web/src/features/sections/`);
   a unit test fails on section-key string literals outside the registry and kind modules.
5. **Separate project.** Never use, copy or reference anything from Mythical (`/Users/dhanraj/Workspace/mythical-*`):
   no accounts, infrastructure, code, config, workflows or secrets.
6. **All third-party accounts belong to `dhanrajsahoo.work@gmail.com`.** Agents never create accounts, sign up,
   enter passwords or add secrets; ask the owner. Secret names may be documented, values never.
7. **No copying features.** No "Copy for LLM", raw-markdown endpoints, copy buttons or full-text feeds. Copy
   protection (`apps/web/src/features/content-protection/`) stays on for content areas (owner decision 2026-11-07).
8. **Zod at every trust boundary** (env, frontmatter, request bodies, webhook payloads); no `any`. Every API route
   goes through the `route()` wrapper (`apps/web/src/server/http.ts`): zod body, auth/role, Origin check, rate-limit
   hook, `no-store`, uniform errors.
9. **Every bug fix lands with a test that would have caught it.**
10. Keep the dependency surface small: `npm run knip` must stay clean; add a dependency only when it's used.
11. **Production data safety:** the DB boot guard refuses non-local hosts outside known `APP_ENV`s; never seed,
    truncate or run destructive SQL against a remote database; migrations are additive (expand/contract).

## Repo map

```
AGENTS.md · CLAUDE.md (@AGENTS.md) · README.md
package.json            npm workspaces root; format, knip and scripts forwarding to apps/web
.github/workflows/      ci.yml (checks, two build profiles, E2E with Postgres, visual, a11y, leak, size,
                        Lighthouse), deploy.yml + preview.yml (Cloudflare, skip without tokens), newsletter-send.yml
apps/web/
  content/              sections.yaml (registry), features.yaml (non-section switches), one folder per section
                        (ai-system-design, system-design, cloud, dsa, newsletter, ml-system-design), question-bank,
                        companies, pages (legal pages)
  assets/               asset library: brand, images, diagrams (mermaid, excalidraw, animated, svg), logos, icons,
                        og, downloads, LICENSES.yaml, remote.yaml (large files kept in R2)
  src/app/              routes: (content)/[section] (all docs sections), interviews, companies, dsa, newsletter,
                        pricing, legal, contact, security, sign-in, account, api, sitemap.ts, robots.ts
  src/features/         vertical slices: sections, docs, dsa, newsletter, email, auth, account, progress, seo,
                        observability, analytics, content-protection, pages
  src/server/           server-only: env.ts, http.ts (route wrapper), log.ts, db/ (Drizzle client, schema,
                        migrations runner, boot guard), edge/ (the only server code middleware may import)
  src/middleware.ts     hidden/off sections, SECTIONS_KILL, entitlement cookie verification; no DB, no Node APIs
  src/components/       UI: site-header, content-shell, mdx/, article/, diagrams/, cloud/, db/, ui/
  src/lib/              loaders and helpers: mdx-doc.tsx, nav-tree.ts, question-bank.ts, icons.ts
  scripts/              content-check.ts, build-assets.ts, render-mermaid.mjs, check-agents-md.ts
  drizzle/              SQL migrations (generated by drizzle-kit)
  tests/unit/ · tests/e2e/ · tests/fixtures/
  wrangler.jsonc · open-next.config.ts · next.config.ts · docker-compose.dev.yml (local Postgres only)
```

## Commands

Run from the repo root (Node 22, see `.nvmrc`; npm only, `npm ci` with the committed lockfile). App scripts take
`-w web`.

| Command                                                  | What it does                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| `npm run dev`                                            | Dev server on http://localhost:3001                                   |
| `npm run build`                                          | Production build (no env vars needed; `APP_ENV` picks section states) |
| `npm run typecheck` · `npm run lint`                     | `tsc --noEmit` · ESLint                                               |
| `npm run format` / `npm run format:check`                | Prettier write / check                                                |
| `npm test`                                               | Vitest unit + integration (DB tests skip without Docker)              |
| `npm run content-check -w web`                           | Validates registry, frontmatter, nav index, questions, assets, links  |
| `npm run e2e:chromium -w web`                            | Playwright on Chromium (what CI runs); needs a build first            |
| `npm run size -w web`                                    | First-load JS budgets per route type                                  |
| `npm run db:up -w web` · `npm run db:migrate -w web`     | Local Postgres (Docker) · apply migrations (local/preview only)       |
| `npm run asset:new -w web` · `npm run asset:find -w web` | Scaffold an asset with its sidecar · search the library               |
| `npm run preview -w web`                                 | Cloudflare Workers build + local preview (no account needed)          |
| `npm run knip` · `npm run check:agents-md`               | Unused code/deps · checks this file                                   |

Before you finish: typecheck, lint, format:check, test, `content-check`, build with `APP_ENV=production`, and the
Chromium E2E suite when you touched pages, routes, content or middleware.

## Recipes

- **Add an article:** create `apps/web/content/<section>/<hub>/<slug>.mdx` (frontmatter validated: `title`,
  `description` ≤ 160 chars, optional `access`, `status`) and list it in the hub's nav index `apps/web/content/<section>/_index.yaml`. Icons must exist
  in `apps/web/src/lib/icons.ts`. Outline pages carry `status: outline`.
- **Add a section of an existing kind:** add an entry to `apps/web/content/sections.yaml` and a content folder.
  No code.
- **Release a section:** change only its `release.production` (`off` → `hidden` → `on`) in a PR with the launch
  checklist; code-owner approval required. Emergency off without a rebuild: the `SECTIONS_KILL` Worker variable.
- **Add interview questions:** add them to the category file in `apps/web/content/question-bank/`; articles with
  `<InterviewQuestion>` blocks must be mapped in `apps/web/content/question-bank/articles.yaml`.
- **Add or reuse an asset:** `npm run asset:new -w web`, fill its `<slug>.meta.yaml` sidecar (`alt` and licence required),
  reference it by ID. Third-party packs need an entry in `apps/web/assets/LICENSES.yaml`.
- **Add an API route:** use the `route()` wrapper with a zod schema, an auth/role rule and a rate-limit key.
- **Add a DB table:** edit the schema under `apps/web/src/server/db/`, run `npm run db:generate -w web`, keep the
  migration additive, add integration tests.
- **Add an analytics event:** add it to the catalogue in `apps/web/src/features/analytics/events.ts`; `track()` is
  a no-op until the PostHog key exists.
- **Add an E2E test:** add a spec in `apps/web/tests/e2e/`, tag it `@smoke`, `@core` or `@full`. The crawl reads URLs
  from the build manifest, so new pages are covered automatically.

## Testing expectations

- Unit: pure logic (loaders, registry, schemas, entitlement and billing state machines); billing, entitlements and
  middleware ≥ 90% line coverage. Integration tests run against Docker Postgres.
- E2E: route crawl on both build profiles (preview + production), registry contract, auth and account (test-login
  provider, non-production only), DSA runner, newsletter double opt-in, observability off-by-default, SEO, edge
  gate, paywall-leak suite, axe, visual snapshots. CI retries 2; flaky tests get fixed or deleted.
- Known flaky: a rare React hydration error #418 under parallel load drops the font preload link
  (`tests/e2e/fonts-prefetch.spec.ts`); not reproducible with 64 parallel loads locally; investigate if it recurs.

## Environments and secrets (names only)

`APP_ENV` (`local | preview | staging | production`, set per Wrangler environment). Database: `DATABASE_URL`,
`DATABASE_URL_DIRECT` (CI migrations). Auth: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `TRUSTED_ORIGINS`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; test only: `ENABLE_TEST_LOGIN`, `TEST_LOGIN_KEY`. Edge:
`ENTITLEMENT_SECRET`, `ENTITLEMENT_SECRET_PREVIOUS`, `SECTIONS_KILL`. Newsletter/email: `NEWSLETTER_TOKEN_SECRET`,
`RESEND_API_KEY`. Observability (all optional, off when unset): `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`,
`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_CF_BEACON_TOKEN`, `SENTRY_AUTH_TOKEN`. Deploy: `CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID` (GitHub environments).

Budgets and SLOs: article first-load JS ≤ 150 kB (today ~137 kB); p75 free-page TTFB ≤ 100 ms, LCP ≤ 1.5 s,
INP ≤ 100 ms, CLS ≤ 0.05; 99.9% availability.

## Branches

Work on a feature branch from `development`; PR into `development` (deploys to staging); `main` is the release
branch (deploys to production after review). Workflows, middleware, billing, entitlements, auth, the database layer
and the section registry need code-owner review (`.github/CODEOWNERS`).

## Planned

**Not built yet**; the AGENTS.md check skips this section. Move an item up when it lands.

- Paywall + billing: `apps/web/src/features/billing/` (provider port, Dodo adapter, webhooks), entitlement refresh
  endpoint, premium previews, `/account/billing`, `/checkout` consent step, `paywall` switch in `features.yaml`.
- `/admin` dashboards (KPIs, MRR in USD by country, webhook health), asset browser, section states.
- DSA stage C (hidden-test judge in a separate sandbox service); newsletter Turnstile, Queue sending, bounce webhooks.
- `eslint-plugin-boundaries` import rules; Analytics Engine writes; Sentry on the Worker entry; R2 + regional cache.
