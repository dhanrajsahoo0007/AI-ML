import { describe, expect, it } from "vitest";
import { parseTicks, withTick } from "./checklist";

describe("checklist ticks", () => {
  it("keeps lists of strings and drops the rest", () => {
    const raw = JSON.stringify({ plan: ["a", "a", 3, "b"], bad: "x", other: [] });
    expect(parseTicks(raw)).toEqual({ plan: ["a", "b"], other: [] });
    expect(parseTicks("nope")).toEqual({});
    expect(parseTicks("[1]")).toEqual({});
    expect(parseTicks(null)).toEqual({});
  });

  it("ticks and unticks one item of one list", () => {
    const one = withTick({}, "plan", "a", true);
    expect(one).toEqual({ plan: ["a"] });
    expect(withTick(one, "plan", "a", true)).toEqual({ plan: ["a"] });
    expect(withTick(one, "plan", "b", true)).toEqual({ plan: ["a", "b"] });
    expect(withTick(one, "plan", "a", false)).toEqual({ plan: [] });
    expect(withTick(one, "other", "z", true)).toEqual({ plan: ["a"], other: ["z"] });
  });
});
