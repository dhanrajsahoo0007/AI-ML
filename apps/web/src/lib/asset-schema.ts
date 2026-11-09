import { z } from "zod";

// The asset library's contracts (plan §5.6), shared by scripts/build-assets.ts (which writes the manifest),
// scripts/content-check.ts (which validates the library) and the MDX components (which read the manifest).
// No Node or React imports, so any of them can load it.
//
// An asset ID is its path under apps/web/assets/ without the extension, e.g. `logos/companies/google` or
// `diagrams/mermaid/system-design/write-ahead-log`. Metadata lives in an optional sidecar next to the file,
// `<slug>.meta.yaml`, validated by `sidecarSchema`.

export const ASSET_TYPES = [
  "image", // raster: png, jpg, webp, avif, gif → AVIF + WebP at several widths
  "svg", // static SVG (diagrams/svg, brand, og, images) → optimised, inlined
  "mermaid", // diagrams/mermaid/*.mmd → light + dark SVG via the build-time Mermaid pipeline
  "excalidraw", // diagrams/excalidraw/*.excalidraw → light + dark SVG and PNG
  "animated", // diagrams/animated/*.ts → AnimatedDiagram spec
  "logo", // logos/companies/*.svg → src/lib/company-logos.ts (generated)
  "tech-icon", // logos/tech/<vendor>/*.svg → <TechIcon id>
  "icon", // icons/*.svg → custom icons beyond lucide
  "download", // downloads/*.{pdf,zip,csv} → <Download id>
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

const RASTER_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "avif", "gif"] as const;
const DOWNLOAD_EXTENSIONS = ["pdf", "zip", "csv"] as const;

/** Types rendered as an image, which therefore need `alt` (except decorative og/ backgrounds). */
export const ALT_REQUIRED: readonly AssetType[] = ["image", "svg", "mermaid", "excalidraw", "animated"];
/** Folders that are always public (plan §5.6 step 5), whatever uses them. */
export const ALWAYS_PUBLIC_GROUPS = ["brand", "og"] as const;
/** A tag that marks an asset as used outside articles (emails, pricing, landing), so it is always public. */
export const SHARED_TAG = "shared";

/** Source size limits (plan §5.6 validation). Bigger files belong in remote.yaml. */
export const SIZE_LIMITS: Record<"image" | "svg" | "other", number> = {
  image: 1024 * 1024,
  svg: 200 * 1024,
  other: 5 * 1024 * 1024,
};

/** Widths (px) every raster image is converted to, capped at its own width. */
export const IMAGE_WIDTHS = [480, 960, 1600] as const;

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const isKebab = (segment: string) => kebab.test(segment);

const isoDate = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD"),
  z.date().transform((d) => d.toISOString().slice(0, 10)),
]);

export const sidecarSchema = z
  .object({
    title: z.string().min(1).optional(),
    /** Required for anything rendered as an image (ALT_REQUIRED). Describe what the picture shows. */
    alt: z.string().min(1).optional(),
    caption: z.string().min(1).optional(),
    tags: z.array(z.string().regex(kebab, "tags are kebab-case")).default([]),
    /** premium assets are never written to public output (plan §5.6 step 6). */
    access: z.enum(["free", "premium"]).default("free"),
    /** `original`, or a key from assets/LICENSES.yaml. */
    source: z.string().min(1).default("original"),
    author: z.string().min(1).optional(),
    created: isoDate.optional(),
  })
  .strict();
export type Sidecar = z.output<typeof sidecarSchema>;

export const licenseEntrySchema = z
  .object({
    name: z.string().min(1),
    url: z.url(),
    package: z.string().optional(),
    version: z.string().optional(),
    /** SPDX identifier, e.g. MIT, CC0-1.0, Apache-2.0. */
    license: z.string().min(1),
    licenseUrl: z.url().optional(),
    licenseFile: z.string().optional(),
    copyright: z.string().optional(),
    usedFor: z.array(z.string()).min(1),
    attributionRequired: z.boolean(),
    attribution: z.string().min(1),
    trademarks: z.string().optional(),
    changes: z.string().optional(),
  })
  .strict();
export const licensesSchema = z.record(z.string().regex(kebab, "licence keys are kebab-case"), licenseEntrySchema);
export type LicenseEntry = z.output<typeof licenseEntrySchema>;

export const remoteSchema = z
  .object({
    assets: z.array(
      z
        .object({
          id: z.string().regex(/^remote\/[a-z0-9/-]+$/, "remote ids start with remote/ and are kebab-case"),
          r2: z.string().min(1),
          sha256: z.string().regex(/^[a-f0-9]{64}$/),
          bytes: z.number().int().positive(),
          access: z.enum(["free", "premium"]).default("free"),
          title: z.string().optional(),
          alt: z.string().optional(),
          tags: z.array(z.string()).default([]),
          source: z.string().default("original"),
        })
        .strict()
    ),
  })
  .strict();
export type RemoteAsset = z.output<typeof remoteSchema>["assets"][number];

