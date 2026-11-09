import { describe, expect, it } from "vitest";
import { NINES, NINES_LABEL, downtimeFor, downtimeRatio, nearestNines, ninesHint } from "./nines";

describe("downtimeFor", () => {
  it("computes the well-known figures", () => {
    const three = downtimeFor(99.9);
    expect(three.perDay).toBeCloseTo(86.4, 5);
    expect(three.perYear).toBeCloseTo(31_536, 3);
    const four = downtimeFor(99.99);
    expect(four.perYear).toBeCloseTo(3_153.6, 3);
    expect(four.perMonth).toBeCloseTo(259.2, 3);
    expect(downtimeFor(100).perYear).toBe(0);
  });

  it("scales by period", () => {
    const d = downtimeFor(99);
    expect(d.perWeek).toBeCloseTo(d.perDay * 7);
    expect(d.perMonth).toBeCloseTo(d.perDay * 30);
    expect(d.perYear).toBeCloseTo(d.perDay * 365);
  });
});

describe("downtimeRatio", () => {
  it("is 10× per extra nine", () => {
    expect(downtimeRatio(99.9, 99.99)).toBeCloseTo(10);
    expect(downtimeRatio(99, 99.999)).toBeCloseTo(1000);
    expect(downtimeRatio(99.9, 99.9)).toBe(1);
    expect(downtimeRatio(99.9, 99)).toBeCloseTo(0.1);
    expect(downtimeRatio(99, 100)).toBe(Infinity);
  });
});

describe("nearestNines", () => {
  it("snaps to a supported level", () => {
    expect(nearestNines(99.9)).toBe(99.9);
    expect(nearestNines(99.93)).toBe(99.95);
    expect(nearestNines(50)).toBe(99);
    expect(nearestNines(100)).toBe(99.999);
  });
});

describe("labels and hints", () => {
  it("exist for every level", () => {
    for (const n of NINES) {
      expect(NINES_LABEL[n].length).toBeGreaterThan(0);
      expect(ninesHint(n).length).toBeGreaterThan(0);
    }
  });
});
