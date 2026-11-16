import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { rehypeHeadingIds, slugify, type DocHeading } from "@/lib/doc-headings";

// Lines outside code fences, with the text of JSX blocks (lines inside an open tag or a component) dropped.
function proseLines(text: string) {
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, "");
  const out: { line: string; n: number }[] = [];
  let inCode = false;
  let jsxDepth = 0;
  body.split("\n").forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith("```")) {
      inCode = !inCode;
      return;
    }
    if (inCode) return;
    const opens = (t.match(/<[A-Z][A-Za-z]*\b(?![^>]*\/>)/g) ?? []).length;
    const closes = (t.match(/<\/[A-Z][A-Za-z]*>/g) ?? []).length;
    const inJsx = jsxDepth > 0 || t.startsWith("<");
    jsxDepth = Math.max(0, jsxDepth + opens - closes);
    if (!inJsx) out.push({ line: t, n: i + 1 });
  });
  return out;
}

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

// The pattern hub follows the same v2 format (plan: plans/patterns-expansion-plan.md §7.6). All 36 pages were
// converted by 2026-11-16, so every page must carry `updated:` and none may be an outline; a new pattern page lands in
// the v2 format from the start.
describe("system-design patterns v2 headings and point-wise format", () => {
  const dir = path.join(process.cwd(), "content", "system-design", "patterns");
  const pages = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .sort()
    .map((f) => ({ f, text: fs.readFileSync(path.join(dir, f), "utf8") }));

  it("has every page converted: an `updated` date and no outline", () => {
    const unconverted = pages
      .filter(({ text }) => !/^updated:/m.test(text) || /^status:\s*outline/m.test(text))
      .map(({ f }) => f);
    expect(pages.length).toBeGreaterThanOrEqual(36);
    expect(unconverted).toEqual([]);
  });
  const retired = new Set([
    "TL;DR",
    "The idea in plain English",
    "Deep dive",
    "Real-world examples",
    "Common pitfalls",
    "How to answer in an interview",
    "Related patterns",
  ]);

  it("uses Overview and Mental model and no retired heading", () => {
    const violations: string[] = [];
    for (const { f, text } of pages) {
      const h2s = proseLines(text)
        .filter(({ line }) => line.startsWith("## "))
        .map(({ line }) => line.slice(3).trim());
      for (const h of h2s) if (retired.has(h)) violations.push(`${f}: retired heading "## ${h}"`);
      if (!h2s.includes("Overview")) violations.push(`${f}: missing "## Overview"`);
      if (!h2s.includes("Mental model")) violations.push(`${f}: missing "## Mental model"`);
    }
    expect(violations).toEqual([]);
  });

  it("writes in points: bulleted answers, no Mermaid, no long unbulleted prose", () => {
    const violations: string[] = [];
    for (const { f, text } of pages) {
      // Attributes may contain ">" ("R + W > N"), so skip quoted attribute values when finding the end of the tag.
      for (const m of text.matchAll(/<InterviewQuestion\b(?:[^>"]|"[^"]*")*>([\s\S]*?)<\/InterviewQuestion>/g)) {
        if (!m[1].trim().startsWith("- ")) violations.push(`${f}: unbulleted <InterviewQuestion> answer`);
      }
      if (/^\s*```mermaid/m.test(text)) violations.push(`${f}: Mermaid fence`);
      for (const { line, n } of proseLines(text)) {
        const listed = /^(- |\* |\d+\. |\| |#|>)/.test(line);
        if (!listed && line.length > 200) violations.push(`${f}:${n}: prose line of ${line.length} characters`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("puts the Interview edge callout on every advanced page", () => {
    const missing = pages
      .filter(({ text }) => /^tier:\s*advanced\s*$/m.test(text))
      .filter(({ text }) => !/<Callout\b[^>]*title="Interview edge[^"]*"/.test(text))
      .map(({ f }) => f);
    expect(missing).toEqual([]);
  });
});

// Case studies (plan: plans/case-studies-plan.md §5 and §6.4). A page is held to the format once it is converted:
// it has `updated:` and no `status: outline`. Every page, outline or not, carries its system logo.
describe("system-design case studies: interview-grade format", () => {
  const dir = path.join(process.cwd(), "content", "system-design-case-studies", "case-studies");
  const all = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .sort()
    .map((f) => ({ f, text: fs.readFileSync(path.join(dir, f), "utf8") }));
  const pages = all.filter(({ text }) => /^updated:/m.test(text) && !/^status:\s*outline/m.test(text));
  const ORDER = [
    "The interview question",
    "Overview",
    "Functional requirements",
    "Non-functional requirements",
    "Estimates and decision drivers",
    "API design",
    "Data model",
    "Building the architecture, step by step",
    "Final architecture",
    "Deep dives",
    "Design decisions and why",
    "Patterns used",
    "Same design, other systems",
    "How real systems do it",
    "Failure modes & pitfalls",
    "Interview framework",
    "Further reading",
  ];
  // Messenger keeps its cloud section after Final architecture (plan §3 decision 12).
  const OPTIONAL = new Set(["Running it on AWS"]);
  const section = (text: string, h2: string) => {
    const start = text.indexOf(`\n## ${h2}\n`);
    if (start < 0) return "";
    const next = text.indexOf("\n## ", start + 4);
    return text.slice(start, next < 0 ? undefined : next);
  };
  const tableRows = (chunk: string) =>
    chunk
      .split("\n")
      .filter((l) => l.startsWith("|"))
      .slice(2);

  it("gives every case study a system logo", () => {
    expect(all.length).toBe(27);
    expect(all.filter(({ text }) => !/^logo: \S+/m.test(text)).map(({ f }) => f)).toEqual([]);
  });

  it("uses the section order of the format", () => {
    const violations: string[] = [];
    for (const { f, text } of pages) {
      const h2s = proseLines(text)
        .filter(({ line }) => line.startsWith("## "))
        .map(({ line }) => line.slice(3).trim())
        .filter((h) => !OPTIONAL.has(h));
      if (JSON.stringify(h2s) !== JSON.stringify(ORDER)) violations.push(`${f}: H2s are ${h2s.join(" / ")}`);
    }
    expect(violations).toEqual([]);
  });

  it("has the prompt, requirement and estimate tables, drivers D1-D12 and at least 7 decisions", () => {
    const violations: string[] = [];
    for (const { f, text } of pages) {
      if (!text.includes("<InterviewPrompt")) violations.push(`${f}: no <InterviewPrompt>`);
      if ((text.match(/<RequirementsTable\b/g) ?? []).length !== 2)
        violations.push(`${f}: needs two <RequirementsTable>`);
      if ((text.match(/<EstimateTable\b/g) ?? []).length < 1) violations.push(`${f}: no <EstimateTable>`);
      const drivers = tableRows(section(text, "Estimates and decision drivers"))
        .map((r) => r.match(/^\|\s*(D\d+)\s*\|/)?.[1])
        .filter(Boolean);
      const want = Array.from({ length: 12 }, (_, i) => `D${i + 1}`);
      if (JSON.stringify(drivers) !== JSON.stringify(want)) violations.push(`${f}: drivers are ${drivers.join(",")}`);
      const decisions = tableRows(section(text, "Design decisions and why")).length;
      if (decisions < 7) violations.push(`${f}: ${decisions} design decisions (need 7+)`);
    }
    expect(violations).toEqual([]);
  });

  it("has 4+ figures with one stepper, 8+ bulleted questions, no Mermaid and no long prose", () => {
    const violations: string[] = [];
    for (const { f, text } of pages) {
      const figures = text.match(/<AnimatedDiagram\b[^>]*>/g) ?? [];
      if (figures.length < 4) violations.push(`${f}: ${figures.length} figures (need 4+)`);
      if (!figures.some((d) => /\bstepper\b/.test(d))) violations.push(`${f}: no stepper figure`);
      if (/^\s*```mermaid/m.test(text)) violations.push(`${f}: Mermaid fence`);
      const answers = [...text.matchAll(/<InterviewQuestion\b(?:[^>"]|"[^"]*")*>([\s\S]*?)<\/InterviewQuestion>/g)];
      if (answers.length < 8) violations.push(`${f}: ${answers.length} questions (need 8+)`);
      for (const m of answers) if (!m[1].trim().startsWith("- ")) violations.push(`${f}: unbulleted answer`);
      for (const { line, n } of proseLines(text)) {
        const listed = /^(- |\* |\d+\. |\| |#|>)/.test(line);
        if (!listed && line.length > 200) violations.push(`${f}:${n}: prose line of ${line.length} characters`);
      }
    }
    expect(violations).toEqual([]);
  });
});
