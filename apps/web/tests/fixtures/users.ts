import { execFileSync } from "node:child_process";
import path from "node:path";
import type { BrowserContext } from "@playwright/test";
import { Client } from "pg";
import { TEST_USERS, testUserEmail, type TestUserKey } from "../../src/server/db/test-users";

// Seeded users per role (plan §12.3) and helpers for the database-backed e2e specs (auth.spec.ts,
// account.spec.ts). Those specs run only when the server under test has a database and the test-login
// provider, signalled by E2E_DB=1:
//
//   npm run db:up -w web
//   export DATABASE_URL=postgres://origins:origins@127.0.0.1:54329/origins_dev
//   export E2E_DB=1 ENABLE_TEST_LOGIN=1 TEST_LOGIN_KEY=local-e2e-test-login-key
//   export BETTER_AUTH_URL=http://127.0.0.1:3100 BETTER_AUTH_SECRET=local-e2e-secret-0123456789abcdef0123
//   export DB_QUERY_LOG_FILE=$PWD/apps/web/test-results/db-queries.log
//   npm run db:migrate -w web && npm run db:seed:test -w web
//   APP_ENV=preview npm run build && npx playwright test auth account --project=chromium   (from apps/web)
//
// The Playwright web server inherits these variables, so the app and the specs share the database.

export { TEST_USERS, testUserEmail, type TestUserKey };

export const dbE2E = process.env.E2E_DB === "1";
export const SKIP_REASON = "needs E2E_DB=1 with Postgres and the test-login provider (see tests/fixtures/users.ts)";

const webRoot = path.resolve(__dirname, "../..");

/** Resets the given seeded users (and only them) to their initial state. */
export function reseed(...keys: TestUserKey[]): void {
  execFileSync("npm", ["run", "--silent", "db:seed:test", "--", ...keys], { cwd: webRoot, stdio: "pipe" });
}

/** Runs one statement against the e2e database (for setup only, e.g. ageing a session). */
export async function sql(text: string, params: unknown[] = []): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(text, params);
  } finally {
    await client.end();
  }
}

/** The app's origin, as playwright.config.ts computes its baseURL. */
export const origin = () =>
  (process.env.E2E_BASE_URL ?? `http://127.0.0.1:${process.env.E2E_PORT ?? 3100}`).replace(/\/+$/, "");

/**
 * Signs in as a seeded user through the test-login provider. The session cookies land in the context, so the
 * browser is signed in for every page opened from it.
 */
export async function loginAs(context: BrowserContext, key: TestUserKey): Promise<void> {
  const res = await context.request.post("/api/test/login", {
    data: { userKey: key },
    headers: { "x-test-login-key": process.env.TEST_LOGIN_KEY ?? "", origin: origin() },
  });
  if (res.status() !== 200) throw new Error(`test login as ${key} failed: ${res.status()} ${await res.text()}`);
}
