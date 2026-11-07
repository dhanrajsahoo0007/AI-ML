import fs from "node:fs";
import path from "node:path";

// Runs before `opennextjs-cloudflare build` (npm run cf:build): records which incremental cache this build's
// Worker uses, in src/generated/cf-profile.json, which open-next.config.ts bundles (plan §9.2).
//
// - paywall on (local, preview, staging): R2 + regional cache. Prerendered pages, including the full premium
//   pages, live in the private R2 bucket (NEXT_INC_CACHE_R2_BUCKET), never in public static assets.
// - paywall off (production today): the read-only Workers Static Assets cache, as before: nothing is premium.

// Resolve APP_ENV exactly as `next build` will (NODE_ENV=production: unset means production).
(process.env as Record<string, string | undefined>).NODE_ENV ??= "production";
const { resolveAppEnv } = await import("../src/features/sections/registry");
const { isFeatureOn } = await import("../src/config/features");
const env = resolveAppEnv();
const paywall = isFeatureOn("paywall");
const profile = { appEnv: env, paywall, incrementalCache: paywall ? "r2" : "static-assets" };
const dir = path.join(process.cwd(), "src", "generated");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "cf-profile.json"), `${JSON.stringify(profile, null, 2)}\n`);
console.log(
  `cf-profile: APP_ENV=${env}, paywall ${paywall ? "on" : "off"}, ${profile.incrementalCache} incremental cache`
);
