// The asset library build (plan §5.6). Runs before `next build` (prebuild) and by hand:
//
//   npm run assets                      build: index, render, write the manifest and public output
//   npm run asset:new -- <id> [--from <file>]   scaffold an asset and its sidecar
//   npm run asset:find -- <query>       search assets by ID, title, tag, alt or type
//
// Build steps:
//   1. Index apps/web/assets/ (sidecars validated with zod), scan content/**/*.mdx for references, and run
//      the content-check asset rules; any error stops the build.
//   2. Render each asset into .build-cache/assets/<hash>/ (skipped when already there): raster → AVIF + WebP
//      at 480/960/1600 + a blur placeholder (sharp); SVG → SVGO + safe number rounding + prefixed ids;
//      Mermaid (.mmd) → light/dark SVG through the build-time Mermaid pipeline and cache; Excalidraw →
//      light/dark SVG and PNG (headless Chromium, @excalidraw/utils); PNG variants for email and social.
//   3. Publish per environment (APP_ENV, through the section registry): files of free assets used by a
//      visible page, or in brand/ or og/, or tagged `shared`, go to public/_a/<hash>/. Premium assets are
//      never written to public/; they go to .build/private-assets/<id>/ for the future R2 upload.
//   4. Write src/generated/asset-manifest.json and regenerate src/lib/company-logos.ts and
//      src/components/diagrams/animated-specs.ts.
//   5. Check public/_a holds nothing premium or unlisted.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ASSET_TYPES, assetSlug, assetTypeOf, isKebab } from "../src/lib/asset-schema";
import {
  SIDECAR_SUFFIX,
  assertNoLeaks,
  checkAssets,
  contentPages,
  generatedModules,
  indexAssets,
  logoPrefix,
  optimizeSvg,
  publishAssets,
  scanUsage,
  sha256,
  snippetFor,
  svgSize,
  usedByOf,
  type IndexedAsset,
  type Problem,
  type Rendered,
  type RenderedFile,
} from "./build-assets.lib";
import { DiagramRenderer, PNG_BACKGROUND, excalidrawVersion, renderImage, svgToPng } from "./build-assets.render";
import { stepCount, svgAtStep, svgComplete } from "../src/lib/svg-steps";

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(APP_DIR);

const ASSETS_DIR = path.join(APP_DIR, "assets");
const CONTENT_DIR = path.join(APP_DIR, "content");
const CACHE_DIR = path.join(APP_DIR, ".build-cache", "assets");
const PUBLIC_DIR = path.join(APP_DIR, "public", "_a");
const PRIVATE_DIR = path.join(APP_DIR, ".build", "private-assets");
const MANIFEST_FILE = path.join(APP_DIR, "src", "generated", "asset-manifest.json");

// `npm run build` builds for production unless APP_ENV says otherwise (as `next build` does), so the
// prebuild step must publish production's assets too.
if (
  !process.env.APP_ENV &&
  !process.env.NODE_ENV &&
  ["prebuild", "build"].includes(process.env.npm_lifecycle_event ?? "")
) {
  Object.assign(process.env, { NODE_ENV: "production" });
}

const rel = (p: string) => path.relative(APP_DIR, p);

function printProblems(problems: Problem[]) {
  for (const p of problems) console.log(`${p.file}${p.line ? `:${p.line}` : ""}: ${p.level}: ${p.message}`);
}

// ── build ────────────────────────────────────────────────────────────────────────────────────────

