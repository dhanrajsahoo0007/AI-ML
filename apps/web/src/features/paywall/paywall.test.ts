import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PREVIEW_SEGMENT } from "./constants";
import { fixtureDocsFor } from "./fixtures";
import { previewNodes, remarkPremium, type MdNode } from "./remark-premium";

const p = (text: string) => ({ type: "paragraph", children: [{ type: "text", value: text }] }) as MdNode;
const h = (text: string) => ({ type: "heading", depth: 2, children: [{ type: "text", value: text }] }) as MdNode;
const esm = { type: "mdxjsEsm", value: "export const x = 1" } as unknown as MdNode;
const brk = { type: "mdxJsxFlowElement", name: "PremiumBreak", attributes: [], children: [] } as unknown as MdNode;
const texts = (nodes: MdNode[]) =>
  nodes.map((n) => ("children" in n ? (n as { children: { value: string }[] }).children[0].value : n.type));

describe("preview truncation", () => {
  const body = [p("intro"), h("Free"), p("free text"), h("Premium"), p("SECRET")];

  it("keeps the first N blocks", () => {
    expect(texts(previewNodes(body, 3).nodes)).toEqual(["intro", "Free", "free text"]);
    expect(previewNodes(body, 3).truncated).toBe(true);
    expect(previewNodes(body, 0).nodes).toEqual([]);
  });

  it("defaults to 3 blocks and keeps short articles whole", () => {
    expect(previewNodes(body).nodes).toHaveLength(3);
    expect(previewNodes(body.slice(0, 2), 3)).toMatchObject({ truncated: false });
    expect(previewNodes(body, 99).truncated).toBe(false);
  });

  it("doesn't count imports, and a <PremiumBreak /> wins over the count", () => {
    expect(texts(previewNodes([esm, ...body], 1).nodes)).toEqual(["mdxjsEsm", "intro"]);
    expect(texts(previewNodes([p("a"), brk, p("SECRET")], 5).nodes)).toEqual(["a"]);
    expect(previewNodes([p("a"), brk], 5).truncated).toBe(false);
    // Only trailing non-blocks after the cut: nothing premium was dropped.
    expect(previewNodes([p("a"), esm], 1).truncated).toBe(false);
  });

  it("the plugin cuts previews and strips the marker from the full page", () => {
    const tree = () => ({ type: "root", children: [p("a"), brk, p("SECRET")] });
    const preview = tree();
    remarkPremium({ mode: "preview" })(preview);
    expect(JSON.stringify(preview)).not.toContain("SECRET");
    const full = tree();
    remarkPremium({ mode: "full" })(full);
    expect(texts(full.children)).toEqual(["a", "SECRET"]);
  });
});

describe("test-only fixture content", () => {
  // The section the fixtures join is their folder name under tests/fixtures/content/.
  const section = fs.readdirSync(path.join(process.cwd(), "tests", "fixtures", "content"))[0];

  it("is published in every environment but production", () => {
    const docs = fixtureDocsFor(section, "preview");
    expect(docs.map((d) => d.slug)).toContain("leak-canary/premium-article");
    expect(fs.readFileSync(docs[0].file, "utf8")).toMatch(/LEAK-CANARY-/);
    expect(fixtureDocsFor(section, "production")).toEqual([]);
    expect(fixtureDocsFor("no-such-section", "local")).toEqual([]);
  });
});

describe("premium-routes manifest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const load = async (appEnv: string) => {
    vi.stubEnv("APP_ENV", appEnv);
    vi.resetModules();
    return import("./access");
  };

  it("lists premium articles, the fixture, and never hubs or outlines while the paywall is on", async () => {
    const { premiumRoutes } = await load("preview");
    const m = premiumRoutes();
    expect(m).toMatchObject({ env: "preview", paywall: true });
    expect(m.routes).toContain("/system-design/leak-canary/premium-article");
    expect(m.routes).toContain("/system-design/databases/b-trees");
    expect(m.routes).not.toContain("/system-design/databases");
    // An outline article stays free (alwaysFree: outlines).
    expect(m.routes).not.toContain("/system-design/case-studies/dropbox");
    expect(m.routes.every((r) => !r.endsWith(`/${PREVIEW_SEGMENT}`))).toBe(true);
  });

  it("is empty in production, where the paywall is off", async () => {
    const { premiumRoutes, paywallOn } = await load("production");
    expect(paywallOn()).toBe(false);
    expect(premiumRoutes()).toEqual({ env: "production", paywall: false, routes: [] });
  });

  it("the switch exists for every environment", () => {
    const yaml = fs.readFileSync(path.join(process.cwd(), "content", "features.yaml"), "utf8");
    expect(yaml).toMatch(/^paywall: \{ local: on, preview: on, staging: on, production: off \}$/m);
  });
});
