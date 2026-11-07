// Rendering for scripts/build-assets.ts: raster images with sharp, Mermaid and Excalidraw diagrams in
// headless Chromium (the same approach as scripts/render-mermaid.mjs, sharing its theme, cache and SVG
// post-processing). Everything is written into a per-asset cache folder; build-assets copies from there.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import sharp from "sharp";
import type { Browser, Page } from "playwright";
import { IMAGE_WIDTHS } from "../src/lib/asset-schema";
import type { RenderedFile } from "./build-assets.lib";
import { mermaidConfig, prepareSource } from "../src/lib/mermaid-theme.mjs";
import { optimize as optimizeMermaid, uniquifyIds } from "./render-mermaid.svg.mjs";

const require = createRequire(import.meta.url);

/** Background behind PNG variants (for email and social, where transparency reads badly). Matches --paper. */
export const PNG_BACKGROUND = { light: "#faf9f6", dark: "#141413" } as const;

// ── Raster images ────────────────────────────────────────────────────────────────────────────────

/**
 * AVIF + WebP at IMAGE_WIDTHS (never upscaled; an image narrower than the smallest width gets one
 * rendition at its own width), plus a tiny blurred WebP placeholder as a data: URL.
 */
export async function renderImage(source: Buffer, outDir: string, slug: string) {
  const meta = await sharp(source).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error("could not read the image size");
  const widths = [...new Set(IMAGE_WIDTHS.map((w) => Math.min(w, width)))];
  const files: RenderedFile[] = [];
  for (const w of widths) {
    const h = Math.round((height * w) / width);
    const base = sharp(source).rotate().resize({ width: w });
    for (const format of ["avif", "webp"] as const) {
      const name = `${slug}-${w}.${format}`;
      const out = format === "avif" ? base.clone().avif({ quality: 55, effort: 4 }) : base.clone().webp({ quality: 78 });
      const buf = await out.toBuffer();
      fs.writeFileSync(path.join(outDir, name), buf);
      files.push({ name, format, width: w, height: h, bytes: buf.length });
    }
  }
  const tiny = await sharp(source).rotate().resize({ width: 16 }).blur(1).webp({ quality: 40 }).toBuffer();
  return { width, height, files, placeholder: `data:image/webp;base64,${tiny.toString("base64")}` };
}

/** PNG of a static SVG at 2× its intrinsic width (capped at 2400 px), on the page background. */
export async function svgToPng(svg: string, width: number, outFile: string, background: string) {
  const target = Math.min(Math.round(width * 2), 2400);
  const buf = await sharp(Buffer.from(svg), { density: 192 })
    .resize({ width: target })
    .flatten({ background })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(outFile, buf);
  const meta = await sharp(buf).metadata();
  return { bytes: buf.length, width: meta.width, height: meta.height };
}

// ── Headless Chromium ────────────────────────────────────────────────────────────────────────────

const ORIGIN = "http://assets.build.local";

/** One Chromium page for all diagram renders in a run, started only when something needs rendering. */
export class DiagramRenderer {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private mermaidReady = false;
  private excalidrawReady = false;
  private errors: string[] = [];

  private async open(): Promise<Page> {
    if (this.page) return this.page;
    const { chromium } = await import("playwright");
    try {
      this.browser = await chromium.launch();
    } catch (err) {
      throw new Error(`could not start Chromium. Run \`npx playwright install chromium\` first.\n${(err as Error).message}`);
    }
    this.page = await this.browser.newPage({ deviceScaleFactor: 2 });
    // Nothing leaves the machine: the page and its scripts are served from memory, every other request fails.
    await this.page.route("**/*", (route) => {
      const url = route.request().url();
      if (url === `${ORIGIN}/`) return route.fulfill({ contentType: "text/html", body: this.html() });
      if (url === `${ORIGIN}/excalidraw.js`)
        return route.fulfill({ contentType: "text/javascript", path: require.resolve("@excalidraw/utils") });
      return route.abort();
    });
    this.page.on("console", (m) => {
      // @excalidraw/utils logs this when font subsetting falls back to the main thread; harmless.
      if (m.type() === "error" && !m.text().includes("Worker has to be in a separate chunk")) this.errors.push(m.text());
    });
    await this.page.goto(`${ORIGIN}/`);
    await this.page.evaluate(() => document.fonts.ready);
    return this.page;
  }

  private html() {
    // Diagrams are measured with the font the site shows them in (Inter), as in render-mermaid.mjs.
    const font = fs.readFileSync(require.resolve("@fontsource-variable/inter/files/inter-latin-wght-normal.woff2"));
    return `<!doctype html><html><head><style>
      @font-face { font-family: "Inter Variable"; font-weight: 100 900; src: url(data:font/woff2;base64,${font.toString("base64")}) format("woff2"); }
      :root { --font-inter: "Inter Variable"; }
      body { margin: 0; font-family: var(--font-inter); }
      #shot { display: inline-block; padding: 24px; }
      #shot svg { display: block; }
    </style></head><body><span style="font-weight:400">Aa</span><span style="font-weight:500">Aa</span><span style="font-weight:600">Aa</span><div id="shot"></div></body></html>`;
  }

