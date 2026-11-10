# Load and concurrency tests (k6)

Plan §12.6. One k6 script (`k6/main.js`) holds every scenario; a Node runner (`run.ts`) prepares the inputs and
runs it. **Only localhost is ever loaded** unless the owner names a staging host explicitly (see below).

```bash
npm run cf:build -w web      # Workers build (.open-next/), once per code change
npm run load:local -w web    # starts `opennextjs-cloudflare preview` on :8787, runs the local profile, stops it
```

`load:local` takes about 4 minutes. If a preview is already running on :8787 (`npm run preview -w web`), the runner uses
it; pass `ENTITLEMENT_SECRET=<the Worker's key>` so the pro cookie verifies. Results are in `test-results/load/` as
JSON (p95, p99, max, error rate and RPS per scenario, plus soak drift), and k6 exits non-zero when a threshold is
crossed.

k6 itself: the runner uses a local `k6` binary when there is one (`brew install k6`), otherwise the official
`grafana/k6` Docker image (pinned in `run.ts`). No npm dependency.
On macOS, prefer the native binary for `spike`: through Docker Desktop's networking a burst of new connections
can hit `dial: i/o timeout` before reaching the Worker (seen locally: 8 of 1,750 spike requests; the Worker logged
only 200s). The preview's own log is in `test-results/load/preview.log`.

## Scenarios

| Scenario        | staging profile (§12.6)             | local profile (laptop)         | Pass criteria                                                    |
| --------------- | ----------------------------------- | ------------------------------ | ---------------------------------------------------------------- |
| `free_pages`    | ramp to 2,000 RPS, hold 10 min      | ramp to 40 RPS, hold 40 s      | p95 < 150 ms, errors < 0.1%, edge cache ≥ 95%¹                   |
| `premium_pages` | 300 RPS for 5 min with a pro cookie | 20 RPS for 30 s                | p95 < 200 ms, errors < 0.1%, 0 DB queries²                       |
| `auth`          | 20 RPS for 5 min                    | 2 RPS for 30 s (needs DB)³     | p95 < 800 ms, errors < 1%                                        |
| `spike`         | 0 → 5,000 RPS in 30 s, hold 30 s    | 0 → 100 RPS in 10 s, hold 10 s | no errors                                                        |
| `soak`          | 200 RPS for 2 h                     | 15 RPS for 90 s                | p95 < 150 ms, errors < 0.1%, late p95 ≤ 1.25 × early p95 + 10 ms |
| `webhook_storm` | 50 RPS for 2 min, 30% duplicates    | –                              | TODO: billing (stream L) isn't on this base                      |

Every scenario also requires > 99.9% of its checks to pass (200 + HTML for pages, no `Set-Cookie` on free pages).
Locally the scenarios run one after another, so one scenario's latency isn't another's load.

1. `edge_cache_hit` reads `cf-cache-status`, which only exists behind Cloudflare: enforced on the staging profile.
2. Read from Neon's metrics for the test window; the read path has no database by design (AGENTS.md rule 1).
3. Sign-in and the session lookup need Postgres: `npm run db:up -w web` and `DATABASE_URL=postgres://…localhost…`.
   Without `DATABASE_URL` a local run skips `auth` unless you pass `--scenarios auth`.

Inputs the runner builds:

- **URLs**: every prerendered 200 page in `.next/prerender-manifest.json`, minus the sections the middleware gates in
  this build (`src/generated/hidden-routes.json`).
- **Entitlement cookie**: a `tier=pro` `tts_ent` token signed with `signEntitlement` from `src/server/edge/entitlement.ts`
  and a throwaway 256-bit key, which the runner also gives the preview Worker as `ENTITLEMENT_SECRET`. Until the
  paywall lands there are no premium pages, so `premium_pages` fetches articles with that cookie; set
  `PREMIUM_URLS=/a,/b` to target real ones (then it also checks the response isn't publicly cacheable).

Options: `--scenarios free_pages,spike`, `--profile staging`, `--base http://127.0.0.1:8787`, `--no-start`.
`LOAD_SCALE=5` multiplies the local rates (capacity probing).

## Staging (owner only)

The staging profile is meant for the staging Worker, from a runner with enough bandwidth (k6 Cloud or a GitHub runner
in several regions). The runner and the k6 script both refuse non-local hosts unless `LOAD_ALLOW_HOST` equals the
exact hostname and the hostname is marked as staging/preview/dev/test. Never point it at production.

```bash
LOAD_ALLOW_HOST=staging.<domain> npm run load -w web -- --profile staging --base https://staging.<domain>
```

TODOs that land with stream L: the `webhook_storm` scenario (signed fixtures, 30% duplicate deliveries, exactly-once
check against the webhook event table), `POST /api/entitlements/refresh` in `auth`, and real premium URLs from the
paywall manifest.
