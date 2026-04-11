# Origins AI Learn

**Origins AI Learn** is a structured learning system for going from **scratch to job-ready** in modern AI: **machine learning**, **deep learning**, **generative AI**, **large language models**, **agentic AI**, and adjacent topics. It combines **guided learning paths**, **interview prep** (question-first drills), and **ML system design** notes so you understand both concepts and how they show up in real systems.

Stack: **Next.js (App Router)**, **PostgreSQL**, **Redis**.

## Structure

- `apps/web` — Next.js UI, MDX content, and `/api/v1/*` route handlers (deploy this app)
- `packages/*` — reserved for shared packages (optional)

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

More detail: [docs/GITHUB_SETUP.md](docs/GITHUB_SETUP.md).

## CI

GitHub Actions runs install, lint, and build for `apps/web` on push and pull request.
