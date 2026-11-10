import fs from "node:fs";
import path from "node:path";
import type { APIRequestContext } from "@playwright/test";

// Paywall leak suite helpers (plan §12.4). A premium fixture article carries a canary string; these helpers fetch
// every public surface of a URL and scan the static build output, so a test can assert the canary never appears
// where a non-entitled visitor can read it.

const webRoot = path.resolve(__dirname, "../../..");

export const LEAK_FIXTURE = path.join(
  webRoot,
  "tests",
  "fixtures",
  "content",
  "system-design",
  "leak-canary",
  "premium-article.mdx"
);

/** Matches any canary, so a canary from another fixture or an older build is caught too. */
export const ANY_CANARY = /LEAK-CANARY-[A-Za-z0-9]{8,}/;

/** The canary in the fixture article (Phase 5 seeds a fresh one per build). */
export function readCanary(file = LEAK_FIXTURE): string {
  const match = fs.readFileSync(file, "utf8").match(ANY_CANARY);
  if (!match) throw new Error(`${file} has no LEAK-CANARY-… string`);
  return match[0];
}

export interface Hit {
  where: string;
  excerpt: string;
}

/** Every match of `needle` in `text`, with a little context. */
export function scanText(text: string, needle: string | RegExp, where: string): Hit[] {
  const re =
    typeof needle === "string"
      ? new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
      : new RegExp(needle.source, "g");
  return [...text.matchAll(re)].map((m) => ({
    where,
    excerpt: text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40),
  }));
}

/**
 * Scans every file under `dir` (any type: JS, CSS, JSON, images, fonts, source maps). Binary files are read as
 * latin1 so a plain-text canary embedded in them is still found. Returns [] when the directory doesn't exist.
 */
export function scanDir(dir: string, needle: string | RegExp): Hit[] {
  if (!fs.existsSync(dir)) return [];
  const hits: Hit[] = [];
  for (const rel of fs.readdirSync(dir, { recursive: true, encoding: "utf8" })) {
    const file = path.join(dir, rel);
    if (!fs.statSync(file).isFile()) continue;
    hits.push(...scanText(fs.readFileSync(file).toString("latin1"), needle, path.relative(webRoot, file)));
  }
  return hits;
}

/**
 * Directories whose files are served to anyone: the Next client build, `public/`, and the OpenNext asset
 * bundle once the Cloudflare build exists (Phase 3). Server-only output (.next/server) is not public and is not
 * listed: in Phase 5 it holds the entitled variant of premium pages.
 */
export function publicOutputDirs(root = webRoot): string[] {
  return [path.join(root, ".next", "static"), path.join(root, "public"), path.join(root, ".open-next", "assets")];
}

/** A visitor without a valid entitlement. Free, expired-pro and pro sessions need the test login (Phase 4/5). */
export interface Visitor {
  name: string;
  headers: Record<string, string>;
}

export const NON_ENTITLED_VISITORS: Visitor[] = [
  { name: "anonymous", headers: {} },
  // A well-formed but unsigned entitlement cookie (plan §11.3): must be treated as no entitlement.
  { name: "forged cookie", headers: { cookie: "tts_ent=eyJ0aWVyIjoicHJvIiwiZXhwIjo0MTAyNDQ0ODAwfQ.forged-signature" } },
];

export interface Surface {
  surface: string;
  url: string;
  status: number;
  body: string;
}

/** The page, its RSC payload (`RSC: 1` with `?_rsc=`) and its RSC prefetch, as `visitor` sees them. */
export async function fetchPageSurfaces(request: APIRequestContext, url: string, visitor: Visitor): Promise<Surface[]> {
  const sep = url.includes("?") ? "&" : "?";
  const variants: { surface: string; url: string; headers: Record<string, string> }[] = [
    { surface: "html", url, headers: {} },
    { surface: "rsc", url: `${url}${sep}_rsc=leak1`, headers: { rsc: "1" } },
    { surface: "rsc-prefetch", url: `${url}${sep}_rsc=leak2`, headers: { rsc: "1", "next-router-prefetch": "1" } },
  ];
  const out: Surface[] = [];
  for (const v of variants) {
    const res = await request.get(v.url, { headers: { ...visitor.headers, ...v.headers } });
    out.push({ surface: v.surface, url: v.url, status: res.status(), body: await res.text() });
  }
  return out;
}

/** Site-wide files that list or describe pages. The search index and OG images are added when they exist. */
export const SITE_FILES = ["/sitemap.xml", "/robots.txt"];
