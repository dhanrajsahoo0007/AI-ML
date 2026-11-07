// The asset library's logic (plan §5.6), shared by scripts/build-assets.ts (build, asset:new, asset:find)
// and scripts/content-check.ts (validation). Pure functions over the file system; no rendering here
// (that's scripts/build-assets.render.ts), so the unit tests (tests/unit/assets/) can run it on fixtures.

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import matter from "gray-matter";
import { optimize as svgo } from "svgo";
import {
  ALT_REQUIRED,
  ALWAYS_PUBLIC_GROUPS,
  ASSET_REF_COMPONENTS,
  SHARED_TAG,
  SIZE_LIMITS,
  assetIdOf,
  assetTypeOf,
  isKebab,
  licensesSchema,
  remoteSchema,
  resolveAssetRef,
  sidecarSchema,
  type AssetEntry,
  type AssetManifest,
  type AssetRefComponent,
  type AssetVariant,
  type AssetType,
  type LicenseEntry,
  type RemoteAsset,
  type Sidecar,
} from "../src/lib/asset-schema";
import { roundNumbers, uniquifyIds } from "./render-mermaid.svg.mjs";

export interface Problem {
  file: string;
  line?: number;
  level: "error" | "warning";
  message: string;
}

/** Bumped when the outputs for an unchanged source change, so content hashes (and URLs) change too. */
export const PIPELINE_VERSION = "1";

export const SIDECAR_SUFFIX = ".meta.yaml";

// ── Index ────────────────────────────────────────────────────────────────────────────────────────

/** An asset found on disk, before rendering: everything except variants, usedBy and public. */
export type IndexedAsset = Omit<AssetEntry, "variants" | "usedBy" | "public"> & { sidecar: string | null };

export interface AssetIndex {
  assets: Map<string, IndexedAsset>;
  licenses: Record<string, LicenseEntry>;
  remote: RemoteAsset[];
  problems: Problem[];
}

function walkFiles(dir: string, base = ""): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((e) => (e.isDirectory() ? walkFiles(path.join(dir, e.name), `${base}${e.name}/`) : [`${base}${e.name}`]));
}

export const sha256 = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");

/** Output hash for an asset: its source plus the pipeline version (12 hex chars). */
export const contentHash = (sourceSha: string) => sha256(`${PIPELINE_VERSION}\0${sourceSha}`).slice(0, 12);

function readYaml(file: string, rel: string, problems: Problem[]): unknown {
  try {
    return yaml.load(fs.readFileSync(file, "utf8"));
  } catch (e) {
    problems.push({ file: rel, level: "error", message: `invalid YAML: ${(e as Error).message.split("\n")[0]}` });
    return undefined;
  }
}

function zodProblems(rel: string, issues: { path: PropertyKey[]; message: string }[], problems: Problem[]) {
  for (const i of issues) {
    problems.push({ file: rel, level: "error", message: `${i.path.map(String).join(".") || "(root)"}: ${i.message}` });
  }
}

/** Intrinsic size from an SVG's width/height, or its viewBox. */
export function svgSize(svg: string): { width: number; height: number } | null {
  const root = /<svg\b[^>]*>/.exec(svg)?.[0] ?? "";
  const num = (attr: string) => {
    const m = new RegExp(`\\s${attr}="([\\d.]+)(px)?"`).exec(root);
    return m ? Number(m[1]) : null;
  };
  const w = num("width");
  const h = num("height");
  if (w && h) return { width: w, height: h };
  const vb = /\sviewBox="([^"]+)"/
    .exec(root)?.[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  return vb?.length === 4 && vb[2] > 0 && vb[3] > 0 ? { width: vb[2], height: vb[3] } : null;
}

/**
 * Walks assets/: validates names and sidecars, hashes every file. `rel` paths in problems are relative to
 * `appDir` (apps/web). Never throws on bad content; everything wrong is a problem.
 */
