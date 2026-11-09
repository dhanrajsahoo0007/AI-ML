import { describe, expect, it } from "vitest";
import {
  focusAfterRemove,
  assignKeys,
  assignModulo,
  buildRing,
  countPerServer,
  hashAngle,
  makeKeys,
  movedKeys,
  ownerOf,
  serverName,
} from "./consistent-hash";
import { hash32 } from "./hash";

const servers = ["S1", "S2", "S3"];

describe("buildRing", () => {
  it("creates vnodes points per server, sorted by hash", () => {
    const ring = buildRing(servers, 8);
    expect(ring).toHaveLength(24);
    for (let i = 1; i < ring.length; i++) expect(ring[i].hash).toBeGreaterThanOrEqual(ring[i - 1].hash);
    expect(ring.filter((p) => p.server === "S2")).toHaveLength(8);
  });

  it("is empty with no servers", () => {
    expect(buildRing([], 4)).toEqual([]);
    expect(ownerOf([], 5)).toBeNull();
  });
});

describe("ownerOf", () => {
  it("picks the first point clockwise and wraps around", () => {
    const ring = [
      { hash: 100, server: "A" },
      { hash: 200, server: "B" },
      { hash: 300, server: "C" },
    ];
    expect(ownerOf(ring, 50)).toBe("A");
    expect(ownerOf(ring, 100)).toBe("A");
    expect(ownerOf(ring, 101)).toBe("B");
    expect(ownerOf(ring, 250)).toBe("C");
    expect(ownerOf(ring, 301)).toBe("A");
  });
});

describe("assignKeys and movedKeys", () => {
  const keys = makeKeys(200);

  it("moves only a fraction of keys when a server is added", () => {
    const before = assignKeys(buildRing(servers, 16), keys);
    const after = assignKeys(buildRing([...servers, "S4"], 16), keys);
    const moved = movedKeys(before, after);
    // Ideal is 1/4 of the keys; allow a wide band for a demo-sized ring.
    expect(moved.length).toBeGreaterThan(20);
    expect(moved.length).toBeLessThan(90);
    // Keys only move to the new server, never between the old ones.
    for (const k of moved) expect(after[k]).toBe("S4");
  });

  it("moves most keys under hash mod N", () => {
    const before = assignModulo(servers, keys);
    const after = assignModulo([...servers, "S4"], keys);
    expect(movedKeys(before, after).length).toBeGreaterThan(100);
  });

  it("counts every key exactly once", () => {
    const counts = countPerServer(assignKeys(buildRing(servers, 16), keys), servers);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(200);
    expect(Object.keys(counts)).toEqual(servers);
  });

  it("assigns null when there are no servers", () => {
    expect(assignKeys([], ["a"])).toEqual({ a: null });
    expect(assignModulo([], ["a"])).toEqual({ a: null });
  });
});

describe("helpers", () => {
  it("maps hashes to angles and names servers", () => {
    expect(hashAngle(0)).toBe(0);
    expect(hashAngle(2 ** 31)).toBe(180);
    expect(serverName(0)).toBe("S1");
    expect(makeKeys(2)).toEqual(["user:1", "user:2"]);
    expect(assignKeys(buildRing(["A"], 1), ["x"]).x).toBe("A");
    expect(hash32("user:1")).toBe(hash32("user:1"));
  });
});

describe("focusAfterRemove", () => {
  it("moves to the next row, or the previous one after the last row", () => {
    expect(focusAfterRemove(["S1", "S2", "S3"], "S1")).toBe("S2");
    expect(focusAfterRemove(["S1", "S2", "S3"], "S2")).toBe("S3");
    expect(focusAfterRemove(["S1", "S2", "S3"], "S3")).toBe("S2");
  });

  it("falls back to Undo when the only Remove button left is disabled", () => {
    expect(focusAfterRemove(["S1", "S2"], "S1")).toBe("undo");
    expect(focusAfterRemove(["S1", "S2"], "S2")).toBe("undo");
  });
});
