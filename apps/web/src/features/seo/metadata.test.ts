import { describe, expect, it } from "vitest";
import { SITE_URL } from "../../config/business";
import type { ResolvedMetadata, ResolvingMetadata } from "next";
import { pageMetadata, pageRobots, withParentImages } from "./metadata";
import { absoluteUrl, SITE_NAME } from "./site";

describe("absoluteUrl", () => {
  it("joins paths to the site origin", () => {
    expect(absoluteUrl("/")).toBe(SITE_URL);
    expect(absoluteUrl("/system-design")).toBe(`${SITE_URL}/system-design`);
    expect(absoluteUrl("system-design/")).toBe(`${SITE_URL}/system-design`);
    expect(absoluteUrl("/a", "https://x.test")).toBe("https://x.test/a");
    expect(absoluteUrl("https://other.test/a")).toBe("https://other.test/a");
  });
});

describe("pageRobots", () => {
  it("indexes on sections and keeps hidden ones and seo.noindex pages out", () => {
    expect(pageRobots({ sectionState: "on" })).toEqual({ index: true, follow: true });
    expect(pageRobots({})).toEqual({ index: true, follow: true });
    expect(pageRobots({ sectionState: "hidden" })).toEqual({ index: false, follow: false });
    expect(pageRobots({ sectionState: "hidden", noindex: false })).toEqual({ index: false, follow: false });
    expect(pageRobots({ sectionState: "on", noindex: true })).toEqual({ index: false, follow: true });
  });
});

describe("pageMetadata", () => {
  const meta = pageMetadata({
    path: "/system-design/databases/b-trees",
    title: "B-Trees",
    description: "How B-trees work.",
    type: "article",
    modifiedTime: "2026-10-01T00:00:00.000Z",
    sectionState: "on",
  });

  it("sets an absolute canonical URL from SITE_URL", () => {
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/system-design/databases/b-trees`);
  });

  it("sets title and description, Open Graph and Twitter tags", () => {
    expect(meta.title).toBe("B-Trees");
    expect(meta.description).toBe("How B-trees work.");
    expect(meta.openGraph).toMatchObject({
      title: `B-Trees · ${SITE_NAME}`,
      description: "How B-trees work.",
      url: `${SITE_URL}/system-design/databases/b-trees`,
      siteName: SITE_NAME,
      type: "article",
      modifiedTime: "2026-10-01T00:00:00.000Z",
    });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image", title: `B-Trees · ${SITE_NAME}` });
    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  it("omits an unknown modified time and defaults to a website", () => {
    const m = pageMetadata({ path: "/interviews", title: "Q", description: "d" });
    expect(m.openGraph).toMatchObject({ type: "website" });
    expect(m.openGraph).not.toHaveProperty("modifiedTime");
    const a = pageMetadata({ path: "/x", title: "Q", description: "d", type: "article", modifiedTime: null });
    expect(a.openGraph).not.toHaveProperty("modifiedTime");
  });

  it("noindexes hidden sections", () => {
    const m = pageMetadata({ path: "/cloud", title: "Cloud", description: "d", sectionState: "hidden" });
    expect(m.robots).toEqual({ index: false, follow: false });
  });

  it("gives the home page an absolute title without doubling the brand", () => {
    const m = pageMetadata({ path: "/", title: SITE_NAME, description: "d", absoluteTitle: true });
    expect(m.title).toEqual({ absolute: SITE_NAME });
    expect(m.openGraph?.title).toBe(SITE_NAME);
    expect(m.alternates?.canonical).toBe(SITE_URL);
  });
});

describe("withParentImages", () => {
  const meta = pageMetadata({ path: "/system-design", title: "S", description: "d" });

  it("keeps the parent segment's social images under the page's own Open Graph tags", async () => {
    const images = [{ url: new URL(`${SITE_URL}/system-design/opengraph-image`), width: 1200, height: 630 }];
    const parent = Promise.resolve({ openGraph: { images }, twitter: { images } } as unknown as ResolvedMetadata);
    const m = await withParentImages(meta, parent as ResolvingMetadata);
    expect(m.openGraph).toMatchObject({ url: `${SITE_URL}/system-design`, images });
    expect(m.twitter).toMatchObject({ title: `S · ${SITE_NAME}`, images });
    expect(m.alternates).toEqual(meta.alternates);
  });

  it("adds nothing when the parent has no images", async () => {
    const parent = Promise.resolve({ openGraph: null, twitter: null } as unknown as ResolvedMetadata);
    const m = await withParentImages(meta, parent as ResolvingMetadata);
    expect(m.openGraph).not.toHaveProperty("images");
    expect(m.twitter).not.toHaveProperty("images");
  });
});

describe("pageMetadata image", () => {
  it("points Open Graph and Twitter at a static opengraph-image route", () => {
    const m = pageMetadata({
      path: "/interviews/rag/basics",
      title: "Basics",
      description: "d",
      image: { path: "/interviews/opengraph-image", alt: "Interview Practice" },
    });
    const image = {
      url: `${SITE_URL}/interviews/opengraph-image`,
      width: 1200,
      height: 630,
      alt: "Interview Practice",
      type: "image/png",
    };
    expect(m.openGraph).toMatchObject({ images: [image] });
    expect(m.twitter).toMatchObject({ images: [image] });
  });
});
