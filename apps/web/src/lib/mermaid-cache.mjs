// Content-hash cache of pre-rendered Mermaid diagrams, shared by scripts/render-mermaid.mjs (writes) and
// the rehype plugin in src/lib/rehype-mermaid-svg.ts (reads). Each diagram is stored once as
// .build-cache/mermaid/<hash>.json = { light, dark } inline SVG strings. Node only.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { THEME_VERSION } from "./mermaid-theme.mjs";

/** Relative to the app folder (apps/web), which is the working directory for `next` and npm scripts. */
export const CACHE_DIR = ".build-cache/mermaid";

let mermaidVersion;
function getMermaidVersion() {
  if (!mermaidVersion) {
    const pkg = path.join(process.cwd(), "node_modules/mermaid/package.json");
    const rootPkg = path.join(process.cwd(), "../../node_modules/mermaid/package.json");
    const file = fs.existsSync(pkg) ? pkg : rootPkg;
    mermaidVersion = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")).version : "unknown";
  }
  return mermaidVersion;
}

/** Cache key for a diagram: its trimmed source plus the theme and Mermaid versions. */
export function diagramHash(chart) {
  return createHash("sha256")
    .update(`${THEME_VERSION}\0${getMermaidVersion()}\0${chart.trim()}`)
    .digest("hex")
    .slice(0, 20);
}

export function cachePath(hash) {
  return path.join(process.cwd(), CACHE_DIR, `${hash}.json`);
}

/** @returns {{ light: string; dark: string } | null} */
export function readDiagram(hash) {
  try {
    return JSON.parse(fs.readFileSync(cachePath(hash), "utf8"));
  } catch {
    return null;
  }
}

export function writeDiagram(hash, entry) {
  ensureBuildCache();
  const dir = path.join(process.cwd(), CACHE_DIR);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(cachePath(hash), JSON.stringify(entry));
}

/** Creates .build-cache/, which holds build artefacts and keeps itself out of git. */
export function ensureBuildCache() {
  const dir = path.join(process.cwd(), ".build-cache");
  fs.mkdirSync(dir, { recursive: true });
  const ignore = path.join(dir, ".gitignore");
  if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, "*\n");
  return dir;
}
