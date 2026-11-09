import { describe, expect, it } from "vitest";
import { HASH_SPACE, hash32, lcg, randInt } from "./hash";

describe("hash32", () => {
  it("is stable, unsigned and spreads sequential strings", () => {
    expect(hash32("user:1")).toBe(hash32("user:1"));
    for (const s of ["", "a", "S1#7", "hello world"]) {
      const h = hash32(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(HASH_SPACE);
    }
    expect(hash32("user:1")).toBeLessThan(HASH_SPACE);
    // Sequential keys should land in different 8ths of the space, not all in one.
    const buckets = new Set(Array.from({ length: 64 }, (_, i) => Math.floor((hash32(`user:${i}`) / HASH_SPACE) * 8)));
    expect(buckets.size).toBeGreaterThanOrEqual(6);
  });

  it("separates strings that differ in one middle character", () => {
    // Regression: with FNV-1a these two landed one degree apart on the ring.
    const gap = Math.abs(hash32("S1#0") - hash32("S2#0")) / HASH_SPACE;
    expect(gap).toBeGreaterThan(0.01);
  });
});

describe("lcg", () => {
  it("is deterministic for a seed and yields values in [0, 1)", () => {
    const a = lcg(42);
    const b = lcg(42);
    for (let i = 0; i < 50; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("differs between seeds", () => {
    expect(lcg(1)()).not.toBe(lcg(2)());
  });
});

describe("randInt", () => {
  it("stays within the inclusive range and reaches both ends", () => {
    const next = lcg(7);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = randInt(next, 3, 6);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });
});
