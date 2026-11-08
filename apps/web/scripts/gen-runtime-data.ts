import fs from "node:fs";
import path from "node:path";

// Runs in `prebuild`. Writes the data that request-time code and the browser need, for this build's APP_ENV:
// - src/generated/header-nav.json: the header menu; next.config.ts inlines it as HEADER_NAV, so the root layout
//   never reads content from disk at request time (Cloudflare Workers has no filesystem).
// - src/generated/search-index.json and public/search-index.json: the headline search index (title, short
//   description, section, URL) of every page in sections that are `on`. Titles only: never article bodies, and
//   nothing from `hidden` or `off` sections (plan §5.1.1, §11.10). The header search loads the public copy on demand;
//   next.config.ts inlines the generated copy as SEARCH_INDEX for server pages that need titles (account progress).
// Also runs in `predev` with --dev: then only the search index is written (APP_ENV defaults to local), so header
// search works in `next dev`, while the header menu keeps reading content live.
const devMode = process.argv.includes("--dev");
if (devMode) process.env.APP_ENV ||= "local";
(process.env as Record<string, string | undefined>).NODE_ENV ??= "production";
const { getHeaderNav } = await import("../src/lib/nav-tree");
const { visibleSections } = await import("../src/features/sections/registry");
const { loadSection } = await import("../src/features/sections/kinds");

const nav = await getHeaderNav();

interface SearchEntry {
  t: string; // title
  d?: string; // short description
  h: string; // href
  s: string; // section label
}
const entries: SearchEntry[] = [];
const seen = new Set<string>();
for (const def of visibleSections()) {
  const { section, kind, items } = await loadSection(def);
  for (const doc of kind.search(section, items)) {
    if (!doc.title || seen.has(doc.href)) continue;
    seen.add(doc.href);
    const d = doc.description?.trim();
    entries.push({
      t: doc.title,
      ...(d ? { d: d.length > 140 ? `${d.slice(0, 137)}…` : d } : {}),
      h: doc.href,
      s: section.label,
    });
  }
}

const generated = path.join(process.cwd(), "src", "generated");
fs.mkdirSync(generated, { recursive: true });
if (!devMode) fs.writeFileSync(path.join(generated, "header-nav.json"), `${JSON.stringify(nav)}\n`);
const index = `${JSON.stringify(entries)}\n`;
fs.writeFileSync(path.join(generated, "search-index.json"), index);
fs.writeFileSync(path.join(process.cwd(), "public", "search-index.json"), index);
console.log(`runtime data: header nav ${nav.length} sections, search index ${entries.length} pages`);
