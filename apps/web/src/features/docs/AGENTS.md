# features/docs: the `docs` section kind

MDX hubs and articles for GenAI & LLM Systems, Classic System Design, Cloud and ML System Design. One shared route
pair serves every docs section: `apps/web/src/app/(content)/[section]/page.tsx` and
`apps/web/src/app/(content)/[section]/[...slug]/page.tsx`.

## Public API

No index file; import the files directly.

- `kind.ts`: `docsKind`, the `SectionKind<DocItem>` implementation (load, staticParams, nav, sitemap, search,
  access, questions, counts, validate).
- `routes.ts`: `docsSectionParams()`, `docsSection(param)` (404 for unknown or off), `docsItems()`,
  `docSlugParams()`, `sectionRobots()` (`noindex` for hidden).
- `source.ts`: `loadDocItems()`, `loadNavIndex()`, `hubsOf()`, `articlesOf()`, `sectionDir()`, `DocItem`.
- `hub-markup.ts`: `parseHubMarkup()` reads `<ModelCategory>`/`<ModelCard>` grids out of hub MDX.

Rendering is in `apps/web/src/lib/mdx-doc.tsx` (compile, MDX component map, headings) and
`apps/web/src/components/section-doc-page.tsx`; SEO in `apps/web/src/features/seo/docs.ts`.

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

## Extend it

- New article or hub: `.claude/skills/add-article/SKILL.md`.
- New frontmatter field: add it to `frontmatterSchema` (strict), use it in `source.ts`/`kind.ts`, and document it in
  `apps/web/content/AGENTS.md`.
- New docs section: registry entry only (`.claude/skills/add-section/SKILL.md`).

## Tests

`apps/web/src/features/sections/kinds.test.ts` (docs kind against real content), `apps/web/tests/unit/nav-payload.test.ts`,
`apps/web/tests/unit/doc-headings.test.ts`, `apps/web/src/features/seo/docs.test.ts`; E2E route crawl
`apps/web/tests/e2e/routes.crawl.spec.ts`.
