// Leader-follower replication with lag. Time is a simulated clock in ms that only moves when the reader
// clicks "wait", so the demo never reads the real clock.

export interface ReplicaWrite {
  /** 1, 2, 3, … in write order. */
  version: number;
  /** Simulated time the leader accepted the write. */
  at: number;
}

export type ReplicaId = "leader" | "follower-1" | "follower-2";

export const REPLICA_LABEL: Record<ReplicaId, string> = {
  leader: "Leader",
  "follower-1": "Follower 1",
  "follower-2": "Follower 2",
};

/** Lag per follower: follower 2 is the slower one, at twice the slider value. */
export function followerLags(lagMs: number): Record<Exclude<ReplicaId, "leader">, number> {
  return { "follower-1": lagMs, "follower-2": lagMs * 2 };
}

/** Highest version a replica has applied at time `now`. 0 means it has no writes yet. */
export function versionAt(writes: readonly ReplicaWrite[], lagMs: number, now: number): number {
  let v = 0;
  for (const w of writes) if (w.at + lagMs <= now) v = Math.max(v, w.version);
  return v;
}

export interface ReadResult {
  /** Replica that answered. With read-your-writes on, a lagging follower hands the read to the leader. */
  servedBy: ReplicaId;
  version: number;
  /** True when the answer is older than the client's own latest write. */
  stale: boolean;
  note: string;
}

/**
 * A client that last wrote `clientVersion` reads from `target` at `now`. With `readYourWrites` the client
 * sends its version along; a follower that has not applied it yet forwards the read to the leader.
 */
export function readFrom(
  writes: readonly ReplicaWrite[],
  lagMs: number,
  now: number,
  target: ReplicaId,
  clientVersion: number,
  readYourWrites: boolean
): ReadResult {
  const latest = versionAt(writes, 0, now);
  if (target === "leader") {
    return { servedBy: "leader", version: latest, stale: false, note: "The leader always has every write." };
  }
  const lag = followerLags(lagMs)[target];
  const seen = versionAt(writes, lag, now);
  if (seen >= clientVersion) {
    return { servedBy: target, version: seen, stale: false, note: `${REPLICA_LABEL[target]} has caught up.` };
  }
  if (readYourWrites) {
    return {
      servedBy: "leader",
      version: latest,
      stale: false,
      note: `${REPLICA_LABEL[target]} is at v${seen}, behind your v${clientVersion}, so the read went to the leader.`,
    };
  }
  return {
    servedBy: target,
    version: seen,
    stale: true,
    note: `Stale read: you wrote v${clientVersion} but ${REPLICA_LABEL[target]} still has v${seen}.`,
  };
}

/** Time from `now` until a replica with `replicaLagMs` applies `version`; 0 when it already has it. */
export function msUntilApplied(
  writes: readonly ReplicaWrite[],
  replicaLagMs: number,
  now: number,
  version: number
): number {
  const w = writes.find((x) => x.version === version);
  if (!w) return 0;
  return Math.max(0, w.at + replicaLagMs - now);
}
