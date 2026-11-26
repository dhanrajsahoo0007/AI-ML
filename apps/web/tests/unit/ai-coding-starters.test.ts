import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Drift guard for the AI-Assisted Coding starter zips. Every scenario repo under
// content/ai-assisted-coding/_repos/<slug>/ that has a download asset (assets/downloads/ai-coding-<slug>-starter.zip)
// must carry the pack-manifest.json that SYSTEM-DESIGN/plans/ai-assisted-coding/tools/pack.py wrote with it, and:
//   - the manifest's files equal the starter folder now (path → sha256), so the zip is not stale;
//   - the manifest's zip_sha256 equals the asset file, so the asset is the zip that manifest describes.
// After changing a starter, re-run pack.py and copy the zip it prints. Passes trivially with no scenarios.

const REPOS = path.join(process.cwd(), "content", "ai-assisted-coding", "_repos");
const DOWNLOADS = path.join(process.cwd(), "assets", "downloads");
// Same exclusions as pack.py.
const SKIP_DIRS = new Set([
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
  ".venv",
  ".git",
  ".idea",
  ".vscode",
]);
const SKIP_FILES = new Set([".DS_Store", "Thumbs.db"]);
const SKIP_SUFFIXES = [".pyc", ".pyo", ".swp"];

const sha256 = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function starterHashes(dir: string, base = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = `${base}${e.name}`;
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) Object.assign(out, starterHashes(path.join(dir, e.name), `${rel}/`));
    } else if (e.isFile() && !SKIP_FILES.has(e.name) && !SKIP_SUFFIXES.some((s) => e.name.endsWith(s))) {
      out[rel] = sha256(path.join(dir, e.name));
    }
  }
  return out;
}

const sorted = (o: Record<string, string>) =>
  Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));

const slugs = fs.existsSync(REPOS)
  ? fs
      .readdirSync(REPOS, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
      .map((e) => e.name)
      .filter((slug) => fs.existsSync(path.join(DOWNLOADS, `ai-coding-${slug}-starter.zip`)))
  : [];

describe("AI-Assisted Coding starter zips match their starter folders", () => {
  it("finds the scenario repos folder or none at all", () => {
    expect(Array.isArray(slugs)).toBe(true);
  });

  it.each(slugs)("%s: pack-manifest.json matches the starter and the zip asset", (slug) => {
    const manifestFile = path.join(REPOS, slug, "pack-manifest.json");
    expect(fs.existsSync(manifestFile), `${slug}: no pack-manifest.json; run tools/pack.py ${slug}`).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")) as {
      asset: string;
      zip_sha256: string;
      files: Record<string, string>;
    };
    expect(manifest.asset).toBe(`downloads/ai-coding-${slug}-starter`);
    expect(sorted(starterHashes(path.join(REPOS, slug, "starter")))).toEqual(sorted(manifest.files));
    expect(sha256(path.join(DOWNLOADS, `ai-coding-${slug}-starter.zip`))).toBe(manifest.zip_sha256);
  });
});
