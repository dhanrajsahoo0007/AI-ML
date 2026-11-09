import { describe, expect, it } from "vitest";
import { CACHE_POLICIES, DEFAULT_SEQUENCE, hitRatio, parseSequence, runCache } from "./cache-sim";

describe("parseSequence", () => {
  it("splits on spaces, commas and semicolons and upper-cases", () => {
    expect(parseSequence("a b,c;  d\n e")).toEqual(["A", "B", "C", "D", "E"]);
    expect(parseSequence("")).toEqual([]);
    expect(parseSequence("a b c", 2)).toEqual(["A", "B"]);
  });
});

describe("runCache", () => {
  const seq = parseSequence("A B C A D B E");

  it("LRU evicts the least recently used key", () => {
    const steps = runCache("lru", 3, seq);
    // A B C -> hit A (order B C A) -> miss D evicts B -> miss B evicts C -> miss E evicts A
    expect(steps.map((s) => s.hit)).toEqual([false, false, false, true, false, false, false]);
    expect(steps[4].evicted).toBe("B");
    expect(steps[5].evicted).toBe("C");
    expect(steps[6].evicted).toBe("A");
    expect(steps[6].contents).toEqual(["D", "B", "E"]);
    expect(steps[6].hits).toBe(1);
    expect(steps[6].misses).toBe(6);
  });

  it("FIFO evicts the oldest insertion even when it was just read", () => {
    const steps = runCache("fifo", 3, seq);
    // A B C -> hit A -> miss D evicts A (first in) -> miss B? B is still there: hit
    expect(steps[4].evicted).toBe("A");
    expect(steps[5].hit).toBe(true);
    expect(steps[6].evicted).toBe("B");
  });

  it("LFU keeps frequently used keys and breaks ties by recency", () => {
    const steps = runCache("lfu", 3, parseSequence("A A B C D"));
    // A has count 2; B and C count 1; D evicts the least recent of the ties: B.
    expect(steps[4].evicted).toBe("B");
    expect(steps[4].contents).toEqual(["C", "D", "A"]);
    expect(steps[4].counts).toEqual({ A: 2, C: 1, D: 1 });
  });

  it("never exceeds capacity and records every step", () => {
    for (const { value } of CACHE_POLICIES) {
      const steps = runCache(value, 4, parseSequence(DEFAULT_SEQUENCE));
      expect(steps).toHaveLength(14);
      for (const s of steps) expect(s.contents.length).toBeLessThanOrEqual(4);
    }
  });

  it("handles capacity 0", () => {
    const steps = runCache("lru", 0, ["A", "A"]);
    expect(steps.map((s) => s.hit)).toEqual([false, false]);
    expect(steps[1].contents).toEqual([]);
  });
});

describe("hitRatio", () => {
  it("is 0 before any step and the running ratio afterwards", () => {
    const steps = runCache("lru", 2, parseSequence("A A B A"));
    expect(hitRatio(steps, 0)).toBe(0);
    expect(hitRatio([])).toBe(0);
    expect(hitRatio(steps, 2)).toBe(0.5);
    expect(hitRatio(steps)).toBe(0.5);
    expect(hitRatio(steps, 99)).toBe(0.5);
  });
});
