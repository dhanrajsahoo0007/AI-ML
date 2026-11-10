import { HASH_SPACE, hash32 } from "./hash";

// Consistent hashing: servers and keys hash onto the same ring; a key belongs to the first server clockwise
// from it. Virtual nodes (several ring points per server) even out the load.

interface RingPoint {
  hash: number;
  server: string;
}

/** Ring points sorted by hash. Each server gets `vnodes` points, hashed from "server#i". */
export function buildRing(servers: readonly string[], vnodes: number): RingPoint[] {
  const points: RingPoint[] = [];
  for (const server of servers) {
    for (let i = 0; i < vnodes; i++) points.push({ hash: hash32(`${server}#${i}`), server });
  }
  return points.sort((a, b) => a.hash - b.hash || a.server.localeCompare(b.server));
}

/** Owner of a hash: the first point at or after it, wrapping to the first point of the ring. */
export function ownerOf(ring: readonly RingPoint[], hash: number): string | null {
  if (ring.length === 0) return null;
  let lo = 0;
  let hi = ring.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ring[mid].hash < hash) lo = mid + 1;
    else hi = mid;
  }
  return ring[lo === ring.length ? 0 : lo].server;
}

/** key -> server for every key, using consistent hashing. */
export function assignKeys(ring: readonly RingPoint[], keys: readonly string[]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const k of keys) out[k] = ownerOf(ring, hash32(k));
  return out;
}

/** key -> server using the naive `hash mod N` scheme, for comparison. */
export function assignModulo(servers: readonly string[], keys: readonly string[]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const k of keys) out[k] = servers.length ? servers[hash32(k) % servers.length] : null;
  return out;
}

export function countPerServer(
  assignment: Record<string, string | null>,
  servers: readonly string[]
): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(servers.map((s) => [s, 0]));
  for (const s of Object.values(assignment)) if (s !== null && s in counts) counts[s]++;
  return counts;
}

/** Keys whose owner differs between two assignments. */
export function movedKeys(before: Record<string, string | null>, after: Record<string, string | null>): string[] {
  return Object.keys(after).filter((k) => k in before && before[k] !== after[k]);
}

/** Angle in degrees (0 at the top, clockwise) for a hash on the ring drawing. */
export function hashAngle(hash: number): number {
  return (hash / HASH_SPACE) * 360;
}

export const makeKeys = (n: number): string[] => Array.from({ length: n }, (_, i) => `user:${i + 1}`);
export const serverName = (i: number): string => `S${i + 1}`;

/**
 * Where keyboard focus goes after `removed` is taken out of `servers` (its row and focused button unmount):
 * the next row's Remove button, or the previous row's when it was the last row. "undo" when no Remove button
 * stays enabled (a single server left), since the Undo button appears after any change.
 */
export function focusAfterRemove(servers: readonly string[], removed: string): string | "undo" {
  const rest = servers.filter((s) => s !== removed);
  if (rest.length <= 1) return "undo";
  const i = servers.indexOf(removed);
  return rest[Math.min(Math.max(i, 0), rest.length - 1)];
}
