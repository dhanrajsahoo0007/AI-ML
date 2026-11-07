import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { AssetEntry, AssetManifest } from "@/lib/asset-schema";

// Reads the asset library's build output at render time (pages are static, so this runs during `next build`):
// src/generated/asset-manifest.json and the inline SVGs in .build-cache/assets/<hash>/, both written by
// scripts/build-assets.ts. Never touches a database or the network.

const MANIFEST_FILE = path.join(process.cwd(), "src", "generated", "asset-manifest.json");
const RENDER_DIR = path.join(process.cwd(), ".build-cache", "assets");

let cache: { mtimeMs: number; manifest: AssetManifest } | null = null;

function manifest(): AssetManifest | null {
  let mtimeMs: number;
  try {
    mtimeMs = fs.statSync(MANIFEST_FILE).mtimeMs;
  } catch {
    return null;
  }
  // Re-read when `npm run assets` rewrote it (matters in `next dev`).
  if (cache?.mtimeMs !== mtimeMs) cache = { mtimeMs, manifest: JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8")) };
  return cache.manifest;
}

export class AssetError extends Error {}

/** The manifest entry for an asset ID. Throws an AssetError when there is no manifest or no such asset. */
export function getAsset(id: string): AssetEntry {
  const m = manifest();
  if (!m) throw new AssetError("the asset manifest is missing; run `npm run assets` (it also runs before `npm run build`)");
  const entry = m.assets[id];
  if (!entry) throw new AssetError(`unknown asset "${id}"; search with \`npm run asset:find -- <words>\``);
  return entry;
}

/** Like getAsset, but null instead of an error (for optional metadata). */
export function findAsset(id: string): AssetEntry | null {
  return manifest()?.assets[id] ?? null;
}

/** Inline SVG markup of an asset; the dark rendering falls back to the light one. */
export function inlineSvg(asset: AssetEntry, theme: "light" | "dark" = "light"): string {
  const file = (t: string) => path.join(RENDER_DIR, asset.hash, `${t}.svg`);
  try {
    return fs.readFileSync(fs.existsSync(file(theme)) ? file(theme) : file("light"), "utf8");
  } catch {
    throw new AssetError(`no rendered SVG for "${asset.id}"; run \`npm run assets\``);
  }
}

/** True when the asset has a separate dark rendering. */
export function hasDarkSvg(asset: AssetEntry): boolean {
  return asset.variants.some((v) => v.format === "svg" && v.theme === "dark");
}
