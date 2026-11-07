// Link and image extraction from an issue's MDX body, for validate() (links resolve, PNG-only images) and the
// email renderer. Pure string functions; no MDX parser needed for the plain Markdown issues are written in.

export interface FoundRef {
  url: string;
  /** 1-based line in the body. */
  line: number;
}

const LINK_RE = /(?<!!)\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)|href=["']([^"']+)["']/g;
const IMAGE_RE = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)|<img\b[^>]*\bsrc=["']([^"']+)["']/g;
/** JSX elements other than plain HTML: issues are Markdown so the same file renders to the web and to email. */
const COMPONENT_RE = /<([A-Z][A-Za-z0-9.]*)\b/g;

function lineAt(text: string, index: number) {
  return text.slice(0, index).split("\n").length;
}

function collect(text: string, re: RegExp): FoundRef[] {
  return [...text.matchAll(re)].map((m) => ({ url: m[1] ?? m[2], line: lineAt(text, m.index) }));
}

export const findLinks = (body: string) => collect(body, LINK_RE);
export const findImages = (body: string) => collect(body, IMAGE_RE);

export function findComponents(body: string): FoundRef[] {
  // Fenced code may show JSX; it is not rendered as a component.
  const masked = body.replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, " "));
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
