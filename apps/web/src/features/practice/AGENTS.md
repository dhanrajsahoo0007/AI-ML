# features/practice: self-ratings and interview stories

What a learner produces while practising behavioural interviews: a 1 to 5 rating of their own answer to a question
(practice mode on question lists, the mock loop) and the interview stories they write in the story builder. Both are
kept in the browser first, so every tool works signed out, and copied to the account when the learner is signed in.

## Public API (`index.ts`)

- Schemas: `questionIdSchema`, `ratingSchema`, `ratingItemSchema`, `storyIdSchema`, `storySchema`,
  `MAX_MERGE_RATINGS` (200).
- Store: `listRatings`, `listStories`, `addRating`, `mergeRatings`, `saveStory`, `deleteStory`.
- `STORY_SYNC_FLAG`: the name of the switch in `apps/web/content/features.yaml` (`practiceStories`).

The browser side is not in this folder, because components cannot import a feature:
`apps/web/src/lib/practice.ts` (ratings and the answer timer), `apps/web/src/lib/stories.ts` (stories and the
writing checks) and `apps/web/src/lib/practice-sync.ts` (the calls to this API).

## Data flow

`GET /api/practice` (`apps/web/src/app/api/practice/route.ts`) returns the learner's ratings and stories.
`POST /api/practice/ratings` records one practice. `POST /api/practice/merge` merges ratings collected in a browser.
`POST` and `DELETE /api/practice/stories` save and remove one story. All go through `route` with `auth: "user"` and the
`progress` rate limit, then `store.ts`, then the `practice_rating` and `practice_story` tables
(`apps/web/src/server/db/schema/account-data.ts`).

`apps/web/src/lib/practice-sync.ts` pulls once per page load, on the Practice Lab tool pages and when practice mode is turned on. It
merges both ways and uploads what the account lacks. A signed-out visitor is asked once per tab (the 401 is
remembered in `sessionStorage`).

## Invariants and gotchas

- **Pages never read practice data.** Content pages stay static and DB-free; the tools are client islands.
- **Story text is the learner's own writing.** It is returned only to its owner and is never logged, sent to
  analytics, or shown to an admin. Do not add it to an error message or an audit entry.
- **Story sync is behind `practiceStories`.** While it is off, `GET` returns `stories: null`, the story routes answer
  404, and stories stay in the browser. It is on only in `local` until the privacy page covers story text.
  Ratings (a question id and a number) sync either way, like progress.
- **Question ids must name a question of the build**: `isKnownQuestionId()` checks `PRACTICE_IDS`, the
  leadership-track ids written by `apps/web/scripts/gen-runtime-data.ts` and inlined by `apps/web/next.config.ts`.
  Without a list (`next dev`, unit tests) well-formed ids pass; a production bundle without one refuses all. So
  rows per user are bounded by the number of questions. A question whose id changes loses its ratings, which is
  why `apps/web/content/AGENTS.md` says not to change the id of a published question.
- An account holds at most 30 stories (`STORY_LIMITS` in `apps/web/src/lib/stories.ts`); a 31st gets 409. The text
  limits are in three places that must agree: `STORY_LIMITS`, `schema.ts` and the table's check constraint.
- The API body limit is 64 kB, so the browser sends stories one at a time and ratings 200 per request.
- Merging never removes a rating. For a story, the newer `updatedAt` wins, and a time in the future is clamped to
  now. A story deleted on one device is dropped on another at its next sync (the browser marks synced stories).
- Deleting the account removes both tables' rows (`ON DELETE CASCADE`), and the JSON export includes them
  (`apps/web/src/features/account/data.ts`).

## Extend it

A new kind of practice data: a table with a cascade to `user`, a line in the account export, a zod schema here, a
route through `route`, and the browser store in `apps/web/src/lib/`. Checklist ticks (`apps/web/src/lib/checklist.ts`) are
browser-only today.

## Tests

`practice.test.ts`: schemas and the id check (unit), and the API against a database (skipped without the local
Postgres; CI runs it).
