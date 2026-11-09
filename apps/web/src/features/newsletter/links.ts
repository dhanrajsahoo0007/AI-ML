// Link and image extraction from an issue's MDX body, for validate() (links resolve, figures exist, PNG-only raw
// images) and the renderers. Pure string functions; no MDX parser needed for the plain Markdown issues are
// written in.

interface FoundRef {
  url: string;
  /** 1-based line in the body. */
  line: number;
}

const LINK_RE = /(?<!!)\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)|href=["']([^"']+)["']/g;
const IMAGE_RE = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)|<img\b[^>]*\bsrc=["']([^"']+)["']/g;
/** JSX elements other than plain HTML: issues are Markdown so the same file renders to the web and to email. */
const COMPONENT_RE = /<([A-Z][A-Za-z0-9.]*)\b/g;
/** GitHub alert syntax on the first line of a blockquote: `> [!NOTE]`. */
const CALLOUT_RE = /^>\s*\[!([A-Za-z]+)\]/gm;

function lineAt(text: string, index: number) {
  return text.slice(0, index).split("\n").length;
}

/** Fenced code may show any syntax; it is not rendered as Markdown. Masked so line numbers stay right. */
const maskFences = (body: string) => body.replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, " "));

function collect(text: string, re: RegExp): FoundRef[] {
  return [...maskFences(text).matchAll(re)].map((m) => ({ url: m[1] ?? m[2], line: lineAt(text, m.index) }));
}

export const findLinks = (body: string) => collect(body, LINK_RE);
export const findImages = (body: string) => collect(body, IMAGE_RE);

export function findComponents(body: string): FoundRef[] {
  const masked = maskFences(body);
  return [...masked.matchAll(COMPONENT_RE)].map((m) => ({ url: m[1], line: lineAt(masked, m.index) }));
}

/** Email clients need PNG (or JPEG); SVG and WebP/AVIF are not shown by many of them. Plan §15.3: PNG only. */
export const isPng = (url: string) => /\.png(?:[?#].*)?$/i.test(url);

/** Path of an internal link without query and fragment ("/a/b/?x#y" → "/a/b"). */
export function internalPath(url: string): string | null {
  if (!url.startsWith("/") || url.startsWith("//")) return null;
  const pathname = url.split(/[?#]/)[0].replace(/\/$/, "");
  return pathname || "/";
}

// ── Figures: ![alt](asset:<id>), ![alt](asset:<id>#step=<n>) and ![alt](asset:<id>#steps) ──────────

export const ASSET_SCHEME = "asset:";

export interface AssetSrc {
  /** Asset ID: the path under apps/web/assets/ without the extension. */
  id: string;
  /** Build-up step (1-based) of a figure whose SVG has data-step layers. */
  step?: number;
  /** `#steps`: every step of a build-up figure, stepped through on the web (the last step in email). */
  allSteps?: boolean;
}

/** Parses an `asset:` image source; null for any other URL, or a malformed one. */
export function parseAssetSrc(src: string): AssetSrc | null {
  if (!src.startsWith(ASSET_SCHEME)) return null;
  const m = /^asset:([a-z0-9][a-z0-9/-]*[a-z0-9])(?:#step=([1-9]\d*)|#(steps))?$/.exec(src);
  if (!m) return null;
  if (m[3]) return { id: m[1], allSteps: true };
  return m[2] ? { id: m[1], step: Number(m[2]) } : { id: m[1] };
}

export interface FoundAssetRef extends FoundRef {
  /** Null when the `asset:` source is malformed. */
  ref: AssetSrc | null;
}

/** Every `asset:` image in the body. */
export function findAssetRefs(body: string): FoundAssetRef[] {
  return findImages(body)
    .filter((i) => i.url.startsWith(ASSET_SCHEME))
    .map((i) => ({ ...i, ref: parseAssetSrc(i.url) }));
}

/**
 * True when a rendered paragraph's children are a single `asset:` image: the renderers unwrap it, since a figure
 * (and its caption) can't sit inside a <p>.
 */
export function isFigureOnly(children: unknown): boolean {
  const only = Array.isArray(children) ? (children.length === 1 ? children[0] : null) : children;
  const src = only && typeof only === "object" && "props" in only ? (only.props as { src?: unknown }).src : undefined;
  return typeof src === "string" && src.startsWith(ASSET_SCHEME);
}

// ── Callouts ─────────────────────────────────────────────────────────────────────────────────────

export interface FoundCallout {
  /** The alert type as written (NOTE, TIP, …). */
  type: string;
  line: number;
}

export function findCallouts(body: string): FoundCallout[] {
  return [...maskFences(body).matchAll(CALLOUT_RE)].map((m) => ({ type: m[1], line: lineAt(body, m.index) }));
}
