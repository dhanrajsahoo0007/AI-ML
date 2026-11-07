# AGENTS.md

Instructions for coding agents working in this repo. Humans start with `README.md`. Keep this file short and true:
`npm run check:agents-md` (run in CI) fails if a backticked path or npm script below doesn't exist. Paths that are
planned but not built yet go under the **Planned** heading at the end, which the check skips.

## What this is

**Origins AI Learn**: a learning site for AI system design, system design, cloud architecture and interview
practice. A Next.js 15 (App Router) app in `apps/web`. Content is MDX and YAML in `apps/web/content`, compiled at
build time. It is becoming a public, **paid** product (freemium per article, monthly/yearly subscription) served
from Cloudflare Workers (OpenNext) with Neon Postgres used only for sign-in, billing and progress.

Request paths (target):

```
Browser ─► Cloudflare edge ─► static assets (/_next/static, fonts, svgs)
                          └─► Worker: middleware.ts (headers, signed entitlement cookie; NO database)
                                 ├─ free / entitled page ─► cached HTML (no database)
                                 ├─ premium, not entitled ─► rewrite to the cached public preview
                                 └─ /api/auth · /api/billing · /api/entitlements ─► Neon via Hyperdrive
```

## Golden rules

1. **No database in page renders or middleware.** Pages are static or cached; database access is allowed only in
   `/api/*` route handlers and state-changing server actions. `npm run build` must succeed with **no environment
   variables**.
2. **Premium content never reaches a non-entitled response**: not in HTML, RSC payloads, JSON, sitemaps, search
   indexes, OG images or logs. The server decides; never trust a client flag or a checkout redirect.
3. **Content lives in `apps/web/content/` only.** Reusable media (images, diagrams, logos, downloads) goes in the
   asset library (see Planned) and is referenced by ID; don't paste images into `apps/web/public/`.
4. **Sections are added only through the section registry** (being built, see Planned). Until it lands,
   use the switches in `apps/web/src/config/features.ts`; don't add new hard-coded section lists.
5. **Separate project.** Never use, copy or reference anything from Mythical (`/Users/dhanraj/Workspace/mythical-*`):
   no accounts, infrastructure, code, config, workflows or secrets.
6. **All third-party accounts belong to `dhanrajsahoo.work@gmail.com`.** Agents never create accounts, sign up,
   enter passwords or add secrets; ask the owner. Secret names may be documented, values never.
7. **No copying features.** The site must not offer ways to copy or export article content (no "Copy for LLM",
   no raw-markdown endpoints; the existing ones are being removed). Copy protection is an owner decision (2026-11-07).
8. **Zod at every trust boundary** (env, frontmatter, request bodies, webhook payloads); no `any`.
9. **Every bug fix lands with a test that would have caught it.**
10. Keep the dependency surface small: `npm run knip` must stay clean; add a dependency only when it's used.

## Repo map (current)

```
AGENTS.md · CLAUDE.md (@AGENTS.md) · README.md
package.json            npm workspaces root; format, knip and the scripts that forward to apps/web
knip.ts · .prettierrc.json · .prettierignore · osv-scanner.toml · .gitleaksignore · .pre-commit-config.yaml
.github/                ci.yml, CODEOWNERS, renovate.json, pull_request_template.md
apps/web/
  content/              MDX + YAML: ai-system-design, system-design, cloud, ml-system-design (parked),
                        question-bank (taxonomy + one YAML per category + articles.yaml), companies
  src/app/              routes: one folder per section, interviews/, companies/, layout.tsx, page.tsx
  src/components/       UI: site-header, content-shell, mdx/, article/, diagrams/, cloud/, db/, ui/
  src/lib/              loaders and helpers: mdx-doc.tsx, nav-tree.ts, question-bank.ts, icons.ts
  src/config/           site.ts, features.ts (section switches)
  scripts/              check-agents-md.ts
  tests/unit/           Vitest unit tests (colocated `*.test.ts` under src/ also run)
  tests/e2e/            Playwright: routes.crawl.spec.ts, a11y.spec.ts
  vitest.config.ts · playwright.config.ts · eslint.config.mjs · next.config.ts
```

Files to know: `apps/web/src/lib/mdx-doc.tsx` (loads and compiles MDX), `apps/web/src/lib/question-bank.ts`
(interview library), `apps/web/src/lib/icons.ts` (icon names allowed in MDX), `apps/web/src/config/features.ts`.

## Commands

Run from the repo root (Node 22, see `.nvmrc`; npm only, `npm ci` with the committed lockfile).

