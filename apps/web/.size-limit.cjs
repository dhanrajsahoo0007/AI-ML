/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS config file read by the tool */
// JavaScript size budgets per route type (plan §6), measured from the production build: `npm run build`, then
// `npm run size -w web`. Sizes are gzip, 1 kB = 1000 bytes, the same units `next build` prints.
//
// Two views of each route:
// - "First Load JS" is the number `next build` prints: the shared chunks plus the page entry's own chunks. The
//   §6 budgets are written against it.
// - "all scripts" is every <script> the page really loads: the same plus the chunks of the layouts above the
//   page (root layout: header, footer, theme, copy protection). Next leaves layout chunks out of its number, so
//   this is the honest figure; its limits are the measured size plus a little headroom, so they catch
//   regressions until the budgets are tightened.
const fs = require("node:fs");
const path = require("node:path");

const nextDir = path.join(__dirname, ".next");

function readJson(name) {
  const file = path.join(nextDir, name);
  if (!fs.existsSync(file)) throw new Error(`size-limit: ${file} not found. Run \`npm run build\` first.`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const { pages } = readJson("app-build-manifest.json");
const { rootMainFiles } = readJson("build-manifest.json");

// size-limit treats paths as globs (node:fs glob), and app route chunks live in folders such as
// `(content)/[section]`. Brackets become one-character classes; parentheses are literal without an extglob prefix.
const escapeGlob = (p) => p.replace(/[[\]]/g, (c) => `[${c}]`);
const jsFiles = (...entries) => {
  const files = new Set();
  for (const entry of entries) {
    const list = entry === "shared" ? rootMainFiles : pages[entry];
    if (!list) throw new Error(`size-limit: no entry "${entry}" in .next/app-build-manifest.json`);
    for (const f of list) {
      if (!f.endsWith(".js")) continue;
      if (!fs.existsSync(path.join(nextDir, f))) throw new Error(`size-limit: ${f} is in the manifest but not on disk`);
      files.add(escapeGlob(path.join(nextDir, f)));
    }
  }
  return [...files];
};

const ROOT = "/layout";
const DOCS = "/(content)/[section]/layout";
const ROUTES = [
  // name, page entry, its layouts, First Load JS budget, all-scripts limit
  ["home /", "/page", [ROOT], "160 kB", "185 kB"],
  ["section hub /[section]", "/(content)/[section]/page", [ROOT, DOCS], "120 kB", "190 kB"],
  ["article /[section]/[...slug]", "/(content)/[section]/[...slug]/page", [ROOT, DOCS], "150 kB", "210 kB"],
  [
    "interview subsection",
    "/interviews/[category]/[subsection]/page",
    [ROOT, "/interviews/layout"],
    "120 kB",
    "190 kB",
  ],
  ["companies", "/companies/page", [ROOT, "/companies/layout"], "145 kB", "195 kB"],
  ["pricing", "/pricing/page", [ROOT], "125 kB", "185 kB"],
  // Plan §15.1: ≤ 130 kB without the editor. CodeMirror and the runner workers load on interaction, in chunks
  // of their own that no page entry lists.
  ["DSA problem /dsa/problems/[slug]", "/dsa/problems/[slug]/page", [ROOT, "/dsa/layout"], "130 kB", "190 kB"],
];

module.exports = [
  { name: "First Load JS shared by all", path: jsFiles("shared"), limit: "110 kB", gzip: true },
  ...ROUTES.map(([name, page, , budget]) => ({
    name: `First Load JS: ${name}`,
    path: jsFiles("shared", page),
    limit: budget,
    gzip: true,
  })),
  ...ROUTES.map(([name, page, layouts, , limit]) => ({
    name: `all scripts: ${name}`,
    path: jsFiles("shared", page, ...layouts),
    limit,
    gzip: true,
  })),
];
