import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertNoLeaks,
  checkAssets,
  contentHash,
  findRefs,
  generatedModules,
  indexAssets,
  isPublic,
  optimizeSvg,
  publishAssets,
  scanUsage,
  svgSize,
  usedByOf,
  type AssetRef,
  type PageInfo,
  type Rendered,
} from "../../../scripts/build-assets.lib";
import { assetTypeOf, resolveAssetRef } from "@/lib/asset-schema";

const APP = path.resolve(__dirname, "../../..");
const LICENSES = `mit-pack:
  name: Some pack
  url: https://example.com
  license: MIT
  usedFor: [tests]
  attributionRequired: true
  attribution: Icons from Some pack (MIT).
`;

const tmpDirs: string[] = [];
afterEach(() => {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

/** A throwaway app folder: { "assets/x.svg": "<svg…>", "content/s/a.mdx": "…" }. */
function fixture(files: Record<string, string | Buffer>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "assets-test-"));
  tmpDirs.push(dir);
  for (const [rel, body] of Object.entries({ "assets/LICENSES.yaml": LICENSES, ...files })) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  return dir;
}

const SVG = (body = '<path d="M0 0h10v10H0z"/>', attrs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"${attrs}>${body}</svg>`;
const page = (href: string, over: Partial<PageInfo> = {}): PageInfo => ({
  href,
  visible: true,
  access: "free",
  ...over,
});
const ref = (id: string, p: PageInfo | null, component: AssetRef["component"] = "Img"): AssetRef => ({
  id,
  component,
  file: "content/x.mdx",
  line: 1,
  page: p,
});
const messages = (problems: { level: string; message: string }[], level = "error") =>
  problems.filter((p) => p.level === level).map((p) => p.message);

describe("asset IDs", () => {
  it("resolves short references to full IDs", () => {
    expect(resolveAssetRef("Mermaid", "system-design/wal")).toBe("diagrams/mermaid/system-design/wal");
    expect(resolveAssetRef("Mermaid", "mermaid/system-design/wal")).toBe("diagrams/mermaid/system-design/wal");
    expect(resolveAssetRef("AnimatedDiagram", "messenger/aws")).toBe("diagrams/animated/messenger/aws");
    expect(resolveAssetRef("AnimatedDiagram", "animated/messenger/aws")).toBe("diagrams/animated/messenger/aws");
    expect(resolveAssetRef("AnimatedDiagram", "diagrams/animated/messenger/aws")).toBe(
      "diagrams/animated/messenger/aws"
    );
    expect(resolveAssetRef("CloudMapping", "messenger/architecture")).toBe("diagrams/animated/messenger/architecture");
    expect(resolveAssetRef("TechIcon", "aws/lambda")).toBe("logos/tech/aws/lambda");
    expect(resolveAssetRef("Diagram", "excalidraw/sd/ring")).toBe("diagrams/excalidraw/sd/ring");
    expect(resolveAssetRef("Img", "/images/a/b")).toBe("images/a/b");
  });

  it("types files by folder and extension", () => {
    expect(assetTypeOf("images/cloud/vpc.png")).toBe("image");
    expect(assetTypeOf("images/cloud/vpc.svg")).toBe("svg");
    expect(assetTypeOf("diagrams/mermaid/a/b.mmd")).toBe("mermaid");
    expect(assetTypeOf("diagrams/mermaid/a/b.svg")).toBeNull();
    expect(assetTypeOf("diagrams/animated/a/b.ts")).toBe("animated");
    expect(assetTypeOf("logos/companies/x.svg")).toBe("logo");
    expect(assetTypeOf("logos/tech/aws/lambda.svg")).toBe("tech-icon");
    expect(assetTypeOf("downloads/sheet.pdf")).toBe("download");
    expect(assetTypeOf("downloads/sheet.exe")).toBeNull();
    expect(assetTypeOf("misc/x.png")).toBeNull();
  });

  it("finds references in MDX, and ignores <Figure caption> without an id", () => {
    const refs = findRefs(`
<Img id="images/a/b" />
<Figure caption="x">
<Mermaid ref="sd/wal" caption="Write-ahead log" />
<AnimatedDiagram name="messenger/aws" stepper />
<AnimatedDiagram spec='animated/uber-eats/architecture' />
<TechIcon id={"aws/lambda"} />
<CloudMapping diagram="messenger/architecture" lead="aws" />`);
    expect(refs.map((r) => `${r.component} ${r.id}`)).toEqual([
      "Img images/a/b",
      "Mermaid diagrams/mermaid/sd/wal",
      "AnimatedDiagram diagrams/animated/messenger/aws",
      "AnimatedDiagram diagrams/animated/uber-eats/architecture",
      "TechIcon logos/tech/aws/lambda",
      "CloudMapping diagrams/animated/messenger/architecture",
    ]);
  });

  it("finds newsletter figures written as Markdown images with an asset: source", () => {
    const refs = findRefs(
      "Intro.\n\n![Loop](asset:diagrams/svg/newsletter/x/loop#step=2)\n\n![Hero](asset:diagrams/svg/newsletter/x/hero)\n" +
        "![Raw](https://cdn.example/x.png)"
    );
    expect(refs.map((r) => `${r.component} ${r.id}`)).toEqual([
      "Figure diagrams/svg/newsletter/x/loop",
      "Figure diagrams/svg/newsletter/x/hero",
    ]);
  });
});

describe("indexAssets + checkAssets", () => {
  it("accepts a valid library", () => {
    const dir = fixture({
      "assets/diagrams/svg/sd/cap.svg": SVG(),
      "assets/diagrams/svg/sd/cap.meta.yaml": "alt: A triangle\ncaption: CAP\ntags: [cap]\n",
      "assets/logos/companies/acme.svg": SVG('<circle r="5"/>'),
      "assets/logos/companies/acme.meta.yaml": "source: mit-pack\n",
    });
    const index = indexAssets(path.join(dir, "assets"), dir);
    expect(index.problems).toEqual([]);
    const cap = index.assets.get("diagrams/svg/sd/cap")!;
    expect(cap).toMatchObject({
      type: "svg",
      group: "diagrams",
      alt: "A triangle",
      access: "free",
      width: 10,
      height: 10,
    });
    expect(index.assets.get("logos/companies/acme")!.license).toMatchObject({ key: "mit-pack", license: "MIT" });
    const problems = checkAssets(index, [ref("diagrams/svg/sd/cap", page("/a"), "Figure")]);
    expect(messages(problems)).toEqual([]);
    expect(messages(problems, "warning")).toEqual([]);
  });

  it("reports names, types, sidecars, alt, licences, sizes and duplicates", () => {
    const dir = fixture({
      "assets/images/Bad_Name.svg": SVG(),
      "assets/images/a/no-alt.svg": SVG('<circle r="1"/>'),
      "assets/images/a/dup.svg": SVG('<circle r="1"/>'),
      "assets/images/a/dup.meta.yaml": "alt: x\n",
      "assets/images/a/orphan.meta.yaml": "alt: x\n",
      "assets/images/a/bad-meta.svg": SVG('<rect width="2"/>'),
      "assets/images/a/bad-meta.meta.yaml": "alt: x\naccess: secret\nextra: 1\n",
      "assets/images/a/huge.svg": SVG(`<path d="${"M0 0L1 1".repeat(30_000)}"/>`),
      "assets/images/a/huge.meta.yaml": "alt: x\n",
      "assets/images/a/notes.txt": "hello",
      "assets/logos/companies/nolicence.svg": SVG('<rect width="3"/>'),
      "assets/logos/tech/aws/unknown.svg": SVG('<rect width="4"/>'),
      "assets/logos/tech/aws/unknown.meta.yaml": "source: nowhere\n",
    });
    const index = indexAssets(path.join(dir, "assets"), dir);
    const errors = messages(checkAssets(index, []));
    const has = (text: string) =>
      expect(
        errors.some((e) => e.includes(text)),
        `${text}\n${errors.join("\n")}`
      ).toBe(true);
    has('"Bad_Name" is not kebab-case');
    has("images/a/no-alt: alt is required");
    has("same file as assets/images/a/dup.svg");
    has("sidecar has no asset file next to it");
    has("access: Invalid option");
    has("Unrecognized key");
    has("over the 200 KB limit");
    has("file type not allowed");
    has("third-party logos need `source");
    has('source "nowhere" is not a key in assets/LICENSES.yaml');
  });

  it("checks references: unknown IDs, wrong component, premium on a free page", () => {
    const dir = fixture({
      "assets/diagrams/svg/sd/pro.svg": SVG(),
      "assets/diagrams/svg/sd/pro.meta.yaml": "alt: x\naccess: premium\n",
      "assets/downloads/sheet.pdf": "%PDF-1.4",
    });
    const index = indexAssets(path.join(dir, "assets"), dir);
    const errors = messages(
      checkAssets(index, [
        ref("images/missing", page("/a")),
        ref("downloads/sheet", page("/a"), "Img"),
        ref("diagrams/svg/sd/pro", page("/free"), "Figure"),
        ref("diagrams/svg/sd/pro", page("/paid", { access: "premium" }), "Figure"),
      ])
    );
    expect(errors).toEqual([
      "<Img>: unknown asset images/missing",
      "<Img> can't show downloads/sheet (a download asset)",
      "premium asset diagrams/svg/sd/pro is used on a free page (/free)",
    ]);
  });

  it("warns about unused assets, except brand/, og/, shared and code-referenced logos", () => {
    const dir = fixture({
      "assets/images/a/unused.svg": SVG('<rect width="5"/>'),
      "assets/images/a/unused.meta.yaml": "alt: x\n",
      "assets/images/a/shared.svg": SVG('<rect width="6"/>'),
      "assets/images/a/shared.meta.yaml": "alt: x\ntags: [shared]\n",
      "assets/brand/logo.svg": SVG('<rect width="7"/>'),
      "assets/brand/logo.meta.yaml": "alt: Logo\n",
      "assets/logos/companies/acme.svg": SVG('<rect width="8"/>'),
      "assets/logos/companies/acme.meta.yaml": "source: mit-pack\n",
    });
    const index = indexAssets(path.join(dir, "assets"), dir);
    expect(messages(checkAssets(index, []), "warning")).toEqual(["images/a/unused is not used by any page"]);
    expect(usedByOf(index.assets, []).get("logos/companies/acme")).toEqual(["code:src/lib/company-logos.ts"]);
  });
});

describe("usage scan", () => {
  it("maps references to their page and line", () => {
    const dir = fixture({ "content/sd/a.mdx": '---\ntitle: A\n---\n\nText\n\n<Img id="images/x" />\n' });
    const file = path.join(dir, "content/sd/a.mdx");
    const refs = scanUsage(path.join(dir, "content"), new Map([[file, page("/sd/a")]]), dir);
    expect(refs).toEqual([
      { id: "images/x", component: "Img", file: "content/sd/a.mdx", line: 7, page: page("/sd/a") },
    ]);
  });

  it("finds every animated diagram in the real content", async () => {
    const { contentPages } = await import("../../../scripts/build-assets.lib");
    const content = path.join(APP, "content");
    const refs = scanUsage(content, await contentPages(content), APP);
    const index = indexAssets(path.join(APP, "assets"), APP);
    const used = usedByOf(index.assets, refs);
    expect(used.get("diagrams/animated/messenger/aws")).toEqual(["/system-design/case-studies/facebook-messenger"]);
    for (const a of index.assets.values()) {
      if (a.type === "animated") expect(used.get(a.id)!.length, a.id).toBeGreaterThan(0);
    }
  });
});

describe("per-environment publishing", () => {
  const asset = (over: Partial<{ id: string; access: "free" | "premium"; group: string; tags: string[] }> = {}) => ({
    id: "images/a/b",
    access: "free" as const,
    group: "images",
    tags: [] as string[],
    ...over,
  });

  it("decides what is public", () => {
    expect(isPublic(asset(), [ref("images/a/b", page("/on"))])).toBe(true);
    expect(isPublic(asset(), [ref("images/a/b", page("/hidden", { visible: false }))])).toBe(false);
    expect(isPublic(asset(), [])).toBe(false);
    expect(isPublic(asset({ group: "brand" }), [])).toBe(true);
    expect(isPublic(asset({ group: "og" }), [])).toBe(true);
    expect(isPublic(asset({ tags: ["shared"] }), [])).toBe(true);
    // Premium is never public, wherever it's used.
    expect(
      isPublic(asset({ access: "premium", group: "brand", tags: ["shared"] }), [ref("images/a/b", page("/on"))])
    ).toBe(false);
  });

  it("copies premium files only to the private folder, hidden-section files nowhere, and fails on leaks", () => {
    const dir = fixture({
      "assets/images/a/free.svg": SVG('<rect width="1"/>'),
      "assets/images/a/free.meta.yaml": "alt: x\n",
      "assets/images/a/pro.svg": SVG('<rect width="2"/>'),
      "assets/images/a/pro.meta.yaml": "alt: x\naccess: premium\n",
      "assets/images/a/hidden.svg": SVG('<rect width="3"/>'),
      "assets/images/a/hidden.meta.yaml": "alt: x\n",
    });
    const index = indexAssets(path.join(dir, "assets"), dir);
    const assets = [...index.assets.values()];
    const cacheDir = path.join(dir, ".build-cache/assets");
    const rendered = new Map<string, Rendered>();
    for (const a of assets) {
      fs.mkdirSync(path.join(cacheDir, a.hash), { recursive: true });
      fs.writeFileSync(path.join(cacheDir, a.hash, "light.svg"), "<svg/>");
      fs.writeFileSync(path.join(cacheDir, a.hash, "x.png"), "png");
      rendered.set(a.id, {
        files: [
          { name: "light.svg", format: "svg", theme: "light", bytes: 6 },
          { name: "x.png", format: "png", theme: "light", bytes: 3 },
        ],
      });
    }
    const publicDir = path.join(dir, "public/_a");
    const privateDir = path.join(dir, ".build/private-assets");
    fs.mkdirSync(path.join(publicDir, "stale"), { recursive: true });
    const refs = [
      ref("images/a/free", page("/on")),
      ref("images/a/pro", page("/paid", { access: "premium" })),
      ref("images/a/hidden", page("/cloud/x", { visible: false })),
    ];
    const { manifest, publicFiles, privateFiles } = publishAssets({
      env: "production",
      assets,
      rendered,
      refs,
      cacheDir,
      publicDir,
      privateDir,
    });
    const free = index.assets.get("images/a/free")!;
    const pro = index.assets.get("images/a/pro")!;
    // Only the free, visible asset's PNG is public; its inline SVG never gets a URL.
    expect(fs.readdirSync(publicDir)).toEqual([free.hash]);
    expect(fs.readdirSync(path.join(publicDir, free.hash))).toEqual(["x.png"]);
    expect(publicFiles).toBe(1);
    expect(manifest.assets["images/a/free"].variants.map((v) => v.url)).toEqual([undefined, `/_a/${free.hash}/x.png`]);
    // Premium: both files privately, none publicly, no URLs.
    expect(fs.readdirSync(path.join(privateDir, "images/a/pro")).sort()).toEqual(["light.svg", "x.png"]);
    expect(privateFiles).toBe(2);
    expect(manifest.assets["images/a/pro"]).toMatchObject({ public: false, access: "premium" });
    expect(manifest.assets["images/a/pro"].variants.every((v) => !v.url)).toBe(true);
    expect(fs.existsSync(path.join(publicDir, pro.hash))).toBe(false);
    expect(manifest.assets["images/a/hidden"].public).toBe(false);
    expect(manifest.assets["images/a/free"].usedBy).toEqual(["/on"]);

    expect(() => assertNoLeaks(manifest, publicDir)).not.toThrow();
    fs.mkdirSync(path.join(publicDir, pro.hash));
    fs.writeFileSync(path.join(publicDir, pro.hash, "x.png"), "png");
    expect(() => assertNoLeaks(manifest, publicDir)).toThrow(/is not a public free asset/);
  });
});

describe("SVG optimisation", () => {
  const numbers = (d: string) => d.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g)!.map(Number);

  it("keeps viewBox, prefixes ids and their references", () => {
    const out = optimizeSvg(
      SVG(
        '<defs><linearGradient id="g"><stop offset="0"/></linearGradient></defs><path fill="url(#g)" d="M0 0h1"/><use href="#g"/>',
        ' width="10" height="10"'
      ),
      "p1"
    );
    expect(out).toContain('viewBox="0 0 10 10"');
    expect(out).toContain('id="p1-g"');
    expect(out).toContain("url(#p1-g)");
    expect(out).toContain('href="#p1-g"');
    expect(out).not.toMatch(/id="g"/);
  });

  it("strips scripts, event handlers and javascript: links from inlined SVGs (security review L3)", () => {
    const out = optimizeSvg(
      SVG(
        '<script>alert(1)</script><path onclick="alert(2)" onload="alert(3)" d="M0 0h1"/><a href="javascript:alert(4)"><path d="M1 1h1"/></a>'
      ),
      "p"
    );
    expect(out).not.toMatch(/<script|alert|onclick|onload|javascript:/i);
    expect(out).toContain('d="M1 1h1"');
  });

  it("never merges or corrupts path numbers", () => {
    const d = "M.5.5l.25.125.0004-.0006a.998.998 0 00-.998 0L1.893 5.68c0 .296.032.535.088.71z";
    const out = optimizeSvg(SVG(`<path d="${d}"/>`), "p");
    const after = /\sd="([^"]+)"/.exec(out)![1];
    const [a, b] = [numbers(d), numbers(after)];
    expect(b).toHaveLength(a.length);
    a.forEach((n, i) => expect(Math.abs(n - b[i])).toBeLessThanOrEqual(0.0005));
  });

  it("leaves every company logo's path data intact", () => {
    const dir = path.join(APP, "assets/logos/companies");
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".svg"))) {
      const src = fs.readFileSync(path.join(dir, f), "utf8");
      const out = optimizeSvg(src, "logo-x");
      const paths = (s: string) => [...s.matchAll(/\sd="([^"]+)"/g)].map((m) => numbers(m[1]));
      const [a, b] = [paths(src), paths(out)];
      expect(b.length, f).toBe(a.length);
      a.forEach((nums, i) => {
        expect(b[i].length, `${f} path ${i}`).toBe(nums.length);
        nums.forEach((n, j) => expect(Math.abs(n - b[i][j]), `${f} path ${i} #${j}`).toBeLessThanOrEqual(0.0005));
      });
    }
  });

  it("reads intrinsic sizes", () => {
    expect(svgSize('<svg width="120" height="80" viewBox="0 0 12 8">')).toEqual({ width: 120, height: 80 });
    expect(svgSize('<svg viewBox="0 0 24 12">')).toEqual({ width: 24, height: 12 });
    expect(svgSize("<svg>")).toBeNull();
  });
});

describe("the real library", () => {
  const index = indexAssets(path.join(APP, "assets"), APP);

  it("has no errors", () => {
    expect(messages(checkAssets(index, []))).toEqual([]);
  });

  it("matches the committed generated files (run `npm run assets` when this fails)", () => {
    for (const g of generatedModules(index, APP)) {
      expect(fs.readFileSync(path.join(APP, g.file), "utf8"), g.file).toBe(g.content);
    }
  });

  it("changes an asset's hash when its source changes", () => {
    expect(contentHash("a".repeat(64))).not.toBe(contentHash("b".repeat(64)));
    expect(contentHash("a".repeat(64))).toMatch(/^[0-9a-f]{12}$/);
  });
});
