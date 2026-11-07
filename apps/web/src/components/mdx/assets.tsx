import fs from "node:fs";
import path from "node:path";
import * as React from "react";
import { Download as DownloadIcon } from "lucide-react";
import { AssetError, getAsset, findAsset, hasDarkSvg, inlineSvg } from "@/lib/assets";
import { resolveAssetRef, type AssetEntry, type AssetRefComponent } from "@/lib/asset-schema";
import { diagramHash, readDiagram } from "@/lib/mermaid-cache.mjs";
import { Diagram as AnimatedDiagramById } from "@/components/diagrams/diagram";
import { cn } from "@/lib/utils";
import { DevMermaid, Figure as ChildFigure, MermaidSvg, captionClass } from "./code-block";
import { ProPlaceholder } from "./pro-placeholder";

// MDX components that show assets from apps/web/assets/ by ID (plan §5.6):
//
//   <Img id="images/cloud/aws-console-vpc" />              raster (AVIF/WebP srcset) or inline SVG
//   <Figure id="diagrams/svg/system-design/cap-triangle" caption="…" />
//   <Diagram id="excalidraw/system-design/consistent-hashing-ring" />   any diagram; light/dark swap with the theme
//   <Mermaid ref="system-design/write-ahead-log" />        assets/diagrams/mermaid/*.mmd, rendered at build time
//   <TechIcon id="aws/lambda" />                           assets/logos/tech/<vendor>/<slug>.svg
//   <Download id="downloads/system-design-cheatsheet" />   free → static file; premium → "Pro" placeholder
//
// Everything comes from the manifest that scripts/build-assets.ts writes before the build. A missing asset fails
// the production build (content-check reports it first, with file and line); `next dev` shows the problem inline.

const isProd = process.env.NODE_ENV === "production";

type Resolved = { asset: AssetEntry; problem?: never } | { asset?: never; problem: React.ReactElement };

function resolve(component: AssetRefComponent, ref: string | undefined): Resolved {
  const id = ref ? resolveAssetRef(component, ref) : "";
  try {
    if (!ref) throw new AssetError("an `id` is required");
    return { asset: getAsset(id) };
  } catch (err) {
    if (!(err instanceof AssetError) || isProd) throw new Error(`<${component} id="${ref ?? ""}">: ${(err as Error).message}`);
    return { problem: <AssetProblem message={`<${component} id="${ref ?? ""}">: ${err.message}`} /> };
  }
}

function AssetProblem({ message }: { message: string }) {
  return (
    <p className="my-4 rounded-lg border border-red-500/40 bg-red-500/5 p-3 font-mono text-xs text-red-700 dark:text-red-400">
      {message}
    </p>
  );
}

function wrongType(component: string, asset: AssetEntry): Resolved {
  const message = `<${component}> can't show ${asset.id} (a ${asset.type} asset)`;
  if (isProd) throw new Error(message);
  return { problem: <AssetProblem message={message} /> };
}

function Caption({ children }: { children: React.ReactNode }) {
  return <figcaption className={captionClass}>Fig. — {children}</figcaption>;
}

// ── Building blocks ──────────────────────────────────────────────────────────────────────────────

const DEFAULT_SIZES = "(min-width: 768px) 720px, 100vw";

