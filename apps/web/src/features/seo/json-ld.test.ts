import { describe, expect, it } from "vitest";
import { SITE_URL } from "../../config/business";
import {
  articleNode,
  breadcrumbNode,
  collectionPageNode,
  jsonLdGraph,
  organizationNode,
  serializeJsonLd,
  websiteNode,
} from "./json-ld";
import { PAYWALL_CONTAINER_CLASS, SITE_NAME } from "./site";

describe("articleNode", () => {
  const base = { path: "/system-design/databases/b-trees", headline: "B-Trees", description: "d" };

  it("marks free articles accessible, without paywall parts", () => {
    const node = articleNode({ ...base, access: "free", dateModified: "2026-10-01T00:00:00.000Z" });
    expect(node).toMatchObject({
      "@type": "Article",
      headline: "B-Trees",
      description: "d",
      url: `${SITE_URL}/system-design/databases/b-trees`,
      dateModified: "2026-10-01T00:00:00.000Z",
      isAccessibleForFree: true,
    });
    expect(node).not.toHaveProperty("hasPart");
  });

  it("adds Google's paywall markup to premium articles, pointing at the paywall container class", () => {
    const node = articleNode({ ...base, access: "premium" });
    expect(node.isAccessibleForFree).toBe(false);
    expect(node.hasPart).toEqual({
      "@type": "WebPageElement",
      isAccessibleForFree: false,
      cssSelector: `.${PAYWALL_CONTAINER_CLASS}`,
    });
    expect(node).not.toHaveProperty("dateModified");
  });

  it("keeps the paywall class a plain CSS class name", () => {
    expect(PAYWALL_CONTAINER_CLASS).toMatch(/^[a-z][a-z0-9-]*$/);
  });

  it("caps the headline at 110 characters", () => {
    const node = articleNode({ ...base, headline: "x".repeat(200), access: "free" });
    expect((node.headline as string).length).toBe(110);
  });
});

describe("breadcrumbNode", () => {
  it("numbers items from 1 and gives the last one the current URL", () => {
    const node = breadcrumbNode(
      [
        { label: "Home", href: "/" },
        { label: "Classic System Design", href: "/system-design" },
        { label: "Databases" },
      ],
      "/system-design/databases"
    );
    expect(node.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Classic System Design", item: `${SITE_URL}/system-design` },
      { "@type": "ListItem", position: 3, name: "Databases", item: `${SITE_URL}/system-design/databases` },
    ]);
  });
});

describe("home and listing nodes", () => {
  it("links WebSite to its Organization publisher by @id", () => {
    const org = organizationNode();
    const site = websiteNode("desc");
    expect(org).toMatchObject({ "@type": "Organization", name: SITE_NAME, url: SITE_URL });
    expect(site).toMatchObject({ "@type": "WebSite", name: SITE_NAME, url: SITE_URL, description: "desc" });
    expect(site.publisher).toEqual({ "@id": org["@id"] });
  });

  it("builds a CollectionPage", () => {
    expect(collectionPageNode({ path: "/interviews", name: "Q", description: "d" })).toMatchObject({
      "@type": "CollectionPage",
      url: `${SITE_URL}/interviews`,
    });
  });
});

describe("serializeJsonLd", () => {
  it("round-trips and cannot close the script element", () => {
    const doc = jsonLdGraph(
      articleNode({ path: "/a", headline: "</script><script>alert(1)</script> &  ", description: "d", access: "free" })
    );
    const text = serializeJsonLd(doc);
    expect(text).not.toMatch(/<\/script/i);
    expect(text).not.toContain("<");
    expect(text).not.toContain(" ");
    expect(JSON.parse(text)).toEqual(doc);
    expect(JSON.parse(text)["@context"]).toBe("https://schema.org");
  });
});
