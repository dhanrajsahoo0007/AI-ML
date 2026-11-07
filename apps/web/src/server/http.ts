import "server-only";
import { z } from "zod";
import { createDb, type Db, type DbHandle } from "./db/client";

// The one wrapper every API route handler goes through (plan §11.6):
// - an Origin allow-list check on state-changing methods (CSRF); GET never changes state
// - auth / role check
// - a rate-limit hook (the Workers Rate Limiting binding is plugged in with setRateLimiter)
// - zod body parsing that rejects unknown fields
// - `Cache-Control: no-store` on every response
// - a uniform error shape `{ error: { code, message }, requestId }` with no stack traces
// - one database handle per request, opened lazily and always closed
//
// `server/` must not import `features/`, so the session lookup and the allowed origins are injected:
// features/auth binds them with `createRoute()` and exports the ready `route`. App routes import that one.

// ── Errors ───────────────────────────────────────────────────────────────────────────────────────────────────

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string = code,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const notFound = () => new HttpError(404, "not_found", "Not found");

// ── Sessions (injected) ──────────────────────────────────────────────────────────────────────────────────────

export interface RequestUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "user" | "admin";
}

export interface RequestSessionInfo {
  user: RequestUser;
  session: { id: string; userId: string; createdAt: Date; expiresAt: Date };
}

export interface SessionLookup {
  info: RequestSessionInfo | null;
  /** Set-Cookie headers the lookup produced (a sliding-expiry refresh); copied onto the response. */
  setCookies?: string[];
}

export interface RouteDeps {
  getSession(request: Request, db: () => Db): Promise<SessionLookup>;
  /** Exact origins (`https://example.com`) or host wildcards (`https://*.example.workers.dev`). */
  allowedOrigins(): readonly string[];
  /** Turns library errors (for example Better Auth's APIError) into HttpErrors; null when it isn't one. */
  mapError?(err: unknown): HttpError | null;
}

// ── Rate limiting (hook) ─────────────────────────────────────────────────────────────────────────────────────

/** Named limits from plan §11.6; the limiter decides the numbers (Workers Rate Limiting binding config). */
export type RateLimitName = "auth" | "account" | "progress" | "checkout" | "portal" | "entitlements" | "test";

export interface RateLimiter {
  limit(input: { name: RateLimitName; key: string }): Promise<{ success: boolean }>;
}

let rateLimiter: RateLimiter | null = null;

/** Stream G wires the Workers `RATE_LIMITER` binding here at startup. Without one, requests aren't limited. */
export function setRateLimiter(limiter: RateLimiter | null): void {
  rateLimiter = limiter;
}

// ── Origin check ─────────────────────────────────────────────────────────────────────────────────────────────

const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function originAllowed(origin: string | null, allowed: readonly string[]): boolean {
  if (!origin || origin === "null") return false;
  return allowed.some((pattern) => {
    if (!pattern.includes("*")) return pattern === origin;
    const re = new RegExp(`^${pattern.split("*").map(escapeRegExp).join("[a-z0-9-]+")}$`, "i");
    return re.test(origin);
  });
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Responses ────────────────────────────────────────────────────────────────────────────────────────────────

// JSON-serialisable handler results (Dates become ISO strings).
type Json = string | number | boolean | null | Date | Json[] | { [key: string]: Json | undefined };

const MAX_BODY_BYTES = 64 * 1024;

function errorResponse(err: HttpError, requestId: string): Response {
  const body: { error: { code: string; message: string; details?: unknown }; requestId: string } = {
    error: { code: err.code, message: err.message },
    requestId,
  };
  if (err.details !== undefined) body.error.details = err.details;
  return Response.json(body, { status: err.status });
}

function finalize(response: Response, requestId: string, setCookies: readonly string[] = []): Response {
  let res = response;
  try {
    res.headers.set("cache-control", "no-store");
  } catch {
    // Immutable headers (a fetched Response): copy it.
    res = new Response(response.body, response);
    res.headers.set("cache-control", "no-store");
  }
  res.headers.set("x-request-id", requestId);
  for (const cookie of setCookies) res.headers.append("set-cookie", cookie);
  return res;
}

// ── route() ──────────────────────────────────────────────────────────────────────────────────────────────────

export type AuthLevel = "none" | "optional" | "user" | "admin";

// The body schema is any zod object; the wrapper makes it strict.
type BodySchema = z.ZodObject;

type SessionFor<A extends AuthLevel> = A extends "user" | "admin" ? RequestSessionInfo : RequestSessionInfo | null;

export interface HandlerContext<S extends BodySchema | undefined, A extends AuthLevel> {
  request: Request;
  requestId: string;
  params: Record<string, string | string[] | undefined>;
  body: S extends BodySchema ? z.output<S> : undefined;
  auth: SessionFor<A>;
  /** The request's database handle, opened on first use. */
  db(): Db;
  /** Set-Cookie headers to add to the response (for example to clear the auth cookies). */
  setCookies: string[];
  ip: string | null;
}

export interface RouteOptions<S extends BodySchema | undefined, A extends AuthLevel> {
  auth?: A;
  /**
   * The Origin allow-list check on state-changing methods (default true). Set `false` only for endpoints that
   * authenticate the request some other way and are called server to server, such as payment webhooks
   * (signature-checked); they never act on a browser's cookies.
   */
  origin?: boolean;
  body?: S;
  rateLimit?: { name: RateLimitName; by: "ip" | "user" };
  handler(ctx: HandlerContext<S, A>): Promise<Response | Json | void> | Response | Json | void;
}

/** A route that doesn't exist in this build: always the uniform 404, with no config, session or DB work. */
export const notFoundRoute: NextRouteHandler = async (request) => {
  const requestId = request.headers.get("cf-ray") ?? crypto.randomUUID();
  return finalize(errorResponse(notFound(), requestId), requestId);
};

export type NextRouteHandler = (
  request: Request,
  context: { params: Promise<Record<string, string | string[] | undefined>> }
) => Promise<Response>;

function logError(requestId: string, request: Request, err: unknown) {
  // Structured one-liner until stream M's server/log.ts lands. Never the stack or the body.
  console.error(
    JSON.stringify({
      level: "error",
      requestId,
      method: request.method,
      path: new URL(request.url).pathname,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    })
  );
}

async function readJsonBody(request: Request, schema: BodySchema): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!/^application\/json\b/i.test(type)) {
    throw new HttpError(415, "unsupported_media_type", "Send the body as application/json");
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new HttpError(413, "body_too_large", "The request body is too large");
  }
  let raw: unknown;
  try {
    raw = text ? JSON.parse(text) : {};
  } catch {
    throw new HttpError(400, "invalid_json", "The request body is not valid JSON");
  }
  const parsed = schema.strict().safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(
      400,
      "invalid_body",
      "The request body is invalid",
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
    );
  }
  return parsed.data;
}

