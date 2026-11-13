import { describe, expect, it } from "vitest";
import { sectionOfKind } from "../sections/registry";
import { judgeCases, judgeParams } from "./judge";
import { HIDDEN_NAME_SENTINEL } from "./schema";
import { loadDsaItems, readHiddenTestsForValidation, validProblems } from "./source";

// The submit judge's data: one route per built problem, serving the hidden cases without their names.

const section = sectionOfKind("problems");
const problems = validProblems(loadDsaItems(section)).filter((p) => p.fm.status !== "draft");

describe("judge route data", () => {
  it("has one route per built problem and none for outlines", () => {
    expect(judgeParams().map((p) => p.slug)).toEqual(problems.map((p) => p.slug));
  });

  it("serves a problem's hidden cases as arguments and expected values only", () => {
    for (const p of problems) {
      const hidden = readHiddenTestsForValidation(section, p);
      const served = judgeCases(p.slug);
      expect(served, p.slug).toEqual(hidden.map(({ args, expected }) => ({ args, expected })));
      expect(HIDDEN_NAME_SENTINEL.test(JSON.stringify(served)), p.slug).toBe(false);
    }
  });

  it("knows nothing about an unknown slug or an outline", () => {
    expect(judgeCases("no-such-problem")).toBeNull();
    const outline = loadDsaItems(section).find((i) => i.type === "outline");
    if (outline) expect(judgeCases(outline.slug)).toBeNull();
  });
});