async function build() {
  const { resolveAppEnv } = await import("../src/features/sections/registry");
  const env = resolveAppEnv();
  const index = indexAssets(ASSETS_DIR, APP_DIR);
  const pages = await contentPages(CONTENT_DIR);
  const refs = scanUsage(CONTENT_DIR, pages, APP_DIR);
  const problems = checkAssets(index, refs);
  const errors = problems.filter((p) => p.level === "error");
  printProblems(errors);
  if (errors.length) {
    console.error(`assets: ${errors.length} error(s); fix them (npm run content-check lists warnings too)`);
    process.exit(1);
  }

  const { diagramHash, readDiagram, writeDiagram, ensureBuildCache } = await import("../src/lib/mermaid-cache.mjs");
  ensureBuildCache();
  const assets = [...index.assets.values()];
  const source = (a: IndexedAsset) => fs.readFileSync(path.join(APP_DIR, a.file));

  // Diagrams also depend on the renderer, so it is part of their content hash.
  const exVersion = excalidrawVersion();
  for (const a of assets) {
    if (a.type === "mermaid") a.hash = sha256(`${a.hash}\0${diagramHash(source(a).toString("utf8"))}`).slice(0, 12);
    if (a.type === "excalidraw") a.hash = sha256(`${a.hash}\0excalidraw@${exVersion}`).slice(0, 12);
  }

  const renderer = new DiagramRenderer();
  const rendered = new Map<string, Rendered>();
  let renderedCount = 0;
  try {
    // Mermaid charts missing from the shared cache are rendered in one batch.
    const charts = assets.filter((a) => a.type === "mermaid").map((a) => ({ a, chart: source(a).toString("utf8") }));
    const missing = charts.filter(({ chart }) => !readDiagram(diagramHash(chart)));
    if (missing.length) {
      const results = await renderer.mermaid(missing.map(({ chart }) => ({ key: diagramHash(chart), chart })));
      const failed: string[] = [];
      for (const { a, chart } of missing) {
        const r = results.get(diagramHash(chart));
        if (!r || "error" in r) failed.push(`${a.file}: Mermaid error: ${r && "error" in r ? r.error : "no output"}`);
        else writeDiagram(diagramHash(chart), r);
      }
      if (failed.length) throw new Error(failed.join("\n"));
    }

    for (const a of assets) {
      const dir = path.join(CACHE_DIR, a.hash);
      const done = path.join(dir, "rendered.json");
      if (fs.existsSync(done)) {
        rendered.set(a.id, JSON.parse(fs.readFileSync(done, "utf8")));
        continue;
      }
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      const r = await renderAsset(a, dir, renderer, { readDiagram, diagramHash });
      fs.writeFileSync(done, JSON.stringify(r));
      rendered.set(a.id, r);
      renderedCount++;
    }
  } finally {
    await renderer.close();
  }

  const { manifest, publicFiles, privateFiles } = publishAssets({
    env,
    assets,
    rendered,
    refs,
    cacheDir: CACHE_DIR,
    publicDir: PUBLIC_DIR,
    privateDir: PRIVATE_DIR,
  });
  fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true });
  fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`);

  for (const g of generatedModules(index, APP_DIR)) {
    const file = path.join(APP_DIR, g.file);
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== g.content) {
      fs.writeFileSync(file, g.content);
      console.log(`assets: wrote ${g.file}`);
    }
  }

  assertNoLeaks(manifest, PUBLIC_DIR);
  const premium = assets.filter((a) => a.access === "premium").length;
  console.log(
    `assets: ${assets.length} assets (${renderedCount} rendered, ${premium} premium) for ${env}; ` +
      `${publicFiles} public file(s) in public/_a, ${privateFiles} private file(s) in .build/private-assets; ` +
      `manifest ${rel(MANIFEST_FILE)}`
  );
}

async function renderAsset(
  a: IndexedAsset,
  dir: string,
  renderer: DiagramRenderer,
  mermaid: { readDiagram: (h: string) => { light: string; dark: string } | null; diagramHash: (c: string) => string }
): Promise<Rendered> {
  const src = fs.readFileSync(path.join(APP_DIR, a.file));
  const slug = assetSlug(a.id);
  const write = (name: string, data: string | Buffer) => {
    fs.writeFileSync(path.join(dir, name), data);
    return Buffer.byteLength(data);
  };
  const inline = (theme: "light" | "dark", svg: string): RenderedFile => {
    const size = svgSize(svg);
    return { name: `${theme}.svg`, format: "svg", theme, bytes: write(`${theme}.svg`, svg), ...(size ?? {}) };
  };

  switch (a.type) {
    case "image": {
      const img = await renderImage(src, dir, slug);
      return { files: img.files, width: img.width, height: img.height, placeholder: img.placeholder };
    }
    case "svg":
    case "icon":
    case "tech-icon":
    case "logo": {
      const prefix = a.type === "logo" ? logoPrefix(a.id) : `a${a.hash.slice(0, 8)}`;
      const svg = optimizeSvg(src.toString("utf8"), prefix);
      const files = [inline("light", svg)];
      const size = svgSize(svg);
      const steps = a.type === "svg" ? stepCount(svg) : 0;
      if (a.type === "svg" && size) {
        const name = `${slug}.png`;
        // A build-up figure's plain PNG is the complete figure: every step at full strength, with the last
        // step's caption (all the step-only captions would overlap).
        const full = svgComplete(svg);
        const png = await svgToPng(full, size.width, path.join(dir, name), PNG_BACKGROUND.light);
        files.push({ name, format: "png", theme: "light", bytes: png.bytes, width: png.width, height: png.height });
        // Build-up figures (newsletter): one PNG per step, for email and the LinkedIn carousel. Only SVGs with
        // data-step layers get them, so existing render caches stay valid without a PIPELINE_VERSION bump.
        for (let step = 1; step <= steps; step++) {
          const stepName = `${slug}-step-${step}.png`;
          const out = await svgToPng(svgAtStep(svg, step), size.width, path.join(dir, stepName), PNG_BACKGROUND.light);
          files.push({ name: stepName, format: "png", theme: "light", step, ...out });
        }
      }
      return { files, ...(size ?? {}), ...(steps ? { steps } : {}) };
    }
    case "mermaid": {
      const entry = mermaid.readDiagram(mermaid.diagramHash(src.toString("utf8")));
      if (!entry) throw new Error(`${a.file}: Mermaid render missing from the cache`);
      const files = [inline("light", entry.light), inline("dark", entry.dark)];
      for (const theme of ["light", "dark"] as const) {
        const name = `${slug}-${theme}.png`;
        const png = await renderer.png(entry[theme], PNG_BACKGROUND[theme], path.join(dir, name));
        files.push({ name, format: "png", theme, ...png });
      }
      return { files, ...(svgSize(entry.light) ?? {}) };
    }
    case "excalidraw": {
      let scene: { type?: string; elements?: unknown[] };
      try {
        scene = JSON.parse(src.toString("utf8"));
      } catch {
        throw new Error(`${a.file}: not valid JSON`);
      }
      if (scene.type !== "excalidraw" || !Array.isArray(scene.elements)) {
        throw new Error(`${a.file}: not an Excalidraw scene (expected "type": "excalidraw" and an elements array)`);
      }
      const out = await renderer.excalidraw(scene);
      const files = [
        inline("light", optimizeSvg(out.lightSvg, `a${a.hash.slice(0, 8)}l`)),
        inline("dark", optimizeSvg(out.darkSvg, `a${a.hash.slice(0, 8)}d`)),
      ];
      for (const theme of ["light", "dark"] as const) {
        const name = `${slug}-${theme}.png`;
        const buf = Buffer.from(theme === "light" ? out.lightPng : out.darkPng, "base64");
        files.push({ name, format: "png", theme, bytes: write(name, buf) });
      }
      return { files, ...(svgSize(out.lightSvg) ?? {}) };
    }
    case "download": {
      const name = `${slug}.${a.ext}`;
      return { files: [{ name, format: "file", bytes: write(name, src) }] };
    }
    case "animated":
      return { files: [] };
  }
}

// ── asset:new ────────────────────────────────────────────────────────────────────────────────────

const TEMPLATES: Partial<Record<string, { ext: string; body: string }>> = {
  mermaid: { ext: "mmd", body: "flowchart LR\n  A[Client] --> B[Service]\n" },
  excalidraw: {
    ext: "excalidraw",
    body: `${JSON.stringify({ type: "excalidraw", version: 2, source: "https://excalidraw.com", elements: [], appState: { viewBackgroundColor: "#ffffff" }, files: {} }, null, 2)}\n`,
  },
  animated: {
    ext: "ts",
    body: `import type { DiagramSpec } from "@/components/diagrams/types";