export function indexAssets(assetsDir: string, appDir = path.dirname(assetsDir)): AssetIndex {
  const problems: Problem[] = [];
  const relOf = (p: string) => path.relative(appDir, path.join(assetsDir, p));

  const licensesFile = path.join(assetsDir, "LICENSES.yaml");
  let licenses: Record<string, LicenseEntry> = {};
  if (fs.existsSync(licensesFile)) {
    const parsed = licensesSchema.safeParse(readYaml(licensesFile, relOf("LICENSES.yaml"), problems) ?? {});
    if (parsed.success) licenses = parsed.data;
    else zodProblems(relOf("LICENSES.yaml"), parsed.error.issues, problems);
  } else {
    problems.push({ file: relOf("LICENSES.yaml"), level: "error", message: "missing" });
  }

  let remote: RemoteAsset[] = [];
  const remoteFile = path.join(assetsDir, "remote.yaml");
  if (fs.existsSync(remoteFile)) {
    const parsed = remoteSchema.safeParse(readYaml(remoteFile, relOf("remote.yaml"), problems) ?? { assets: [] });
    if (parsed.success) remote = parsed.data.assets;
    else zodProblems(relOf("remote.yaml"), parsed.error.issues, problems);
  }

  const files = walkFiles(assetsDir).filter((f) => f.includes("/"));
  const fileSet = new Set(files);
  const assets = new Map<string, IndexedAsset>();

  for (const rel of files) {
    if (rel.endsWith(SIDECAR_SUFFIX)) {
      const base = rel.slice(0, -SIDECAR_SUFFIX.length);
      if (!files.some((f) => f !== rel && assetIdOf(f) === base && !f.endsWith(SIDECAR_SUFFIX))) {
        problems.push({ file: relOf(rel), level: "error", message: "sidecar has no asset file next to it" });
      }
      continue;
    }
    const type = assetTypeOf(rel);
    if (!type) {
      problems.push({
        file: relOf(rel),
        level: "error",
        message: "file type not allowed in this folder (see assets/README.md)",
      });
      continue;
    }
    const id = assetIdOf(rel);
    const segments = id.split("/");
    const bad = segments.find((s) => !isKebab(s));
    if (bad) problems.push({ file: relOf(rel), level: "error", message: `"${bad}" is not kebab-case` });
    if (assets.has(id)) {
      problems.push({
        file: relOf(rel),
        level: "error",
        message: `duplicate asset ID ${id} (${assets.get(id)!.file})`,
      });
      continue;
    }

    const sidecarRel = `${id}${SIDECAR_SUFFIX}`;
    let meta: Sidecar = sidecarSchema.parse({});
    if (fileSet.has(sidecarRel)) {
      const parsed = sidecarSchema.safeParse(
        readYaml(path.join(assetsDir, sidecarRel), relOf(sidecarRel), problems) ?? {}
      );
      if (parsed.success) meta = parsed.data;
      else zodProblems(relOf(sidecarRel), parsed.error.issues, problems);
    }

    const buf = fs.readFileSync(path.join(assetsDir, rel));
    const sourceSha = sha256(buf);
    const ext = rel.split(".").pop()!.toLowerCase();
    const license = meta.source !== "original" ? licenses[meta.source] : undefined;
    const size = ext === "svg" ? svgSize(buf.toString("utf8")) : null;
    assets.set(id, {
      id,
      type,
      group: segments[0],
      file: relOf(rel),
      ext,
      bytes: buf.length,
      sha256: sourceSha,
      hash: contentHash(sourceSha),
      title: meta.title,
      alt: meta.alt,
      caption: meta.caption,
      tags: meta.tags,
      access: meta.access,
      source: meta.source,
      license: license && { key: meta.source, name: license.name, license: license.license, url: license.url },
      ...(size ?? {}),
      sidecar: fileSet.has(sidecarRel) ? relOf(sidecarRel) : null,
    });
  }
  return { assets, licenses, remote, problems };
}

// ── Pages and usage ──────────────────────────────────────────────────────────────────────────────

export interface PageInfo {
  /** Site path of the page. */
  href: string;
  /** Shown in this environment (its section is `on`, or it is not in a section). */
  visible: boolean;
  access: "free" | "premium";
}

export interface AssetRef {
  id: string;
  component: AssetRefComponent;
  /** Relative to apps/web. */
  file: string;
  line: number;
  page: PageInfo | null;
}

