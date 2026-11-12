import { describe, expect, it } from "vitest";
import { buildProblemIndex, filterProblems, pageOf, PAGE_SIZE } from "./problem-index";
import type { ValidProblem } from "./source";

// The build-time index behind the problem list, and the client-side filter.

function problem(slug: string, fm: Partial<ValidProblem["fm"]>): ValidProblem {
  return {
    type: "problem",
    slug,
    href: `/x/problems/${slug}`,
    file: `${slug}.mdx`,
    data: {},
    issues: [],
    title: fm.title ?? slug,
    hasBreak: true,
    fm: {
      title: slug,
      description: "d",
      difficulty: "easy",
      patterns: ["hash-map"],
      topics: ["t"],
      companies: [],
      languages: ["javascript"],
      starter: { javascript: "x" },
      entry: { javascript: "x" },
      mode: "function",
      tests: { public: "tests/a.public.json", hidden: "tests/a.hidden.json" },
      complexity: { time: "O(1)", space: "O(1)" },
      related: [],
      status: "published",
      ...fm,
    },
  };
}

const problems = [
  problem("a", { title: "Rotting Oranges", difficulty: "medium", patterns: ["bfs", "matrix"], companies: ["meta"] }),
  problem("b", { title: "Two Sum", difficulty: "easy", patterns: ["hash-map"], companies: ["meta", "amazon"] }),
  problem("c", { title: "Word Ladder", difficulty: "hard", patterns: ["bfs"], companies: [], topics: ["t", "g"] }),
  problem("d", { status: "draft" }),
];

const index = buildProblemIndex({
  base: "/x/problems",
  problems,
  topicLabels: new Map([["t", "Topic T"]]),
  access: (p) => (p.fm.difficulty === "easy" ? "free" : "premium"),
  patternLabels: new Map([["bfs", "Breadth-first search"]]),
  companyLabels: new Map([
    ["meta", "Meta"],
    ["amazon", "Amazon"],
  ]),
});

describe("buildProblemIndex", () => {
  it("lists published problems only, with list fields and access", () => {
    expect(index.base).toBe("/x/problems");
    expect(index.problems.map((p) => p.slug)).toEqual(["a", "b", "c"]);
    expect(index.problems[1]).toEqual({
      slug: "b",
      title: "Two Sum",
      difficulty: "easy",
      patterns: ["hash-map"],
      topics: ["t"],
      companies: ["meta", "amazon"],
      access: "free",
    });
  });
  it("never carries starters, tests, complexity, editorial fields or per-problem links", () => {
    const json = JSON.stringify(index);
    for (const field of ["starter", "tests", "complexity", "entry", "related", "file", "href", "description"])
      expect(json).not.toContain(`"${field}"`);
  });
  it("builds facets with labels and counts; difficulties in easy → hard order", () => {
    expect(index.facets.difficulty.map((f) => f.value)).toEqual(["easy", "medium", "hard"]);
    expect(index.facets.pattern).toEqual([
      { value: "bfs", label: "Breadth-first search", count: 2 },
      { value: "hash-map", label: "hash-map", count: 1 },
      { value: "matrix", label: "matrix", count: 1 },
    ]);
    expect(index.facets.topic).toEqual([
      { value: "g", label: "g", count: 1 },
      { value: "t", label: "Topic T", count: 3 },
    ]);
    expect(index.facets.company).toEqual([
      { value: "amazon", label: "Amazon", count: 1 },
      { value: "meta", label: "Meta", count: 2 },
    ]);
  });
});

describe("filterProblems", () => {
  const slugs = (f: Parameters<typeof filterProblems>[1]) => filterProblems(index.problems, f).map((p) => p.slug);
  it("returns everything with no filter", () => expect(slugs({})).toEqual(["a", "b", "c"]));
  it("filters by difficulty, pattern and company, and combines them", () => {
    expect(slugs({ difficulty: "medium" })).toEqual(["a"]);
    expect(slugs({ pattern: "bfs" })).toEqual(["a", "c"]);
    expect(slugs({ company: "meta" })).toEqual(["a", "b"]);
    expect(slugs({ pattern: "bfs", company: "meta" })).toEqual(["a"]);
    expect(slugs({ difficulty: "easy", pattern: "bfs" })).toEqual([]);
  });
  it("filters by topic and by title text, ignoring case and surrounding spaces", () => {
    expect(slugs({ topic: "g" })).toEqual(["c"]);
    expect(slugs({ q: "  OR " })).toEqual(["a", "c"]);
    expect(slugs({ q: "TWO" })).toEqual(["b"]);
    expect(slugs({ q: "two", topic: "g" })).toEqual([]);
    expect(slugs({ q: "   " })).toEqual(["a", "b", "c"]);
  });
});

describe("pageOf", () => {
  const rows = Array.from({ length: 2 * PAGE_SIZE + 3 }, (_, i) => i);
  it("cuts the list into pages of PAGE_SIZE rows", () => {
    expect(PAGE_SIZE).toBe(50);
    expect(pageOf(rows, 1)).toMatchObject({ page: 1, pages: 3, rows: rows.slice(0, 50) });
    expect(pageOf(rows, 3).rows).toEqual([100, 101, 102]);
  });
  it("clamps the page to the pages that exist", () => {
    expect(pageOf(rows, 9).page).toBe(3);
    expect(pageOf(rows, 0).page).toBe(1);
    expect(pageOf([], 4)).toEqual({ rows: [], page: 1, pages: 1 });
  });
});
