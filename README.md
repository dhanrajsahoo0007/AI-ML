# Origins AI Learn

**Origins AI Learn** is a one-stop place to prepare for **AI system design** and **system design** interviews: deep-dives on transformers, LLMs, RAG, agents and production AI systems, classic system design fundamentals and case studies, and an interview question library tagged with the companies that ask each question.

Stack: **Next.js (App Router)**, **PostgreSQL**, **Redis**.

## Structure

- `apps/web` — Next.js UI, MDX content, and `/api/v1/*` route handlers (deploy this app)
- `packages/*` — reserved for shared packages (optional)

**Documentation:** keep in-repo prose in **this README only** (no extra markdown guides under `docs/` or elsewhere).

## Content

All content lives in `apps/web/content` as MDX and YAML:

| Folder | Site section |
| --- | --- |
| `ai-system-design/` | AI System Design deep-dives (`/ai-system-design`) |
| `system-design/` | System Design fundamentals and case studies (`/system-design`) |
| `question-bank/` | Interview question library: `taxonomy.yaml` (categories and subsections), one YAML file per category, `articles.yaml` (files practice questions inside articles under a subsection) |
| `companies/` | Company records used for tags and `/companies` |
| `ml-system-design/` | ML System Design, parked (see feature flags) |

### Feature flags

`apps/web/src/config/features.ts` parks content for later iterations without deleting it:

- `mlSystemDesign` shows the `/ml-system-design` section and the practice questions from its articles.
- `mlInterviews` shows the interview categories marked `flag: mlInterviews` in `taxonomy.yaml` (ML Fundamentals, Deep Learning, Statistics & Data Science).

Set a flag to `true` and rebuild to bring that content back in the nav, pages, interview library, companies page and home counts.

### Writing System Design content

This repo is the only home for system design content. The old [System-Design](https://github.com/dhanrajsahoo0007/System-Design) repo (an outline of empty files, last commit `869dacb`) was migrated here as outline pages and retired; do not add content anywhere else.

- **Structure:** `apps/web/content/system-design/<hub>.mdx` is a hub (`fundamentals`, `databases`, `patterns`, `case-studies`, ordered by the `order` frontmatter field) whose `<ModelCategory>`/`<ModelCard>` blocks drive the hub page and the sidebar. Articles live in `apps/web/content/system-design/<hub>/<slug>.mdx`.
- **Adding a topic:** create the article file and add a `<ModelCard title icon description href>` to its hub. Icons must exist in `apps/web/src/lib/icons.ts`. Quote frontmatter values that contain a colon.
- **Article template** (the same one AI System Design uses): TL;DR, the idea in plain English, core concepts, an architecture Mermaid diagram, a deep dive, a trade-offs table, real-world examples, common pitfalls, how to answer in an interview, further reading, and `<InterviewQuestions>` practice questions.
- **Finishing an outline page:** outline pages carry `status: outline` in their frontmatter and `status="outline"` on their hub card, which shows an "Outline" badge and keeps them out of the home page's article count. Remove both when the article is written.
- **Interview questions:** the build fails if an article with `<InterviewQuestion>` blocks is not mapped in `question-bank/articles.yaml`. When the first System Design article gets questions, add a "System Design" category to `taxonomy.yaml` with subsections mirroring the hubs, then map each article to its subsection.
- **Writing order:** (1) requirements and APIs, (2) client-server communication, (3) storage data structures, (4) replication, (5) distributed infrastructure case studies (rate limiter, key-value store, URL shortener, message queue, typeahead), (6) the remaining case study groups, (7) design patterns, networking and security.

### Follow-ups

- The database still has the old learning-path catalog (`learning_paths` and `modules` tables, `/api/v1/catalog`, `scripts/seed.mjs`), which the site no longer shows. Removing it needs a migration.

## Full stack in Docker (Postgres + Redis + Next.js)

Runs migrations and catalog seed on container start, then the production Next server.

From the **repository root**:

```bash
cp .env.example .env   # optional: tune WEB_HOST_PORT
docker compose --profile app up --build
```

Open the app at **http://localhost:3000** by default.

### If port 3000 is already in use

Docker will fail to bind `0.0.0.0:3000`. Set a free host port in `.env`:

```bash
WEB_HOST_PORT=3001
```

Then run Compose again and open **http://localhost:3001** (host port maps to container port 3000).

- Postgres is also exposed on the host at **localhost:5433** and Redis at **localhost:6380** (for local tooling or `npm run dev` workflows).
- To skip seeding on start, set `RUN_DB_SEED=0` on the `web` service (for example in a `docker-compose.override.yml`).

Stop everything:

```bash
docker compose --profile app down
```

### Web image only (no Compose)

Build from the **repository root**:

```bash
docker build -f apps/web/Dockerfile .
```

Run with `DATABASE_URL` and `REDIS_URL` pointing at your Postgres and Redis instances.

## Local development (Next on host, DBs in Docker)

1. Copy environment file:

   ```bash
   cp .env.example .env
   ```

2. Start **Postgres and Redis** only (no `app` profile):

   ```bash
   docker compose up -d
   ```

3. Install dependencies, migrate, and seed the catalog (from repo root):

   ```bash
   npm install
   npm run db:migrate -w web
   npm run db:seed -w web
   npm run dev -w web
   ```

   Local services use host ports **5433** (Postgres) and **6380** (Redis) to avoid clashes with existing installs.

4. Open [http://localhost:3000](http://localhost:3000).

## Push to GitHub ([dhanrajsahoo0007](https://github.com/dhanrajsahoo0007))

The remote repo must be created with **your** GitHub authentication (browser or [GitHub CLI](https://cli.github.com/) `gh auth login`). Suggested repository name: **`origins-ai-learn`** (matches this workspace package name).

### One-time: authenticate

```bash
gh auth login
```

### New repository (recommended repo name)

From your local clone at the repository root (replace nothing if you use the suggested name):

```bash
# If you do not yet have git initialized:
git init
git checkout -b main
git add .
git commit -m "Initial commit: Origins AI Learn"

# Create GitHub repo and push main
gh repo create dhanrajsahoo0007/origins-ai-learn --public --source=. --remote=origin --push
```

### Push the `development` branch

```bash
git checkout development  # create if missing: git checkout -b development
git merge main            # optional: keep development up to date with main
git push -u origin development
```

### If the empty repo already exists on GitHub

```bash
git remote add origin https://github.com/dhanrajsahoo0007/origins-ai-learn.git
git branch -M main
git push -u origin main
git checkout -b development
git push -u origin development
```

On GitHub: **Settings → General → Default branch** should be **main**. Use **development** for ongoing feature work.

## CI

GitHub Actions runs install, lint, and build for `apps/web` on push and pull request.
