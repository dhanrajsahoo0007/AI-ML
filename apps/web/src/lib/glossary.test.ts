import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { glossarySection } from "@/features/sections/registry";
import { SHORT_MAX, getTerm, glossaryFile, loadGlossary, parseGlossary, sortByTerm, termHref } from "./glossary";

describe("glossary.yaml", () => {
  it("parses and has the core terms", () => {
    const entries = parseGlossary(fs.readFileSync(glossaryFile(), "utf8"));
    expect(entries.length).toBeGreaterThanOrEqual(40);
    const ids = new Set(entries.map((e) => e.id));
    for (const id of ["latency", "throughput", "qps", "cache", "cdn", "quorum", "wal", "p99", "tls", "api-gateway"]) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it("loads once and looks terms up by id", () => {
    expect(loadGlossary().length).toBeGreaterThan(0);
    expect(getTerm("latency")?.term).toBe("Latency");
    expect(getTerm("not-a-term")).toBeUndefined();
  });
});

describe("parseGlossary", () => {
  it("rejects duplicate ids", () => {
    const text = `
- id: a
  term: A
  short: One.
- id: a
  term: A again
  short: Two.
`;
    expect(() => parseGlossary(text, "test.yaml")).toThrow(/duplicate id "a"/);
  });

  it("rejects unknown and self related ids", () => {
    const text = `
- id: a
  term: A
  short: One.
  related: [a, b]
`;
    expect(() => parseGlossary(text, "test.yaml")).toThrow(/cannot relate to itself[\s\S]*unknown related id "b"/);
  });

  it("rejects a long short text and unknown keys", () => {
    const text = `
- id: a
  term: A
  short: "${"x".repeat(SHORT_MAX + 1)}"
  extra: nope
`;
    expect(() => parseGlossary(text, "test.yaml")).toThrow(/short is at most/);
    expect(() => parseGlossary(text, "test.yaml")).toThrow(/Unrecognized key/);
  });
});

describe("helpers", () => {
  it("sortByTerm sorts case-insensitively without mutating", () => {
    const list = [
      { id: "b", term: "beta", short: "." },
      { id: "a", term: "Alpha", short: "." },
    ];
    expect(sortByTerm(list).map((e) => e.id)).toEqual(["a", "b"]);
    expect(list[0].id).toBe("b");
  });

  it("termHref links into the owning section from the registry, only while it is on", () => {
    const owner = glossarySection();
    expect(owner).toBeDefined();
    expect(glossaryFile()).toBe(path.join(process.cwd(), "content", owner!.key, "glossary.yaml"));
    const on = { ...owner!, state: "on" as const };
    expect(termHref("hash-ring", on)).toBe(`${owner!.href}/glossary#hash-ring`);
    expect(termHref("hash-ring", { ...on, state: "hidden" })).toBeUndefined();
    expect(termHref("hash-ring", { ...on, state: "off" })).toBeUndefined();
  });
});
