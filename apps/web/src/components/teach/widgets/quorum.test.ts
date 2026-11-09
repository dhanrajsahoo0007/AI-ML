import { describe, expect, it } from "vitest";
import {
  QUORUM_PRESETS,
  analyzeQuorum,
  clampQuorum,
  quorumHints,
  quorumVerdict,
  worstReadSet,
  writeSet,
} from "./quorum";

describe("analyzeQuorum", () => {
  it("is strong when R + W > N", () => {
    const a = analyzeQuorum(3, 2, 2);
    expect(a).toMatchObject({ strong: true, overlap: 1, writeTolerates: 1, readTolerates: 1, writeMajority: true });
    expect(a.readLatencyMs).toBeGreaterThan(analyzeQuorum(3, 1, 2).readLatencyMs);
  });

  it("is not strong when R + W <= N", () => {
    const a = analyzeQuorum(3, 1, 1);
    expect(a.strong).toBe(false);
    expect(a.overlap).toBe(-1);
    expect(a.writeMajority).toBe(false);
  });

  it("clamps R and W to N", () => {
    expect(clampQuorum(3, 9, 0)).toEqual({ n: 3, r: 3, w: 1 });
    expect(clampQuorum(99, 1, 1).n).toBe(7);
  });
});

describe("sets", () => {
  it("overlap exactly when the quorum is strong", () => {
    for (const p of QUORUM_PRESETS) {
      const ws = new Set(writeSet(p.n, p.w));
      const shared = worstReadSet(p.n, p.r).filter((i) => ws.has(i)).length;
      expect(shared > 0).toBe(p.r + p.w > p.n);
    }
    expect(worstReadSet(5, 2)).toEqual([3, 4]);
    expect(writeSet(5, 2)).toEqual([0, 1]);
  });
});

describe("quorumVerdict", () => {
  it("names the overlap", () => {
    expect(quorumVerdict(analyzeQuorum(5, 3, 3))).toContain("at least 1 replica.");
    expect(quorumVerdict(analyzeQuorum(3, 1, 1))).toContain("stale");
  });
});

describe("quorumHints", () => {
  it("warns about the slow path and weak quorums", () => {
    expect(quorumHints(analyzeQuorum(3, 1, 3)).join(" ")).toContain("W = N");
    expect(quorumHints(analyzeQuorum(3, 1, 1)).join(" ")).toContain("not a majority");
    expect(quorumHints(analyzeQuorum(5, 3, 3))).toEqual([
      "A common default: survives one slow or failed replica on both paths.",
    ]);
  });
});
