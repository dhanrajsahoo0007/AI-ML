import fs from "node:fs";
import path from "node:path";
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

describe("genai-system-design house headings and point-wise format", () => {
  const dir = path.join(process.cwd(), "content", "ai-system-design", "genai-system-design");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .sort();
  const retired = new Set([
    "TL;DR",
    "The idea in plain English",
    "Deep dive",
    "Real-world examples",
    "Common pitfalls",
    "How to answer in an interview",
  ]);

  it("uses Overview and Mental model instead of retired headings", () => {
    const violations: string[] = [];
    for (const f of files) {
      const text = fs.readFileSync(path.join(dir, f), "utf8");
      let inCode = false;
      const h2s: string[] = [];
      for (const line of text.split("\n")) {
        if (line.trimStart().startsWith("```")) inCode = !inCode;
        if (!inCode && line.startsWith("## ")) {
          const h = line.slice(3).trim();
          h2s.push(h);
          if (retired.has(h)) violations.push(`${f}: retired heading "## ${h}"`);
        }
      }
      if (!h2s.includes("Overview")) violations.push(`${f}: missing "## Overview"`);
      if (!h2s.includes("Mental model")) violations.push(`${f}: missing "## Mental model"`);
    }
    expect(violations).toEqual([]);
  });

  it("formats published pages and interview answers point-wise without dense prose blobs", () => {
    const violations: string[] = [];
    for (const f of files) {
      const text = fs.readFileSync(path.join(dir, f), "utf8");
      if (/^status:\s*outline/m.test(text)) continue;
      for (const m of text.matchAll(/<InterviewQuestion\b[^>]*>([\s\S]*?)<\/InterviewQuestion>/g)) {
        const body = m[1].trim();
        if (!body.startsWith("- ") && !body.startsWith("* ")) {
          violations.push(`${f}: unbulleted <InterviewQuestion> answer`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
