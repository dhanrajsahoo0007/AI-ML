import { describe, expect, it } from "vitest";
import { formatMinutes, totalMinutes } from "./learning-path-time";

describe("totalMinutes", () => {
  it("sums and skips missing values", () => {
    expect(totalMinutes([{ minutes: 10 }, {}, { minutes: 25 }])).toBe(35);
    expect(totalMinutes([])).toBe(0);
  });
});

describe("formatMinutes", () => {
  it("formats minutes and hours", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(60)).toBe("1 h");
    expect(formatMinutes(90)).toBe("1 h 30 min");
    expect(formatMinutes(0)).toBe("0 min");
  });
});
