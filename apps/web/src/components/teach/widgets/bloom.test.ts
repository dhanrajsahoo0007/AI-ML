import { describe, expect, it } from "vitest";
import { bloomAdd, bloomBuild, bloomPositions, bloomTest, falsePositiveRate, normalizeWord, optimalK } from "./bloom";

describe("bloomPositions", () => {
  it("returns k positions inside [0, m) and is deterministic", () => {
    const p = bloomPositions("apple", 3, 64);
    expect(p).toHaveLength(3);
    for (const x of p) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(64);
      expect(Number.isInteger(x)).toBe(true);
    }
    expect(p).toEqual(bloomPositions("apple", 3, 64));
    expect(bloomPositions("apple", 0, 64)).toEqual([]);
    expect(bloomPositions("apple", 3, 0)).toEqual([]);
  });

  it("gives k distinct positions for any m >= k, not only powers of 2", () => {
    // An odd step can share a factor with m (or be 0 mod m, e.g. 27 % 9), which collapsed positions.
    for (const m of [8, 9, 12, 15, 24, 40, 48, 56, 64]) {
      for (let w = 0; w < 200; w++) {
        const p = bloomPositions(`word${w}`, 6, m);
        expect(new Set(p).size).toBe(6);
      }
    }
  });
});

describe("add / test / build", () => {
  it("finds added words and never a false negative", () => {
    const words = ["apple", "banana", "cherry", "date"];
    const bits = bloomBuild(words, 3, 64);
    for (const w of words) expect(bloomTest(bits, bloomPositions(w, 3, 64))).toBe(true);
    expect(bits.filter(Boolean).length).toBeLessThanOrEqual(12);
    expect(bits).toHaveLength(64);
  });

  it("does not mutate the input bits", () => {
    const bits = new Array<boolean>(8).fill(false);
    const next = bloomAdd(bits, [1, 5]);
    expect(bits.every((b) => !b)).toBe(true);
    expect(next[1]).toBe(true);
    expect(next[5]).toBe(true);
  });

  it("reports a clear bit as definitely absent", () => {
    const bits = new Array<boolean>(16).fill(false);
    expect(bloomTest(bits, [0, 1])).toBe(false);
    expect(bloomTest(bits, [])).toBe(false);
  });
});

describe("falsePositiveRate", () => {
  it("matches the formula and edge cases", () => {
    expect(falsePositiveRate(64, 3, 0)).toBe(0);
    expect(falsePositiveRate(0, 3, 5)).toBe(1);
    const p = falsePositiveRate(100, 3, 20);
    expect(p).toBeCloseTo(Math.pow(1 - Math.exp(-0.6), 3), 10);
    expect(falsePositiveRate(100, 3, 50)).toBeGreaterThan(p);
  });
});

describe("optimalK", () => {
  it("is m/n · ln 2 rounded, at least 1", () => {
    expect(optimalK(100, 10)).toBe(7);
    expect(optimalK(64, 100)).toBe(1);
    expect(optimalK(64, 0)).toBe(1);
  });
});

describe("normalizeWord", () => {
  it("trims and lower-cases", () => {
    expect(normalizeWord("  Apple ")).toBe("apple");
  });
});
