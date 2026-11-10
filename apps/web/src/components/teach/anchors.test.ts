import { describe, expect, it } from "vitest";
import { duplicateAnchors, requirementAnchor } from "./anchors";

describe("requirementAnchor", () => {
  it("prefixes the id", () => {
    expect(requirementAnchor("F1")).toBe("req-F1");
    expect(requirementAnchor("NFR-2")).toBe("req-NFR-2");
  });

  it("cleans whitespace and punctuation", () => {
    expect(requirementAnchor(" F 1 ")).toBe("req-F-1");
    expect(requirementAnchor("F#1!")).toBe("req-F1");
  });
});

describe("duplicateAnchors", () => {
  it("finds ids that map to the same anchor", () => {
    expect(duplicateAnchors(["F1", "F2"])).toEqual([]);
    expect(duplicateAnchors(["F1", "F2", "F1", "F1"])).toEqual(["F1"]);
    expect(duplicateAnchors(["F 1", "F-1"])).toEqual(["F-1"]);
  });
});
