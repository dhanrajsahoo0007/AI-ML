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
});
