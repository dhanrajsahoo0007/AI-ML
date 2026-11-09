import { describe, expect, it } from "vitest";
import { DEFAULT_ESTIMATE, estimate } from "./estimate";

describe("estimate", () => {
  const r = estimate(DEFAULT_ESTIMATE);

  it("derives QPS from DAU and actions", () => {
    expect(r.requestsPerDay).toBe(100_000_000);
    expect(r.avgQps).toBeCloseTo(1157.4, 1);
    expect(r.peakQps).toBeCloseTo(3472.2, 1);
  });

  it("splits reads and writes by the ratio", () => {
    expect(r.writeQps).toBeCloseTo(r.avgQps / 11);
    expect(r.readQps).toBeCloseTo((r.avgQps * 10) / 11);
    expect(r.writeQps + r.readQps).toBeCloseTo(r.avgQps);
  });

  it("derives storage from writes and payload", () => {
    expect(r.writesPerDay).toBeCloseTo(100_000_000 / 11);
    expect(r.storagePerDay).toBeCloseTo((100_000_000 / 11) * 1000);
    expect(r.storagePerYear).toBeCloseTo(r.storagePerDay * 365);
    expect(r.storageRetained).toBeCloseTo(r.storagePerDay * 365 * 5);
  });

  it("derives bandwidth from QPS and payload", () => {
    expect(r.ingressBps).toBeCloseTo(r.writeQps * 1000);
    expect(r.egressBps).toBeCloseTo(r.readQps * 1000);
  });

  it("shows the working for every line", () => {
    expect(r.lines).toHaveLength(10);
    expect(r.lines[0]).toEqual({ label: "Requests per day", formula: "10M users × 10 actions", value: "100M" });
    expect(r.lines[1].value).toBe("1.16K");
    expect(r.lines[5].value).toBe("9.09 GB");
    for (const line of r.lines) expect(line.formula.length).toBeGreaterThan(0);
  });

  it("handles a write-only workload", () => {
    const w = estimate({ ...DEFAULT_ESTIMATE, readWriteRatio: 0 });
    expect(w.writeQps).toBeCloseTo(w.avgQps);
    expect(w.readQps).toBeCloseTo(0);
  });
});
