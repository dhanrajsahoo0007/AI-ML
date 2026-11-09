import { hash32, lcg, randInt } from "./hash";

// Load balancing algorithms run over a fixed, deterministic request stream so the reader can switch
// algorithm and compare the resulting distribution.

export type LbAlgorithm = "round-robin" | "least-connections" | "weighted" | "ip-hash";

export const LB_ALGORITHMS: readonly { value: LbAlgorithm; label: string; summary: string }[] = [
  {
    value: "round-robin",
    label: "Round robin",
    summary: "Each request goes to the next server in turn. Fair when requests cost the same.",
  },
  {
    value: "least-connections",
    label: "Least connections",
    summary: "Pick the server with the fewest open requests. Adapts when some requests are slow.",
  },
  {
    value: "weighted",
    label: "Weighted",
    summary: "Round robin where a server with weight 3 gets three turns for every one of a weight-1 server.",
  },
  {
    value: "ip-hash",
    label: "IP hash",
    summary: "The client's address picks the server, so one client always lands on the same server.",
  },
];

interface LbRequest {
  id: number;
  clientIp: string;
  /** How many later arrivals this request stays open for (least-connections uses it). */
  durationTicks: number;
}

/** Deterministic request stream: 6 clients, a few long requests among many short ones. */
export function makeRequests(n: number, seed = 11): LbRequest[] {
  const next = lcg(seed);
  const out: LbRequest[] = [];
  for (let i = 0; i < n; i++) {
    const client = randInt(next, 1, 6);
    const slow = next() < 0.2;
    out.push({
      id: i + 1,
      clientIp: `10.0.0.${client}`,
      durationTicks: slow ? randInt(next, 5, 9) : randInt(next, 1, 2),
    });
  }
  return out;
}

interface LbResult {
  /** Server index chosen for each request, in arrival order. */
  assignments: number[];
  counts: number[];
}

/**
 * Run `algorithm` over the requests. Each request arrives one tick after the previous one; a request
 * assigned at tick t is still open at tick u when u < t + durationTicks.
 */
export function simulateLb(
  algorithm: LbAlgorithm,
  weights: readonly number[],
  requests: readonly LbRequest[]
): LbResult {
  const n = weights.length;
  const assignments: number[] = [];
  const counts = new Array<number>(n).fill(0);
  if (n === 0) return { assignments, counts };

  // Smooth weighted round robin (the nginx algorithm): each pick adds its weight to every server's current
  // score, takes the highest, and subtracts the total weight from the winner.
  const current = new Array<number>(n).fill(0);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  requests.forEach((req, tick) => {
    let pick: number;
    switch (algorithm) {
      case "round-robin":
        pick = tick % n;
        break;
      case "ip-hash":
        pick = hash32(req.clientIp) % n;
        break;
      case "weighted": {
        for (let i = 0; i < n; i++) current[i] += weights[i];
        pick = 0;
        for (let i = 1; i < n; i++) if (current[i] > current[pick]) pick = i;
        current[pick] -= totalWeight;
        break;
      }
      case "least-connections": {
        const open = new Array<number>(n).fill(0);
        assignments.forEach((s, j) => {
          if (j + requests[j].durationTicks > tick) open[s]++;
        });
        // Ties go to the server that has had the fewest requests so far, so idle servers are not skipped.
        pick = 0;
        for (let i = 1; i < n; i++) {
          if (open[i] < open[pick] || (open[i] === open[pick] && counts[i] < counts[pick])) pick = i;
        }
        break;
      }
    }
    assignments.push(pick);
    counts[pick]++;
  });

  return { assignments, counts };
}

/** Requests still open at `tick` (the arrival index of the request being placed), per server. */
export function openConnections(
  assignments: readonly number[],
  requests: readonly LbRequest[],
  serverCount: number,
  tick: number
): number[] {
  const open = new Array<number>(serverCount).fill(0);
  for (let j = 0; j < Math.min(tick, assignments.length); j++) {
    if (j + requests[j].durationTicks > tick) open[assignments[j]]++;
  }
  return open;
}

export const DEFAULT_WEIGHTS: readonly number[] = [3, 2, 1, 1, 1, 1];
