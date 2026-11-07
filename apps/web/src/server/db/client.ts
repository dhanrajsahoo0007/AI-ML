import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { assertDatabaseAllowed, databaseUrl, readAppEnv, type AppEnv } from "./config";
import * as schema from "./schema";

// One database handle per request (plan §8.1). In Workers a connection can't outlive the request that opened
// it, so there is no module-level pool: each request makes a one-connection pool that connects lazily on the
// first query (requests that never query never connect) and is closed when the request ends. Hyperdrive does
// the real pooling in front of Neon.

export type Db = NodePgDatabase<typeof schema>;

export interface DbHandle {
  db: Db;
  close(): Promise<void>;
}

// ── Query-log hook ────────────────────────────────────────────────────────────────────────────────────────────
// Lets tests prove that page renders never touch the database (plan §8.3 exit criteria): every query run
// through a handle is reported to the listeners. With DB_QUERY_LOG_FILE set (never in production) each query
// is also appended to that file, which the e2e crawl reads from outside the server process.

type QueryListener = (query: string) => void;
const LISTENERS_KEY = Symbol.for("origins.db.queryListeners");
const globalStore = globalThis as typeof globalThis & { [LISTENERS_KEY]?: Set<QueryListener> };
const listeners = (globalStore[LISTENERS_KEY] ??= new Set());

export function onQuery(listener: QueryListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function fileQueryLog(appEnv: AppEnv): QueryListener | null {
  const file = process.env.DB_QUERY_LOG_FILE;
  if (!file || appEnv === "production") return null;
  return (query) => {
    void import("node:fs").then((fs) => fs.appendFileSync(file, `${new Date().toISOString()} ${query}\n`));
  };
}

export interface CreateDbOptions {
  connectionString?: string;
  appEnv?: AppEnv;
}

export function createDb(options: CreateDbOptions = {}): DbHandle {
  const appEnv = options.appEnv ?? readAppEnv();
  const connectionString = options.connectionString ?? databaseUrl();
  assertDatabaseAllowed(connectionString, appEnv);

  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 1_000,
    application_name: "origins-web",
  });
  // An idle-client error (server restart, network drop) must not crash the process; the next query reconnects.
  pool.on("error", () => {});

  const fileLog = fileQueryLog(appEnv);
  const db = drizzle(pool, {
    schema,
    logger: {
      logQuery(query) {
        fileLog?.(query);
        for (const listener of listeners) listener(query);
      },
    },
  });

  let closed = false;
  return {
    db,
    async close() {
      if (closed) return;
      closed = true;
      await pool.end();
    },
  };
}

/** Runs `fn` with a fresh handle and always closes it. */
export async function withDb<T>(fn: (db: Db) => Promise<T>, options?: CreateDbOptions): Promise<T> {
  const handle = createDb(options);
  try {
    return await fn(handle.db);
  } finally {
    await handle.close();
  }
}
