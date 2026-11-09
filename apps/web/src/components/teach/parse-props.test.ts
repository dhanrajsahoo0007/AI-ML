import { describe, expect, it } from "vitest";
import { z } from "zod";
import { formatIssues, parseProps } from "./parse-props";

describe("formatIssues", () => {
  it("joins paths and messages", () => {
    expect(
      formatIssues([
        { path: ["rows", 1, "id"], message: "Required" },
        { path: [], message: "bad" },
      ])
    ).toBe("rows.1.id: Required; bad");
  });
});

describe("parseProps", () => {
  const schema = z.object({ title: z.string().min(1) }).strict();

  it("returns the parsed data", () => {
    expect(parseProps("X", schema, { title: "a" })).toEqual({ ok: true, data: { title: "a" } });
  });

  it("names the component in the error", () => {
    const r = parseProps("Numbers", schema, { title: "", extra: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toMatch(/^<Numbers>: /);
      expect(r.message).toMatch(/title/);
      expect(r.message).toMatch(/extra/);
    }
  });
});
