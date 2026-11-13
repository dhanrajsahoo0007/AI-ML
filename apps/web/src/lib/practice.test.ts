import { describe, expect, it } from "vitest";
import {
  ANSWER_PARTS,
  ANSWER_SECONDS,
  clock,
  parsePracticeLog,
  partAt,
  shuffled,
  weakestFirst,
  withPractice,
} from "./practice";

describe("parsePracticeLog", () => {
  it("returns an empty log for nothing, bad JSON and non-objects", () => {
    expect(parsePracticeLog(null)).toEqual({});
    expect(parsePracticeLog("{oops")).toEqual({});
    expect(parsePracticeLog("[1,2]")).toEqual({});
    expect(parsePracticeLog('"text"')).toEqual({});
  });

  it("keeps well-formed entries and drops the rest", () => {
    const raw = JSON.stringify({
      good: { rating: 4, times: 2, at: "2026-11-13T10:00:00.000Z" },
      noTimes: { rating: 2, at: "2026-11-12T10:00:00.000Z" },
      badRating: { rating: 9, times: 1, at: "2026-11-13T10:00:00.000Z" },
      halfRating: { rating: 2.5, times: 1, at: "2026-11-13T10:00:00.000Z" },
      noDate: { rating: 3, times: 1 },
      notAnObject: 5,
    });
    expect(parsePracticeLog(raw)).toEqual({
      good: { rating: 4, times: 2, at: "2026-11-13T10:00:00.000Z" },
      noTimes: { rating: 2, times: 1, at: "2026-11-12T10:00:00.000Z" },
    });
  });
});

describe("withPractice", () => {
  it("counts each practice and keeps the latest rating and time", () => {
    const first = withPractice({}, "q1", 2, new Date("2026-11-13T10:00:00.000Z"));
    expect(first.q1).toEqual({ rating: 2, times: 1, at: "2026-11-13T10:00:00.000Z" });
    const second = withPractice(first, "q1", 4, new Date("2026-11-14T10:00:00.000Z"));
    expect(second.q1).toEqual({ rating: 4, times: 2, at: "2026-11-14T10:00:00.000Z" });
    expect(first.q1.times).toBe(1);
  });
});

describe("weakestFirst", () => {
  const log = {
    strong: { rating: 5 as const, times: 1, at: "2026-11-10T00:00:00.000Z" },
    weakOld: { rating: 2 as const, times: 1, at: "2026-11-01T00:00:00.000Z" },
    weakNew: { rating: 2 as const, times: 3, at: "2026-11-12T00:00:00.000Z" },
  };

  it("puts never-practised questions first, then the lowest rating, then the oldest practice", () => {
    expect(weakestFirst(["strong", "weakNew", "new1", "weakOld", "new2"], log)).toEqual([
      "new1",
      "new2",
      "weakOld",
      "weakNew",
      "strong",
    ]);
  });

  it("does not change the list it was given", () => {
    const ids = ["strong", "new1"];
    weakestFirst(ids, log);
    expect(ids).toEqual(["strong", "new1"]);
  });
});

describe("shuffled", () => {
  it("keeps every item exactly once", () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const items = ["a", "b", "c", "d", "e", "f"];
    const out = shuffled(items, random);
    expect([...out].sort()).toEqual(items);
    expect(out).not.toEqual(items);
    expect(items).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
});

describe("the answer timer", () => {
  it("has parts whose shares add up to the whole answer", () => {
    expect(ANSWER_PARTS.reduce((n, p) => n + p.share, 0)).toBeCloseTo(1);
  });

  it("names the part for a moment in the answer", () => {
    expect(partAt(0)?.key).toBe("situation");
    expect(partAt(17.9)?.key).toBe("situation");
    expect(partAt(18)?.key).toBe("action");
    expect(partAt(89.9)?.key).toBe("action");
    expect(partAt(90)?.key).toBe("result");
    expect(partAt(108)?.key).toBe("learning");
    expect(partAt(ANSWER_SECONDS)).toBeNull();
    expect(partAt(300)).toBeNull();
  });

  it("formats seconds as a clock", () => {
    expect(clock(0)).toBe("0:00");
    expect(clock(65.8)).toBe("1:05");
    expect(clock(120)).toBe("2:00");
    expect(clock(-3)).toBe("0:00");
  });
});
