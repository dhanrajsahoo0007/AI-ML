import { describe, expect, it } from "vitest";
import { compareSchema, compareShape } from "./compare-schema";

describe("compareShape", () => {
  it("accepts matching columns and rows", () => {
    expect(compareShape(["a", "b"], [["x", true]], false)).toBeNull();
  });

  it("accepts a children table without data", () => {
    expect(compareShape(undefined, undefined, true)).toBeNull();
  });

  it("reports the first row with the wrong length", () => {
    expect(compareShape(["a", "b"], [["x", "y"], ["z"]], false)).toBe("row 2 has 1 cells, expected 2");
  });

  it("needs columns with rows, and rows with columns", () => {
    expect(compareShape(undefined, [["x"]], false)).toBe("rows need columns");
    expect(compareShape(["a"], undefined, false)).toBe("rows are required with columns");
    expect(compareShape(["a"], [], false)).toBe("rows are required with columns");
  });

  it("needs something to show", () => {
    expect(compareShape(undefined, undefined, false)).toMatch(/give columns and rows/);
  });
});

describe("compareSchema", () => {
  it("rejects a non boolean, non string cell", () => {
    expect(compareSchema.safeParse({ columns: ["a"], rows: [[1]] }).success).toBe(false);
  });

  it("runs the shape check", () => {
    const r = compareSchema.safeParse({ columns: ["a", "b"], rows: [["x"]] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/row 1 has 1 cells/);
  });
});
