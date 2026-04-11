import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(url, { max: 1 });
const db = drizzle(client);
const folder =
  process.env.MIGRATIONS_FOLDER ??
  path.join(__dirname, "..", "drizzle");

await migrate(db, { migrationsFolder: folder });
await client.end();
console.log("Migrations applied.");
