import { NextResponse, type NextRequest } from "next/server";
import { REGION_COOKIE } from "@/config/pricing-tiers";
import { paywallPreviewPoint, writeAnalytics } from "@/server/edge/analytics";
import { ENTITLEMENT_COOKIE, isAdmin, keyringFromEnv, verifyEntitlement } from "@/server/edge/entitlement";
import { appVersion, readEdgeEnv } from "@/server/edge/env";
import { decideHost, SMOKE_KEY_HEADER } from "@/server/edge/host-guard";
import { maintenanceResponse } from "@/server/edge/maintenance";
import {
  EMPTY_PREMIUM_MANIFEST,
  decidePaywall,
  isPremiumPath,
  premiumIndex,
  premiumManifestSchema,
  type PremiumManifest,
} from "@/server/edge/paywall-gate";
import { COUNTRY_HEADER, decidePricing } from "@/server/edge/pricing-variant";
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
// - production on a host other than BETTER_AUTH_URL's (workers.dev, version preview URLs) → 308 to the canonical
//   host, unless the deploy smoke key is presented (server/edge/host-guard.ts, security review M2)
// - SECTIONS_KILL sections → 503 maintenance page
// - `off` sections → 404 (their pages are not built)
// - `hidden` sections → 404 unless `oa_ent` carries role=admin; admitted responses are never cached
//   by shared caches
// - premium pages (src/generated/premium-routes.json, plan §9.2) → the full page only with a valid `oa_ent`
//   carrying tier=pro (private, never stored by shared caches); everyone else gets the public preview, by a
//   rewrite to `<path>/_preview`. HTML, RSC (`RSC: 1`, `?_rsc=`) and prefetch requests all hit the page path,
//   so they are gated alike. The full page is prerendered into the server-only cache (R2 on Cloudflare,
//   .next/server under `next start`), never into public static assets (open-next.config.ts).
// - /pricing → its variant for checkout (live when the paywall is on and DODO_API_KEY is set) × the visitor's
//   regional price tier (`oa_region` cookie, else cf-ipcountry): server/edge/pricing-variant.ts

const manifest = loadManifest();
const premiumManifest = loadPremiumManifest();
const premium = premiumIndex(premiumManifest);

/** A path no route serves: rewriting to it renders the site's 404 page (for RSC requests too). */
const NOT_FOUND_PATH = "/_edge-gate/not-found";

/** Response header carrying the deployed commit; the deploy smoke test checks it (plan §7.8). */
const VERSION_HEADER = "x-app-version";

export async function middleware(request: NextRequest) {
  const env = readEdgeEnv();
  const { pathname } = request.nextUrl;

  const host = decideHost({
    appEnv: env.APP_ENV,
    url: new URL(request.url),
    canonicalUrl: env.BETTER_AUTH_URL,
    smokeKey: env.SMOKE_KEY,
    presentedKey: request.headers.get(SMOKE_KEY_HEADER),
  });
  if (host.action === "redirect") {
    const redirect = NextResponse.redirect(host.location, 308);
    redirect.headers.set("X-Robots-Tag", "noindex");
    redirect.headers.set(VERSION_HEADER, appVersion(env));
    return redirect;
  }

  // The cookie is verified only on paths that need it (HS256 with jose, well under 1 ms).
  let claims: Awaited<ReturnType<typeof verifyEntitlement>> = null;
  if (needsAdmin(pathname, manifest) || isPremiumPath(pathname, premium)) {
    const keyring = keyringFromEnv(env.ENTITLEMENT_SECRET, env.ENTITLEMENT_SECRET_PREVIOUS);
    claims = await verifyEntitlement(request.cookies.get(ENTITLEMENT_COOKIE)?.value, keyring);
  }
  const admin = isAdmin(claims);

  const decision = decideGate({ pathname, manifest, killed: parseKillList(env.SECTIONS_KILL), isAdmin: admin });
  let response: Response;
  switch (decision.action) {
    case "maintenance":
      response = maintenanceResponse();
      break;
    case "not-found":
      // Next.js answers 404 for HTML; RSC requests get the not-found tree with a 200, as for any missing
      // page. Don't force 404 on those: the client router leaves non-200 prefetch bodies unread.
      response = NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("X-Robots-Tag", "noindex");
      break;
    case "pass":
      response = paywallResponse(request, viewerTier(request, env, claims?.tier ?? null), Boolean(env.DODO_API_KEY));
      if (decision.gated) {
        // A hidden page shown to an admin: keep it out of every shared cache.
        response.headers.set("Cache-Control", "private, no-store");
        response.headers.set("X-Robots-Tag", "noindex");
      }
      break;
  }
  if (host.action === "pass-noindex") response.headers.set("X-Robots-Tag", "noindex");
  response.headers.set(VERSION_HEADER, appVersion(env));
  return response;
}