const spec: DiagramSpec = {
  title: "TODO",
  width: 960,
  height: 480,
  zones: [],
  nodes: [],
  edges: [],
};

export default spec;
`,
  },
};

function assetNew(args: string[]) {
  const id = args.find((a) => !a.startsWith("--"))?.replace(/\.[a-z]+$/, "");
  const fromIdx = args.indexOf("--from");
  const from = fromIdx >= 0 ? args[fromIdx + 1] : undefined;
  if (!id) {
    console.error(
      "usage: npm run asset:new -- <id> [--from <file>]\n  e.g. diagrams/mermaid/system-design/write-ahead-log"
    );
    process.exit(1);
  }
  const bad = id.split("/").find((s) => !isKebab(s));
  if (bad) throw new Error(`"${bad}" is not kebab-case`);
  const ext = from ? path.extname(from).slice(1).toLowerCase() : undefined;
  const probeExt = ext ?? Object.values(TEMPLATES).find((t) => assetTypeOf(`${id}.${t!.ext}`))?.ext;
  const type = probeExt ? assetTypeOf(`${id}.${probeExt}`) : null;
  if (!type || !probeExt) {
    throw new Error(
      `can't tell what ${id} is. Diagrams (mermaid, excalidraw, animated) are scaffolded; for other folders pass --from <file>.\n` +
        `Types: ${ASSET_TYPES.join(", ")}`
    );
  }
  const file = path.join(ASSETS_DIR, `${id}.${probeExt}`);
  if (fs.existsSync(file)) throw new Error(`${rel(file)} already exists`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (from) fs.copyFileSync(path.resolve(process.env.INIT_CWD ?? process.cwd(), from), file);
  else fs.writeFileSync(file, TEMPLATES[type]!.body);
  const sidecar = path.join(ASSETS_DIR, `${id}${SIDECAR_SUFFIX}`);
  const needsAlt = ["image", "svg", "mermaid", "excalidraw", "animated"].includes(type);
  fs.writeFileSync(
    sidecar,
    [
      `title: ${assetSlug(id).replaceAll("-", " ")}`,
      needsAlt ? "# alt: what the picture shows, for screen readers (required)" : null,
      "# caption: shown under <Figure> unless the page overrides it",
      "tags: []",
      "access: free # free | premium (premium is never written to public/)",
      type === "logo" || type === "tech-icon" ? "source: TODO # a key from assets/LICENSES.yaml" : "source: original",
      `created: ${new Date().toISOString().slice(0, 10)}`,
      "",
    ]
      .filter((l) => l !== null)
      .join("\n")
  );
  console.log(`created ${rel(file)}\ncreated ${rel(sidecar)}\nuse it with: ${snippetFor({ id, type })}`);
}

