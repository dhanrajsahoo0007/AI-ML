# features/sections: the section registry and kind contract

Every section (GenAI, System Design, Cloud, Interviews, Companies, DSA, Newsletter, ML) is one entry in
`apps/web/content/sections.yaml`. This feature parses it, resolves each entry's release state for the build's
`APP_ENV`, and maps each entry to its kind module. Shared code (header, sidebar, home counts, sitemap, route
generation, aggregators, content-check) only loops over the registry.

## Public API

There is no index file; import these files directly.

- `registry.ts`: `allSections()`, `visibleSections()` (`on`), `builtSections()` (`on` + `hidden`),
  `getSection(key)`, `sectionState(key)`, `sectionOfKind(kind)`, `sectionForPath(href)`, `isPathVisible(href)`,
  `hiddenRoutes()` (middleware manifest), `publicNavLinks()`, `resolveAppEnv()`.
- `kinds.ts`: `kindOf(section)` → the `SectionKind` object, `loadSection()`, `directoryRefs()`.
- `kind.ts`: the `SectionKind<Item>` contract and nav/sitemap/search types; `navSection()`.
- `schema.ts`: zod schemas for `apps/web/content/sections.yaml`, `apps/web/content/features.yaml`, docs
  frontmatter and the per-section nav index (`apps/web/content/<section>/_index.yaml`);
  `DESCRIPTION_MAX` (160).
- `public.ts`: client-safe `publicNav()` (reads `process.env.SECTION_NAV`, inlined by `next.config.ts`),
  `headerNavSection()`.
- `route-helpers.ts`: `routeSection(kind)`, `isRouteBuilt(kind)`, `routeMetadata(kind)` for the route-folder kinds.

## Data flow

The YAML → `parseRegistry` (zod, every problem listed with its path) → `resolveSections(entries, env)` adds
`state` → cached per env. `next.config.ts` calls it at build to inline `APP_ENV` and `SECTION_NAV`, to compute
redirects, and to write the hidden-routes manifest that `apps/web/src/middleware.ts` gates on.

## Invariants and gotchas

- **No section key literals in shared code.** `literals.test.ts` scans `src/` and allows only this folder,
  `apps/web/src/features/docs/`, and section-owned components (cloud, db, diagrams). Pick sections by kind or loop the registry.
- `key` must equal the `href` segment and the content folder name (schema refinement). `docs` entries need `hub`.
- `APP_ENV` unset → `production` under `NODE_ENV=production`, else `local`. Never read `APP_ENV` elsewhere for
  section logic; call the registry.
- Release state is resolved **at build**. `next start` serves the states the build was made with; changing
  the YAML needs a rebuild (or the `SECTIONS_KILL` secret for an emergency off).
- `hidden` sections are built but excluded from nav, sitemap, home counts and aggregators; `off` sections generate
  no params at all. `publicNav()` only ever sees `on` sections, so hidden sections never reach a client bundle.
- `registry.ts` and `schema.ts` use relative imports and no `server-only`: `next.config.ts` and the scripts load
  them with plain Node.
- Tests here use `test-runner.ts`, which picks `node:test` or Vitest (when `VITEST` is set), so they run both ways.

## Extend it

- New section of an existing kind: `.claude/skills/add-section/SKILL.md` (registry entry + folder, no code).
- New kind: add the name to `SECTION_KINDS` and `KINDS_WITH_ROUTES` in `schema.ts`, implement `SectionKind` in its
  own feature, register it in `kinds.ts`, add a thin route folder under `apps/web/src/app/`, then extend
  `literals.test.ts` allow-list and the registry contract tests.
- New registry field: add it to `sectionEntrySchema` (strict, so unknown fields fail), document it in the YAML
  header comment.

## Tests

`registry.test.ts`, `kinds.test.ts`, `literals.test.ts` here; `apps/web/tests/unit/registry-contract.test.ts`;
E2E `apps/web/tests/e2e/registry.contract.spec.ts` and `apps/web/tests/e2e/sections.profile.spec.ts` (both build
profiles).
