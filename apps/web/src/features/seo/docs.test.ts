import { afterEach, describe, expect, it, vi } from "vitest";
import { SITE_URL } from "../../config/business";
import { docsKind } from "../docs/kind";
import { loadDocItems, type DocItem } from "../docs/source";
import { allSections, sectionOfKind, type SectionDef } from "../sections/registry";
import type { JsonLdNode } from "./json-ld";
import { docPageSeo, docsSectionSeo } from "./docs";
import { PAYWALL_CONTAINER_CLASS } from "./site";

// Reads the real content tree and registry, so the SEO follows sections.yaml and the frontmatter as they are.
// Sections and pages are picked from the registry (no section keys in shared code, plan §5.1).

const node = (graph: JsonLdNode[], type: string) => graph.find((n) => n["@type"] === type);

function findPage(match: (section: SectionDef, item: DocItem) => boolean) {
  for (const section of allSections().filter((s) => s.kind === "docs" && s.state !== "off")) {
    const item = loadDocItems(section).find((i) => match(section, i));
    if (item) return { section, item };
  }
  throw new Error("no matching page in the content tree");
}

const premium = findPage((s, i) => !i.isHub && docsKind.access(s, i) === "premium");
const free = findPage((s, i) => !i.isHub && docsKind.access(s, i) === "free");
const hub = findPage((_s, i) => i.isHub);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("docPageSeo", () => {
  it("builds metadata and premium Article JSON-LD for a premium article", async () => {
    const { section, item } = premium;
    const seo = (await docPageSeo(section.key, item.segments))!;
    expect(seo.metadata.alternates?.canonical).toBe(`${SITE_URL}${item.href}`);
    expect(seo.metadata.title).toBe(item.title);
    expect(seo.metadata.openGraph).toMatchObject({ type: "article", url: `${SITE_URL}${item.href}` });
    const article = node(seo.jsonLd["@graph"], "Article")!;
    expect(article.headline).toBe(item.title);
    expect(article.isAccessibleForFree).toBe(false);
    expect(article.hasPart).toMatchObject({ cssSelector: `.${PAYWALL_CONTAINER_CLASS}` });
    const crumbs = node(seo.jsonLd["@graph"], "BreadcrumbList")!.itemListElement as { name: string; item: string }[];
    expect(crumbs.map((c) => c.name).slice(0, 2)).toEqual(["Home", section.label]);
    expect(crumbs).toHaveLength(4);
    expect(crumbs.at(-1)!.item).toBe(`${SITE_URL}${item.href}`);
  });

  it("marks free articles (e.g. outlines) accessible, without paywall parts", async () => {
    const seo = (await docPageSeo(free.section.key, free.item.segments))!;
    const article = node(seo.jsonLd["@graph"], "Article")!;
    expect(article.isAccessibleForFree).toBe(true);
    expect(article).not.toHaveProperty("hasPart");
  });

  it("treats hubs as collection pages", async () => {
    const seo = (await docPageSeo(hub.section.key, hub.item.segments))!;
    expect(seo.metadata.title).toBe(hub.item.title);
    expect(node(seo.jsonLd["@graph"], "CollectionPage")).toBeDefined();
    expect(node(seo.jsonLd["@graph"], "Article")).toBeUndefined();
  });

  it("returns null for unknown pages and non-docs sections", async () => {
    expect(await docPageSeo(hub.section.key, ["no-such-page"])).toBeNull();
    expect(await docPageSeo(sectionOfKind("question-bank").key, ["x"])).toBeNull();
    expect(docsSectionSeo(sectionOfKind("question-bank").key)).toBeNull();
  });

  it("noindexes pages of hidden sections and indexes the rest", async () => {
    vi.stubEnv("APP_ENV", "production");
    const docs = allSections().filter((s) => s.kind === "docs");
    const hidden = docs.find((s) => s.state === "hidden");
    const on = docs.find((s) => s.state === "on")!;
    expect(docsSectionSeo(on.key)!.metadata.robots).toEqual({ index: true, follow: true });
    if (!hidden) return; // nothing is hidden in production right now
    const page = loadDocItems(hidden)[0];
    expect((await docPageSeo(hidden.key, page.segments))!.metadata.robots).toEqual({ index: false, follow: false });
    expect(docsSectionSeo(hidden.key)!.metadata.robots).toEqual({ index: false, follow: false });
  });
});
