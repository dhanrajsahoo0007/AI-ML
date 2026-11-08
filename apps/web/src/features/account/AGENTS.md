# features/account: the user's own data

The account overview, the JSON data export (GDPR art. 15/20, India DPDP) and account deletion. Pages:
`apps/web/src/app/account/page.tsx`, `apps/web/src/app/account/data/page.tsx` (dynamic, signed-in only). API:
`apps/web/src/app/api/account/` (`consent`, `export`, `delete`, `sessions`).

## Public API (`index.ts`)

- `accountOverview(db, userId)`: what `/account` shows (profile, plan, devices).
- `exportUserData(db, userId)`: every row the user owns, as JSON.
- `deleteAccount(db, userId)`: deletes the user; throws `LiveSubscriptionError` while a subscription is live.
- `setSubscriptionCanceller(fn)`, `LiveSubscription`, `SubscriptionCanceller`: the hook billing registers.
- `describeDevice(userAgent)`: "Chrome on macOS" labels for the session list.
- Client islands by path: `account-actions.client.tsx`; `profile-menu.client.tsx`, the header's profile menu
  (session fetched only when opened), rendered by `apps/web/src/app/layout.tsx` and passed into `SiteHeader`.

## Data flow

Account pages call `withPageSession()` from `apps/web/src/features/auth/index.ts` (reads the database, no cookie
cache) and then these functions. Export and delete run through `route` with `auth: "user"` and the `account`
rate limit, and require `isFreshSession()` (signed in within 10 minutes), else 403 `reauth_required`.

## Invariants and gotchas

- **Every query is filtered by the signed-in user's id**; nothing else is ever selected. Keep it that way: no admin
  or cross-user reads here.
- Deletion relies on `ON DELETE CASCADE` for sessions, accounts, consent, progress, bookmarks, subscriptions,
  entitlement, customers and newsletter rows; `payment` rows stay for revenue reporting with `user_id` set to NULL.
  A new user-owned table needs a cascade (or an explicit delete) and a line in the export.
- The deletion itself is written to `audit_log` without personal data.
- **Live subscriptions block deletion** until billing registers a canceller with `setSubscriptionCanceller`
  (stream L), so nobody is deleted while still being charged.
- Delete needs the typed confirmation body `{ confirm: "DELETE" }`; the auth cookies are cleared on success.
- These pages are dynamic and the only non-API code allowed to touch the database (golden rule 1).

## Extend it

Adding a table that holds user data: add it to `exportUserData`, make sure `deleteAccount` removes or anonymises it,
and extend `account.test.ts`. New account action: an API route under `apps/web/src/app/api/account/` using `route`.

## Tests

`account.test.ts` (DB-backed: export, delete, cascade), `device.test.ts`; E2E `apps/web/tests/e2e/account.spec.ts`
(export, re-auth after 10 minutes, delete).
