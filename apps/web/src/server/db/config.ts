import { z } from "zod";

// Database configuration and the production-data safety rules (plan §8.1, §11.5). No `server-only` import:
// drizzle.config.ts and the db scripts load this outside Next.
//
// Integration note: stream G's `src/server/env.ts` becomes the single env reader; until then this file reads
// `process.env` (OpenNext copies Worker vars there) and validates with zod.

export const APP_ENVS = ["local", "test", "preview", "staging", "production"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

/** Environments that may talk to a database that isn't on this machine (Neon through Hyperdrive). */
const REMOTE_DB_ENVS: ReadonlySet<AppEnv> = new Set(["preview", "staging", "production"]);

const appEnvSchema = z.enum(APP_ENVS);

/**
 * The environment this code runs as. The defaults are the literal `process.env.APP_ENV` expression on purpose:
 * next.config.ts inlines it at build time, so a production build stays production whatever the runtime env says
 * (and dead code behind `appEnv !== "production"` checks can be dropped from the bundle). Same fallback as the
 * section registry: unset means production under NODE_ENV=production, else local.
 */
export function readAppEnv(
  raw: string | undefined = process.env.APP_ENV,
  nodeEnv: string | undefined = process.env.NODE_ENV
): AppEnv {
  if (raw) return appEnvSchema.parse(raw);
  return nodeEnv === "production" ? "production" : "local";
}

export class DatabaseConfigError extends Error {
  override name = "DatabaseConfigError";
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", ""]);

/** Host of a Postgres connection string; a Unix socket path counts as local. */
export function databaseHost(connectionString: string): string {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new DatabaseConfigError("The database connection string is not a valid URL");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new DatabaseConfigError(`Unsupported database URL scheme "${url.protocol}"`);
  }
  // `?host=/var/run/postgresql` (socket) overrides the authority part, as libpq does.
  const socketHost = url.searchParams.get("host");
  if (socketHost) return socketHost.startsWith("/") ? "" : socketHost.toLowerCase();
  return url.hostname.toLowerCase();
}

export function isLocalHost(host: string): boolean {
  return LOCAL_HOSTS.has(host) || host.startsWith("127.") || host.endsWith(".localhost");
}

/**
 * Boot guard: refuse a non-local database host unless APP_ENV is preview, staging or production. Stops a dev
 * or test run that picked up a production URL from writing to it.
 */
export function assertDatabaseAllowed(connectionString: string, appEnv: AppEnv = readAppEnv()): void {
  const host = databaseHost(connectionString);
  if (isLocalHost(host) || REMOTE_DB_ENVS.has(appEnv)) return;
  throw new DatabaseConfigError(
    `Refusing to connect to non-local database host "${host}" with APP_ENV=${appEnv}. ` +
      `Remote databases are allowed only for APP_ENV ${[...REMOTE_DB_ENVS].join(", ")}.`
  );
}

/** Seed, truncate and reset scripts run only against a database on this machine, whatever APP_ENV says. */
export function assertLocalDatabase(connectionString: string, what: string): void {
  const host = databaseHost(connectionString);
  if (!isLocalHost(host)) {
    throw new DatabaseConfigError(`Refusing to ${what} on non-local database host "${host}"`);
  }
}

type ConnectionStringSource = () => string | undefined;
let connectionStringSource: ConnectionStringSource | null = null;

/**
 * Where the per-request connection string comes from. In Workers this is Hyperdrive's
 * `env.HYPERDRIVE.connectionString` (a binding, so not in `process.env`); stream G registers it at startup:
 *
 *   setConnectionStringSource(() => getCloudflareContext().env.HYPERDRIVE?.connectionString);
 *
 * Without a source (Node, `next start`, tests) `DATABASE_URL` is used.
 */
export function setConnectionStringSource(source: ConnectionStringSource | null): void {
  connectionStringSource = source;
}

const urlSchema = z.string().min(1);

/** The connection string for this request, or null when no database is configured (for example a bare build). */
export function databaseUrlOrNull(): string | null {
  const parsed = urlSchema.safeParse(connectionStringSource?.() ?? process.env.DATABASE_URL);
  return parsed.success ? parsed.data : null;
}

export function databaseUrl(): string {
  const url = databaseUrlOrNull();
  if (!url) throw new DatabaseConfigError("No database configured: set DATABASE_URL (or the Hyperdrive binding)");
  return url;
}