const REF_RE = new RegExp(`<(${Object.keys(ASSET_REF_COMPONENTS).join("|")})\\b([^>]*?)\\/?>`, "g");

/** Asset references in one MDX source. `<Figure caption>` without an id is not a reference. */
export function findRefs(text: string): { component: AssetRefComponent; id: string; index: number }[] {
  const out: { component: AssetRefComponent; id: string; index: number }[] = [];
  for (const m of text.matchAll(REF_RE)) {
    const component = m[1] as AssetRefComponent;
    for (const attr of ASSET_REF_COMPONENTS[component]) {
      const value = new RegExp(`\\s${attr}=(?:"([^"]+)"|'([^']+)'|\\{["']([^"']+)["']\\})`).exec(m[2]);
      if (value) {
        out.push({ component, id: resolveAssetRef(component, value[1] ?? value[2] ?? value[3]), index: m.index! });
        break;
      }
    }
  }
  return out;
}

/** Every asset reference in content/**\/*.mdx, with the page it is on. */
export function scanUsage(contentDir: string, pages: Map<string, PageInfo>, appDir: string): AssetRef[] {
  const refs: AssetRef[] = [];
  for (const rel of walkFiles(contentDir).filter((f) => f.endsWith(".mdx"))) {
    const abs = path.join(contentDir, rel);
    const text = fs.readFileSync(abs, "utf8");
    for (const r of findRefs(text)) {
      refs.push({
        id: r.id,
        component: r.component,
        file: path.relative(appDir, abs),
        line: text.slice(0, r.index).split("\n").length,
        page: pages.get(abs) ?? null,
      });
    }
  }
  return refs;
}

/** content/pages/<p>.mdx → its route (the site pages that render it). */
const SITE_PAGE_ROUTES: Record<string, string> = { "pricing-faq": "/pricing" };

/**
 * MDX file → page, from the section registry (docs sections, through their kind for `access`) and
 * content/pages. Pages of `off` sections are included with visible: false.
 */
export async function contentPages(contentDir: string): Promise<Map<string, PageInfo>> {
  const { allSections } = await import("../src/features/sections/registry");
  const { kindOf } = await import("../src/features/sections/kinds");
  const { loadDocItems } = await import("../src/features/docs/source");
  const pages = new Map<string, PageInfo>();
  for (const section of allSections()) {
    if (section.kind !== "docs") continue;
    const kind = kindOf(section);
    for (const item of loadDocItems(section)) {
      const access = kind.access?.(section, item) ?? "free";
      pages.set(item.file, { href: item.href, visible: section.state === "on", access });
    }
  }
  const pagesDir = path.join(contentDir, "pages");
  for (const rel of walkFiles(pagesDir).filter((f) => f.endsWith(".mdx"))) {
    const slug = rel.slice(0, -4);
    const file = path.join(pagesDir, rel);
    const access = matter(fs.readFileSync(file, "utf8")).data.access === "premium" ? "premium" : "free";
    pages.set(file, { href: SITE_PAGE_ROUTES[slug] ?? `/${slug}`, visible: true, access });
  }
  return pages;
}

/** Assets referenced from code rather than MDX: always considered used. */
export const CODE_REFS: { test: (a: IndexedAsset) => boolean; ref: string }[] = [
  { test: (a) => a.type === "logo", ref: "code:src/lib/company-logos.ts" },
];

/** usedBy for each asset: the pages that reference it (sorted, unique) plus code references. */
export function usedByOf(index: Map<string, IndexedAsset>, refs: AssetRef[]): Map<string, string[]> {
  const out = new Map<string, Set<string>>();
  for (const id of index.keys()) out.set(id, new Set());
  for (const r of refs) out.get(r.id)?.add(r.page?.href ?? r.file);
  for (const a of index.values()) for (const c of CODE_REFS) if (c.test(a)) out.get(a.id)!.add(c.ref);
  return new Map([...out].map(([id, s]) => [id, [...s].sort()]));
}

/**
 * Whether an asset's files may be written to public/ in this environment (plan §5.6 steps 5–6): never when
 * premium; otherwise when it's brand/og, tagged `shared`, or used by a page visible in this environment.
 */
