#!/usr/bin/env node
// Renders every ```mermaid fence in content/**/*.mdx to inline SVG, once in the light and once in the
// dark palette, using headless Chromium (Playwright) and the same Mermaid config as the site.
//
// Results go to .build-cache/mermaid/<hash>.json, keyed by a hash of the diagram source, the theme version and
// the Mermaid version, so unchanged diagrams are never re-rendered. The rehype plugin
// (src/lib/rehype-mermaid-svg.ts) swaps each fence for its cached SVG while the MDX is compiled, so no
// Mermaid code ships to the browser.
//
// Runs automatically before `npm run build` (prebuild). Run `npm run mermaid` by hand after editing
// diagrams in `next dev` to see the production rendering instead of the client-side fallback.
// A diagram with a syntax error fails the run with its file and line.
//
//   node scripts/render-mermaid.mjs            render missing diagrams
//   node scripts/render-mermaid.mjs --force    re-render everything
//   node scripts/render-mermaid.mjs --prune    also delete cache entries no article uses
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { serialize } from "next-mdx-remote/serialize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { mermaidConfig, prepareSource } from "../src/lib/mermaid-theme.mjs";
import { CACHE_DIR, diagramHash, readDiagram, writeDiagram } from "../src/lib/mermaid-cache.mjs";

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(APP_DIR);
const require = createRequire(import.meta.url);
const args = new Set(process.argv.slice(2));

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : e.name.endsWith(".mdx") ? [p] : [];
  });
}

function textOf(node) {
  if (node.type === "text") return node.value;
  return (node.children ?? []).map(textOf).join("");
}

// Finds mermaid fences the way the site's MDX pipeline sees them (same remark plugins), so the text
// hashed here is exactly the text the rehype plugin hashes.
async function collect(file) {
  const raw = fs.readFileSync(file, "utf8");
  const { content } = matter(raw);
  const lineOffset = raw.split("\n").length - content.split("\n").length;
  const found = [];
  const collector = () => (tree) => {
    const visit = (node) => {
      if (node.type === "element" && node.tagName === "pre") {
        const code = node.children?.find((c) => c.type === "element" && c.tagName === "code");
        const cls = code?.properties?.className;
        if (Array.isArray(cls) && cls.includes("language-mermaid")) {
          found.push({ chart: textOf(code), line: (node.position?.start.line ?? 0) + lineOffset });
          return;
        }
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
  await serialize(content, {
    parseFrontmatter: false,
    mdxOptions: { remarkPlugins: [remarkGfm, remarkMath], rehypePlugins: [collector] },
  });
  return found.map((d) => ({ ...d, file: path.relative(APP_DIR, file) }));
}

// Mermaid ids sub-elements (markers, gradients) without the diagram id in some diagram types. The light
// and dark copies sit in the same page, so give every id the diagram's own prefix to keep them unique.
function uniquifyIds(svg, prefix) {
  const ids = new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).filter((id) => !id.startsWith(prefix)));
  let out = svg;
  for (const id of ids) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out
      .replace(new RegExp(`(\\sid=")${esc}"`, "g"), `$1${prefix}-${id}"`)
      .replace(new RegExp(`url\\(#${esc}\\)`, "g"), `url(#${prefix}-${id})`)
      .replace(new RegExp(`((?:xlink:)?href=")#${esc}"`, "g"), `$1#${prefix}-${id}"`);
  }
  return out;
}

// Interaction-only data (data-points, data-id, ...), unused marker definitions, ids nothing points at and
// sub-pixel precision add ~30% to each SVG without changing how it looks.
const GEOMETRY_ATTRS = /(\s(?:d|transform|x|y|x1|y1|x2|y2|cx|cy|r|rx|ry|width|height|viewBox|points|refX|refY)=")([^"]*)"/g;
function optimize(svg, rootId) {
  let out = svg.replace(/\sdata-[\w-]+="[^"]*"/g, "");
  const referenced = () => new Set([...out.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map((m) => m[1] ?? m[2]));
  let refs = referenced();
  out = out.replace(/<marker\b[^>]*\sid="([^"]+)"[\s\S]*?<\/marker>/g, (m, id) => (refs.has(id) ? m : ""));
  refs = referenced();
  out = out.replace(/\sid="([^"]+)"/g, (m, id) => (id === rootId || refs.has(id) ? m : ""));
  out = out.replace(GEOMETRY_ATTRS, (_, attr, value) =>
    `${attr}${value.replace(/-?\d*\.\d{3,}/g, (n) => String(Math.round(Number(n) * 100) / 100))}"`,
  );
  return out;
}