| Command                                   | What it does                                          |
| ----------------------------------------- | ----------------------------------------------------- |
| `npm run dev`                             | Dev server on http://localhost:3001                   |
| `npm run build`                           | Production build (no env vars needed)                 |
| `npm run start`                           | Serve the production build                            |
| `npm run typecheck`                       | `tsc --noEmit`                                        |
| `npm run lint`                            | ESLint (`eslint .`)                                   |
| `npm run format` / `npm run format:check` | Prettier write / check                                |
| `npm test`                                | Vitest unit tests                                     |
| `npm run e2e`                             | Playwright, all browsers; needs `npm run build` first |
| `npm run e2e:chromium -w web`             | E2E on Chromium only (what CI runs)                   |
| `npm run knip`                            | Unused files, dependencies and exports                |
| `npm run check:agents-md`                 | Checks the paths and scripts named in this file       |

Before you finish: `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`, plus
`npm run e2e:chromium -w web` when you touched pages, routes or content.

## Recipes (current system)

- **Add an article:** create `apps/web/content/<section>/<hub>/<slug>.mdx` and add a
  `<ModelCard title icon description href>` to `apps/web/content/<section>/<hub>.mdx`. Icons must exist in
  `apps/web/src/lib/icons.ts`. Quote frontmatter values that contain a colon. Outline pages carry
  `status: outline` (frontmatter) and `status="outline"` (hub card); remove both when the article is written.
- **Add interview questions:** add them to the category file in `apps/web/content/question-bank/`. Articles with
  `<InterviewQuestion>` blocks must be mapped in `apps/web/content/question-bank/articles.yaml` or the build fails.
- **Park or show a section:** flip its switch in `apps/web/src/config/features.ts` (temporary; replaced by the
  registry, see Planned).
- **Add a unit test:** colocate a `*.test.ts` file next to the code or add it under `apps/web/tests/unit/`. Pure logic
  only; `server-only` is stubbed (see `apps/web/vitest.config.ts`).
- **Add an E2E test:** add a spec in `apps/web/tests/e2e/` and tag the title `@smoke`, `@core` or `@full`. The crawl
  reads its URL list from the build manifest, so new pages are covered automatically.
- **Add a dependency:** `npm install <pkg> -w web`, use it, then `npm run knip`. Renovate (weekly, grouped) keeps
  it updated; security fixes arrive at any time.
- **A security scan flags a dependency:** upgrade it. Only if no fix exists, add an entry with a reason and an expiry
  date to `osv-scanner.toml` in a reviewed PR.

## Testing expectations

- Unit (Vitest): pure logic such as loaders, nav building, schemas, entitlement and billing state machines.
  Billing, entitlements and middleware will need ≥ 90% line coverage.
- E2E (Playwright, `apps/web/tests/e2e/`): the route crawl (every built page returns 200 with an `<h1>`, a `<title>`
  and no console errors; switched-off sections 404), axe checks (no new serious or critical violations), and later
  sign-in, paywall, checkout and the paywall-leak suite.
- CI (`.github/workflows/ci.yml`, on PRs to `development` and `main`): typecheck, lint, format, test, knip, build,
  crawl + axe on Chromium, gitleaks, Semgrep and OSV-Scanner. Retries: 2 in CI, 0 locally; flaky tests get fixed or
  deleted, not ignored.

## Branches

Work on a feature branch from `development`; PR into `development`. `main` is the release branch. Workflows,
middleware, billing, entitlements, auth, the database layer and the section registry need code-owner review
(`.github/CODEOWNERS`).

## Planned

Target structure from the platform plan. **Not built yet**; the AGENTS.md check skips this section. Move an item
up into the sections above when it lands.

- Section registry: `apps/web/content/sections.yaml` (kinds, per-environment release `on | hidden | off`),
  `apps/web/src/features/sections/`, one dynamic route `apps/web/src/app/(content)/[section]/`, and
  `apps/web/scripts/content-check.ts` (`npm run content-check`).
- Feature slices under `apps/web/src/features/`: `content`, `docs`, `interviews`, `companies`, `auth`, `billing`,
  `entitlements`, `progress`, `analytics`, `content-protection`. Each exposes its API through `index.ts`.
- Server-only code in `apps/web/src/server/` (`env.ts`, `db/`, `log.ts`, `http.ts`, `edge/`); `middleware.ts` may
  import only `apps/web/src/server/edge/`. Import rules enforced with `eslint-plugin-boundaries`.
- Asset library in `apps/web/assets/` with `npm run asset:new` / `npm run asset:find`.
- Cloudflare: `apps/web/wrangler.jsonc`, `apps/web/open-next.config.ts`, `npm run preview`, `deploy.yml`.
- Database: `npm run db:generate`, `npm run db:migrate` (local/preview only), additive-only migrations.
- Planned recipes: add a section of an existing kind (registry entry + content folder, no code); add a section kind;
  release a section `off` → `hidden` → `on` (kill switch `SECTIONS_KILL`); mark an article premium; add an API
  route (zod + auth + rate limit); add a DB table; add a billing event; add an analytics event.
- Environments and secrets (names only), performance budgets and SLOs (p75 free-page TTFB ≤ 100 ms, LCP ≤ 1.5 s,
  INP ≤ 100 ms, CLS ≤ 0.05; 99.9% availability), release and rollback.
