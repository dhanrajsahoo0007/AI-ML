// Rendering tests for scripts/build-assets.render.ts: sharp image conversion and the headless-Chromium
// Mermaid and Excalidraw exports. Run with `npm run test:scripts` (needs `npx playwright install chromium`).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

// The module under test is TypeScript with extensionless imports; ts-hooks.mjs teaches Node to load it.
await import("./ts-hooks.mjs");
const { DiagramRenderer, renderImage, svgToPng } = await import("./build-assets.render.ts");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "render-test-"));
const PNG_SIGNATURE = "89504e470d0a1a0a";

test("renderImage: AVIF + WebP per width, never upscaled, with a blur placeholder", async () => {
  const dir = tmp();
  const src = await sharp({ create: { width: 1200, height: 600, channels: 3, background: "#3366cc" } })
    .png()
    .toBuffer();
  const out = await renderImage(src, dir, "hero");
  assert.equal(out.width, 1200);
  assert.equal(out.height, 600);
  assert.deepEqual(
    out.files.map((f) => f.name),
    ["hero-480.avif", "hero-480.webp", "hero-960.avif", "hero-960.webp", "hero-1200.avif", "hero-1200.webp"]
  );
  for (const f of out.files) {
    assert.equal(f.height, f.width / 2);
    const meta = await sharp(path.join(dir, f.name)).metadata();
    assert.equal(meta.width, f.width);
    assert.equal(meta.format === "heif" ? "avif" : meta.format, f.format);
  }
  assert.match(out.placeholder, /^data:image\/webp;base64,/);
  assert.ok(out.placeholder.length < 400, "placeholder stays tiny");
  fs.rmSync(dir, { recursive: true });
});

test("renderImage: an image narrower than 480 px gets one rendition at its own width", async () => {
  const dir = tmp();
  const src = await sharp({ create: { width: 300, height: 100, channels: 4, background: "#fff0" } })
    .png()
    .toBuffer();
  const out = await renderImage(src, dir, "small");
  assert.deepEqual([...new Set(out.files.map((f) => f.width))], [300]);
  fs.rmSync(dir, { recursive: true });
});

test("svgToPng: 2x PNG on the given background", async () => {
  const dir = tmp();
  const file = path.join(dir, "x.png");
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="100" height="50"><rect width="50" height="50" fill="red"/></svg>';
  const r = await svgToPng(svg, 100, file, "#ffffff");
  assert.equal(r.width, 200);
  assert.equal(r.height, 100);
  assert.equal(fs.readFileSync(file).subarray(0, 8).toString("hex"), PNG_SIGNATURE);
  fs.rmSync(dir, { recursive: true });
});

const element = (over) => ({
  angle: 0,
  strokeColor: "#1e1e1e",
  backgroundColor: "transparent",
  fillStyle: "solid",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  opacity: 100,
  groupIds: [],
  frameId: null,
  roundness: null,
  seed: 1,
  version: 1,
  versionNonce: 1,
  isDeleted: false,
  boundElements: null,
  updated: 1,
  link: null,
  locked: false,
  ...over,
});

test("DiagramRenderer: Excalidraw and Mermaid to light/dark SVG and PNG", { timeout: 120_000 }, async () => {
  const renderer = new DiagramRenderer();
  const dir = tmp();
  try {
    const scene = {
      type: "excalidraw",
      version: 2,
      elements: [
        element({ id: "box", type: "rectangle", x: 0, y: 0, width: 200, height: 100, backgroundColor: "#a5d8ff" }),
        element({
          id: "label",
          type: "text",
          x: 20,
          y: 30,
          width: 120,
          height: 25,
          text: "Load balancer",
          originalText: "Load balancer",
          fontSize: 20,
          fontFamily: 5,
          textAlign: "left",
          verticalAlign: "top",
          containerId: null,
          autoResize: true,
          lineHeight: 1.25,
        }),
      ],
      appState: { viewBackgroundColor: "#ffffff" },
      files: {},
    };
    const ex = await renderer.excalidraw(scene);
    for (const svg of [ex.lightSvg, ex.darkSvg]) {
      assert.match(svg, /^<svg[^>]*viewBox="0 0 \d+ \d+"/);
      assert.match(svg, /Load balancer/);
    }
    assert.notEqual(ex.lightSvg, ex.darkSvg, "dark export differs from light");
    for (const png of [ex.lightPng, ex.darkPng])
      assert.equal(Buffer.from(png, "base64").subarray(0, 8).toString("hex"), PNG_SIGNATURE);

    const results = await renderer.mermaid([
      { key: "ok", chart: "flowchart LR\n  A[Client] --> B[Service]" },
      { key: "bad", chart: "flowchart LR\n  A[Client --> " },
    ]);
    const ok = results.get("ok");
    assert.ok(ok && "light" in ok, "valid chart renders");
    assert.match(ok.light, /<svg[^>]*id="mmd-ok-l"/);
    assert.match(ok.dark, /<svg[^>]*id="mmd-ok-d"/);
    assert.ok("error" in results.get("bad"), "syntax errors are reported, not thrown");

    const shot = await renderer.png(ok.light, "#faf9f6", path.join(dir, "m.png"));
    assert.ok(shot.width > 100 && shot.height > 20);
  } finally {
    await renderer.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
