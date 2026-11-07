// One-off migration (plan §5.2): writes content/<section>/_index.yaml for every docs section from the
// <ModelCategory>/<ModelCard> markup in its hub MDX files, so the nav reads YAML instead of
// regex-parsing JSX. Attribute order does not matter here (the old parser needed title before href).
//
//   node --import ./scripts/ts-hooks.mjs scripts/migrate-nav-index.ts [--check]
//
// --check writes nothing and exits 1 if any _index.yaml differs from what the hub MDX gives (useful
// until the hub MDX renders its grid from the index, after which this script can be deleted).

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { allSections, CONTENT_DIR } from "../src/features/sections/registry";
import { navIndexSchema, type NavIndex } from "../src/features/sections/schema";
import { parseHubMarkup } from "../src/features/docs/hub-markup";

const HEADER =
  "# Nav index for this section (plan §5.2): one entry per hub, its categories and cards.\n" +
  "# Read by src/lib/nav-tree.ts for the header and sidebar; checked by scripts/content-check.ts.\n" +
  "# Generated from the hub MDX by scripts/migrate-nav-index.ts; keep it in step with the hub's cards.\n";

function main() {
  const check = process.argv.includes("--check");
  let stale = 0;
  for (const section of allSections().filter((s) => s.kind === "docs")) {
    const dir = path.join(CONTENT_DIR, section.key);
    if (!fs.existsSync(dir)) continue;
    const hubs = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".mdx"))
      .sort()
      .map((f) => ({
        slug: f.replace(/\.mdx$/, ""),
        categories: parseHubMarkup(fs.readFileSync(path.join(dir, f), "utf8")),
      }))
      .filter((h) => h.categories.length > 0);
    const index: NavIndex = navIndexSchema.parse({ hubs });
    const text = HEADER + yaml.dump(index, { lineWidth: 120, noRefs: true });
    const file = path.join(dir, "_index.yaml");
    const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
    if (current === text) continue;
    if (check) {
      console.error(`${path.relative(process.cwd(), file)} is out of date with the hub MDX`);
      stale += 1;
    } else {
      fs.writeFileSync(file, text);
      const cards = hubs.reduce((n, h) => n + h.categories.reduce((m, c) => m + c.cards.length, 0), 0);
      console.log(`wrote ${path.relative(process.cwd(), file)} (${hubs.length} hubs, ${cards} cards)`);
    }
  }
  if (stale) process.exit(1);
}

main();