export function isPublic(asset: Pick<IndexedAsset, "id" | "access" | "group" | "tags">, refs: AssetRef[]): boolean {
  if (asset.access === "premium") return false;
  if ((ALWAYS_PUBLIC_GROUPS as readonly string[]).includes(asset.group) || asset.tags.includes(SHARED_TAG)) return true;
  return refs.some((r) => r.id === asset.id && (r.page?.visible ?? true));
}

// ── Validation (content-check) ───────────────────────────────────────────────────────────────────

function sizeLimit(type: AssetType, ext: string) {
  if (type === "image") return SIZE_LIMITS.image;
  if (ext === "svg") return SIZE_LIMITS.svg;
  return SIZE_LIMITS.other;
}

const kb = (n: number) => `${Math.round(n / 1024)} KB`;

/** The asset rules of content-check (plan §5.6 "Validation"). */
export function checkAssets(index: AssetIndex, refs: AssetRef[]): Problem[] {
  const problems: Problem[] = [...index.problems];
  const { assets, licenses } = index;
  const remoteIds = new Set(index.remote.map((r) => r.id));
  const metaFile = (a: IndexedAsset) => a.sidecar ?? `${a.file.replace(/\.[^.]+$/, "")}${SIDECAR_SUFFIX}`;

  for (const a of assets.values()) {
    if (ALT_REQUIRED.includes(a.type) && a.group !== "og" && !a.alt) {
      problems.push({ file: metaFile(a), level: "error", message: `${a.id}: alt is required for ${a.type} assets` });
    }
    if (a.source !== "original" && !licenses[a.source]) {
      problems.push({
        file: metaFile(a),
        level: "error",
        message: `${a.id}: source "${a.source}" is not a key in assets/LICENSES.yaml`,
      });
    }
    if (a.group === "logos" && a.source === "original") {
      problems.push({
        file: metaFile(a),
        level: "error",
        message: `${a.id}: third-party logos need \`source: <LICENSES.yaml key>\` in a sidecar`,
      });
    }
    const limit = sizeLimit(a.type, a.ext);
    if (a.bytes > limit) {
      problems.push({
        file: a.file,
        level: "error",
        message: `${kb(a.bytes)} is over the ${kb(limit)} limit; shrink it or move it to assets/remote.yaml`,
      });
    }
  }

  // Duplicate files.
  const bySha = new Map<string, IndexedAsset[]>();
  for (const a of assets.values()) bySha.set(a.sha256, [...(bySha.get(a.sha256) ?? []), a]);
  for (const same of bySha.values()) {
    if (same.length > 1) {
      problems.push({
        file: same[1].file,
        level: "error",
        message: `same file as ${same[0].file}; keep one and reference it by ID (${same[0].id})`,
      });
    }
  }

  // References.
  for (const r of refs) {
    const a = assets.get(r.id);
    if (!a) {
      if (!remoteIds.has(r.id)) {
        problems.push({
          file: r.file,
          line: r.line,
          level: "error",
          message: `<${r.component}>: unknown asset ${r.id}`,
        });
      }
      continue;
    }
    const expected: Partial<Record<AssetRefComponent, AssetType[]>> = {
      Img: ["image", "svg", "icon"],
      Figure: ["image", "svg", "mermaid", "excalidraw", "animated"],
      Diagram: ["svg", "mermaid", "excalidraw", "animated"],
      Mermaid: ["mermaid"],
      AnimatedDiagram: ["animated"],
      CloudMapping: ["animated"],
      TechIcon: ["tech-icon"],
      Download: ["download"],
    };
    const ok = expected[r.component];
    if (ok && !ok.includes(a.type)) {
      problems.push({
        file: r.file,
        line: r.line,
        level: "error",
        message: `<${r.component}> can't show ${r.id} (a ${a.type} asset)`,
      });
    }
    if (a.access === "premium" && r.page?.access !== "premium") {
      problems.push({
        file: r.file,
        line: r.line,
        level: "error",
        message: `premium asset ${r.id} is used on a free page${r.page ? ` (${r.page.href})` : ""}`,
      });
    }
  }

  // Unused (warnings, so drafts can exist).
  const used = usedByOf(assets, refs);
  for (const a of assets.values()) {
    const always = (ALWAYS_PUBLIC_GROUPS as readonly string[]).includes(a.group) || a.tags.includes(SHARED_TAG);
    if (!always && used.get(a.id)!.length === 0) {
      problems.push({ file: a.file, level: "warning", message: `${a.id} is not used by any page` });
    }
  }
  return problems;
}