  /** Light and dark SVG for each Mermaid chart, through the same config and post-processing as the fences. */
  async mermaid(jobs: { key: string; chart: string }[]): Promise<Map<string, { light: string; dark: string } | { error: string }>> {
    const page = await this.open();
    if (!this.mermaidReady) {
      await page.addScriptTag({ path: require.resolve("mermaid/dist/mermaid.min.js") });
      this.mermaidReady = true;
    }
    const out = new Map<string, { light: string; dark: string } | { error: string }>();
    const svgs: Record<string, Partial<Record<"light" | "dark", string>>> = {};
    for (const mode of ["light", "dark"] as const) {
      const results = await page.evaluate(
        async ({ config, jobs }) => {
          const mermaid = (window as unknown as { mermaid: { initialize(c: unknown): void; render(id: string, s: string): Promise<{ svg: string }> } }).mermaid;
          mermaid.initialize(config);
          const res: { svg?: string; error?: string }[] = [];
          for (const job of jobs) {
            try {
              res.push({ svg: (await mermaid.render(job.id, job.source)).svg });
            } catch (err) {
              res.push({ error: String((err as Error)?.message ?? err) });
            }
            document.getElementById(job.id)?.remove();
            document.getElementById(`d${job.id}`)?.remove();
          }
          return res;
        },
        {
          config: mermaidConfig(mode),
          jobs: jobs.map((j) => ({ id: `mmd-${j.key}-${mode[0]}`, source: prepareSource(j.chart, mode) })),
        }
      );
      results.forEach((r, i) => {
        const job = jobs[i];
        if (r.error) out.set(job.key, { error: r.error.split("\n").slice(0, 4).join(" ") });
        else {
          const rootId = `mmd-${job.key}-${mode[0]}`;
          (svgs[job.key] ??= {})[mode] = optimizeMermaid(uniquifyIds(r.svg!, rootId), rootId);
        }
      });
    }
    for (const job of jobs) {
      const s = svgs[job.key];
      if (!out.has(job.key) && s?.light && s.dark) out.set(job.key, { light: s.light, dark: s.dark });
    }
    return out;
  }

  /** Light and dark SVG and PNG of an Excalidraw scene, exported by @excalidraw/utils. */
  async excalidraw(scene: unknown) {
    const page = await this.open();
    if (!this.excalidrawReady) {
      await page.evaluate(async (url) => {
        (window as unknown as { excalidraw: unknown }).excalidraw = await import(url);
      }, `${ORIGIN}/excalidraw.js`);
      this.excalidrawReady = true;
    }
    return page.evaluate(async (scene) => {
      type Exporter = { exportScene(o: unknown): Promise<SVGSVGElement | Blob> };
      const { exportScene } = (window as unknown as { excalidraw: Exporter }).excalidraw;
      const s = scene as { elements: unknown[]; appState?: Record<string, unknown>; files?: unknown };
      const data = { elements: s.elements, appState: { viewBackgroundColor: "#ffffff", ...(s.appState ?? {}) }, files: s.files ?? {} };
      const out: Record<string, string> = {};
      for (const theme of ["light", "dark"]) {
        const svg = (await exportScene({ data, type: "svg", config: { theme, canvasBackgroundColor: false } })) as SVGSVGElement;
        out[`${theme}Svg`] = svg.outerHTML;
        const png = (await exportScene({ data, type: "png", config: { theme, scale: 2 } })) as Blob;
        const bytes = new Uint8Array(await png.arrayBuffer());
        let bin = "";
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        out[`${theme}Png`] = btoa(bin);
      }
      return out as { lightSvg: string; darkSvg: string; lightPng: string; darkPng: string };
    }, scene);
  }

  /**
   * PNG of an SVG as Chromium draws it (Mermaid labels are HTML in <foreignObject>, which sharp can't
   * render), at 2× on the page background. Also fails on any console error, like render-mermaid.mjs.
   */
  async png(svg: string, background: string, outFile: string) {
    const page = await this.open();
    this.errors = [];
    await page.evaluate(
      ({ svg, background }) => {
        const shot = document.getElementById("shot")!;
        shot.style.background = background;
        shot.innerHTML = svg;
      },
      { svg, background }
    );
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
    if (this.errors.length) throw new Error(`SVG is invalid: ${this.errors[0].slice(0, 160)}`);
    const buf = await page.locator("#shot").screenshot({ type: "png" });
    fs.writeFileSync(outFile, buf);
    const meta = await sharp(buf).metadata();
    return { bytes: buf.length, width: meta.width, height: meta.height };
  }

  async close() {
    await this.browser?.close();
    this.browser = null;
    this.page = null;
  }
}

/** Version of @excalidraw/utils, part of an Excalidraw asset's content hash. */
export function excalidrawVersion(): string {
  try {
    const pkg = path.join(path.dirname(require.resolve("@excalidraw/utils")), "../../package.json");
    return JSON.parse(fs.readFileSync(pkg, "utf8")).version;
  } catch {
    return "unknown";
  }
}
