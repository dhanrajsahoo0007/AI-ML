# TokensToScale

**TokensToScale** is a one-stop place to prepare for **AI system design**, **system design** and **cloud architecture** interviews: deep-dives on transformers, LLMs, RAG, agents and production AI systems, classic system design fundamentals and case studies, AWS / Google Cloud / Azure guides, and an interview question library tagged with the companies that ask each question.

Stack: **Next.js 15 (App Router)**, MDX content compiled at build time. Pages never touch a database, and the build needs no environment variables. Planned: Cloudflare Workers (OpenNext) hosting, Neon Postgres for sign-in and billing only.

## Structure

- `apps/web`: the Next.js app and all content (deploy this app)
- `packages/*`: reserved for shared packages (optional)

**Documentation:** humans read this README; coding agents read [`AGENTS.md`](AGENTS.md) (product, decisions, architecture, rules, runbooks), plus short `AGENTS.md` files next to the code (`apps/web/src/features/<x>/`, `apps/web/src/server/{db,edge}/`, `apps/web/content/`, `apps/web/assets/`) and step-by-step skills in `.claude/skills/`. `CLAUDE.md` only points to `AGENTS.md`. No other prose docs.

`npm run check:agents-md` (in CI) fails when an agent doc names a path or npm script that doesn't exist.

## Local development

Requires Node 22 (see `.nvmrc`) and npm.

```bash
npm ci
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

| Command                                   | What it does                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `npm run dev`                             | Dev server on port 3001                                                                     |
| `npm run build` / `npm run start`         | Production build / serve it                                                                 |
| `npm run typecheck`                       | TypeScript check                                                                            |
| `npm run lint`                            | ESLint                                                                                      |
| `npm run format` / `npm run format:check` | Prettier                                                                                    |
| `npm test`                                | Unit tests (Vitest)                                                                         |
| `npm run e2e`                             | End-to-end tests (Playwright; run `npm run build` first, and `npx playwright install` once) |
| `npm run knip`                            | Unused files, dependencies and exports                                                      |

Optional: install the secret-scanning git hook with `pipx install pre-commit && pre-commit install`.

## Content

All content lives in `apps/web/content` as MDX and YAML:

| Folder              | Site section                                                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ai-system-design/` | GenAI & LLM Systems (`/ai-system-design`): GenAI deep-dives, plus the ML System Design hub (parked: local only, `hubRelease` in `sections.yaml`)                                    |
| `system-design/`    | System Design fundamentals and case studies (`/system-design`)                                                                                                                      |
| `cloud/`            | Cloud Architecture: AWS, Google Cloud and Azure guides (`/cloud`), dev only for now (see feature flags)                                                                             |
| `question-bank/`    | Interview question library: `taxonomy.yaml` (categories and subsections), one YAML file per category, `articles.yaml` (files practice questions inside articles under a subsection) |
| `companies/`        | Company records used for tags and `/companies`                                                                                                                                      |

### Feature flags

`apps/web/src/config/features.ts` parks content for later iterations without deleting it:

- `mlInterviews` shows the interview categories marked `flag: mlInterviews` in `taxonomy.yaml` (ML Fundamentals, Deep Learning, Statistics & Data Science).
- `cloud` shows the `/cloud` section. It is on under `npm run dev` and off in production builds until the pilot pages are approved.

Set a flag to `true` and rebuild to bring that content back in the nav, pages, interview library, companies page and home counts.

### Writing System Design content

This repo is the only home for system design content. The old [System-Design](https://github.com/dhanrajsahoo0007/System-Design) repo (an outline of empty files, last commit `869dacb`) was migrated here as outline pages and retired; do not add content anywhere else.

- **Structure:** `apps/web/content/system-design/<hub>.mdx` is a hub (`fundamentals`, `databases`, `patterns`, `case-studies`, ordered by the `order` frontmatter field) whose `<ModelCategory>`/`<ModelCard>` blocks drive the hub page and the sidebar. Articles live in `apps/web/content/system-design/<hub>/<slug>.mdx`.
- **Adding a topic:** create the article file and add a `<ModelCard title icon description href>` to its hub. Icons must exist in `apps/web/src/lib/icons.ts`. Quote frontmatter values that contain a colon.
- **Article template** (the same one AI System Design uses): TL;DR, the idea in plain English, core concepts, an architecture Mermaid diagram, a deep dive, a trade-offs table, real-world examples, common pitfalls, how to answer in an interview, further reading, and `<InterviewQuestions>` practice questions.
- **Finishing an outline page:** outline pages carry `status: outline` in their frontmatter and `status="outline"` on their hub card, which shows an "Outline" badge and keeps them out of the home page's article count. Remove both when the article is written.
- **Interview questions:** the build fails if an article with `<InterviewQuestion>` blocks is not mapped in `question-bank/articles.yaml`. When the first System Design article gets questions, add a "System Design" category to `taxonomy.yaml` with subsections mirroring the hubs, then map each article to its subsection.
- **Writing order:** (1) requirements and APIs, (2) client-server communication, (3) storage data structures, (4) replication, (5) distributed infrastructure case studies (rate limiter, key-value store, URL shortener, message queue, typeahead), (6) the remaining case study groups, (7) design patterns, networking and security.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every pull request to `development` and `main`: typecheck, lint, format check, unit tests, knip, a production build with no environment variables, the Playwright route crawl and accessibility checks (Chromium), and security scans (gitleaks, Semgrep, OSV-Scanner). Renovate opens weekly grouped dependency updates and immediate security fixes.

## Branches

Work on a feature branch from `development` and open a PR into `development`. `main` is the release branch. Repository: [dhanrajsahoo0007/AI-ML](https://github.com/dhanrajsahoo0007/AI-ML).
