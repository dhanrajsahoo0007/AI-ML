// OpenNext adapter config for Cloudflare Workers (plan §2, §7, §9.2).
//
// Every content route is fully static (no ISR, no `revalidate`), so nothing is written at request time; the
// incremental cache only holds the prerendered HTML and RSC payloads. Which cache depends on the build's
// paywall switch (content/features.yaml), recorded by scripts/cf-profile.ts (run by `npm run cf:build`) in
// src/generated/cf-profile.json and bundled here:
//
// - paywall on (local, preview, staging): R2 + the regional cache. Full premium pages must never sit in
//   public static assets (plan §9.2): the spike (2026-11-07) showed the static-assets cache files under
//   .open-next/assets/cdn-cgi/_next_cache/ are served to anyone by `wrangler dev` (a request with `$`
//   escaped as `%24` returned the full page). R2 is private: only the Worker reads it, after middleware has
//   checked the `tts_ent` cookie. `opennextjs-cloudflare preview` fills a local R2 bucket (no account needed);
//   deployed environments need the NEXT_INC_CACHE_R2_BUCKET bucket (wrangler.jsonc TODOs) and
//   `opennextjs-cloudflare populateCache remote` on deploy.
// - paywall off (production today): the read-only Workers Static Assets cache under `cdn-cgi/_next_cache/`,
//   unchanged. Nothing is premium, so every page is public anyway.
//
// Without the profile file (opennextjs-cloudflare run directly) the R2 cache is used: a build that forgot the
// step fails loudly at populateCache ("No R2 binding") instead of shipping premium pages as public assets.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

function incrementalCacheKind(): "r2" | "static-assets" {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const profile = require("./src/generated/cf-profile.json") as { incrementalCache?: string };
    return profile.incrementalCache === "static-assets" ? "static-assets" : "r2";
  } catch {
    return "r2";
  }
}

export default defineCloudflareConfig({
  incrementalCache:
    incrementalCacheKind() === "static-assets"
      ? staticAssetsIncrementalCache
      : // Tag cache and queue only if ISR revalidation comes back; content changes only on deploy.
        withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  // Serve prerendered pages straight from the cache, before the Next server runs (static only, no PPR).
  // OpenNext runs middleware first (routingHandler: handleMiddleware, then cacheInterceptor), so the cache
  // only ever sees the path middleware chose: the full page for Pro, the preview for everyone else.
  enableCacheInterception: true,
});
