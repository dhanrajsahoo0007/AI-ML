# content/: every word on the site

All learning content is MDX and YAML here, compiled at build. Nothing is read at request time. Validate with
`npm run content-check -w web` (also runs inside every production build). Prettier ignores this folder, so keep
tables and prose tidy by hand.

## Layout

| Path                            | What                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `sections.yaml`                 | The section registry: kind, label, nav group, release state per env                                                       |
| `features.yaml`                 | Non-section switches (`on`/`off` per env), e.g. `mlInterviews`                                                            |
| `<section>/<hub>.mdx`           | A docs hub (grid of `<ModelCategory>`/`<ModelCard>`)                                                                      |
| `<section>/<hub>/<slug>.mdx`    | A docs article                                                                                                            |
| `<section>/_index.yaml`         | Nav index per docs section: hubs → categories → cards (sidebar, header)                                                   |
| `question-bank/<category>.yaml` | Interview questions; `question-bank/taxonomy.yaml` lists the categories                                                   |
| `question-bank/articles.yaml`   | Article path → category/subsection for articles with interview questions                                                  |
| `companies/companies.yaml`      | Company records behind company tags and `/companies`                                                                      |
| `dsa/`                          | `dsa/topics/`, `dsa/problems/`, `dsa/tests/` (public + hidden), `dsa/solutions/` (Python references), `dsa/patterns.yaml` |
| `newsletter/<yyyy>/<slug>.mdx`  | Newsletter issues                                                                                                         |
| `pages/`                        | Legal, contact, security and pricing FAQ, with `{{KEY}}` placeholders                                                     |

Docs sections today: `ai-system-design/` (hubs `genai-system-design` and `ml-system-design`, the latter parked
with `hubRelease`: on in local only), `system-design/`, `behavioral/`, `cloud/`.

## Docs frontmatter

Validated by `frontmatterSchema` in `apps/web/src/features/sections/schema.ts` (strict: unknown keys fail).

```yaml
title: "Design Facebook Messenger" # required
description: "One line, ≤ 160 chars" # required; used for <meta>; longer is a warning
icon: message-circle # optional; must be a key in src/lib/icons.ts
status: outline # outline | draft | published (default)
access: free # free | premium; default from sections.yaml
order: 3 # optional sort
categories: [...] # hubs: category titles in display order
updated: 2026-11-07 # optional; otherwise taken from git history
```

## Rules

- **Content lives only here; media lives only in `apps/web/assets/`**, referenced by ID (`<Img id>`, `<Figure id>`,
  `<Mermaid ref>`, `<TechIcon id>`, `<Download id>`). Never put files in `apps/web/public/`.
- **A new article needs three edits**: the MDX file, a `<ModelCard>` in its hub MDX, and the matching card in
  `<section>/_index.yaml` (content-check fails if the hub and the index disagree). Outline pages carry
  `status: outline` and the "Outline." callout.
- Free by default only where the registry says so: hubs and outlines are free in docs sections; set `access: free`
  on articles the owner picked as free. Never mark content free or premium on your own initiative.
- Articles with `<InterviewQuestion>` blocks must be listed in `question-bank/articles.yaml` when their section has
  `questions: true` (Cloud is warning-only for now). Questions in `question-bank/*.yaml` need `category` and
  `subcategory` slugs from `question-bank/taxonomy.yaml`; `companies` names must match `companies/companies.yaml`.
- Internal links must resolve; a link into a section that isn't `on` renders as plain text and is a warning.
- Mermaid: inline fences are fine; a diagram used in two or more places moves to
  `apps/web/assets/diagrams/mermaid/` (content-check warns on duplicates). Fences are pre-rendered at build.
- No copy features, no raw-HTML embeds of third-party scripts, no "View as Markdown" links.
- Third-party text needs a licence: `question-bank/NOTICE.md` (Outcome School, Apache 2.0) and the attributions page.
- Keep the writing plain: short sentences, active voice, define a term before using it; all ages read this.
- `system-design/CASE-STUDY-FORMAT.md` is a style guide for case studies (a content asset, not product docs).

