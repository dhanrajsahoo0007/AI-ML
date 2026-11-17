import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { rehypeHeadingIds, slugify, type DocHeading } from "@/lib/doc-headings";

// Lines outside code fences, with the text of JSX blocks (lines inside an open tag or a component) dropped.
function proseLines(text: string) {
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, "");
  const offset = text.slice(0, text.length - body.length).split("\n").length - 1;
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
    // A multi-line self-closing tag (`<InterviewPrompt` … `/>`) closes on a line with no tag of its own.
    const selfClose = !/<[A-Z]/.test(t) && /\/>$/.test(t) ? 1 : 0;
    const closes = (t.match(/<\/[A-Z][A-Za-z]*>/g) ?? []).length + selfClose;
    const inJsx = jsxDepth > 0 || t.startsWith("<");
    jsxDepth = Math.max(0, jsxDepth + opens - closes);
    if (!inJsx) out.push({ line: t, n: i + 1 + offset });
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

// Case studies (plan: plans/case-studies-plan.md §5 and §6.4). Every page is converted (`updated:`, no outline) and
// carries its system logo.
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
    "Component choices and why",
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

  // All 27 pages were written by 2026-11-17 (Waves 2-7), so every page must now carry `updated:` and none may be an
  // outline; a new case study lands in this format from the start.
  it("has every page converted: an `updated` date and no outline", () => {
    expect(all.map(({ f }) => f).filter((f) => !pages.some((p) => p.f === f))).toEqual([]);
  });

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

  it("justifies every component: 6+ subsections, each with a choice, a why and a why-not", () => {
    const violations: string[] = [];
    for (const { f, text } of pages) {
      const parts = section(text, "Component choices and why").split("\n### ").slice(1);
      if (parts.length < 6) violations.push(`${f}: ${parts.length} component subsections (need 6+)`);
      for (const p of parts) {
        const title = p.split("\n")[0];
        if (!p.includes("- **Choice:**")) violations.push(`${f}: "${title}" has no Choice bullet`);
        if (!/- \*\*Why/.test(p)) violations.push(`${f}: "${title}" has no Why bullet`);
        if (!p.includes("- **Why not")) violations.push(`${f}: "${title}" has no Why not bullet`);
      }
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

// GenAI System Design case studies (plan: SYSTEM-DESIGN/plans/genai-design-plan.md §4). Pages join DONE as each wave
// lands; every page in DONE must follow the format exactly. The list grows to all eleven by Wave 3.
describe("GenAI System Design case studies: interview-grade format", () => {
  const dir = path.join(process.cwd(), "content", "genai-system-design", "case-studies");
  const specDir = path.join(process.cwd(), "assets", "diagrams", "animated");
  const DONE: string[] = [
    "customer-support-agent",
    "voice-agent-call-centre",
    "ai-answer-engine",
    "document-extraction-pipeline",
  ];
  const pages = DONE.map((slug) => ({
    f: `${slug}.mdx`,
    text: fs.readFileSync(path.join(dir, `${slug}.mdx`), "utf8"),
  }));
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
    "Component choices and why",
    "Model, prompt and context design",
    "Latency and cost budget",
    "Evaluation and release gates",
    "Safety and guardrails",
    "Deep dives",
    "Design decisions and why",
    "Principles and patterns used",
    "Same design, other systems",
    "How real systems do it",
    "Failure modes & pitfalls",
    "Interview framework",
    "Further reading",
  ];
  const section = (text: string, heading: string, level = "##") => {
    const start = text.indexOf(`\n${level} ${heading}\n`);
    if (start < 0) return "";
    const rest = text.slice(start + level.length + 2);
    const next = rest.search(level === "##" ? /\n## / : /\n##+ /);
    return next < 0 ? text.slice(start) : text.slice(start, start + level.length + 2 + next);
  };
  const tableRows = (chunk: string) =>
    chunk
      .split("\n")
      .filter((l) => l.startsWith("|"))
      .slice(2);
  const specText = (tag: string) => {
    const id = tag.match(/\b(?:spec="animated\/|name=")([a-z0-9/-]+)"/)?.[1];
    const file = id ? path.join(specDir, `${id}.ts`) : "";
    return file && fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  };

  it("lists only pages that exist, are written and carry logo and updated", () => {
    const violations: string[] = [];
    for (const { f, text } of pages) {
      if (/^status:\s*outline/m.test(text)) violations.push(`${f}: still an outline`);
      if (!/^updated: \d{4}-\d{2}-\d{2}/m.test(text)) violations.push(`${f}: no updated date`);
      if (!/^logo: \S+/m.test(text)) violations.push(`${f}: no logo`);
      if (/^title: "Case Study:/m.test(text)) violations.push(`${f}: title keeps the "Case Study:" prefix`);
    }
    expect(violations).toEqual([]);
  });

  it("uses the section order of the format", () => {
    const violations: string[] = [];
    for (const { f, text } of pages) {
      const h2s = proseLines(text)
        .filter(({ line }) => line.startsWith("## "))
        .map(({ line }) => line.slice(3).trim());
      if (JSON.stringify(h2s) !== JSON.stringify(ORDER)) violations.push(`${f}: H2s are ${h2s.join(" / ")}`);
    }
    expect(violations).toEqual([]);
  });

  it("has the prompt, numbers, requirement and estimate tables, drivers G1-G12 and 7+ decisions", () => {
    const violations: string[] = [];
    for (const { f, text } of pages) {
      for (const tag of ["<InterviewPrompt", "<Numbers", "<KeyIdea", "<PremiumBreak"])
        if (!text.includes(tag)) violations.push(`${f}: no ${tag}>`);
      if ((text.match(/<RequirementsTable\b/g) ?? []).length !== 2)
        violations.push(`${f}: needs two <RequirementsTable>`);
      if ((text.match(/<EstimateTable\b/g) ?? []).length < 1) violations.push(`${f}: no <EstimateTable>`);
      const drivers = tableRows(section(text, "Estimates and decision drivers"))
        .map((r) => r.match(/^\|\s*(G\d+)\s*\|/)?.[1])
        .filter(Boolean);
      const want = Array.from({ length: 12 }, (_, i) => `G${i + 1}`);
      if (JSON.stringify(drivers) !== JSON.stringify(want)) violations.push(`${f}: drivers are ${drivers.join(",")}`);
      const decisions = tableRows(section(text, "Design decisions and why")).length;
      if (decisions < 7 || decisions > 10) violations.push(`${f}: ${decisions} design decisions (need 7-10)`);
      if (!/```http\n/.test(section(text, "API design"))) violations.push(`${f}: API design has no http block`);
    }
    expect(violations).toEqual([]);
  });

  it("builds the architecture in 5-8 steps on one hero, then shows it with a stepper", () => {
    const violations: string[] = [];
    for (const { f, text } of pages) {
      const build = section(text, "Building the architecture, step by step");
      const steps = [...build.matchAll(/\n### Step (\d+): .+\(([A-Z]\d+(?:, [A-Z]\d+)*)\)\n/g)].map((m) =>
        Number(m[1])
      );
      if (steps.length < 5 || steps.length > 8) violations.push(`${f}: ${steps.length} build steps (need 5-8)`);
      if (JSON.stringify(steps) !== JSON.stringify(steps.map((_, i) => i + 1)))
        violations.push(`${f}: steps are not numbered 1..n with requirement ids in the title`);
      for (const part of build.split("\n### Step ").slice(1)) {
        const n = part.split(":")[0];
        if (!new RegExp(`<AnimatedDiagram\\b[^>]*architecture"[^>]*step=\\{${n}\\}`).test(part))
          violations.push(`${f}: Step ${n} has no hero at step={${n}}`);
        for (const b of ["- **Adds:**", "- **Flow:**", "- **Why this and not that:**"])
          if (!part.includes(b)) violations.push(`${f}: Step ${n} has no ${b}`);
      }
      if (!/<AnimatedDiagram\b[^>]*architecture"[^>]*\bstepper\b/.test(section(text, "Final architecture")))
        violations.push(`${f}: Final architecture has no hero stepper`);
    }
    expect(violations).toEqual([]);
  });

  it("justifies every component: 6+ subsections, each with a choice, a why and a why-not", () => {
    const violations: string[] = [];
    for (const { f, text } of pages) {
      const parts = section(text, "Component choices and why").split("\n### ").slice(1);
      if (parts.length < 6) violations.push(`${f}: ${parts.length} component subsections (need 6+)`);
      for (const p of parts) {
        const title = p.split("\n")[0];
        if (!p.includes("- **Choice:**")) violations.push(`${f}: "${title}" has no Choice bullet`);
        if (!/- \*\*Why:\*\*/.test(p)) violations.push(`${f}: "${title}" has no Why bullet`);
        if (!p.includes("- **Why not")) violations.push(`${f}: "${title}" has no Why not bullet`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("ties the design to 5+ principles and to system design patterns", () => {
    const violations: string[] = [];
    for (const { f, text } of pages) {
      const sec = section(text, "Principles and patterns used");
      const principles = tableRows(section(sec, "GenAI principles", "###"));
      if (principles.length < 5) violations.push(`${f}: ${principles.length} principle rows (need 5+)`);
      for (const r of principles) {
        if (!r.includes("](/genai-system-design/case-studies/design-principles#"))
          violations.push(`${f}: principle row without a principles-page link: ${r.slice(0, 60)}`);
        if (!r.includes("](/ai-system-design/"))
          violations.push(`${f}: principle row without a concept page: ${r.slice(0, 60)}`);
      }
      const patterns = tableRows(section(sec, "System design patterns", "###"));
      if (patterns.length < 3) violations.push(`${f}: ${patterns.length} pattern rows (need 3+)`);
      for (const r of patterns)
        if (!r.includes("](/system-design/patterns/"))
          violations.push(`${f}: pattern row without a link: ${r.slice(0, 60)}`);
    }
    expect(violations).toEqual([]);
  });

  it("has 7+ figures with a stepper, a sequence and a waterfall, and no Mermaid", () => {
    const violations: string[] = [];
    for (const { f, text } of pages) {
      const body = text.split("<InterviewQuestions")[0];
      const figures = body.match(/<AnimatedDiagram\b[^>]*>/g) ?? [];
      if (figures.length < 7) violations.push(`${f}: ${figures.length} figures (need 7+)`);
      if (!figures.some((d) => /\bstepper\b/.test(d))) violations.push(`${f}: no stepper figure`);
      const specs = figures.map(specText);
      if (specs.some((s) => !s)) violations.push(`${f}: a figure points at a spec that does not exist`);
      if (!specs.some((s) => /kind: "sequence"/.test(s))) violations.push(`${f}: no sequence figure`);
      if (!specs.some((s) => /\bwaterfall\(/.test(s))) violations.push(`${f}: no latency waterfall`);
      if (/^\s*```mermaid/m.test(text)) violations.push(`${f}: Mermaid fence`);
    }
    expect(violations).toEqual([]);
  });

  it("asks 10-12 questions, 4+ Senior and 2+ Junior, each answered in 3-5 bullets", () => {
    const violations: string[] = [];
    for (const { f, text } of pages) {
      const qs = [...text.matchAll(/<InterviewQuestion\b((?:[^>"]|"[^"]*")*)>([\s\S]*?)<\/InterviewQuestion>/g)];
      if (qs.length < 10 || qs.length > 12) violations.push(`${f}: ${qs.length} questions (need 10-12)`);
      const levels = qs.map((m) => m[1].match(/level="(\w+)"/)?.[1]);
      if (levels.filter((l) => l === "Senior").length < 4) violations.push(`${f}: fewer than 4 Senior questions`);
      if (levels.filter((l) => l === "Junior").length < 2) violations.push(`${f}: fewer than 2 Junior questions`);
      for (const m of qs) {
        const body = m[2].trim();
        const bullets = body.split("\n").filter((l) => l.trim().startsWith("- ")).length;
        if (!body.startsWith("- ") || bullets < 3 || bullets > 5)
          violations.push(`${f}: answer with ${bullets} bullets: ${m[1].match(/question="([^"]*)"/)?.[1]}`);
        if (m[1].includes('level="Senior"') && !m[1].includes("followUps="))
          violations.push(`${f}: Senior question without followUps: ${m[1].match(/question="([^"]*)"/)?.[1]}`);
        if (/<AnimatedDiagram|```mermaid/.test(body)) violations.push(`${f}: a figure inside an answer`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("writes points, not paragraphs: no prose line over 200 characters", () => {
    const violations: string[] = [];
    for (const { f, text } of pages)
      for (const { line, n } of proseLines(text)) {
        const listed = /^(- |\* |\d+\. |\| |#|>)/.test(line);
        if (!listed && line.length > 200) violations.push(`${f}:${n}: prose line of ${line.length} characters`);
      }
    expect(violations).toEqual([]);
  });
});
