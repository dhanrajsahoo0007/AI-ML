import { vi } from "vitest";
import type { NextRouteHandler } from "@/server/http";
import { createTestDatabase, type TestDatabase } from "@/server/db/testing";
import { seedTestUsers } from "@/server/db/seed-test";
import type { TestUserKey } from "@/server/db/test-users";
import { TEST_LOGIN_HEADER } from "./test-login";

// Shared by the auth, account and progress integration tests (Vitest only): a migrated, seeded database and
// helpers that call route handlers the way Next does.

export const ORIGIN = "http://localhost:3001";
export const TEST_KEY = "vitest-test-login-key-0123456789";

export async function setupAuthTestEnv(extra: Record<string, string> = {}) {
  const tdb: TestDatabase = await createTestDatabase();
  const ids = await seedTestUsers(tdb.db);
  const env: Record<string, string> = {
    APP_ENV: "test",
    DATABASE_URL: tdb.url,
    BETTER_AUTH_URL: ORIGIN,
    BETTER_AUTH_SECRET: "vitest-secret-0123456789abcdef0123456789abcdef",
    ENABLE_TEST_LOGIN: "1",
    TEST_LOGIN_KEY: TEST_KEY,
    ...extra,
  };
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return {
    tdb,
    ids,
    async teardown() {
      vi.unstubAllEnvs();
      await tdb.drop();
    },
  };
}

export interface CallOptions {
  method?: string;
  body?: unknown;
  cookie?: string;
  origin?: string | null;
  headers?: Record<string, string>;
  params?: Record<string, string | string[]>;
}

export async function call(handler: NextRouteHandler, path: string, options: CallOptions = {}) {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);
  if (options.origin !== null && method !== "GET") headers.set("origin", options.origin ?? ORIGIN);
  if (options.cookie) headers.set("cookie", options.cookie);
  let body: string | undefined;
  if (options.body !== undefined) {
    headers.set("content-type", headers.get("content-type") ?? "application/json");
    body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
  }
  const request = new Request(new URL(path, ORIGIN), { method, headers, body });
  return handler(request, { params: Promise.resolve(options.params ?? {}) });
}

/** `name=value; …` from a response's Set-Cookie headers (expired cookies dropped). */
export function cookieHeader(response: Response, previous = ""): string {
  const jar = new Map<string, string>();
  for (const part of previous.split(/;\s*/).filter(Boolean)) {
    const i = part.indexOf("=");
    jar.set(part.slice(0, i), part.slice(i + 1));
  }
  for (const line of response.headers.getSetCookie()) {
    const [pair] = line.split(";");
    const i = pair!.indexOf("=");
    const name = pair!.slice(0, i);
    const value = pair!.slice(i + 1);
    if (/max-age=0/i.test(line) || value === "") jar.delete(name);
    else jar.set(name, value);
  }
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

/** Signs in as a seeded user through the real test-login route; returns the cookie header. */
export async function testLoginAs(userKey: TestUserKey, extraCookie = ""): Promise<string> {
  const { POST } = await import("@/app/api/test/login/route");
  const res = await call(POST, "/api/test/login", {
    method: "POST",
    body: { userKey },
    cookie: extraCookie || undefined,
    headers: { [TEST_LOGIN_HEADER]: TEST_KEY },
  });
  if (res.status !== 200) throw new Error(`test login failed: ${res.status} ${await res.text()}`);
  return cookieHeader(res, extraCookie);
}
