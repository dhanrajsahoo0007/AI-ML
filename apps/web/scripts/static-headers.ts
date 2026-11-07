import fs from "node:fs";
import path from "node:path";

// Runs after `opennextjs-cloudflare build` (npm run cf:build). Writes .open-next/assets/_headers, the Workers Static
// Assets headers file: static files are served by the assets binding without the Worker, so next.config.ts
// `headers()` never reaches them (security review M3). The content comes from staticAssetHeadersFile() in
// src/features/seo/security-headers.ts, so the policies stay identical to the ones next.config.ts sends.

(process.env as Record<string, string | undefined>).NODE_ENV ??= "production";
const { resolveAppEnv } = await import("../src/features/sections/registry");
const { staticAssetHeadersFile } = await import("../src/features/seo/security-headers");

const assets = path.join(process.cwd(), ".open-next", "assets");
if (!fs.existsSync(assets)) {
  console.error("static-headers: .open-next/assets is missing; run `opennextjs-cloudflare build` first");
  process.exit(1);
}
const file = path.join(assets, "_headers");
fs.writeFileSync(file, staticAssetHeadersFile({ indexable: resolveAppEnv() === "production" }));
console.log(`static-headers: wrote ${path.relative(process.cwd(), file)}`);
