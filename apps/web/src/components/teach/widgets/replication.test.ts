import { describe, expect, it } from "vitest";
import { followerLags, msUntilApplied, readFrom, versionAt, type ReplicaWrite } from "./replication";

const writes: ReplicaWrite[] = [
  { version: 1, at: 0 },
  { version: 2, at: 1000 },
];

describe("versionAt", () => {
  it("applies a write once its lag has passed", () => {
    expect(versionAt([], 0, 100)).toBe(0);
    expect(versionAt(writes, 0, 1000)).toBe(2);
    expect(versionAt(writes, 500, 1000)).toBe(1);
    expect(versionAt(writes, 500, 1500)).toBe(2);
  });
});

describe("followerLags", () => {
  it("makes follower 2 twice as slow", () => {
    expect(followerLags(300)).toEqual({ "follower-1": 300, "follower-2": 600 });
  });
});

describe("readFrom", () => {
  it("returns a stale value from a lagging follower without read-your-writes", () => {
    const r = readFrom(writes, 500, 1100, "follower-1", 2, false);
    expect(r).toMatchObject({ servedBy: "follower-1", version: 1, stale: true });
  });

  it("forwards to the leader with read-your-writes", () => {
    const r = readFrom(writes, 500, 1100, "follower-1", 2, true);
    expect(r).toMatchObject({ servedBy: "leader", version: 2, stale: false });
  });

  it("serves from the follower once it caught up", () => {
    expect(readFrom(writes, 500, 1500, "follower-1", 2, true)).toMatchObject({ servedBy: "follower-1", stale: false });
    expect(readFrom(writes, 500, 1500, "follower-2", 2, false)).toMatchObject({ version: 1, stale: true });
  });

  it("always serves the latest from the leader", () => {
    expect(readFrom(writes, 500, 1000, "leader", 2, false)).toMatchObject({ servedBy: "leader", version: 2 });
  });
});

describe("msUntilApplied", () => {
  it("counts down to zero", () => {
    expect(msUntilApplied(writes, 1000, 1100, 2)).toBe(900);
    expect(msUntilApplied(writes, 1000, 3000, 2)).toBe(0);
    expect(msUntilApplied(writes, 500, 0, 9)).toBe(0);
  });
});
