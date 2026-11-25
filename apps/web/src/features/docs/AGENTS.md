# features/docs: the `docs` section kind

MDX hubs and articles for GenAI & LLM Systems, ML System Design, Classic System Design, Behavioral and Cloud. One shared route
pair serves every docs section: `apps/web/src/app/(content)/[section]/page.tsx` and
`apps/web/src/app/(content)/[section]/[...slug]/page.tsx`.

## Public API

- `index.ts`: `docsKind`, the route helpers and the content reader below, for the app, `apps/web/src/components/`
  and `apps/web/src/features/seo/`. No JSX in it: it is loaded by plain Node through the section kinds.
- `section-doc-page.tsx`: `SectionDocPage`, the article page view (server component; renders the paywall on
  previews). Imported by path from `apps/web/src/app/(content)/[section]/[...slug]/page.tsx`, because it is JSX.
- `apps/web/src/features/sections/kinds.ts`, `apps/web/src/features/newsletter/kind.ts` and
  `apps/web/src/features/paywall/access.ts` import `kind.ts` and `source.ts` by path (loaded by `apps/web/next.config.ts`
  and the scripts, which can't load the server-only `routes.ts`); see `FEATURES_WITHOUT_ENTRY` in
  `apps/web/eslint.config.mjs`.

- `kind.ts`: `docsKind`, the `SectionKind<DocItem>` implementation (load, staticParams, nav, sitemap, search,
  access, questions, counts, validate).
- `routes.ts`: `docsSectionParams()`, `docsSection(param)` (404 for unknown or off), `docsItems()`,
  `docSlugParams()`, `sectionRobots()` (`noindex` for hidden).
- `source.ts`: `loadDocItems()`, `loadNavIndex()`, `hubsOf()`, `articlesOf()`, `sectionDir()`, `DocItem`.
- `hub-markup.ts`: `parseHubMarkup()` reads `<ModelCategory>`/`<ModelCard>` grids out of hub MDX.

Rendering is in `apps/web/src/lib/mdx-doc.tsx` (compile, MDX component map, headings) and
`apps/web/src/features/docs/section-doc-page.tsx`; SEO in `apps/web/src/features/seo/docs.ts`.

## Data flow

Build time only: `content/<key>/<hub>.mdx` (hub) and `content/<key>/<hub>/<slug>.mdx` (article) → frontmatter
validated with `frontmatterSchema` (`apps/web/src/features/sections/schema.ts`) → `DocItem`s →
`generateStaticParams` with `dynamicParams = false`. The sidebar and header nav come from
`apps/web/content/<section>/_index.yaml` (categories and cards per hub), not from parsing JSX.

## Invariants and gotchas

- Files here read the disk (`fs`) and run **only at build**. Never import them from a client component or a route
  handler; Workers have no filesystem.
- `access()` order: frontmatter `access` wins; else `alwaysFree` in the registry (`hubs`, `outlines`); else the
  section default. This feeds the paywall (stream L) and the JSON-LD paywall markup.
- The nav index and the hub MDX grid must agree: content-check compares them with `parseHubMarkup()` until hubs
  render their grid from the index. Attribute order in `<ModelCard>` doesn't matter.
- Articles with `<InterviewQuestion>` blocks set `hasQuestions`; sections with `questions: true` must map each one
  in `content/question-bank/articles.yaml` (Cloud is reported as warnings via `--warn-cloud-questions` for now).
- Mermaid fences are pre-rendered to SVG by `apps/web/scripts/render-mermaid.mjs` and swapped in by
  `apps/web/src/lib/rehype-mermaid-svg.ts`; in `next dev` an un-rendered fence falls back to client rendering. Run
  `npm run mermaid -w web` to see production output.
- This folder and `apps/web/src/features/sections/` are the only shared places allowed to name section keys.
- A hub can be parked inside a live section with `hubRelease` in `apps/web/content/sections.yaml` (on/off per
  environment). `loadDocItems()` and `loadNavIndex()` drop `off` hubs, so they are not built, listed, searched or
  in the sitemap; the hidden-routes manifest lists their prefixes as `off` (404). Pass `{ includeOffHubs: true }`
  only from checks that must see every file (content-check, the asset library).

## Extend it

- New article or hub: `.claude/skills/add-article/SKILL.md`.
- New frontmatter field: add it to `frontmatterSchema` (strict), use it in `source.ts`/`kind.ts`, and document it in
  `apps/web/content/AGENTS.md`.
- New docs section: registry entry only (`.claude/skills/add-section/SKILL.md`).

## Tests

`apps/web/src/features/sections/kinds.test.ts` (docs kind against real content), `apps/web/tests/unit/nav-payload.test.ts`,
`apps/web/tests/unit/doc-headings.test.ts`, `apps/web/src/features/seo/docs.test.ts`; E2E route crawl
`apps/web/tests/e2e/routes.crawl.spec.ts`.