// ── asset:find ───────────────────────────────────────────────────────────────────────────────────

async function assetFind(args: string[]) {
  const words = args
    .filter((a) => !a.startsWith("--"))
    .join(" ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const index = indexAssets(ASSETS_DIR, APP_DIR);
  const refs = scanUsage(CONTENT_DIR, await contentPages(CONTENT_DIR), APP_DIR);
  const usedBy = usedByOf(index.assets, refs);
  const hits = [...index.assets.values()].filter((a) => {
    const text = [a.id, a.type, a.title, a.alt, a.caption, ...a.tags].join(" ").toLowerCase();
    return words.every((w) => text.includes(w));
  });
  for (const a of hits) {
    const used = usedBy.get(a.id) ?? [];
    console.log(
      `${a.id}  [${a.type}${a.access === "premium" ? ", premium" : ""}]${a.title ? `  ${a.title}` : ""}\n` +
        `  ${snippetFor(a)}\n` +
        (a.tags.length ? `  tags: ${a.tags.join(", ")}\n` : "") +
        `  used by: ${used.length ? used.slice(0, 5).join(", ") + (used.length > 5 ? ` (+${used.length - 5})` : "") : "nothing"}`
    );
  }
  console.log(`${hits.length} asset(s)${words.length ? ` matching "${words.join(" ")}"` : ""}`);
}

// ── main ─────────────────────────────────────────────────────────────────────────────────────────

const [command = "build", ...rest] = process.argv.slice(2);
try {
  if (command === "build") await build();
  else if (command === "new") assetNew(rest);
  else if (command === "find") await assetFind(rest);
  else throw new Error(`unknown command ${command}; use build, new or find`);
} catch (err) {
  console.error(`assets: ${(err as Error).message}`);
  process.exit(1);
}
