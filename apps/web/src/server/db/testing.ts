import { Client } from "pg";
import { uuidv7 } from "./uuid";
import { assertLocalDatabase } from "./config";
import { createDb, type DbHandle } from "./client";
import { migrateDatabase } from "./migrate";

// Integration-test helpers: each test file gets its own freshly migrated database on the local Docker Postgres
// (`npm run db:up -w web`), dropped afterwards. Only local servers are accepted.
//
// TEST_DATABASE_URL points at the server's maintenance database (default: the docker-compose one). When the
// server isn't reachable the DB tests are skipped, unless REQUIRE_DB=1 (set it in CI with a Postgres service),
// in which case they fail.

export const TEST_SERVER_URL = process.env.TEST_DATABASE_URL ?? "postgres://origins:origins@127.0.0.1:54329/postgres";

function withDatabase(url: string, name: string): string {
  const u = new URL(url);
  u.pathname = `/${name}`;
  return u.toString();
}

async function admin<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  assertLocalDatabase(TEST_SERVER_URL, "create test databases");
  const client = new Client({ connectionString: TEST_SERVER_URL, connectionTimeoutMillis: 2_000 });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** True when the local test server answers. Throws instead when REQUIRE_DB=1. */
export async function testDatabaseAvailable(): Promise<boolean> {
  try {
    await admin((c) => c.query("select 1"));
    return true;
  } catch (err) {
    if (process.env.REQUIRE_DB === "1") throw err;
    console.warn(`[db tests skipped] no Postgres at ${new URL(TEST_SERVER_URL).host}: run \`npm run db:up -w web\``);
    return false;
  }
}

export interface TestDatabase extends DbHandle {
  url: string;
  /** Closes the handle and drops the database. */
  drop(): Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const name = `oa_test_${uuidv7().replace(/-/g, "").slice(-16)}`;
  await admin((c) => c.query(`create database "${name}"`));
  const url = withDatabase(TEST_SERVER_URL, name);
  await migrateDatabase(url);
  const handle = createDb({ connectionString: url, appEnv: "test" });
  return {
    ...handle,
    url,
    async drop() {
      await handle.close();
      await admin((c) => c.query(`drop database if exists "${name}" with (force)`));
    },
  };
}