/** A raster image: AVIF and WebP srcsets, intrinsic width/height (no layout shift), lazy, blurred placeholder. */
function Picture({ asset, alt, sizes = DEFAULT_SIZES, priority }: { asset: AssetEntry; alt: string; sizes?: string; priority?: boolean }) {
  const srcset = (format: "avif" | "webp") =>
    asset.variants
      .filter((v) => v.format === format && v.url)
      .map((v) => `${v.url} ${v.width}w`)
      .join(", ");
  const webp = asset.variants.filter((v) => v.format === "webp" && v.url);
  const ratio = asset.width && asset.height ? `${asset.width} / ${asset.height}` : undefined;
  if (webp.length === 0) {
    // Not published in this environment (e.g. an asset of a hidden section): no request, just the space.
    return <div role="img" aria-label={alt} style={{ aspectRatio: ratio }} className="w-full rounded-xl bg-paper-2" />;
  }
  const fallback = webp.find((v) => v.width === 960) ?? webp[webp.length - 1];
  return (
    <picture>
      <source type="image/avif" srcSet={srcset("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcset("webp")} sizes={sizes} />
      {/* A plain <img>: images are pre-optimised at build (plan §5.6); no runtime image optimiser on Workers. */}
      <img
        src={fallback.url}
        width={asset.width}
        height={asset.height}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        draggable={false}
        style={asset.placeholder ? { backgroundImage: `url(${asset.placeholder})`, backgroundSize: "cover" } : undefined}
        className="mx-auto h-auto max-w-full rounded-xl"
      />
    </picture>
  );
}

/** Inline SVG markup (no downloadable URL); a separate dark rendering swaps in with the theme, without JS. */
function InlineSvg({ asset, alt, className }: { asset: AssetEntry; alt?: string; className?: string }) {
  const light = inlineSvg(asset, "light");
  const dark = hasDarkSvg(asset) ? inlineSvg(asset, "dark") : null;
  const a11y = alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true };
  return (
    <div {...a11y} className={cn("[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full", className)}>
      {dark ? (
        <>
          <div className="dark:hidden" dangerouslySetInnerHTML={{ __html: light }} />
          <div className="hidden dark:block" dangerouslySetInnerHTML={{ __html: dark }} />
        </>
      ) : (
        <div dangerouslySetInnerHTML={{ __html: light }} />
      )}
    </div>
  );
}

type DiagramOptions = { caption?: string; minWidth?: number; step?: number; stepper?: boolean };

/** Any image or diagram asset as a captioned figure. */
function AssetFigure({ asset, caption, minWidth, step, stepper }: { asset: AssetEntry } & DiagramOptions) {
  const label = asset.title ?? asset.id;
  const text = caption ?? asset.caption ?? asset.title;
  const alt = asset.alt ?? text ?? "";
  if (asset.access === "premium") return <ProPlaceholder label={label} kind={asset.type === "image" ? "image" : "diagram"} />;
  switch (asset.type) {
    case "animated":
      return <AnimatedDiagramById spec={asset.id} caption={caption ?? asset.caption} step={step} stepper={stepper} minWidth={minWidth} />;
    case "mermaid":
    case "excalidraw":
      return (
        <MermaidSvg
          light={inlineSvg(asset, "light")}
          dark={inlineSvg(asset, "dark")}
          caption={text}
          alt={alt}
          minWidth={minWidth ?? Math.min(asset.width ?? 560, 560)}
        />
      );
    case "image":
      return (
        <figure className="my-8">
          <Picture asset={asset} alt={alt} />
          {text && <Caption>{text}</Caption>}
        </figure>
      );
    default:
      return (
        <figure className="my-8">
          <InlineSvg asset={asset} alt={alt} className="rounded-xl border border-hairline bg-paper p-4 sm:p-6" />
          {text && <Caption>{text}</Caption>}
        </figure>
      );
  }
}

// ── MDX components ───────────────────────────────────────────────────────────────────────────────

/** An image or static SVG. Caption from the sidecar unless overridden; `alt` likewise. */
export function Img({
  id,
  alt,
  caption,
  sizes,
  priority,
}: {
  id: string;
  alt?: string;
  caption?: string;
  sizes?: string;
  /** Above the fold: load eagerly with high priority. */
  priority?: boolean;
}) {
  const r = resolve("Img", id);
  if (r.problem) return r.problem;
  const { asset } = r;
  if (!["image", "svg", "icon"].includes(asset.type)) return wrongType("Img", asset).problem!;
  if (asset.access === "premium") return <ProPlaceholder label={asset.title ?? asset.id} kind="image" />;
  const text = caption ?? asset.caption;
  const altText = alt ?? asset.alt ?? "";
  const body =
    asset.type === "image" ? (
      <Picture asset={asset} alt={altText} sizes={sizes} priority={priority} />
    ) : (
      <InlineSvg asset={asset} alt={altText} />
    );
  return text ? (
    <figure className="my-8">
      {body}
      <Caption>{text}</Caption>
    </figure>
  ) : (
    <div className="my-6">{body}</div>
  );
}

/**
 * A captioned figure. With `id` it shows that asset (image, SVG or any diagram) and takes its caption from
 * the sidecar unless `caption` is given; without `id` it wraps its children (e.g. a ```mermaid fence).
 */
export function Figure({ id, caption, children, ...options }: { id?: string; children?: React.ReactNode } & DiagramOptions) {
  if (!id) return <ChildFigure caption={caption ?? ""}>{children}</ChildFigure>;
  const r = resolve("Figure", id);
  return r.problem ?? <AssetFigure asset={r.asset} caption={caption} {...options} />;
}

/** Any diagram asset by ID: `excalidraw/…`, `svg/…`, `mermaid/…` or `animated/…` (under assets/diagrams/). */
export function Diagram({ id, ...options }: { id: string } & DiagramOptions) {
  const r = resolve("Diagram", id);
  if (r.problem) return r.problem;
  if (!["svg", "mermaid", "excalidraw", "animated"].includes(r.asset.type)) return wrongType("Diagram", r.asset).problem!;
  return <AssetFigure asset={r.asset} {...options} />;
}

/**
 * A reusable Mermaid diagram from assets/diagrams/mermaid/<ref>.mmd, pre-rendered to light and dark SVG by
 * the same build-time pipeline as ```mermaid fences. In `next dev` the .mmd file is read directly, so edits
 * show up without a rebuild (client-side fallback until `npm run assets` renders them).
 */
export function Mermaid({ ref, id, caption, minWidth }: { ref?: string; id?: string; caption?: string; minWidth?: number }) {
  const source = ref ?? id;
  if (!isProd && source) {
    const assetId = resolveAssetRef("Mermaid", source);
    const file = path.join(process.cwd(), "assets", `${assetId}.mmd`);
    if (fs.existsSync(file)) {
      const chart = fs.readFileSync(file, "utf8");
      const meta = findAsset(assetId);
      const text = caption ?? meta?.caption ?? meta?.title;
      const entry = readDiagram(diagramHash(chart));
      if (entry) return <MermaidSvg light={entry.light} dark={entry.dark} caption={text} alt={meta?.alt} minWidth={minWidth} />;
      if (DevMermaid) return <DevMermaid chart={chart} caption={text} />;
    }
  }
  const r = resolve("Mermaid", source);
  if (r.problem) return r.problem;
  if (r.asset.type !== "mermaid") return wrongType("Mermaid", r.asset).problem!;
  return <AssetFigure asset={r.asset} caption={caption} minWidth={minWidth} />;
}

/** A technology logo (AWS, GCP, Azure, OSS) inline with text, from assets/logos/tech/<vendor>/<slug>.svg. */
export function TechIcon({ id, title, className }: { id: string; title?: string; className?: string }) {
  const r = resolve("TechIcon", id);
  if (r.problem) return r.problem;
  if (r.asset.type !== "tech-icon") return wrongType("TechIcon", r.asset).problem!;
  const label = title ?? r.asset.title;
  return (
    <span
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      className={cn("inline-flex size-[1.15em] align-[-0.2em] [&_svg]:size-full", className)}
      dangerouslySetInnerHTML={{ __html: inlineSvg(r.asset) }}
    />
  );
}

const formatBytes = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/** A downloadable file (cheat sheet, template). Premium files are never public: they show a Pro placeholder. */
export function Download({ id, label }: { id: string; label?: string }) {
  const r = resolve("Download", id);
  if (r.problem) return r.problem;
  const { asset } = r;
  if (asset.type !== "download") return wrongType("Download", asset).problem!;
  const title = label ?? asset.title ?? asset.id;
  if (asset.access === "premium") return <ProPlaceholder label={title} kind="download" />;
  const file = asset.variants.find((v) => v.format === "file");
  const meta = `${asset.ext.toUpperCase()} · ${formatBytes(file?.bytes ?? asset.bytes)}`;
  const body = (
    <>
      <DownloadIcon aria-hidden className="size-4 shrink-0" />
      <span className="font-medium text-ink">{title}</span>
      <span className="text-xs text-muted-foreground">{meta}</span>
    </>
  );
  const className = "my-6 flex w-fit items-center gap-2.5 rounded-lg border border-hairline bg-paper px-4 py-3 text-sm";
  return file?.url ? (
    <a href={file.url} download className={cn(className, "hover:border-ink/40")}>
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
}