/**
 * The tier the paywall serves. On `next dev` (APP_ENV=local, inlined at build) the site can run with the paid or
 * the unpaid view without signing in or out: the `oa_local_view` cookie set by the local view switch
 * (components/local-view-switch.client.tsx), else LOCAL_VIEW_AS from .env.local. `paid` → Pro, `unpaid` → free,
 * `real` or unset → the signed-in user's own tier. Every other build ignores both.
 */
function viewerTier(
  request: NextRequest,
  env: ReturnType<typeof readEdgeEnv>,
  tier: "free" | "pro" | null
): "free" | "pro" | null {
  if (process.env.APP_ENV !== "local") return tier;
  const view = request.cookies.get("oa_local_view")?.value ?? env.LOCAL_VIEW_AS;
  if (view === "paid") return "pro";
  if (view === "unpaid") return "free";
  return tier;
}

function paywallResponse(request: NextRequest, tier: "free" | "pro" | null, billingConfigured: boolean): Response {
  const { pathname } = request.nextUrl;
  const paywall = decidePaywall({ pathname, premium, tier });
  switch (paywall.action) {
    case "entitled": {
      // The full premium page: per-user, so no shared cache may store it under the public URL.
      const response = NextResponse.next();
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("Vary", "Cookie");
      return response;
    }
    case "preview": {
      const url = request.nextUrl.clone();
      url.pathname = paywall.to;
      const response = NextResponse.rewrite(url);
      // The preview under the canonical URL: Pro readers share that URL, so it isn't shared-cacheable either.
      response.headers.set("Cache-Control", "private, no-cache");
      response.headers.set("Vary", "Cookie");
      // Paywall view metric: only on this branch, one non-blocking Analytics Engine write (no-op without the
      // binding). Middleware is the one place that sees every preview: the rewrite is private, so no cache answers.
      const view = paywallPreviewPoint({ pathname, headers: request.headers, tier });
      if (view) writeAnalytics(view);
      return response;
    }
    case "preview-direct": {
      const response = NextResponse.next();
      response.headers.set("X-Robots-Tag", "noindex");
      return response;
    }
    case "pass": {
      const pricing = decidePricing({
        pathname,
        paywall: premiumManifest.paywall,
        billingConfigured,
        regionCookie: request.cookies.get(REGION_COOKIE)?.value,
        country: request.headers.get(COUNTRY_HEADER),
      });
      if (!pricing) return NextResponse.next();
      const url = request.nextUrl.clone();
      if (pricing.rewrite) url.pathname = pricing.rewrite;
      const response = pricing.rewrite ? NextResponse.rewrite(url) : NextResponse.next();
      for (const [name, value] of Object.entries(pricing.headers)) response.headers.set(name, value);
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

/** src/generated/premium-routes.json, written by next.config.ts with hidden-routes.json (same rules). */
function loadPremiumManifest(): PremiumManifest {
  let json: unknown;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    json = require("@/generated/premium-routes.json");
  } catch {
    if (process.env.NODE_ENV === "production") throw new Error("src/generated/premium-routes.json is missing");
    return EMPTY_PREMIUM_MANIFEST;
  }
  return premiumManifestSchema.parse(json);
}