export interface AssetVariant {
  /** avif / webp / png: raster renditions; svg: optimised SVG; file: a download as is. */
  format: "avif" | "webp" | "png" | "svg" | "file";
  theme?: "light" | "dark";
  width?: number;
  height?: number;
  bytes: number;
  /** Public URL (/_a/<hash>/…) when this asset ships publicly in this environment. */
  url?: string;
  /** Build-up step this rendition shows (an SVG with data-step layers gets a PNG per step). */
  step?: number;
}

export interface AssetEntry {
  id: string;
  type: AssetType;
  /** First path segment: brand, images, diagrams, logos, icons, og, downloads. */
  group: string;
  /** Source file, relative to apps/web. */
  file: string;
  ext: string;
  bytes: number;
  /** sha256 of the source file. */
  sha256: string;
  /** Content hash used in output paths (/_a/<hash>/…); changes with the source or the pipeline. */
  hash: string;
  title?: string;
  alt?: string;
  caption?: string;
  tags: string[];
  access: "free" | "premium";
  source: string;
  license?: { key: string; name: string; license: string; url: string };
  /** Intrinsic size (raster pixels, or the SVG viewBox). */
  width?: number;
  height?: number;
  /** Tiny blurred WebP as a data: URL, shown while a raster image loads. */
  placeholder?: string;
  /** Highest data-step layer of a build-up SVG (src/lib/svg-steps.ts). */
  steps?: number;
  variants: AssetVariant[];
  /** Pages (paths) and code (`code:<file>`) that use this asset. */
  usedBy: string[];
  /** Copied to public/ in this environment (free, and used by a visible page, brand/og or tagged shared). */
  public: boolean;
}

export interface AssetManifest {
  version: 1;
  /** APP_ENV the manifest was built for; public output differs per environment. */
  env: string;
  assets: Record<string, AssetEntry>;
}

// ── IDs ──────────────────────────────────────────────────────────────────────────────────────────

/** The MDX components that take an asset reference, and the attribute that holds it. */
export const ASSET_REF_COMPONENTS = {
  Img: ["id"],
  Figure: ["id"],
  Download: ["id"],
  Diagram: ["id"],
  Mermaid: ["ref", "id"],
  TechIcon: ["id"],
  AnimatedDiagram: ["spec", "name"],
  /** Cloud mapping table of an animated diagram (src/components/cloud/cloud-mapping.tsx). */
  CloudMapping: ["diagram"],
} as const;
export type AssetRefComponent = keyof typeof ASSET_REF_COMPONENTS;

/**
 * The asset ID an MDX reference points at. Short forms are accepted where the component implies a folder:
 * `<Mermaid ref="system-design/wal">` → diagrams/mermaid/system-design/wal, `<TechIcon id="aws/lambda">` →
 * logos/tech/aws/lambda, `<AnimatedDiagram name="messenger/aws">` (or `spec="animated/messenger/aws"`) →
 * diagrams/animated/messenger/aws, `<Diagram id="excalidraw/x/y">` → diagrams/excalidraw/x/y.
 */
export function resolveAssetRef(component: AssetRefComponent, value: string): string {
  const v = value.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  // diagrams/<kind>/x, <kind>/x and x all mean diagrams/<kind>/x.
  const diagram = (kind: string) =>
    v.startsWith("diagrams/") ? v : v.startsWith(`${kind}/`) ? `diagrams/${v}` : `diagrams/${kind}/${v}`;
  switch (component) {
    case "Mermaid":
      return diagram("mermaid");
    case "AnimatedDiagram":
    case "CloudMapping":
      return diagram("animated");
    case "TechIcon":
      return v.startsWith("logos/") ? v : `logos/tech/${v}`;
    case "Diagram":
      return v.startsWith("diagrams/") ? v : `diagrams/${v}`;
    default:
      return v;
  }
}

/** Type of an asset from its path under assets/ (e.g. "logos/companies/google.svg"), or null if not allowed. */
export function assetTypeOf(relPath: string): AssetType | null {
  const ext = relPath.split(".").pop()!.toLowerCase();
  const [group, sub] = relPath.split("/");
  if (group === "downloads") return (DOWNLOAD_EXTENSIONS as readonly string[]).includes(ext) ? "download" : null;
  if (group === "diagrams") {
    if (sub === "mermaid") return ext === "mmd" ? "mermaid" : null;
    if (sub === "excalidraw") return ext === "excalidraw" ? "excalidraw" : null;
    if (sub === "animated") return ext === "ts" ? "animated" : null;
    if (sub === "svg") return ext === "svg" ? "svg" : null;
    return null;
  }
  if (group === "logos") {
    if (ext !== "svg") return null;
    // Matched as a path prefix, since the folder name alone is also a section key (no section literals in shared code).
    if (relPath.startsWith("logos/companies/")) return "logo";
    return sub === "tech" ? "tech-icon" : null;
  }
  if (group === "icons") return ext === "svg" ? "icon" : null;
  if (group === "brand" || group === "images" || group === "og") {
    if (ext === "svg") return "svg";
    return (RASTER_EXTENSIONS as readonly string[]).includes(ext) ? "image" : null;
  }
  return null;
}

/** The asset ID for a path under assets/: the path without its extension. */
export function assetIdOf(relPath: string): string {
  return relPath.replace(/\.[^./]+$/, "");
}

/** The file name used for an asset's outputs: its last ID segment. */
export function assetSlug(id: string): string {
  return id.split("/").pop()!;
}
