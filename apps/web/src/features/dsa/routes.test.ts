import { describe, expect, it } from "vitest";
import { sectionOfKind } from "../sections/registry";
import { problemsForTopic } from "./kind";
import { practiceGroups } from "./routes";
import { loadDsaItems, loadPatterns, type ValidProblem } from "./source";

// The topic page's practice list: grouped by each problem's first pattern, labelled from patterns.yaml.

const section = sectionOfKind("problems");
const items = loadDsaItems(section);

describe("practiceGroups", () => {
  it("groups a topic's problems under their first pattern, with its label, in content order", () => {
    const hashMaps = problemsForTopic(items, "hash-maps");
    const groups = practiceGroups(section, hashMaps);
    const labels = new Map(loadPatterns(section).map((p) => [p.slug, p.label]));
    const slugs = (list: ValidProblem[]) => list.map((x) => x.slug).sort();
    expect(slugs(groups.flatMap((g) => g.problems))).toEqual(slugs(hashMaps)); // each problem once
    for (const g of groups) {
      expect(g.label).toBe(labels.get(g.slug));
      for (const p of g.problems) expect(p.fm.patterns[0]).toBe(g.slug);
    }
  });
  it("keeps the order of first appearance and of the problems within a group", () => {
    const p = (slug: string, patterns: string[]) => ({ slug, fm: { patterns } }) as unknown as ValidProblem;
    const groups = practiceGroups(section, [p("a", ["matrix"]), p("b", ["hash-map"]), p("c", ["matrix", "x"])]);
    expect(groups.map((g) => [g.slug, g.label, g.problems.map((x) => x.slug)])).toEqual([
      ["matrix", "Grid / matrix", ["a", "c"]],
      ["hash-map", "Hash map", ["b"]],
    ]);
  });
});