/**
 * ```mermaid fences that appear in two or more places (warnings): a reused diagram belongs in
 * assets/diagrams/mermaid/ and is referenced with <Mermaid ref="…" />.
 */
export function duplicateMermaidFences(contentDir: string, appDir: string): Problem[] {
  const seen = new Map<string, { file: string; line: number }[]>();
  for (const rel of walkFiles(contentDir).filter((f) => f.endsWith(".mdx"))) {
    const abs = path.join(contentDir, rel);
    const text = fs.readFileSync(abs, "utf8");
    for (const m of text.matchAll(/^([ \t]*)```mermaid[^\n]*\n([\s\S]*?)^\1```/gm)) {
      const key = sha256(m[2].replace(/\s+/g, " ").trim());
      const at = { file: path.relative(appDir, abs), line: text.slice(0, m.index).split("\n").length };
      seen.set(key, [...(seen.get(key) ?? []), at]);
    }
  }
  const problems: Problem[] = [];
  for (const places of seen.values()) {
    if (places.length < 2) continue;
    for (const p of places.slice(1)) {
      problems.push({
        ...p,
        level: "warning",
        message: `Mermaid diagram also in ${places[0].file}:${places[0].line}; move it to assets/diagrams/mermaid/ and use <Mermaid ref>`,
      });
    }
  }
  return problems;
}

// ── Publish ──────────────────────────────────────────────────────────────────────────────────────

/** A file rendered into an asset's cache folder (.build-cache/assets/<hash>/<name>). */
export type RenderedFile = AssetVariant & { name: string };

/** What rendering produced for one asset. */
export interface Rendered {
  files: RenderedFile[];
  width?: number;
  height?: number;
  placeholder?: string;
}

/** Files that become URLs when published. Inline SVGs are drawn into the page and never get a URL. */
const isPublishable = (f: AssetVariant) => f.format !== "svg";

function copy(from: string, to: string) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

/**
 * Copies rendered files out of the cache and builds the manifest (plan §5.6 steps 5–6). Premium assets go
 * only to `privateDir/<id>/` (for the future R2 upload); free assets that are public in this environment go
 * to `publicDir/<hash>/` and get a URL; everything else stays in the cache. Both output folders are emptied
 * first, so nothing from an earlier run or another environment lingers.
 */
export function publishAssets(opts: {
  env: string;
  assets: IndexedAsset[];
  rendered: Map<string, Rendered>;
  refs: AssetRef[];
  cacheDir: string;
  publicDir: string;
  privateDir: string;
}): { manifest: AssetManifest; publicFiles: number; privateFiles: number } {
  const { env, assets, rendered, refs, cacheDir, publicDir, privateDir } = opts;
  fs.rmSync(publicDir, { recursive: true, force: true });
  fs.rmSync(privateDir, { recursive: true, force: true });
  const index = new Map(assets.map((a) => [a.id, a]));
  const usedBy = usedByOf(index, refs);
  const manifest: AssetManifest = { version: 1, env, assets: {} };
  let publicFiles = 0;
  let privateFiles = 0;
  for (const a of assets) {
    const r = rendered.get(a.id) ?? { files: [] };
    const pub = isPublic(a, refs);
    const variants = r.files.map(({ name, ...v }): AssetVariant => {
      const from = path.join(cacheDir, a.hash, name);
      if (a.access === "premium") {
        copy(from, path.join(privateDir, a.id, name));
        privateFiles++;
        return v;
      }
      if (pub && isPublishable(v)) {
        copy(from, path.join(publicDir, a.hash, name));
        publicFiles++;
        return { ...v, url: `/_a/${a.hash}/${name}` };
      }
      return v;
    });
    const { sidecar: _sidecar, ...meta } = a;
    void _sidecar;
    manifest.assets[a.id] = {
      ...meta,
      ...(r.width && r.height ? { width: r.width, height: r.height } : {}),
      ...(r.placeholder ? { placeholder: r.placeholder } : {}),
      variants,
      usedBy: usedBy.get(a.id) ?? [],
      public: pub,
    };
  }
  return { manifest, publicFiles, privateFiles };
}

