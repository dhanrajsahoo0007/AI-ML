import "server-only";
import type { z } from "zod";
import { route } from "@/features/auth";
import { HttpError, notFoundRoute, type AuthLevel, type NextRouteHandler, type RouteOptions } from "@/server/http";
import { log } from "@/server/log";
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
          log.error("newsletter_not_configured", { request_id: ctx.requestId, error: e.message });
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
// header, so the wrapper's Origin check is off for them (`origin: false`). They authenticate otherwise (webhook
// signature, signed unsubscribe token), and with `auth: "none"` the wrapper never reads cookies or a session.

/** Largest body these routes accept (the webhook's limit); larger requests are refused before reading. */
const MAX_SERVER_TO_SERVER_BODY = 256 * 1024;

/** A newsletter route called by mail systems: the shared wrapper with the Origin check off and no sessions. */
export function serverToServerRoute<S extends BodySchema | undefined = undefined>(
  options: RouteOptions<S, "none">
): NextRouteHandler {
  const handler = route(withConfigErrors({ ...options, auth: "none", origin: false }));
  return gated(async (request, context) => {
    if (Number(request.headers.get("content-length") ?? "0") > MAX_SERVER_TO_SERVER_BODY) {
      return Response.json(
        { error: { code: "body_too_large", message: "The request body is too large" } },
        { status: 413, headers: { "cache-control": "no-store" } }
      );
    }
    return handler(request, context);
  });
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