export function createRoute(deps: RouteDeps) {
  return function route<S extends BodySchema | undefined = undefined, A extends AuthLevel = "none">(
    options: RouteOptions<S, A>
  ): NextRouteHandler {
    const level: AuthLevel = options.auth ?? "none";

    return async (request, context) => {
      const requestId = request.headers.get("cf-ray") ?? crypto.randomUUID();
      let handle: DbHandle | null = null;
      const db = () => (handle ??= createDb({ label: new URL(request.url).pathname })).db;
      const setCookies: string[] = [];

      try {
        if (
          options.origin !== false &&
          STATE_CHANGING.has(request.method) &&
          !originAllowed(request.headers.get("origin"), deps.allowedOrigins())
        ) {
          throw new HttpError(403, "bad_origin", "Cross-origin request refused");
        }

        let auth: RequestSessionInfo | null = null;
        const needsSession = level !== "none" || options.rateLimit?.by === "user";
        if (needsSession) {
          const lookup = await deps.getSession(request, db);
          auth = lookup.info;
          setCookies.push(...(lookup.setCookies ?? []));
          if ((level === "user" || level === "admin") && !auth) {
            throw new HttpError(401, "unauthenticated", "Sign in to continue");
          }
          if (level === "admin" && auth?.user.role !== "admin") {
            throw new HttpError(403, "forbidden", "You don't have access to this");
          }
        }

        const ip = request.headers.get("cf-connecting-ip");
        if (options.rateLimit && rateLimiter) {
          const key = options.rateLimit.by === "user" && auth ? `user:${auth.user.id}` : `ip:${ip ?? "unknown"}`;
          const { success } = await rateLimiter.limit({ name: options.rateLimit.name, key });
          if (!success) throw new HttpError(429, "rate_limited", "Too many requests, try again shortly");
        }

        const body = (options.body ? await readJsonBody(request, options.body) : undefined) as HandlerContext<
          S,
          A
        >["body"];
        const params = (await context?.params) ?? {};

        const result = await options.handler({
          request,
          requestId,
          params,
          body,
          auth: auth as SessionFor<A>,
          db,
          setCookies,
          ip,
        });
        const response =
          result instanceof Response
            ? result
            : result === undefined
              ? new Response(null, { status: 204 })
              : Response.json(result);
        return finalize(response, requestId, setCookies);
      } catch (err) {
        const known = err instanceof HttpError ? err : (deps.mapError?.(err) ?? null);
        if (!known || known.status >= 500) logError(requestId, request, err);
        return finalize(
          errorResponse(known ?? new HttpError(500, "internal_error", "Something went wrong"), requestId),
          requestId
        );
      } finally {
        if (handle) await (handle as DbHandle).close().catch(() => {});
      }
    };
  };
}
