import { describe, expect, it } from "vitest";
import { decisionTreeSchema, isQuestion, leafOf, nodeAt, pathTaken, type TreeNode } from "./decision-tree-model";

const tree: TreeNode = {
  q: "Do reads outnumber writes 10:1?",
  yes: { q: "Can data be a few seconds stale?", yes: "Add a cache", no: { answer: "Read replicas", href: "/x" } },
  no: "Scale the primary",
};

describe("nodeAt / pathTaken", () => {
  it("walks the answers", () => {
    expect(nodeAt(tree, [])).toBe(tree);
    expect(nodeAt(tree, [true, true])).toBe("Add a cache");
    expect(nodeAt(tree, [true, false])).toEqual({ answer: "Read replicas", href: "/x" });
    expect(nodeAt(tree, [false])).toBe("Scale the primary");
  });

  it("stops at a leaf when given extra answers", () => {
    expect(nodeAt(tree, [false, true, true])).toBe("Scale the primary");
    expect(pathTaken(tree, [false, true])).toEqual([{ q: "Do reads outnumber writes 10:1?", yes: false }]);
  });

  it("lists the path", () => {
    expect(pathTaken(tree, [true, false]).map((p) => p.yes)).toEqual([true, false]);
  });
});

describe("helpers", () => {
  it("tells questions from leaves and normalises leaves", () => {
    expect(isQuestion(tree)).toBe(true);
    expect(isQuestion("leaf")).toBe(false);
    expect(leafOf("A")).toEqual({ answer: "A" });
    expect(leafOf({ answer: "B", href: "/b" })).toEqual({ answer: "B", href: "/b" });
  });
});

describe("decisionTreeSchema", () => {
  it("accepts a nested tree", () => {
    expect(decisionTreeSchema.safeParse({ tree }).success).toBe(true);
  });

  it("rejects a question without both branches or an empty answer", () => {
    expect(decisionTreeSchema.safeParse({ tree: { q: "x", yes: "a" } }).success).toBe(false);
    expect(decisionTreeSchema.safeParse({ tree: "" }).success).toBe(false);
    expect(decisionTreeSchema.safeParse({ tree: { answer: "a", extra: 1 } }).success).toBe(false);
  });
});
