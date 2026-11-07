import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { AssetEntry, AssetManifest } from "@/lib/asset-schema";

// The asset manifest that `npm run assets` writes before every build (src/generated/asset-manifest.json).
// Read at request time, like /admin/sections reads the registry: fine under `next start`; on Workers the page
// reports that the manifest isn't available (see the stream R hand-over note).

const MANIFEST_FILE = path.join(process.cwd(), "src", "generated", "asset-manifest.json");

export function loadAssetManifest(): { env: string; assets: AssetEntry[] } | null {
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8")) as AssetManifest;
    return { env: manifest.env, assets: Object.values(manifest.assets) };
  } catch {
    return null;
  }
}
