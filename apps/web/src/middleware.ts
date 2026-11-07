import { NextResponse, type NextRequest } from "next/server";
import { ENTITLEMENT_COOKIE, isAdmin, keyringFromEnv, verifyEntitlement } from "@/server/edge/entitlement";
import { readEdgeEnv } from "@/server/edge/env";
import { maintenanceResponse } from "@/server/edge/maintenance";
import {
  EMPTY_MANIFEST,
  decideGate,
  needsAdmin,
  parseKillList,
  sectionManifestSchema,
  type SectionManifest,
} from "@/server/edge/sections-gate";

// Edge middleware (plan §1, §5.1.1). Runs before the page cache on every content route.
// NO database and no Node APIs here (AGENTS.md rule 1): only the build manifest, env vars and the
// signed `oa_ent` cookie. Imports are limited to src/server/edge/** and build manifests.
//
// - SECTIONS_KILL sections → 503 maintenance page
// - `off` sections → 404 (their pages are not built)
// - `hidden` sections → 404 unless `oa_ent` carries role=admin; admitted responses are never cached
//   by shared caches

const manifest = loadManifest();

/** A path no route serves: rewriting to it renders the site's 404 page with status 404. */
const NOT_FOUND_PATH = "/_edge-gate/not-found";

export async function middleware(request: NextRequest) {
  const env = readEdgeEnv();
  const { pathname } = request.nextUrl;

  let admin = false;
  if (needsAdmin(pathname, manifest)) {
    const keyring = keyringFromEnv(env.ENTITLEMENT_SECRET, env.ENTITLEMENT_SECRET_PREVIOUS);
    admin = isAdmin(await verifyEntitlement(request.cookies.get(ENTITLEMENT_COOKIE)?.value, keyring));
  }

  const decision = decideGate({ pathname, manifest, killed: parseKillList(env.SECTIONS_KILL), isAdmin: admin });
  switch (decision.action) {
    case "maintenance":
      return maintenanceResponse();
    case "not-found": {
      const response = NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("X-Robots-Tag", "noindex");
      return response;
    }
    case "pass": {
      if (!decision.gated) return NextResponse.next();
      // A hidden page shown to an admin: keep it out of every shared cache.
      const response = NextResponse.next();
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("Vary", "Cookie");
      response.headers.set("X-Robots-Tag", "noindex");
      return response;
    }
  }
}

export const config = {
  // Content routes only: not /api, not Next.js internals, not Cloudflare internals, not files with an
  // extension (static assets, robots.txt, sitemap.xml). RSC requests (`?_rsc=`) hit the page path,
  // so they are gated too.
  matcher: ["/((?!api/|_next/|cdn-cgi/|.*\\.[A-Za-z0-9]+$).*)"],
};

/**
 * src/generated/hidden-routes.json is written by next.config.ts from content/sections.yaml before every
 * production build, so `next build` and `opennextjs-cloudflare build` always bundle it. `next dev`
 * doesn't write it: a `require` inside `try` is optional for webpack, so a fresh checkout still runs,
 * with nothing gated (local has every section on).
 */
function loadManifest(): SectionManifest {
  let json: unknown;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    json = require("@/generated/hidden-routes.json");
  } catch {
    if (process.env.NODE_ENV === "production") throw new Error("src/generated/hidden-routes.json is missing");
    return EMPTY_MANIFEST;
  }
  return sectionManifestSchema.parse(json);
}
