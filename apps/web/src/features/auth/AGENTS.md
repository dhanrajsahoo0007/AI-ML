# features/auth: Google sign-in, sessions and the API route wrapper

Better Auth with Google as the only way in (no passwords), sessions in Postgres, and the session-bound `route`
wrapper every API handler uses. Code-owner review required (`.github/CODEOWNERS`).

## Public API (`index.ts`)

- `route`: `createRoute()` from `apps/web/src/server/http.ts` bound to Better Auth sessions and `TRUSTED_ORIGINS`.
  **Every API route imports this one.** `authFor(request, db)` gives the per-request Better Auth instance.
- `withPageSession(fn)`: session + DB handle for the dynamic account pages only (null when signed out).
- `authConfig()`, `isGoogleConfigured()`: zod-validated env, read per request.
- `ageCookie()`, `isFreshSession()`, `revokeAllSessions()`, `MAX_SESSIONS_PER_USER` (3), `safeNextPath()`.
- `public.ts`: client-safe exports for islands in other features (`safeNextPath()`, which refuses control
  characters, backslashes, `//` and dot-segment tricks, and returns the URL parser's own same-origin path).
- Client island by path: `sign-in-form.client.tsx` (never re-exported from the index, so server tests don't parse
  JSX).

## Data flow

`/sign-in` → age/parental-consent checkbox → `POST /api/account/consent` sets a short-lived cookie scoped to
`/api/auth` → "Continue with Google" → `apps/web/src/app/api/auth/[...all]/route.ts` (Better Auth inside `route`) →
Google callback → session row created → hooks: keep the newest 3 sessions, record `age_confirmation` in
`consent_log`, revoke the browser's previous session (fixation) → `/sign-in/complete` merges signed-out progress.

## Invariants and gotchas

- **Session cookie cache:** Better Auth's `cookieCache` (5 min, `compact`) is on, but API routes and account pages
  pass `disableCookieCache` and read the database, so a revoked session stops working at once. Don't rely on the
  cached cookie for authorisation.
- `route`'s session lookup skips Better Auth and the DB entirely when no `oa.session_token` cookie is present.
- Config is read **per request**, never at module load: `npm run build` must work with no env vars.
- Google must report `email_verified`; scopes are exactly `openid email profile`; PKCE and `state` are Better Auth
  defaults. `disableOriginCheck: false` is set explicitly because Better Auth skips origin checks under
  `NODE_ENV=test`.
- `role` is `input: false`: admins are promoted in the database, never from a request.
- Disabled Better Auth endpoints: update-user, change-email, delete-user, link/unlink; account changes go through
  `apps/web/src/features/account/`.
- Limits: `route()`'s `rateLimit` (`authRateLimit()`: `auth` 10/min/IP for sign-in paths, `session` for the rest),
  backed by the Workers binding. Better Auth's own limiter is a second, per-isolate layer, on only on Cloudflare
  (it keys by `cf-connecting-ip`, which `next start` doesn't have).
- **Test-login** (`test-login.ts`): `POST /api/test/login` with header `x-test-login-key` signs in a seeded user
  (`npm run db:seed:test -w web`). Registered only when `APP_ENV` isn't production, `ENABLE_TEST_LOGIN=1` and
  `TEST_LOGIN_KEY` are set; production builds export a plain 404 (`apps/web/tests/e2e/auth.spec.ts` asserts no bundle
  mentions it). Any failure answers 404.
- Cookies: prefix `oa`, `HttpOnly`, `SameSite=Lax`, `__Secure-` when `secureCookies`; IP from `cf-connecting-ip`.
- Re-auth window for export and delete: `isFreshSession()` (10 minutes).

## Extend it

- New API route: `.claude/skills/add-api-route/SKILL.md`.
- New provider or session rule: change `server.ts` and `config.ts` together, add tests in `auth.test.ts` and
  `config.test.ts`, and get code-owner review.

## Tests

`auth.test.ts`, `config.test.ts`, `route.test.ts` (DB-backed, skipped without Docker), `test-helpers.ts`; E2E
`apps/web/tests/e2e/auth.spec.ts` (sessions, sign out everywhere, age gate, zero DB queries on content pages).
