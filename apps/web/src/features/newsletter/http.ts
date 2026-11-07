import "server-only";
import type { z } from "zod";
import { route } from "@/features/auth";
import {
  createRoute,
  HttpError,
  notFoundRoute,
  type AuthLevel,
  type NextRouteHandler,
  type RouteOptions,
} from "@/server/http";
import { newsletterHref, NotConfiguredError } from "./server";

// The newsletter's API routes go through the shared route() wrapper (src/server/http.ts, plan §11.6), plus:
// - a section gate: every route answers the uniform 404 while the newsletter is not `on` in this build
// - NotConfiguredError (a missing secret or sender) becomes a 503 `not_configured`

// Same as server/http.ts: any zod object; the wrapper makes it strict.
type BodySchema = z.ZodObject;

function withConfigErrors<S extends BodySchema | undefined, A extends AuthLevel>(
  options: RouteOptions<S, A>
): RouteOptions<S, A> {
  return {
    ...options,
    async handler(ctx) {
      try {
        return await options.handler(ctx);
      } catch (e) {
        if (e instanceof NotConfiguredError) {
          console.error(`[newsletter] not configured: ${e.message}`);
          throw new HttpError(503, "not_configured", "This feature is not configured yet");
        }
        throw e;
      }
    },
  };
}

const gated =
  (handler: NextRouteHandler): NextRouteHandler =>
  (request, context) =>
    newsletterHref() ? handler(request, context) : notFoundRoute(request, context);

/** A newsletter API route: the shared wrapper (Origin check, auth, zod body, no-store) behind the section gate. */
export function newsletterRoute<S extends BodySchema | undefined = undefined, A extends AuthLevel = "none">(
  options: RouteOptions<S, A>
): NextRouteHandler {
  return gated(route(withConfigErrors(options)));
}

// ── Server-to-server routes ──────────────────────────────────────────────────────────────────────────────────
// The Resend webhook and the RFC 8058 one-click unsubscribe are POSTed by mail systems, which send no Origin
// header, so the wrapper's Origin check must be off for them. They authenticate otherwise (webhook signature,
// signed unsubscribe token) and never read cookies or a session.
//
// TODO(after stream L merges): L adds `origin: false` to route() (src/server/http.ts). Replace this shim with
// `route({ origin: false, ... })`. Until then the shim is a wrapper with no sessions whose only allowed origin
// is a reserved placeholder it sets on the request itself.

const SERVER_TO_SERVER_ORIGIN = "https://server-to-server.invalid";

const s2sRoute = createRoute({
  getSession: async () => ({ info: null }),
  allowedOrigins: () => [SERVER_TO_SERVER_ORIGIN],
});

function withPlaceholderOrigin(request: Request): Request {
  const headers = new Headers(request.headers);
  headers.set("origin", SERVER_TO_SERVER_ORIGIN);
  // Cookies are never used by these routes; drop them so nothing downstream can act on a browser session.
  headers.delete("cookie");
  return new Request(request, { headers });
}

/** A newsletter route called by mail systems: the shared wrapper with the Origin check off and no sessions. */
export function serverToServerRoute<S extends BodySchema | undefined = undefined>(
  options: RouteOptions<S, "none">
): NextRouteHandler {
  const handler = s2sRoute(withConfigErrors({ ...options, auth: "none" }));
  return gated((request, context) => handler(withPlaceholderOrigin(request), context));
}

/** The uniform error body for a response that needs extra headers (Retry-After). */
export function errorResponse(
  requestId: string,
  status: number,
  code: string,
  message: string,
  headers: Record<string, string> = {}
) {
  return Response.json({ error: { code, message }, requestId }, { status, headers });
}
