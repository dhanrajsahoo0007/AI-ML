import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function getConnectionString() {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  if (process.env.SKIP_ENV_VALIDATION === "1") {
    return "postgresql://postgres:postgres@127.0.0.1:5433/aiml";
  }
  throw new Error("DATABASE_URL is not set");
}

function createDb() {
  const client = postgres(getConnectionString(), { max: 10 });
  return drizzle(client, { schema });
}

declare global {
  var __aiml_db: ReturnType<typeof createDb> | undefined;
}

export const db = globalThis.__aiml_db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalThis.__aiml_db = db;
}
