import { describe, expect, it } from "vitest";
import { buildIndex, generateUsers, parseQueryValue, runQuery, sampleValue } from "./index-playground";

const rows = generateUsers();

describe("generateUsers", () => {
  it("is deterministic and has unique ids and emails", () => {
    expect(rows).toHaveLength(1000);
    expect(generateUsers()).toEqual(rows);
    expect(new Set(rows.map((r) => r.email)).size).toBe(1000);
    for (const r of rows) {
      expect(r.age).toBeGreaterThanOrEqual(18);
      expect(r.age).toBeLessThanOrEqual(67);
    }
  });
});

describe("runQuery", () => {
  it("returns the same rows with and without an index", () => {
    for (const column of ["id", "email", "country", "age"] as const) {
      const value = parseQueryValue(column, sampleValue(rows, column));
      expect(value).not.toBeNull();
      const scan = runQuery(rows, column, value!, null);
      const seek = runQuery(rows, column, value!, buildIndex(rows, column));
      expect(seek.matches.map((r) => r.id).sort((a, b) => a - b)).toEqual(scan.matches.map((r) => r.id));
      expect(scan.rowsScanned).toBe(1000);
      expect(seek.rowsScanned).toBe(scan.matches.length);
      expect(seek.indexSteps).toBeLessThanOrEqual(11);
    }
  });

  it("finds one row by email in about log2(n) steps", () => {
    const r = runQuery(rows, "email", rows[10].email, buildIndex(rows, "email"));
    expect(r.matches).toEqual([rows[10]]);
    expect(r.indexSteps).toBe(10);
  });

  it("returns nothing for a missing value", () => {
    expect(runQuery(rows, "id", 5000, buildIndex(rows, "id")).matches).toEqual([]);
  });
});

describe("parseQueryValue", () => {
  it("coerces per column", () => {
    expect(parseQueryValue("age", "30")).toBe(30);
    expect(parseQueryValue("age", "3.5")).toBeNull();
    expect(parseQueryValue("country", " in ")).toBe("IN");
    expect(parseQueryValue("email", "A@B")).toBe("a@b");
    expect(parseQueryValue("id", " ")).toBeNull();
  });
});