/** Throws if `publicDir` (public/_a) holds anything that isn't a file of a public, free asset in the manifest. */
export function assertNoLeaks(manifest: AssetManifest, publicDir: string) {
  if (!fs.existsSync(publicDir)) return;
  const allowed = new Map(
    Object.values(manifest.assets)
      .filter((a) => a.public && a.access === "free")
      .map((a) => [a.hash, new Set(a.variants.flatMap((v) => (v.url ? [path.basename(v.url)] : [])))])
  );
  for (const dir of fs.readdirSync(publicDir)) {
    const names = allowed.get(dir);
    const full = path.join(publicDir, dir);
    const files = fs.statSync(full).isDirectory() ? fs.readdirSync(full) : [""];
    for (const f of files) {
      if (!names?.has(f))
        throw new Error(`public/_a/${dir}${f ? `/${f}` : ""} is not a public free asset; refusing to continue`);
    }
  }
}

// ── SVG ──────────────────────────────────────────────────────────────────────────────────────────

const GEOMETRY_ATTRS =
  /(\s(?:d|transform|x|y|x1|y1|x2|y2|cx|cy|r|rx|ry|width|height|viewBox|points|offset|stroke-width|stroke-dasharray)=")([^"]*)"/g;

/**
 * Optimises an SVG asset: SVGO for structure (metadata, comments, editor data, empty groups), with every
 * plugin that rewrites numbers or path data turned off, then the tokenizing number rounding from
 * render-mermaid.svg.mjs (which never merges adjacent numbers), then every id prefixed with `prefix` so
 * several inline SVGs on one page can't collide. viewBox is always kept.
 */
export function optimizeSvg(svg: string, prefix: string, decimals = 3): string {
  const { data } = svgo(svg, {
    multipass: false,
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            cleanupNumericValues: false,
            convertPathData: false,
            convertTransform: false,
            convertShapeToPath: false,
            mergePaths: false,
            cleanupIds: false,
            inlineStyles: false,
            minifyStyles: false,
          },
        },
      },
    ],
  });
  const rounded = data.replace(
    GEOMETRY_ATTRS,
    (_, attr: string, value: string) => `${attr}${roundNumbers(value, decimals)}"`
  );
  return uniquifyIds(rounded, prefix);
}

