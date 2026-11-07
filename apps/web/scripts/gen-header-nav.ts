import fs from "node:fs";
import path from "node:path";

// Runs in `prebuild`: writes the header mega-menu for this build's APP_ENV to src/generated/header-nav.json.
// next.config.ts inlines it as HEADER_NAV, so the root layout never loads content from disk at request time.
// Pages rendered per request (sign-in, account, checkout, API) run on Cloudflare Workers, which has no
// filesystem; the prerendered content pages don't need this, but they share the same layout.
(process.env as Record<string, string | undefined>).NODE_ENV ??= "production";
const { getHeaderNav } = await import("../src/lib/nav-tree");
const nav = await getHeaderNav();
const dir = path.join(process.cwd(), "src", "generated");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "header-nav.json"), `${JSON.stringify(nav)}\n`);
console.log(`header-nav: ${nav.length} sections`);
