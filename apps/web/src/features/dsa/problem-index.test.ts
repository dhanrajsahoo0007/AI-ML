import { describe, expect, it } from "vitest";
import { buildProblemIndex, filterProblems } from "./problem-index";
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
  problem("a", { difficulty: "medium", patterns: ["bfs", "matrix"], companies: ["meta"] }),
  problem("b", { difficulty: "easy", patterns: ["hash-map"], companies: ["meta", "amazon"] }),
  problem("c", { difficulty: "hard", patterns: ["bfs"], companies: [] }),
  problem("d", { status: "draft" }),
];

const index = buildProblemIndex({
  problems,
  access: (p) => (p.fm.difficulty === "easy" ? "free" : "premium"),
  patternLabels: new Map([["bfs", "Breadth-first search"]]),
  companyLabels: new Map([
    ["meta", "Meta"],
    ["amazon", "Amazon"],
  ]),
});

describe("buildProblemIndex", () => {
  it("lists published problems only, with list fields and access", () => {
    expect(index.problems.map((p) => p.slug)).toEqual(["a", "b", "c"]);
    expect(index.problems[1]).toEqual({
      slug: "b",
      href: "/x/problems/b",
      title: "b",
      difficulty: "easy",
      patterns: ["hash-map"],
      companies: ["meta", "amazon"],
      access: "free",
    });
  });
  it("never carries starters, tests, complexity or editorial fields", () => {
    const json = JSON.stringify(index);
    for (const field of ["starter", "tests", "complexity", "entry", "related", "file"])
      expect(json).not.toContain(`"${field}"`);
  });
  it("builds facets with labels and counts; difficulties in easy → hard order", () => {
    expect(index.facets.difficulty.map((f) => f.value)).toEqual(["easy", "medium", "hard"]);
    expect(index.facets.pattern).toEqual([
      { value: "bfs", label: "Breadth-first search", count: 2 },
      { value: "hash-map", label: "hash-map", count: 1 },
      { value: "matrix", label: "matrix", count: 1 },
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
});
