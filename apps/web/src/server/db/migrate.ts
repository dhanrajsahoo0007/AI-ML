import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { assertDatabaseAllowed, readAppEnv } from "./config";

// `npm run db:migrate -w web`: applies drizzle/*.sql in order. Uses DATABASE_URL_DIRECT (CI: the direct Neon URL
// with the `migrator` role, plan §8.1/§11.5) or DATABASE_URL. Never run from the Worker. The boot guard applies:
// a non-local host needs APP_ENV preview, staging or production.

export const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../drizzle");

export async function migrateDatabase(connectionString: string): Promise<void> {
  assertDatabaseAllowed(connectionString, readAppEnv());
  const pool = new Pool({ connectionString, max: 1, application_name: "tts-migrate" });
  try {
    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_DIR });
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("db:migrate: set DATABASE_URL (local: postgres://tts:tts@127.0.0.1:54329/tts_dev)");
    process.exit(1);
  }
  migrateDatabase(url).then(
    () => console.log("db:migrate: up to date"),
    (err: unknown) => {
      console.error("db:migrate failed:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  );
}
