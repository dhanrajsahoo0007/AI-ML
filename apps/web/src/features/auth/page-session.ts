import "server-only";
import { cookies, headers } from "next/headers";
import type { RequestSessionInfo } from "@/server/http";
import { withDb, type Db } from "@/server/db/client";
import { createAuth } from "./server";
import { toSessionInfo } from "./route";

// Session lookup for the dynamic account pages (never content pages: those stay static and DB-free).

const SESSION_COOKIE = /^(?:__Secure-)?oa\.session_token$/;

/** True when the browser sends a session cookie at all (cheap, no DB). */
async function hasSessionCookie(): Promise<boolean> {
  return (await cookies()).getAll().some((c) => SESSION_COOKIE.test(c.name));
}

/**
 * Runs `fn` with the signed-in user and a database handle, or returns null when signed out. Reads the session
 * from the database (no cookie cache), so a revoked session is signed out at once.
 */
export async function withPageSession<T>(fn: (auth: RequestSessionInfo, db: Db) => Promise<T>): Promise<T | null> {
  if (!(await hasSessionCookie())) return null;
  const requestHeaders = await headers();
  return withDb(
    async (db) => {
      const result = await createAuth(db).api.getSession({
        headers: requestHeaders,
        query: { disableCookieCache: true },
      });
      return result ? fn(toSessionInfo(result), db) : null;
    },
    { label: "page:account" }
  );
}
