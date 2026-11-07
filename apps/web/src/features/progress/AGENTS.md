# features/progress: completed articles and bookmarks

Per-user progress (`complete`) and bookmarks, keyed by `<section>/<slug>` content keys such as
"system-design/caching/cdn". Signed-out learners keep progress in this browser; it is merged into the account at
sign-in.

## Public API (`index.ts`)

- `contentKeySchema`, `progressKindSchema` (`complete | bookmark`), `mergeItemSchema`, `MAX_MERGE_ITEMS` (500).
- `setProgress(db, userId, key, kind, on)`, `listProgress(db, userId)`, `mergeProgress(db, userId, items)`.
- Client island by path: `merge-local-progress.client.tsx` (runs on `/sign-in/complete`); `local.ts` holds the
  browser-side `localStorage` helpers (`oa_progress_v1`).

## Data flow

Signed out: the browser writes `localStorage` only. Signed in: `GET/POST/DELETE /api/progress`
(`apps/web/src/app/api/progress/route.ts`) and `POST /api/progress/merge` after sign-in, all through `route` with
`auth: "user"` and the `progress` rate limit → `store.ts` → the `progress` and `bookmark` tables.

## Invariants and gotchas

- **Pages never read progress.** Content pages stay static and DB-free; progress UI is a client island that calls
  the API. `apps/web/tests/e2e/auth.spec.ts` asserts content pages make zero DB queries.
- `content-key.ts` mirrors the database check constraint in `apps/web/src/server/db/schema/account-data.ts`; change
  both together (new migration).
- `local.ts` ships to the browser: no zod there; the API validates what it receives. Never store tokens or personal
  data in `localStorage`.
- Merge keeps the earliest completion time, never removes saved rows, and clamps future timestamps to now.
- Keys aren't checked against existing pages at write time; a renamed article leaves old keys behind (harmless).

## Extend it

A new progress kind: add it to `progressKindSchema` and the DB enum/check (additive migration), then the store and
tests. Planned (after stream L): DSA solved status and article progress UI.

## Tests

`progress.test.ts` (DB-backed); E2E "progress persists across browser contexts and signed-out progress merges at
sign-in" in `apps/web/tests/e2e/auth.spec.ts`.
