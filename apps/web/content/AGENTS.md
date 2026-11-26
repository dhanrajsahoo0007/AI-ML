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

Docs sections today: `ai-system-design/` (GenAI and LLM foundations: one hub, `genai-system-design`, whose reading
order is the `groups` list in `sections.yaml`), `genai-system-design/` (one hub, `case-studies`: the eleven GenAI design
case studies in the interview-grade format, plus "Start here" pages `design-principles`, backed by
`src/lib/genai-principles.ts`, and `design-interview-framework`), `system-design/` (fundamentals and patterns),
`system-design-case-studies/`, `ml-system-design/` (hubs `fundamentals` and `case-studies`), `cloud/`, `behavioral/`,
`ai-assisted-coding/` (hubs `guide` and `scenarios`: real-work rounds with an AI assistant, each with a runnable repo).
A planned page is an outline: `status: outline`, the "Outline." callout, then the house headings with no body under
them.

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
tier: advanced # optional; pattern pages only. Must match the hub card's `tier` (absent means core)
logo: systems/messenger # optional; case studies. An id under assets/logos; must match the hub card's `logo`
modelledOn: [tech/oss/apache-kafka] # optional; generic case studies only: up to three logo ids shown as "Modelled on"
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
- **Folders starting with `_` inside a section are never pages**: the docs loader reads only MDX files, so keep MDX
  out of them. A `_plan` folder holds plans; `ai-assisted-coding/_repos/<slug>/` holds a scenario's Python repo
  (scenario.json manifest, starter, solution and traps folders, pack-manifest.json). The starter reaches readers only
  as a free zip in `apps/web/assets/downloads/` (`ai-coding-<slug>-starter.zip`), and
  `apps/web/tests/unit/ai-coding-starters.test.ts` fails when the zip and the starter folder drift apart.
- `ai-assisted-coding/` pages follow a fixed scenario format guarded by `apps/web/tests/unit/doc-headings.test.ts`
  (`DONE` list) and, like `behavioral/`, allow no em dash and no `<InterviewQuestion>` (`NO_EM_DASH` in
  `apps/web/scripts/content-check.ts`).

## Classic System Design authoring

Read these three before writing a `system-design/` page (all Markdown files, so the site does not publish them):

- `system-design/PAGE-TEMPLATES.md`: skeletons for concept, pattern and case-study pages, writing and originality
  rules, where `<PremiumBreak />` goes.
- `system-design/COMPONENTS.md`: the single reference for every component, widget, diagram spec kind and glyph, with
  the exact props the code accepts. Update it in the same PR whenever a prop changes.
- `system-design/CASE-STUDY-FORMAT.md`: the case-study structure.

Rules the code enforces:

- **Teaching components** (`KeyIdea`, `Term`, `Glossary`, `Compare`, `ProsCons`, `Tabs`/`Tab`, `Quiz`/`QuizItem`,
  `DecisionTree`, `SpotTheFlag`, `GuessTheLevel`, `WhichPrinciple`, `StoryBuilder`, `StoryMatrix`, `MockLoop`, `PrepChecklist`, `RequirementsTable`, `EstimateTable`, `Numbers`, `PatternUses`, `LearningPath`, `FileTree`,
  `PromptExchange`/`Prompt`/`AiReply`, `Diff`; source
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

- **Code-review blocks** (server components, no client JavaScript, no copy button; props in `system-design/COMPONENTS.md`):
  - `FileTree`: a repo tree from flat paths, a one-line note and an optional `read | edit | new | bug | test` tag per file.
  - `PromptExchange`: one `<Prompt>` and one `<AiReply>` (any MDX inside), then a verdict `accept | fix | reject` and why.
  - `Diff`: one `diff` code fence with a +/- gutter and `blocker | should-fix | nit` comments under their lines.

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
