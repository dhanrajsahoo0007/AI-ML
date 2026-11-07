---
name: add-section
description: Use when adding a new section (a new docs area, or a new section of an existing kind) to the site through apps/web/content/sections.yaml.
---

# Add a section

Background: `apps/web/src/features/sections/AGENTS.md`. A section of an existing kind needs **no code**.

1. **Pick an existing kind first** (`docs`, `question-bank`, `directory`, `problems`, `newsletter`). A new kind is a
   code change (new `SectionKind` module, route folder, tests); stop and confirm with the owner before starting one.

2. **Add one registry entry** to `apps/web/content/sections.yaml`. `key` is kebab-case and equals the URL segment
   and the content folder; `href` is `/<key>`; `icon` is a key in `apps/web/src/lib/icons.ts`; `navGroup` is
   `learn | practice | more`; `order` places it; `owner: dhanraj`.
   - Good: `key: data-engineering`, `href: /data-engineering`
   - Bad: `key: dataEngineering` or `href: /data/engineering`

3. **Start hidden from users in production.** New sections ship with
   `release: { local: on, preview: on, staging: on, production: off }`. Turning production on is a separate PR
   (`.claude/skills/release-section/SKILL.md`).
   - Bad: a new section PR with `production: on`

4. **Docs sections need `hub`** (`title`, `subtitle`) and `access` (usually
   `{ default: premium, alwaysFree: [hubs, outlines] }`; prices and free picks are the owner's call). Set
   `questions: true` only if its articles will carry interview questions.

5. **Create the content folder** `apps/web/content/<key>/` with at least one hub MDX and its nav index `apps/web/content/<key>/_index.yaml`
   (`.claude/skills/add-article/SKILL.md`).

6. **Never write the key in shared code.** Header, sitemap, home counts and aggregators pick the section up from the
   registry. `apps/web/src/features/sections/literals.test.ts` fails on new literals.
   - Bad: `if (section === "data-engineering")` in a component

7. **Verify:** `npm run content-check -w web`, `npm test`, `npm run build` (preview profile, section visible) and
   `APP_ENV=production npm run build` (section absent), then the registry contract and route crawl E2E
   (`npm run e2e:chromium -w web`).
