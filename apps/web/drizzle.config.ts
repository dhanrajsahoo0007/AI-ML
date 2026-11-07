import { defineConfig } from "drizzle-kit";
import { assertDatabaseAllowed, readAppEnv } from "./src/server/db/config";

// drizzle-kit: `npm run db:generate -w web` writes a new SQL migration in drizzle/ from the schema diff.
// Migrations are additive only (plan §8.1, §20): add tables, columns and enum values; never rename or drop in
// the same release. Apply them with `npm run db:migrate -w web` (src/server/db/migrate.ts), not `drizzle-kit
// push`. The least-privilege roles live in src/server/db/sql/roles.sql and are applied by hand, never here.
const url =
  process.env.DATABASE_URL_DIRECT ??
  process.env.DATABASE_URL ??
  "postgres://origins:origins@127.0.0.1:54329/origins_dev";
assertDatabaseAllowed(url, readAppEnv());

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
