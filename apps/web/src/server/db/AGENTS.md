# server/db: Postgres client, schema, migrations and safety guards

Neon Postgres (through Hyperdrive on Cloudflare) with Drizzle ORM and the `pg` driver. Used only by `/api/*` route
handlers and the account pages. Code-owner review required (`.github/CODEOWNERS`).

## Public API

- `client.ts`: `createDb()` → `DbHandle` (one lazy, one-connection pool per request; always closed), `withDb(fn)`,
  `Db` type, `onQuery()` query-log hook, `hyperdriveConnectionString()` (registered as the connection-string source
  when the module loads).
- `config.ts`: `readAppEnv()`, `databaseUrl()`, `assertDatabaseAllowed()` (boot guard), `assertLocalDatabase()`,
  `setConnectionStringSource()` (Hyperdrive hook), `databaseHost()`.
- `schema/`: every table, enum and view (`schema/index.ts` re-exports `auth`, `billing`, `newsletter`,
  `account-data`, `views`); `schema/columns.ts` shared column helpers.
- `consent.ts`: `CONSENT_VERSIONS`, `recordConsentOnce()`. `uuid.ts`: `uuidv7()` (all primary keys).
- `migrate.ts`: `npm run db:migrate -w web` applies `apps/web/drizzle/*.sql` in order.
- `testing.ts`: `testDatabaseAvailable()`, `createTestDatabase()` for integration tests.
- `test-users.ts` + `seed-test.ts`: seeded users per role (`free`, `pro_monthly`, `pro_yearly`, `pro_expired`,
  `on_hold`, `admin`) for tests and test-login; `npm run db:seed:test -w web`.
- `sql/roles.sql`: least-privilege roles (`app_rw`, `migrator`, `readonly`, `backup`). **Not a migration**; the
  owner runs it by hand.

Route handlers don't create handles themselves: `route()` (`apps/web/src/server/http.ts`) gives each request
`ctx.db()`, opened on first use. Account pages use `withPageSession()` from `apps/web/src/features/auth/index.ts`.

## Invariants and gotchas

- **Never import this from a page render, a layout, middleware or anything under `apps/web/src/server/edge/`.**
  `apps/web/tests/e2e/auth.spec.ts` uses the query log (`DB_QUERY_LOG_FILE`) to prove content pages make zero queries.
- No module-level pool: a Workers connection can't outlive its request. Requests that never query never connect.
- **Boot guard:** a non-local host is refused unless `APP_ENV` is preview, staging or production, and then only with
  `sslmode=require` (or `verify-ca` / `verify-full`; Hyperdrive's `*.hyperdrive.local` endpoint is exempt). Seed, truncate and
  reset scripts refuse any non-local host whatever `APP_ENV` says. Never run destructive SQL against a remote DB.
- `APP_ENV` here also accepts `test`; `readAppEnv()` reads the literal `process.env.APP_ENV` so production builds
  inline it.
- **Migrations are additive** (expand/contract): add tables, columns and enum values; never rename or drop in the
  same release. Generate with `npm run db:generate -w web`, apply with `npm run db:migrate -w web` (local/preview
  only; CI uses `DATABASE_URL_DIRECT` with the `migrator` role). Never `drizzle-kit push`.
- IDs are UUIDv7 generated in the app (Postgres 17 has none built in), so inserts stay index-friendly.
- Payment card data never touches this DB (the MoR stores it); keep PII minimal (email, name, avatar URL).
- `audit_log` is append-only for `app_rw`. The `current_entitlement` view is what entitlement reads use.
- Billing tables (`customer`, `subscription`, `entitlement`, `payment`, `fx_rate`, `webhook_event`) exist; the
  logic that writes them is stream L's billing feature (not merged yet).
- **Connection string:** `client.ts` registers Hyperdrive as the source once per isolate; each request reads
  `env.HYPERDRIVE.connectionString` (bindings are per request) and falls back to `DATABASE_URL` when the binding is
  absent (`next dev`, `next start`, CI, and every Worker until the owner creates the Hyperdrive configs; the
  bindings are commented in `apps/web/wrangler.jsonc` with a TODO). The boot guard runs on whichever string wins.
- `*.hyperdrive.local` is **not** a local host: it fronts a real (possibly production) database, so `local` and
  `test` refuse it. It is only exempt from the `sslmode` rule, because the Worker-to-Hyperdrive hop stays inside
  Cloudflare and Hyperdrive reaches Neon over TLS. Look-alikes (`x.hyperdrive.local.example.com`) get no exemption.

## Extend it

New table or column: `.claude/skills/add-migration/SKILL.md`. User-owned data also needs a cascade and a line in
`exportUserData` (`apps/web/src/features/account/AGENTS.md`). A table needing a non-default grant: update
`sql/roles.sql` and tell the owner to re-run it.

## Tests

`schema.test.ts` (constraints against a freshly migrated Postgres), `config.test.ts` (boot guard),
`hyperdrive.test.ts` (binding vs `DATABASE_URL`, guard on the resolved string; no database needed). DB tests skip
without Docker unless `REQUIRE_DB=1` (CI). Start Postgres with `npm run db:up -w web`.
