import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import {
  assetTypeOf,
  sidecarSchema,
  type AssetEntry,
  type AssetManifest,
  type AssetType,
  type AssetVariant,
} from "../../lib/asset-schema";
import { stepsUsed } from "../../lib/svg-steps";
import { parseAssetSrc, type AssetSrc } from "./links";

// Figures in issues are Markdown images with an `asset:` source (plan §1.2):
//
//   ![Agent = model + harness](asset:diagrams/svg/newsletter/harness-engineering/model-plus-harness)
//   ![Step 3: the harness checks](asset:diagrams/svg/newsletter/harness-engineering/agent-loop#step=3)
//
// Validation reads the asset's source file and sidecar (content-check may run before `npm run assets`); the
// renderers read the manifest the asset build wrote (inline SVG on the web, the PNG in email). Plain Node.

/** Asset types an issue can show as a figure. Animated specs need JSX, which issues can't carry. */
export const FIGURE_TYPES: readonly AssetType[] = ["svg", "mermaid", "excalidraw", "image"];

const defaultAssetsDir = () => path.join(process.cwd(), "assets");

export interface FigureSource {
  id: string;
  type: AssetType;
  file: string;
  alt?: string;
  caption?: string;
  /** The line under the figure on a LinkedIn carousel slide. */
  slide?: string;
  access: "free" | "premium";
  /** data-step layers of an SVG source, sorted. */
  steps: number[];
}

const sourceCache = new Map<string, FigureSource | null>();

/** The asset's source file and sidecar, or null when no file has that ID. */
export function figureSource(id: string, assetsDir = defaultAssetsDir()): FigureSource | null {
  const key = `${assetsDir}\0${id}`;
  if (sourceCache.has(key)) return sourceCache.get(key)!;
  const dir = path.join(assetsDir, path.dirname(id));
  const base = path.basename(id);
  const name = fs.existsSync(dir)
    ? fs.readdirSync(dir).find((f) => f.startsWith(`${base}.`) && !f.endsWith(".meta.yaml"))
    : undefined;
  let found: FigureSource | null = null;
  if (name) {
    const rel = path.posix.join(path.posix.dirname(id), name);
    const type = assetTypeOf(rel);
    const file = path.join(dir, name);
    const sidecarFile = path.join(dir, `${base}.meta.yaml`);
    const parsed = fs.existsSync(sidecarFile)
      ? sidecarSchema.safeParse(yaml.load(fs.readFileSync(sidecarFile, "utf8")))
      : null;
    const meta = parsed?.success ? parsed.data : undefined;
    found = type
      ? {
          id,
          type,
          file,
          alt: meta?.alt,
          caption: meta?.caption,
          slide: meta?.slide,
          access: meta?.access ?? "free",
          steps: type === "svg" ? stepsUsed(fs.readFileSync(file, "utf8")) : [],
        }
      : null;
  }
  sourceCache.set(key, found);
  return found;
}

/** What is wrong with an `asset:` figure source, or [] when it is fine. */
export function figureProblems(src: string, assetsDir = defaultAssetsDir()): string[] {
  const ref = parseAssetSrc(src);
  if (!ref) return [`figure ${src} is malformed: use asset:<id>, asset:<id>#step=<n> or asset:<id>#steps`];
  const a = figureSource(ref.id, assetsDir);
  if (!a) return [`figure ${src}: no asset ${ref.id}; scaffold it with npm run asset:new -w web -- ${ref.id}`];
  const out: string[] = [];
  if (!FIGURE_TYPES.includes(a.type)) out.push(`figure ${src}: a ${a.type} asset can't be shown in an issue`);
  if (a.access === "premium") out.push(`figure ${src}: premium assets can't go in an issue (it is emailed)`);
  if (!a.alt) out.push(`figure ${src}: the asset's sidecar needs alt (what the figure shows)`);
  if (!a.caption) out.push(`figure ${src}: the asset's sidecar needs a caption (the one thing to notice)`);
  if (ref.allSteps) {
    if (a.steps.length === 0) out.push(`figure ${src}: ${ref.id} has no data-step layers`);
  } else if (ref.step !== undefined) {
    if (a.steps.length === 0) out.push(`figure ${src}: ${ref.id} has no data-step layers`);
    else if (!a.steps.includes(ref.step))
      out.push(`figure ${src}: step ${ref.step} is not one of ${a.steps.join(", ")}`);
  } else if (a.steps.length > 0) {
    out.push(
      `figure ${src}: ${ref.id} is a build-up figure; use #steps, or one step with #step=1…${Math.max(...a.steps)}`
    );
  }
  return out;
}

// ── Rendering (manifest) ─────────────────────────────────────────────────────────────────────────

const MANIFEST_FILE = () => path.join(process.cwd(), "src", "generated", "asset-manifest.json");

let manifestCache: { mtimeMs: number; manifest: AssetManifest } | null = null;

function manifest(): AssetManifest {
  const file = MANIFEST_FILE();
  let mtimeMs: number;
  try {
    mtimeMs = fs.statSync(file).mtimeMs;
  } catch {
    throw new Error("the asset manifest is missing; run `npm run assets -w web`");
  }
  if (manifestCache?.mtimeMs !== mtimeMs) {
    manifestCache = { mtimeMs, manifest: JSON.parse(fs.readFileSync(file, "utf8")) };
  }
  return manifestCache.manifest;
}

export interface ResolvedFigure extends AssetSrc {
  asset: AssetEntry;
  alt: string;
  caption: string;
}

/** Resolves an `asset:` image source against the manifest. Throws on anything content-check would reject. */
export function resolveFigure(src: string): ResolvedFigure {
  const ref = parseAssetSrc(src);
  if (!ref) throw new Error(`figure ${src} is malformed`);
  const asset = manifest().assets[ref.id];
  if (!asset) throw new Error(`figure ${src}: unknown asset (run npm run assets -w web)`);
  if (asset.access === "premium") throw new Error(`figure ${src}: premium assets can't go in an issue`);
  return { ...ref, asset, alt: asset.alt ?? asset.caption ?? "", caption: asset.caption ?? asset.title ?? "" };
}

/** The PNG of a figure (of its step, for a build-up figure), light theme: what email clients show. */
export function figurePng(fig: Pick<ResolvedFigure, "asset" | "step" | "allSteps">): AssetVariant | undefined {
  // `#steps` in email: the plain PNG, which for a build-up figure is the complete figure (every step, none faded).
  if (fig.allSteps) return figurePng({ asset: fig.asset });
  const pngs = fig.asset.variants.filter((v) => v.format === "png" && (v.theme ?? "light") === "light");
  return pngs.find((v) => v.step === fig.step) ?? (fig.step === undefined ? undefined : pngs.find((v) => !v.step));
}