/** The root attributes and inner markup of an SVG. */
export function splitSvg(svg: string): { attrs: Record<string, string>; body: string } {
  const open = /<svg\b([^>]*)>/.exec(svg);
  if (!open) throw new Error("not an SVG");
  const attrs: Record<string, string> = {};
  for (const m of open[1].matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[m[1]] = m[2];
  const end = svg.lastIndexOf("</svg>");
  return { attrs, body: svg.slice(open.index + open[0].length, end).trim() };
}

// ── Generated code ───────────────────────────────────────────────────────────────────────────────

const GENERATED = "// GENERATED by scripts/build-assets.ts (`npm run assets`). Do not edit by hand.";

/** A string literal the way Prettier prints it: double quotes unless that needs more escapes than single. */
function quote(value: string) {
  const q = (value.match(/"/g) ?? []).length > (value.match(/'/g) ?? []).length ? "'" : '"';
  return `${q}${value.replace(/\\/g, "\\\\").replaceAll(q, `\\${q}`)}${q}`;
}
/** An object key the way Prettier prints it (quoteProps: as-needed). */
const key = (k: string) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : quote(k));

/** src/lib/company-logos.ts from assets/logos/companies/*.svg (already optimised), formatted as Prettier would. */
export function companyLogosModule(
  logos: { slug: string; svg: string; source: string }[],
  licenses: Record<string, LicenseEntry>
) {
  const sources = [...new Set(logos.map((l) => l.source))].sort().map((k) => {
    const l = licenses[k];
    return l ? `${l.name}${l.version ? ` ${l.version}` : ""} (${l.license})` : k;
  });
  const entries = [...logos]
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map(({ slug, svg }) => {
      const { attrs, body } = splitSvg(svg);
      return [
        `  ${key(slug)}: {`,
        `    viewBox: ${quote(attrs.viewBox ?? "0 0 24 24")},`,
        `    body: ${quote(body)},`,
        `    fill: ${attrs.fill ? quote(attrs.fill) : "null"},`,
        "  },",
      ].join("\n");
    });
  return `${GENERATED}
// Source: apps/web/assets/logos/companies/<slug>.svg, one file per company, from
// ${sources.join(" and ")}.
// Licences and the trademark notice: apps/web/assets/LICENSES.yaml. Companies without a logo render as a monogram.

export interface CompanyLogo {
  viewBox: string;
  body: string;
  /** Fill for single-colour marks; null when the paths carry their own colours. */
  fill: string | null;
}

export const COMPANY_LOGOS: Record<string, CompanyLogo> = {
${entries.join("\n")}
};
`;
}

/** src/components/diagrams/animated-specs.ts: every animated diagram spec by asset ID. */
export function animatedSpecsModule(ids: string[]) {
  const sorted = [...ids].sort();
  const imports = sorted.map((id, i) => `import s${i} from "../../../assets/${id}";`).join("\n");
  const map = sorted.map((id, i) => `  ${JSON.stringify(id)}: s${i},`).join("\n");
  return `${GENERATED}
// Every AnimatedDiagram spec in apps/web/assets/diagrams/animated/, keyed by asset ID. Server-only by use:
// the Diagram wrapper looks a spec up here and passes just that spec to the client component.
import type { DiagramSpec } from "./types";
${imports}

export const ANIMATED_SPECS: Record<string, DiagramSpec> = {
${map}
};
`;
}

/** Prefix for the ids inside a company logo, so logos can sit next to each other and to diagrams. */
export const logoPrefix = (id: string) => `logo-${id.split("/").pop()}`;

/**
 * The generated source files (src/lib/company-logos.ts, src/components/diagrams/animated-specs.ts) for the
 * current library. build-assets writes them; content-check fails when the committed copies are stale.
 */
export function generatedModules(index: AssetIndex, appDir: string): { file: string; content: string }[] {
  const all = [...index.assets.values()];
  const logos = all
    .filter((a) => a.type === "logo")
    .map((a) => ({
      slug: a.id.split("/").pop()!,
      svg: optimizeSvg(fs.readFileSync(path.join(appDir, a.file), "utf8"), logoPrefix(a.id)),
      source: a.source,
    }));
  return [
    { file: "src/lib/company-logos.ts", content: companyLogosModule(logos, index.licenses) },
    {
      file: "src/components/diagrams/animated-specs.ts",
      content: animatedSpecsModule(all.filter((a) => a.type === "animated").map((a) => a.id)),
    },
  ];
}

/** The MDX (or code) that shows an asset, for asset:find and the future admin asset browser. */
export function snippetFor(a: Pick<AssetEntry, "id" | "type">): string {
  const rest = (prefix: string) => a.id.slice(prefix.length);
  switch (a.type) {
    case "mermaid":
      return `<Mermaid ref="${rest("diagrams/mermaid/")}" />`;
    case "animated":
      return `<AnimatedDiagram spec="${rest("diagrams/")}" stepper />`;
    case "excalidraw":
      return `<Diagram id="${rest("diagrams/")}" />`;
    case "tech-icon":
      return `<TechIcon id="${rest("logos/tech/")}" />`;
    case "download":
      return `<Download id="${a.id}" />`;
    case "logo":
      return `<CompanyLogo company={{ slug: "${rest("logos/companies/")}", name: "…" }} />  (src/components/company-logo.tsx)`;
    default:
      return a.id.startsWith("diagrams/") ? `<Figure id="${a.id}" />` : `<Img id="${a.id}" />`;
  }
}
