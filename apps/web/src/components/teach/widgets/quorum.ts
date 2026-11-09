// Leaderless quorums: N replicas, a write waits for W acknowledgements, a read asks R replicas.
// When R + W > N every read set overlaps every write set, so some replica in the read has the latest write.

/** Typical response times of N replicas, fastest first (ms). The k-th fastest decides a k-of-N wait. */
const REPLICA_LATENCY_MS: readonly number[] = [4, 6, 9, 14, 25, 45, 120];

export const MAX_REPLICAS = REPLICA_LATENCY_MS.length;

interface QuorumAnalysis {
  n: number;
  r: number;
  w: number;
  /** R + W > N. */
  strong: boolean;
  /** Fewest replicas a read set and a write set share; 0 or less means they can miss each other. */
  overlap: number;
  /** Replicas that may be down and writes still succeed. */
  writeTolerates: number;
  readTolerates: number;
  /** Time to hear from the W-th / R-th fastest replica. */
  writeLatencyMs: number;
  readLatencyMs: number;
  /** W > N/2: two concurrent writes cannot both reach a quorum on disjoint replicas. */
  writeMajority: boolean;
}

export function clampQuorum(n: number, r: number, w: number): { n: number; r: number; w: number } {
  const nn = Math.min(MAX_REPLICAS, Math.max(1, Math.round(n)));
  return { n: nn, r: Math.min(nn, Math.max(1, Math.round(r))), w: Math.min(nn, Math.max(1, Math.round(w))) };
}

export function analyzeQuorum(nIn: number, rIn: number, wIn: number): QuorumAnalysis {
  const { n, r, w } = clampQuorum(nIn, rIn, wIn);
  return {
    n,
    r,
    w,
    strong: r + w > n,
    overlap: r + w - n,
    writeTolerates: n - w,
    readTolerates: n - r,
    writeLatencyMs: REPLICA_LATENCY_MS[w - 1],
    readLatencyMs: REPLICA_LATENCY_MS[r - 1],
    writeMajority: w > n / 2,
  };
}

/** The write lands on the first W replicas; the worst-case read asks the last R. */
export function writeSet(n: number, w: number): number[] {
  return Array.from({ length: Math.min(n, w) }, (_, i) => i);
}

export function worstReadSet(n: number, r: number): number[] {
  return Array.from({ length: Math.min(n, r) }, (_, i) => n - Math.min(n, r) + i);
}

/** One-line verdict for the widget. */
export function quorumVerdict(a: QuorumAnalysis): string {
  if (a.strong) {
    return `R + W = ${a.r + a.w} > N = ${a.n}: every read overlaps the latest write on at least ${a.overlap} replica${a.overlap === 1 ? "" : "s"}.`;
  }
  return `R + W = ${a.r + a.w} ≤ N = ${a.n}: a read can ask only replicas that missed the latest write and return stale data.`;
}

interface QuorumPreset {
  label: string;
  n: number;
  r: number;
  w: number;
}

export const QUORUM_PRESETS: readonly QuorumPreset[] = [
  { label: "Balanced (3/2/2)", n: 3, r: 2, w: 2 },
  { label: "Fast reads (3/1/3)", n: 3, r: 1, w: 3 },
  { label: "Fast writes (3/3/1)", n: 3, r: 3, w: 1 },
  { label: "Eventual (3/1/1)", n: 3, r: 1, w: 1 },
  { label: "Five replicas (5/3/3)", n: 5, r: 3, w: 3 },
];

/** Short trade-off notes for the current setting, most important first. */
export function quorumHints(a: QuorumAnalysis): string[] {
  const out: string[] = [];
  if (a.w === a.n) out.push("W = N: one slow or failed replica stalls every write.");
  if (a.r === a.n) out.push("R = N: one slow or failed replica stalls every read.");
  if (a.r === 1 && a.strong) out.push("R = 1 is safe only because W = N; reads are as fast as the fastest replica.");
  if (!a.writeMajority && a.w > 0)
    out.push("W is not a majority: two clients can write conflicting values that both succeed.");
  if (!a.strong) out.push("Fine for likes or view counts; not for balances or inventory.");
  if (a.n === 1) out.push("One replica: no redundancy at all.");
  if (out.length === 0) out.push("A common default: survives one slow or failed replica on both paths.");
  return out;
}