## Classic System Design authoring

Read these three before writing a `system-design/` page (all Markdown files, so the site does not publish them):

- `system-design/PAGE-TEMPLATES.md`: skeletons for concept, pattern and case-study pages, writing and originality
  rules, where `<PremiumBreak />` goes.
- `system-design/COMPONENTS.md`: the single reference for every component, widget, diagram spec kind and glyph, with
  the exact props the code accepts. Update it in the same PR whenever a prop changes.
- `system-design/CASE-STUDY-FORMAT.md`: the case-study structure.

Rules the code enforces:

- **Teaching components** (`KeyIdea`, `Term`, `Glossary`, `Compare`, `ProsCons`, `Tabs`/`Tab`, `Quiz`/`QuizItem`,
  `DecisionTree`, `SpotTheFlag`, `GuessTheLevel`, `WhichPrinciple`, `StoryBuilder`, `StoryMatrix`, `MockLoop`, `PrepChecklist`, `RequirementsTable`, `EstimateTable`, `Numbers`, `PatternUses`, `LearningPath`; source
  `apps/web/src/components/teach/`) validate props with strict zod schemas: an unknown or misspelled prop is a red
  note in dev and fails the production build.
- **Widgets** (eleven lazy islands in `apps/web/src/components/teach/widgets/`): at most two per page, `DecisionTree`,
  `SpotTheFlag`, `GuessTheLevel` and `WhichPrinciple` included. content-check enforces it for the exercises on
  behavioral pages (an error above two); in the other sections reviewers check it.
- **Glossary**: owned by the section with `glossary: true` in `sections.yaml`. `<Term id>` ids must exist in
  `system-design/glossary.yaml` (zod-validated by `apps/web/src/lib/glossary.ts`: kebab-case unique ids, `short` at
  most 160 characters, `related` ids must exist).
  `apps/web/tests/unit/teach/term-ids.test.ts` fails `npm test` on an unknown id.
- **Interview answers** (article `<InterviewQuestion>` bodies and `a:` in `question-bank/*.yaml`) are MDX compiled
  for the `/interviews` library with a restricted set: `AnimatedDiagram`, `Callout`, `Compare`, `KeyIdea`, `Tabs`,
  `Tab` (`ANSWER_COMPONENTS` in `apps/web/src/lib/question-answer.ts`). Any other component or a mermaid fence fails
  content-check with the file and question id. In YAML answers only `$$...$$` is math, so prices stay plain text.
- **Practice mode**: a question list whose questions are all in a `track: leadership` category gets a "Practice mode"
  toggle (answer timer, self-rating, follow-up drill; `apps/web/src/components/mdx/interview-practice.client.tsx`).
  Ratings are stored under the question `id`, so do not change the id of a published question.
- **taxonomy.yaml**: quote every subsection `description` (and any title) that contains a comma; an unquoted comma
  ends a YAML flow-mapping value. Content-check rejects a subsection that is not exactly `{slug, title, description}`.

## Sections of other kinds

- DSA problems: `.claude/skills/add-dsa-problem/SKILL.md` (frontmatter in `apps/web/src/features/dsa/schema.ts`).
- Newsletter issues: `.claude/skills/write-newsletter-issue/SKILL.md` (frontmatter in
  `apps/web/src/features/newsletter/schema.ts`).
- Site pages: `apps/web/src/features/pages/AGENTS.md`.

## Changing `sections.yaml`

Adding a section: `.claude/skills/add-section/SKILL.md`. Changing a `release.production` value:
`.claude/skills/release-section/SKILL.md` (its own PR, code-owner approval).

## Checks

`npm run content-check -w web` prints `file:line: level: message`; `--strict` turns warnings into errors. Before a
PR also run `npm run build` with `APP_ENV=production` (it repeats the check) and the route crawl in
`apps/web/tests/e2e/routes.crawl.spec.ts`.