async function main() {
  const files = walk(path.join(APP_DIR, "content"));
  const diagrams = [];
  const failures = [];
  for (const file of files) {
    try {
      diagrams.push(...(await collect(file)));
    } catch (err) {
      failures.push(`${path.relative(APP_DIR, file)}: MDX failed to compile: ${err.message}`);
    }
  }
  for (const d of diagrams) d.hash = diagramHash(d.chart);

  const todo = new Map();
  for (const d of diagrams) if (args.has("--force") || !readDiagram(d.hash)) todo.set(d.hash, d);
  console.log(`mermaid: ${diagrams.length} diagrams in ${files.length} files, ${todo.size} to render`);

  if (todo.size > 0) {
    const { chromium } = await import("playwright");
    let browser;
    try {
      browser = await chromium.launch();
    } catch (err) {
      console.error(`mermaid: could not start Chromium. Run \`npx playwright install chromium\` first.\n${err.message}`);
      process.exit(1);
    }
    const page = await browser.newPage();
    // Diagrams are measured with the font the site shows them in (Inter), so labels fit.
    const font = fs.readFileSync(require.resolve("@fontsource-variable/inter/files/inter-latin-wght-normal.woff2"));
    await page.setContent(`<!doctype html><html><head><style>
      @font-face { font-family: "Inter Variable"; font-weight: 100 900; src: url(data:font/woff2;base64,${font.toString("base64")}) format("woff2"); }
      :root { --font-inter: "Inter Variable"; }
      body { font-family: var(--font-inter); }
    </style></head><body><span style="font-weight:400">Aa</span><span style="font-weight:500">Aa</span><span style="font-weight:600">Aa</span></body></html>`);
    await page.addScriptTag({ path: require.resolve("mermaid/dist/mermaid.min.js") });
    await page.evaluate(() => document.fonts.ready);

    const jobs = [...todo.values()];
    for (const mode of ["light", "dark"]) {
      const results = await page.evaluate(
        async ({ config, jobs }) => {
          const mermaid = window.mermaid;
          mermaid.initialize(config);
          const out = [];
          for (const job of jobs) {
            try {
              const { svg } = await mermaid.render(job.id, job.source);
              out.push({ svg });
            } catch (err) {
              out.push({ error: String(err?.message ?? err) });
            }
            document.getElementById(job.id)?.remove();
            document.getElementById(`d${job.id}`)?.remove();
          }
          return out;
        },
        {
          config: mermaidConfig(mode),
          jobs: jobs.map((j) => ({ id: `mmd-${j.hash}-${mode[0]}`, source: prepareSource(j.chart, mode) })),
        },
      );
      results.forEach((r, i) => {
        const job = jobs[i];
        if (r.error) {
          if (mode === "light") failures.push(`${job.file}:${job.line}: Mermaid error: ${r.error.split("\n").slice(0, 4).join(" ")}`);
          job.failed = true;
        } else {
          const rootId = `mmd-${job.hash}-${mode[0]}`;
          job[mode] = optimize(uniquifyIds(r.svg, rootId), rootId);
        }
      });
    }
    await browser.close();
    for (const job of jobs) if (!job.failed) writeDiagram(job.hash, { light: job.light, dark: job.dark });
  }

  if (args.has("--prune")) {
    const used = new Set(diagrams.map((d) => `${d.hash}.json`));
    const dir = path.join(APP_DIR, CACHE_DIR);
    const stale = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json") && !used.has(f)) : [];
    for (const f of stale) fs.rmSync(path.join(dir, f));
    console.log(`mermaid: pruned ${stale.length} unused cache entries`);
  }

  if (failures.length) {
    console.error(`\nmermaid: ${failures.length} diagram(s) failed:\n${failures.map((f) => `  ${f}`).join("\n")}`);
    process.exit(1);
  }
  console.log("mermaid: done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
