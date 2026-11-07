---
name: add-migration
description: Use when adding or changing a database table, column, index, enum value or view (anything under apps/web/src/server/db/schema or apps/web/drizzle).
---

# Add a database migration

Background: `apps/web/src/server/db/AGENTS.md`. The database layer needs code-owner review.

1. **Additive only (expand/contract).** Add tables, nullable or defaulted columns, indexes and enum values. Renames
   and drops happen in a later release, after no deployed code uses the old shape.
   - Good: add `bookmark.note text` (nullable), backfill later, read it once deployed
   - Bad: rename `progress.content_key` to `key` in one migration

2. **Edit the schema, then generate.** Change the Drizzle schema under `apps/web/src/server/db/schema/` (export new
   tables from `apps/web/src/server/db/schema/index.ts`), then run `npm run db:generate -w web`. Never hand-write the SQL file from scratch
   and never use `drizzle-kit push`.

3. **Review the generated SQL** in `apps/web/drizzle/`: no `DROP`, no `ALTER ... TYPE` that rewrites a big table,
   no `NOT NULL` without a default on an existing table.

4. **Apply locally only:** `npm run db:up -w web`, then `npm run db:migrate -w web`. Never point these at a remote
   database; the boot guard refuses non-local hosts outside preview/staging/production, and production migrations
   run only from CI with the `migrator` role.

5. **Keep the conventions:** UUIDv7 ids from `uuidv7()`, `ON DELETE CASCADE` for rows a user owns, check
   constraints mirrored by zod schemas (e.g. content keys), minimal PII, never card data.

6. **User-owned data** also goes into `exportUserData` and must be removed by `deleteAccount`
   (`apps/web/src/features/account/AGENTS.md`).

7. **Grants:** if the table needs a non-default grant, update `apps/web/src/server/db/sql/roles.sql` and tell the
   owner it must be re-run by hand; it is not a migration.

8. **Test against real Postgres:** extend `apps/web/src/server/db/schema.test.ts` (constraints) and the feature's
   DB tests; run `npm test` with Docker up (`REQUIRE_DB=1` makes skipped DB tests fail, as in CI).
