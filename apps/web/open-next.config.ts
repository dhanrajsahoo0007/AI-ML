// OpenNext adapter config for Cloudflare Workers (plan §2, §7).
//
// Today every content route is fully static (no ISR, no `revalidate`), so the incremental cache is the
// read-only Workers Static Assets cache: prerendered HTML and RSC payloads are uploaded with the assets
// under `cdn-cgi/_next_cache/` (only the Worker can read that prefix) and nothing is written at
// request time. It needs no account resources, so `opennextjs-cloudflare preview` works offline.
//
// Phase 5 target (premium pages): full premium HTML must NOT live in public static assets (plan §9.2).
// Switch to R2 + the regional cache once the `NEXT_INC_CACHE_R2_BUCKET` binding exists in
// wrangler.jsonc, then populate it on deploy with `opennextjs-cloudflare populateCache remote`:
//
//   import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
//   import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
//
//   export default defineCloudflareConfig({
//     incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
//     // Tag cache and queue only if ISR revalidation comes back; content changes only on deploy.
//   });
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  // Serve prerendered pages straight from the cache, before the Next server runs (static only, no PPR).
  enableCacheInterception: true,
});
