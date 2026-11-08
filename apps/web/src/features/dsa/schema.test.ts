import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { sectionOfKind } from "../sections/registry";
import {
  classCaseSchema,
  patternsSchema,
  problemFrontmatterSchema,
  testFileSchema,
  topicFrontmatterSchema,
} from "./schema";
import { dsaDir, splitProblemBody } from "./source";

// Frontmatter and test-file schemas (plan §15.1), checked against a valid fixture and the real content.

const valid = {
  title: "Two Sum",
  description: "Find two positions that add up to a target.",
  difficulty: "easy",
  patterns: ["hash-map"],
  topics: ["hash-maps"],
  companies: ["amazon"],
  access: "free",
  languages: ["javascript", "python"],
  entry: { javascript: "twoSum", python: "two_sum" },
  starter: { javascript: "function twoSum() {}", python: "def two_sum(): pass" },
  tests: { public: "tests/two-sum.public.json", hidden: "tests/two-sum.hidden.json" },
  complexity: { time: "O(n)", space: "O(n)" },
  related: ["/system-design/patterns/caching"],
};

const issuePaths = (data: unknown) => {
  const r = problemFrontmatterSchema.safeParse(data);
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
};

describe("problem frontmatter", () => {
  it("accepts a complete problem and fills defaults", () => {
    const fm = problemFrontmatterSchema.parse(valid);
    expect(fm.mode).toBe("function");
    expect(fm.status).toBe("published");
  });
  it("rejects unknown difficulties, languages and fields", () => {
    expect(issuePaths({ ...valid, difficulty: "trivial" })).toEqual(["difficulty"]);
    expect(issuePaths({ ...valid, languages: ["cobol"] })).toEqual(["languages.0"]);
    expect(issuePaths({ ...valid, solution: "x" })).toEqual([""]);
  });
  it("requires test files under tests/ with the right suffix", () => {
    expect(issuePaths({ ...valid, tests: { public: "two-sum.json", hidden: "tests/two-sum.hidden.json" } })).toEqual([
      "tests.public",
    ]);
    expect(issuePaths({ ...valid, tests: { public: "tests/a.public.json", hidden: "tests/a.public.json" } })).toEqual([
      "tests.hidden",
    ]);
  });
  it("requires kebab-case tags, identifiers as entry points and site paths as related links", () => {
    expect(issuePaths({ ...valid, patterns: ["Hash Map"] })).toEqual(["patterns.0"]);
    expect(issuePaths({ ...valid, entry: { javascript: "two-sum" } })).toEqual(["entry.javascript"]);
    expect(issuePaths({ ...valid, related: ["https://example.com"] })).toEqual(["related.0"]);
  });
  it("validates every problem and topic in the content tree", () => {
    const dir = dsaDir(sectionOfKind("problems"));
    for (const [sub, schema] of [
      ["problems", problemFrontmatterSchema],
      ["topics", topicFrontmatterSchema],
    ] as const) {
      for (const f of fs.readdirSync(path.join(dir, sub))) {
        const r = schema.safeParse(matter(fs.readFileSync(path.join(dir, sub, f), "utf8")).data);
        expect(r.success, `${sub}/${f}: ${r.success ? "" : r.error.message}`).toBe(true);
      }
    }
  });
});

describe("test files", () => {
  it("need at least one case with args and expected", () => {
    expect(testFileSchema.safeParse([]).success).toBe(false);
    expect(testFileSchema.safeParse([{ args: [1], expected: 2 }]).success).toBe(true);
    expect(testFileSchema.safeParse([{ args: 1, expected: 2 }]).success).toBe(false);
    expect(testFileSchema.safeParse([{ args: [], expected: 1, answer: 1 }]).success).toBe(false);
  });
  it("class cases have one argument list and one expected value per operation", () => {
    expect(
      classCaseSchema.safeParse({
        args: [
          ["LRUCache", "get"],
          [[1], [2]],
        ],
        expected: [null, -1],
      }).success
    ).toBe(true);
    expect(classCaseSchema.safeParse({ args: [["LRUCache", "get"], [[1]]], expected: [null, -1] }).success).toBe(false);
    expect(classCaseSchema.safeParse({ args: [["LRUCache"], [[1]]], expected: [null, 1] }).success).toBe(false);
  });
});

describe("patterns", () => {
  it("rejects duplicates", () => {
    expect(
      patternsSchema.safeParse([
        { slug: "a", label: "A" },
        { slug: "a", label: "B" },
      ]).success
    ).toBe(false);
  });
});

describe("splitProblemBody", () => {
  it("splits at <PremiumBreak/> on its own line", () => {
    expect(splitProblemBody("Statement\n\n<PremiumBreak />\n\nEditorial\n")).toEqual({
      statement: "Statement\n\n",
      editorial: "\n\nEditorial\n",
    });
    expect(splitProblemBody("A\n<PremiumBreak/>\nB")).toEqual({ statement: "A\n", editorial: "\nB" });
  });
  it("treats a body without the marker as statement only", () => {
    expect(splitProblemBody("Only `<PremiumBreak />` inline")).toEqual({
      statement: "Only `<PremiumBreak />` inline",
      editorial: null,
    });
  });
});
