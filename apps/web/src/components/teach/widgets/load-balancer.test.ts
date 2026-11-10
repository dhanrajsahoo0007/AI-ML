import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS, LB_ALGORITHMS, makeRequests, openConnections, simulateLb } from "./load-balancer";

describe("makeRequests", () => {
  it("is deterministic and well-formed", () => {
    const a = makeRequests(20);
    expect(a).toEqual(makeRequests(20));
    expect(a).toHaveLength(20);
    a.forEach((r, i) => {
      expect(r.id).toBe(i + 1);
      expect(r.clientIp).toMatch(/^10\.0\.0\.[1-6]$/);
      expect(r.durationTicks).toBeGreaterThanOrEqual(1);
      expect(r.durationTicks).toBeLessThanOrEqual(9);
    });
    expect(makeRequests(20, 2)).not.toEqual(a);
  });
});

describe("simulateLb", () => {
  const reqs = makeRequests(20);
  const even = [1, 1, 1, 1];

  it("round robin cycles through servers", () => {
    const { assignments, counts } = simulateLb("round-robin", even, reqs);
    expect(assignments.slice(0, 8)).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
    expect(counts).toEqual([5, 5, 5, 5]);
  });

  it("weighted gives turns in proportion to weight", () => {
    const { counts } = simulateLb("weighted", [3, 1], makeRequests(40));
    expect(counts).toEqual([30, 10]);
    // Smooth: no long runs on the heavy server.
    const { assignments } = simulateLb("weighted", [3, 1], makeRequests(8));
    expect(assignments).toEqual([0, 0, 1, 0, 0, 0, 1, 0]);
  });

  it("ip hash sends one client to one server", () => {
    const { assignments } = simulateLb("ip-hash", even, reqs);
    const seen = new Map<string, number>();
    reqs.forEach((r, i) => {
      const prev = seen.get(r.clientIp);
      if (prev !== undefined) expect(assignments[i]).toBe(prev);
      seen.set(r.clientIp, assignments[i]);
    });
  });

  it("least connections never picks a server with more open requests than another", () => {
    const { assignments } = simulateLb("least-connections", even, reqs);
    assignments.forEach((pick, tick) => {
      const open = openConnections(assignments, reqs, 4, tick);
      expect(open[pick]).toBe(Math.min(...open));
    });
  });

  it("least connections breaks ties toward the server with the fewest requests", () => {
    // All requests are short and finish before the next arrives, so every server is always idle.
    const quick = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, clientIp: "10.0.0.1", durationTicks: 1 }));
    expect(simulateLb("least-connections", [1, 1, 1, 1], quick).counts).toEqual([2, 2, 2, 2]);
  });

  it("counts sum to the request count for every algorithm", () => {
    for (const { value } of LB_ALGORITHMS) {
      const { counts, assignments } = simulateLb(value, DEFAULT_WEIGHTS.slice(0, 5), reqs);
      expect(assignments).toHaveLength(20);
      expect(counts.reduce((a, b) => a + b, 0)).toBe(20);
    }
  });

  it("handles no servers", () => {
    expect(simulateLb("round-robin", [], reqs)).toEqual({ assignments: [], counts: [] });
  });
});

describe("openConnections", () => {
  it("counts requests whose duration has not elapsed", () => {
    const reqs = [
      { id: 1, clientIp: "a", durationTicks: 3 },
      { id: 2, clientIp: "b", durationTicks: 1 },
      { id: 3, clientIp: "c", durationTicks: 1 },
    ];
    const assignments = [0, 1, 0];
    expect(openConnections(assignments, reqs, 2, 0)).toEqual([0, 0]);
    expect(openConnections(assignments, reqs, 2, 1)).toEqual([1, 0]);
    expect(openConnections(assignments, reqs, 2, 2)).toEqual([1, 0]);
    expect(openConnections(assignments, reqs, 2, 3)).toEqual([0, 0]);
  });
});
