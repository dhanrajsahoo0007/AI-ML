import { appVersion, readEdgeEnv } from "./env";

// GET /api/health → {status, version, env, region} (plan §7.8). The deploy smoke test reads `version`
// to prove the new Worker version is live.
//
// Not mounted yet (route files belong to another stream). To mount it, add
// src/app/api/health/route.ts:
//
//   import { healthHandler } from "@/server/edge/health";
//   export const dynamic = "force-dynamic";
//   export const GET = healthHandler;
//
// (Wrap it in the `route()` helper from src/server/http.ts once that exists, plan §11.6.)

export interface Health {
  status: "ok";
  version: string;
  env: string;
  /** Cloudflare data centre (colo) that served the request, from the `cf-ray` header; null off Cloudflare. */
  region: string | null;
}

export function health(request: Request, env = readEdgeEnv()): Health {
  return {
    status: "ok",
    version: appVersion(env),
    env: env.APP_ENV,
    region: coloFromRay(request.headers.get("cf-ray")),
  };
}

export function healthHandler(request: Request): Response {
  return Response.json(health(request), {
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

/** `cf-ray: 8c1f2a3b4c5d6e7f-SIN` → "SIN". */
export function coloFromRay(ray: string | null): string | null {
  const match = ray?.match(/-([A-Z]{3})$/);
  return match ? match[1] : null;
}
