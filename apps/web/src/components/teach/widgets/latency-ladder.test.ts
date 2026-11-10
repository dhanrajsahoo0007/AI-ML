import { describe, expect, it } from "vitest";
import { LATENCY_ROWS, LATENCY_ROW_BY_ID, compareRows, fitIn, logFraction } from "./latency-ladder";

describe("LATENCY_ROWS", () => {
  it("is sorted from fastest to slowest with unique ids", () => {
    for (let i = 1; i < LATENCY_ROWS.length; i++) {
      expect(LATENCY_ROWS[i].ns).toBeGreaterThanOrEqual(LATENCY_ROWS[i - 1].ns);
    }
    expect(new Set(LATENCY_ROWS.map((r) => r.id)).size).toBe(LATENCY_ROWS.length);
    expect(LATENCY_ROWS[0].ns).toBe(1);
    expect(LATENCY_ROWS[LATENCY_ROWS.length - 1].ns).toBe(150e6);
  });

  it("is indexed by id", () => {
    expect(LATENCY_ROW_BY_ID.memory.ns).toBe(100);
  });
});

describe("logFraction", () => {
  it("maps 1 ns to 0 and the slowest row to 1", () => {
    expect(logFraction(1)).toBe(0);
    expect(logFraction(150e6)).toBe(1);
    expect(logFraction(1000, 1e6)).toBeCloseTo(0.5);
  });
});

describe("fitIn", () => {
  it("counts operations in a window", () => {
    expect(fitIn(100, 100)).toBe(1_000_000);
    expect(fitIn(100, 10_000_000)).toBe(10);
    expect(fitIn(100, 150_000_000)).toBe(0);
  });
});

describe("compareRows", () => {
  const seek = LATENCY_ROW_BY_ID["disk-seek"];
  const mem = LATENCY_ROW_BY_ID.memory;

  it("describes a slower row as a multiple", () => {
    expect(compareRows(seek, mem)).toBe("One HDD disk seek = 100,000× main memory reference");
  });

  it("describes a faster row as how many fit", () => {
    expect(compareRows(mem, seek)).toBe("100,000 of these fit in one HDD disk seek");
  });

  it("handles the same row", () => {
    expect(compareRows(mem, mem)).toMatch(/comparing against/);
    expect(compareRows(LATENCY_ROW_BY_ID.l2, LATENCY_ROW_BY_ID.l1)).toBe(
      "One L2 cache reference = 4× L1 cache reference"
    );
  });
});
