import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "./test-runner";
import { allSections } from "./registry";

// Plan §5.1: no section key appears as a string literal in shared code; shared code iterates the
// registry. Section-specific modules (the registry and kind modules, and components that belong to one
// section, such as src/components/cloud) are allowed to name their section.

const SRC = path.join(process.cwd(), "src");
const ALLOWED = [
  "features/sections/",
  "features/docs/",
  "components/cloud/",
  "components/db/",
  "components/diagrams/",
  "lib/cloud-catalog.ts",
  "lib/cloud-data/",
  "lib/db-catalog.ts",
  // Stream B deletes this route (Copy for LLM is removed, plan §11.10).
  "app/api/markdown/",
];

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "generated" ? [] : files(p);
    return /\.(ts|tsx|mjs|js)$/.test(e.name) ? [p] : [];
  });
}

// Kind modules and route folders that belong to one section may also spell its URL or content path.
const PATH_ALLOWED = [
  ...ALLOWED,
  "app/interviews/",
  "features/interviews/",
  "features/dsa/",
  "features/newsletter/",
  // Pre-existing hard-coded links (home and 404 CTAs, site config) from before this check covered paths. Move
  // them to the registry, then delete them from this list; do not add to it.
  "app/not-found.tsx",
  "components/home/cta-banner.tsx",
  "config/site.ts",
];

const isComment = (line: string) => /^\s*(\/\/|\*|\/\*)/.test(line);
const isTest = (rel: string) => /\.test\.(ts|tsx)$/.test(rel);

describe("section-key literals", () => {
  it("appear only in the registry and kind modules", () => {
    const keys = allSections().map((s) => s.key);
    const re = new RegExp(`(["'\`])(${keys.map((k) => k.replace(/-/g, "\\-")).join("|")})\\1`, "g");
    const hits: string[] = [];
    for (const file of files(SRC)) {
      const rel = path.relative(SRC, file).split(path.sep).join("/");
      if (ALLOWED.some((a) => rel.startsWith(a))) continue;
      fs.readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          for (const m of line.matchAll(re)) hits.push(`src/${rel}:${i + 1}: ${m[0]}`);
        });
    }
    assert.deepEqual(hits, [], `section keys hard-coded in shared code:\n${hits.join("\n")}`);
  });

  it('do not appear as a URL or content path segment in shared code ("/key/...", content/key/)', () => {
    const keys = allSections()
      .map((s) => s.key.replace(/-/g, "\\-"))
      .join("|");
    // A string starting with /key (then /, #, ? or the closing quote), or a content/key/ file path.
    const re = new RegExp(`["'\`]\\/(?:${keys})(?=[/#?"'\`])|(?<![\\w-])content\\/(?:${keys})\\/`, "g");
    const hits: string[] = [];
    for (const file of files(SRC)) {
      const rel = path.relative(SRC, file).split(path.sep).join("/");
      if (isTest(rel) || PATH_ALLOWED.some((a) => rel.startsWith(a))) continue;
      fs.readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (isComment(line)) return;
          for (const m of line.matchAll(re)) hits.push(`src/${rel}:${i + 1}: ${m[0]}`);
        });
    }
    assert.deepEqual(hits, [], `section paths hard-coded in shared code (ask the registry):\n${hits.join("\n")}`);
  });
});
