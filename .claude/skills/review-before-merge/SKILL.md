---
name: review-before-merge
description: Use when finishing any change, before committing a finished piece of work or opening or reviewing a pull request into development or main.
---

# Review before merge

Run from the repo root. Paste the commands you ran and their results into the PR's "How it was tested".

1. **Static checks (always):** `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run knip`,
   `npm run check:agents-md`.

2. **Tests (always):** `npm test`. With Docker running (`npm run db:up -w web`) the DB-backed tests run too; a DB
   change must be tested that way.

3. **Content (when content, assets or the registry changed):** `npm run content-check -w web`, no new errors.

4. **Builds (when pages, routes, content, config or middleware changed):** `npm run build` and
   `APP_ENV=production npm run build`. Both must pass with **no environment variables** set.

5. **E2E (when pages, routes, content or middleware changed):** after a build, `npm run e2e:chromium -w web`.
   UI changes: regenerate visual baselines with `npm run e2e:visual:update -w web` (Docker) and review the PNG diffs.

6. **Budgets (when client code changed):** `npm run size -w web` after a build; article first-load JS ≤ 150 kB.

7. **Review the diff against the golden rules in the root `AGENTS.md`:**
   - no database in page renders or middleware; build works with no env vars
   - no premium content in a non-entitled response (HTML, RSC, JSON, sitemap, OG, RSS, emails, logs)
   - new API routes use `route` with zod, auth and a rate limit
   - no section-key literals in shared code; media referenced by ID; nothing added to `apps/web/public/`
   - no copy buttons or full-text feeds; copy protection intact; axe still green
   - no secrets, tokens, account IDs or anything from Mythical; secret names only
   - migrations additive; new dependencies actually used
   - a bug fix includes the test that would have caught it

8. **Docs:** update the nearest `AGENTS.md` and any skill whose steps changed.

9. **Commits and branches:** small commits with clear messages; work on a feature branch from `development`, PR
   into `development`. Don't push, merge or deploy unless asked; production deploys and `release.production`
   changes need the owner.
   - Bad: "fix stuff" commits, or a PR mixing a release-state flip with code changes
