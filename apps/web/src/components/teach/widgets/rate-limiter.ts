// Rate limiting algorithms replayed over the same arrival times, so the reader sees which requests each
// one accepts and rejects.

export type LimiterAlgorithm = "token-bucket" | "sliding-window" | "fixed-window";

export const LIMITER_ALGORITHMS: readonly { value: LimiterAlgorithm; label: string; summary: string }[] = [
  {
    value: "token-bucket",
    label: "Token bucket",
    summary:
      "Tokens refill at the limit rate up to the bucket size. A request spends one token; an empty bucket rejects. Allows a burst up to the bucket size.",
  },
  {
    value: "sliding-window",
    label: "Sliding window log",
    summary:
      "Count accepted requests in the last window (1 s) ending now. Smooth, no boundary burst, but it keeps a timestamp per request.",
  },
  {
    value: "fixed-window",
    label: "Fixed window",
    summary:
      "Count requests per clock-aligned window (1 s). Cheap, but a burst at the boundary can let through twice the limit.",
  },
];

export interface LimiterConfig {
  /** Requests allowed per window (and the token bucket's refill rate per second). */
  limit: number;
  /** Window length in ms (1000 for all three here). */
  windowMs: number;
  /** Token bucket capacity. */
  bucketSize: number;
}

interface LimiterDecision {
  t: number;
  accepted: boolean;
  /** Short explanation for a tooltip: tokens left, count in window, … */
  detail: string;
}

export const TIMELINE_MS = 4000;

/**
 * Arrival times in ms: a steady stream at `steadyRps`, plus `burstSize` extra requests packed into 200 ms
 * starting at `burstAtMs`. Sorted.
 */
export function generateArrivals(
  steadyRps: number,
  burstSize: number,
  burstAtMs = 1900,
  totalMs = TIMELINE_MS
): number[] {
  const times: number[] = [];
  if (steadyRps > 0) {
    const gap = 1000 / steadyRps;
    for (let t = gap / 2; t < totalMs; t += gap) times.push(Math.round(t));
  }
  for (let i = 0; i < burstSize; i++) times.push(Math.round(burstAtMs + (200 * i) / Math.max(1, burstSize)));
  return times.sort((a, b) => a - b);
}

export function runLimiter(
  algorithm: LimiterAlgorithm,
  config: LimiterConfig,
  arrivals: readonly number[]
): LimiterDecision[] {
  switch (algorithm) {
    case "token-bucket":
      return tokenBucket(config, arrivals);
    case "sliding-window":
      return slidingWindow(config, arrivals);
    case "fixed-window":
      return fixedWindow(config, arrivals);
  }
}

function tokenBucket({ limit, bucketSize }: LimiterConfig, arrivals: readonly number[]): LimiterDecision[] {
  let tokens = bucketSize;
  let last = 0;
  return arrivals.map((t) => {
    tokens = Math.min(bucketSize, tokens + ((t - last) * limit) / 1000);
    last = t;
    if (tokens >= 1) {
      tokens -= 1;
      return { t, accepted: true, detail: `${tokens.toFixed(1)} tokens left` };
    }
    return { t, accepted: false, detail: `bucket empty (${tokens.toFixed(1)} tokens)` };
  });
}

function slidingWindow({ limit, windowMs }: LimiterConfig, arrivals: readonly number[]): LimiterDecision[] {
  const log: number[] = [];
  return arrivals.map((t) => {
    while (log.length && log[0] <= t - windowMs) log.shift();
    if (log.length < limit) {
      log.push(t);
      return { t, accepted: true, detail: `${log.length}/${limit} in the last ${windowMs} ms` };
    }
    return { t, accepted: false, detail: `${log.length}/${limit} in the last ${windowMs} ms` };
  });
}

function fixedWindow({ limit, windowMs }: LimiterConfig, arrivals: readonly number[]): LimiterDecision[] {
  const counts = new Map<number, number>();
  return arrivals.map((t) => {
    const w = Math.floor(t / windowMs);
    const c = (counts.get(w) ?? 0) + 1;
    counts.set(w, c);
    const label = `${Math.min(c, limit)}/${limit} in window ${w + 1}`;
    return c <= limit
      ? { t, accepted: true, detail: label }
      : { t, accepted: false, detail: `window ${w + 1} full (${limit})` };
  });
}

export function tally(decisions: readonly LimiterDecision[]): { accepted: number; rejected: number } {
  let accepted = 0;
  for (const d of decisions) if (d.accepted) accepted++;
  return { accepted, rejected: decisions.length - accepted };
}

/** Largest number of accepted requests inside any 1 s span, the figure a fixed window gets wrong at the boundary. */
export function peakAcceptedPerSecond(decisions: readonly LimiterDecision[]): number {
  const accepted = decisions.filter((d) => d.accepted).map((d) => d.t);
  let best = 0;
  for (let i = 0; i < accepted.length; i++) {
    let j = i;
    while (j < accepted.length && accepted[j] < accepted[i] + 1000) j++;
    best = Math.max(best, j - i);
  }
  return best;
}
