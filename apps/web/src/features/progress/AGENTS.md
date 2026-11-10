# features/progress: completed articles and bookmarks

Per-user progress (`complete`) and bookmarks, keyed by `<section>/<slug>` content keys such as
"system-design/caching/cdn". Signed-out learners keep progress in this browser; it is merged into the account at
sign-in.

## Public API (`index.ts`)

- `contentKeySchema`, `progressKindSchema` (`complete | bookmark`), `mergeItemSchema`, `MAX_MERGE_ITEMS` (500).
- `setProgress(db, userId, key, kind, on)`, `listProgress(db, userId)`, `mergeProgress(db, userId, items)`.
- Client island by path: `merge-local-progress.client.tsx` (runs on `/sign-in/complete`); `local.ts` holds the
  browser-side `localStorage` helpers (`tts_progress_v1`).
- Progress marks outside the article: `completed-provider.client.tsx` (mounted by the docs section layout) reads this
  browser's completed keys with `use-completed.client.ts` and fills the context in
  `apps/web/src/lib/completed.client.ts`. The sidebar (`apps/web/src/components/content-sidebar.tsx`) shows a tick and a
  per-category count from it, and section cards show "N read" (`apps/web/src/components/read-count.tsx`). components/
  cannot import a feature, which is why the context lives in lib/. `local.ts` fires `PROGRESS_EVENT` on every change.

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
- **Keys must name a page of the build** (security review M7): `isKnownContentKey()` checks the inlined page index
  (`SEARCH_INDEX`, every page of every `on` section; `hasPageIndex()` / `pageInfo()` in
  `apps/web/src/features/search/titles.ts`), so POST, DELETE and merge answer 400 to anything else, and rows per user
  are bounded by the number of pages. Without an index (`next dev`, unit tests) well-formed keys pass; a production
  bundle without one refuses all. The merge island drops refused items (by the `items.N.contentKey` paths in the 400) and sends the rest once. Pages of `hidden` sections aren't in the index, so admins can't save progress there.
  A renamed article leaves its old rows behind (harmless; they can no longer be changed through the API).

## Extend it

A new progress kind: add it to `progressKindSchema` and the DB enum/check (additive migration), then the store and
tests. Planned (after stream L): DSA solved status; filling this browser's store from the account after sign-in on a new
device (today the marks show only what this browser recorded); the provider in the other section layouts.

## Tests

`progress.test.ts` (DB-backed); E2E "progress persists across browser contexts and signed-out progress merges at
sign-in" in `apps/web/tests/e2e/auth.spec.ts`.
