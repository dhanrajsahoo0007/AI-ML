# AI-ML Learning Platform

Beginner-focused learning site: **learning paths**, **interview Q&A**, and **ML system design** — built with **Next.js (App Router)**, **PostgreSQL**, and **Redis**.

## Structure

- `apps/web` — Next.js UI, MDX content, and `/api/v1/*` route handlers (deploy this app)
- `packages/*` — reserved for shared packages (optional)

## Full stack in Docker (Postgres + Redis + Next.js)

Runs migrations and catalog seed on container start, then the production Next server.

From the repository root:

```bash
docker compose --profile app up --build
```

Open the app at **http://localhost:3000**.

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

## GitHub repository ([dhanrajsahoo0007](https://github.com/dhanrajsahoo0007))

Creating the remote repo requires you to be logged in (browser or [GitHub CLI](https://cli.github.com/) `gh auth login`).

### Option A: GitHub CLI

Replace `REPO_NAME` with your repository name (for example `ai-ml-learning-platform`).

```bash
cd /path/to/AI-ML
git init
git checkout -b main
git add .
git commit -m "Initial commit: AI-ML learning platform"
gh repo create dhanrajsahoo0007/REPO_NAME --public --source=. --remote=origin --push
git checkout -b development
git push -u origin development
```

If the empty repo already exists on GitHub:

```bash
git remote add origin https://github.com/dhanrajsahoo0007/REPO_NAME.git
git push -u origin main
git checkout -b development
git push -u origin development
```

### Option B: GitHub website

1. Create a new repository under your user (no README if you already have commits locally).
2. Follow the “push an existing repository” instructions for `main`, then create branch `development` locally and `git push -u origin development`.

Set the default branch to **main** in **Settings → General → Default branch** if needed.

## CI

GitHub Actions runs install, lint, and build for `apps/web` on push and pull request.
