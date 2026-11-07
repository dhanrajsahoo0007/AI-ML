import "server-only";
import { isAPIError } from "better-auth/api";
import type { Db } from "@/server/db/client";
import { createRoute, HttpError, type RequestSessionInfo, type SessionLookup } from "@/server/http";
import { authConfig } from "./config";
import { createAuth, type Auth } from "./server";

// Binds the server/http route() wrapper to Better Auth sessions and the trusted origins. App routes import
// `route` from "@/features/auth".

// One Better Auth instance per request, shared by the wrapper's session lookup and the handler.
const perRequest = new WeakMap<Request, Auth>();

export function authFor(request: Request, db: () => Db): Auth {
  let auth = perRequest.get(request);
  if (!auth) {
    auth = createAuth(db());
    perRequest.set(request, auth);
  }
  return auth;
}

type SessionResult = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;

export function toSessionInfo(result: SessionResult): RequestSessionInfo {
  const u = result.user as SessionResult["user"] & { role?: string | null };
  return {
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image ?? null,
      role: u.role === "admin" ? "admin" : "user",
    },
    session: {
      id: result.session.id,
      userId: result.session.userId,
      createdAt: new Date(result.session.createdAt),
      expiresAt: new Date(result.session.expiresAt),
    },
  };
}

async function getSession(request: Request, db: () => Db): Promise<SessionLookup> {
  // Signed-out requests never build Better Auth or open a connection.
  if (!/(?:^|;\s*)(?:__Secure-)?oa\.session_token=/.test(request.headers.get("cookie") ?? "")) return { info: null };
  const auth = authFor(request, db);
  // API routes always read the database (no cookie cache), so revoked sessions stop working at once.
  const { headers, response } = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
    returnHeaders: true,
  });
  return { info: response ? toSessionInfo(response) : null, setCookies: headers.getSetCookie() };
}

function mapError(err: unknown): HttpError | null {
  if (!isAPIError(err)) return null;
  const body = (err as { body?: { code?: string; message?: string } }).body;
  return new HttpError(
    err.statusCode,
    (body?.code ?? String(err.status)).toLowerCase(),
    body?.message ?? "Request failed"
  );
}

export const route = createRoute({
  getSession,
  allowedOrigins: () => authConfig().trustedOrigins,
  mapError,
});
