---
name: release-section
description: Use when changing a section's release state (off, hidden, on) in any environment, launching a section to production, or turning one off in an emergency.
---

# Release (or pull) a section

Background: release states in `apps/web/content/sections.yaml` (`on` built and listed; `hidden` built, unlisted,
admins only, `noindex`; `off` not built). States are resolved at build, so a change needs a deploy.

1. **One section, one field, one PR.** Change only `release.production` (or the one environment you mean) for that
   section. CODEOWNERS approval is required; the owner merges.
   - Good: a PR whose whole diff is `production: off` → `production: hidden` for `dsa`
   - Bad: flipping two sections, or bundling a release with content or code changes

2. **Go in steps:** `off` → `hidden` (review on the real production site as admin) → `on`. Skipping `hidden` needs
   the owner's explicit OK.

3. **Fill the launch checklist in the PR body** (`.github/pull_request_template.md`): content complete (only
   intended outlines), content-check clean, the section's E2E green, Lighthouse budgets met on its heaviest page,
   premium/free split decided by the owner, leak suite covering its premium items, nav label and order final.

4. **Prove it on the production profile:** `APP_ENV=production npm run build`, then `npm run e2e:chromium -w web`
   (`apps/web/tests/e2e/sections.profile.spec.ts` asserts on → 200 and in nav, hidden → 404 for anonymous, off →
   404). CI's `e2e-production-profile` job must be green.

5. **Emergency off needs no rebuild.** The owner runs, from `apps/web`:
   `npx wrangler secret put SECTIONS_KILL --env production` with a comma-separated list such as `dsa,cloud`
   (503 maintenance page at once). Undo with `npx wrangler secret delete SECTIONS_KILL --env production`. Then open
   the PR that sets the section `off`, so the next deploy matches.
   - Bad: an agent running wrangler against production, or editing `apps/web/content/sections.yaml` and expecting it to take effect
     without a deploy

6. **Never read `APP_ENV` yourself** to hide something; everything follows the registry
   (`visibleSections()`, `sectionState()`).
