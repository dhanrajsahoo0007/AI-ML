#!/usr/bin/env node
// Writes .build-cache/content-dates.json: the last commit date of every file under content/, from one
// `git log` over the whole history. src/lib/doc-meta.ts reads it, so pages never run git at request time.
//
// Runs before `npm run build` (prebuild). CI must check out the full history (actions/checkout with
// `fetch-depth: 0`); with a shallow clone every file would get the date of the one commit fetched.
// Without git (e.g. a source tarball) the file is written empty and pages show no "Updated" date, unless
// the article sets `updated:` in its frontmatter.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureBuildCache } from "../src/lib/mermaid-cache.mjs";

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(APP_DIR);

const dates = {};
try {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  if (execFileSync("git", ["rev-parse", "--is-shallow-repository"], { encoding: "utf8" }).trim() === "true") {
    console.warn("content-dates: shallow clone, dates will be wrong. Fetch the full history (fetch-depth: 0).");
  }
  const log = execFileSync("git", ["log", "--format=%x00%cI", "--name-only", "--no-renames", "--", "content"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  // Newest commit first, so the first date seen for a file is its last change.
  for (const block of log.split("\0").slice(1)) {
    const [date, ...files] = block.trim().split("\n");
    for (const f of files) {
      const rel = path.relative(APP_DIR, path.join(root, f.trim()));
      if (f.trim() && !(rel in dates)) dates[rel] = date.trim();
    }
  }
} catch (err) {
  console.warn(`content-dates: git unavailable, no dates recorded (${err.message.split("\n")[0]})`);
}

const out = path.join(ensureBuildCache(), "content-dates.json");
fs.writeFileSync(out, JSON.stringify(dates, null, 0));
console.log(`content-dates: ${Object.keys(dates).length} files -> ${path.relative(APP_DIR, out)}`);
