# features/progress: completed articles and bookmarks

Per-user progress (`complete`) and bookmarks, keyed by `<section>/<slug>` content keys such as
"system-design/caching/cdn". Signed-out learners keep progress in this browser; it is merged into the account at
sign-in, and each section tab computes its own independent `X%` completion progress.

## Public API (`index.ts`)

- `contentKeySchema`, `progressKindSchema` (`complete | bookmark`), `mergeItemSchema`, `MAX_MERGE_ITEMS` (500).
- `setProgress(db, userId, key, kind, on)`, `listProgress(db, userId)`, `mergeProgress(db, userId, items)`.
- Client islands by path: `merge-local-progress.client.tsx` (runs on `/sign-in/complete`),
  `sync-account-progress.client.tsx` (runs on `/account` and `/account/progress`), and `progress-actions.client.tsx`
  (article completion bar, top status badge, live per-tab `X%` progress and Prev/Next topic navigation); `local.ts`
  holds the browser-side `localStorage` helpers (`tts_progress_v1` pending queue and `tts_progress_cache_v1` synced
  cache).
- Progress marks and per-tab percentages outside the article: `completed-provider.client.tsx` (mounted in
  `apps/web/src/app/layout.tsx` and the docs section layout) reads this browser's completed keys with
  `use-completed.client.ts` and fills the context in `apps/web/src/lib/completed.client.ts` (backed by pure stats
  helpers in `apps/web/src/lib/progress-stats.ts`). The sidebar (`apps/web/src/components/content-sidebar.tsx`),
  section landing banner (`apps/web/src/components/section-progress-banner.client.tsx`), section/hub cards and
  learning paths (`apps/web/src/components/read-count.tsx`), and header mega-menu
  (`apps/web/src/components/site-header.tsx`) read it there. `apps/web/src/components/` cannot import a feature, which is why the
  context and stats helpers live in `apps/web/src/lib/`. `local.ts` fires `PROGRESS_EVENT` on every change.

## Data flow

Signed out: the browser writes `localStorage` only (`tts_progress_v1` + `tts_progress_cache_v1`). Signed in:
`GET/POST/DELETE /api/progress` (`apps/web/src/app/api/progress/route.ts`) and `POST /api/progress/merge` after
sign-in, all through `route` with `auth: "user"` and the `progress` rate limit → `store.ts` → the `progress` and
`bookmark` tables. After merging on `/sign-in/complete`, the pending queue (`tts_progress_v1`) is cleared and the
account's saved progress is hydrated into `tts_progress_cache_v1`.

## Invariants and gotchas

- **Pages never read progress.** Content pages stay static and DB-free; progress UI is a client island that calls
  the API only on user interaction or `/sign-in/complete`. `apps/web/tests/e2e/auth.spec.ts` asserts content pages
  make zero DB queries and zero `/api/*` requests on load.
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

Practice ratings and interview stories are a separate feature (`apps/web/src/features/practice/`), because their
keys are question ids and story ids, not pages.

A new progress kind: add it to `progressKindSchema` and the DB enum/check (additive migration), then the store and
tests. Planned (after stream L): DSA solved status.

## Tests

`progress.test.ts` (unit + DB-backed) and `apps/web/src/lib/progress-stats.test.ts`; E2E in
`apps/web/tests/e2e/auth.spec.ts`.
