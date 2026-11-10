import { describe, expect, it } from "vitest";
import { generateArrivals, peakAcceptedPerSecond, runLimiter, tally, type LimiterConfig } from "./rate-limiter";

const cfg: LimiterConfig = { limit: 5, windowMs: 1000, bucketSize: 5 };

describe("generateArrivals", () => {
  it("produces a sorted steady stream plus a burst", () => {
    const a = generateArrivals(2, 0);
    expect(a).toEqual([250, 750, 1250, 1750, 2250, 2750, 3250, 3750]);
    const b = generateArrivals(0, 4, 1000);
    expect(b).toEqual([1000, 1050, 1100, 1150]);
    const c = generateArrivals(3, 5);
    for (let i = 1; i < c.length; i++) expect(c[i]).toBeGreaterThanOrEqual(c[i - 1]);
    expect(c).toHaveLength(12 + 5);
  });
});

describe("runLimiter", () => {
  it("token bucket allows a burst up to the bucket size then refills", () => {
    const d = runLimiter("token-bucket", cfg, [0, 0, 0, 0, 0, 0, 0, 1000, 1000, 1000, 1000, 1000, 1000]);
    expect(d.slice(0, 7).map((x) => x.accepted)).toEqual([true, true, true, true, true, false, false]);
    // One second later 5 tokens have refilled.
    expect(d.slice(7).map((x) => x.accepted)).toEqual([true, true, true, true, true, false]);
  });

  it("sliding window counts accepted requests in the trailing second", () => {
    const d = runLimiter("sliding-window", cfg, [0, 100, 200, 300, 400, 500, 999, 1000, 1100]);
    expect(d.map((x) => x.accepted)).toEqual([true, true, true, true, true, false, false, true, true]);
    expect(d[5].detail).toBe("5/5 in the last 1000 ms");
  });

  it("fixed window lets a boundary burst through at double the limit", () => {
    const times = [900, 920, 940, 960, 980, 1000, 1020, 1040, 1060, 1080];
    const fixed = runLimiter("fixed-window", cfg, times);
    expect(tally(fixed)).toEqual({ accepted: 10, rejected: 0 });
    expect(peakAcceptedPerSecond(fixed)).toBe(10);
    const sliding = runLimiter("sliding-window", cfg, times);
    expect(tally(sliding)).toEqual({ accepted: 5, rejected: 5 });
    expect(peakAcceptedPerSecond(sliding)).toBe(5);
  });

  it("fixed window rejects beyond the limit inside one window", () => {
    const d = runLimiter("fixed-window", cfg, [0, 1, 2, 3, 4, 5, 1000]);
    expect(d.map((x) => x.accepted)).toEqual([true, true, true, true, true, false, true]);
    expect(d[5].detail).toBe("window 1 full (5)");
    expect(d[6].detail).toBe("1/5 in window 2");
  });
});

describe("tally and peakAcceptedPerSecond", () => {
  it("handle empty input", () => {
    expect(tally([])).toEqual({ accepted: 0, rejected: 0 });
    expect(peakAcceptedPerSecond([])).toBe(0);
  });
});
