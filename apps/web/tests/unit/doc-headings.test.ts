import { describe, expect, it } from "vitest";
import { rehypeHeadingIds, slugify, type DocHeading } from "@/lib/doc-headings";

describe("slugify", () => {
  it("lowercases, strips punctuation and joins words with hyphens", () => {
    expect(slugify("What is RAG? (Retrieval-Augmented Generation)")).toBe("what-is-rag-retrieval-augmented-generation");
  });

  it("removes accents", () => {
    expect(slugify("Café Façade")).toBe("cafe-facade");
  });

  it("collapses repeated spaces and hyphens", () => {
    expect(slugify("  a  --  b  ")).toBe("a-b");
  });
});

describe("rehypeHeadingIds", () => {
  const heading = (tagName: string, text: string) => ({
    type: "element",
    tagName,
    children: [{ type: "text", value: text }],
  });

  it("gives h2/h3 unique ids and records the outline", () => {
    const headings: DocHeading[] = [];
    const tree = {
      type: "root",
      children: [heading("h1", "Title"), heading("h2", "Trade-offs"), heading("h3", "Trade-offs"), heading("h2", "")],
    };

    rehypeHeadingIds({ headings })(tree);

    expect(headings).toEqual([
      { id: "trade-offs", text: "Trade-offs", level: 2 },
      { id: "trade-offs-1", text: "Trade-offs", level: 3 },
      { id: "section", text: "", level: 2 },
    ]);
  });
});
