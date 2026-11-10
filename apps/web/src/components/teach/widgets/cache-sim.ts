// Cache eviction policies replayed over a request sequence, one step per request.

export type CachePolicy = "lru" | "lfu" | "fifo";

export const CACHE_POLICIES: readonly { value: CachePolicy; label: string; summary: string }[] = [
  {
    value: "lru",
    label: "LRU",
    summary: "Evict the key that was used longest ago. Good for most access patterns with locality.",
  },
  {
    value: "lfu",
    label: "LFU",
    summary:
      "Evict the key used least often (ties: least recently). Keeps hot keys even after a burst of one-off reads.",
  },
  {
    value: "fifo",
    label: "FIFO",
    summary: "Evict the key inserted first, no matter how often it is read. Simple, but hot keys fall out.",
  },
];

interface CacheStep {
  key: string;
  hit: boolean;
  evicted: string | null;
  /** Cache contents after the step, in eviction order: the first entry is the next to go. */
  contents: string[];
  /** Access counts after the step (LFU shows them; the others carry them for display). */
  counts: Record<string, number>;
  hits: number;
  misses: number;
}

interface Entry {
  key: string;
  inserted: number;
  lastUsed: number;
  count: number;
}

export function runCache(policy: CachePolicy, capacity: number, sequence: readonly string[]): CacheStep[] {
  const entries: Entry[] = [];
  const steps: CacheStep[] = [];
  let hits = 0;
  let misses = 0;

  sequence.forEach((key, t) => {
    const found = entries.find((e) => e.key === key);
    let evicted: string | null = null;
    if (found) {
      hits++;
      found.lastUsed = t;
      found.count++;
    } else {
      misses++;
      if (entries.length >= capacity && capacity > 0) {
        const victim = orderForEviction(policy, entries)[0];
        entries.splice(entries.indexOf(victim), 1);
        evicted = victim.key;
      }
      if (capacity > 0) entries.push({ key, inserted: t, lastUsed: t, count: 1 });
    }
    const ordered = orderForEviction(policy, entries);
    steps.push({
      key,
      hit: Boolean(found),
      evicted,
      contents: ordered.map((e) => e.key),
      counts: Object.fromEntries(entries.map((e) => [e.key, e.count])),
      hits,
      misses,
    });
  });
  return steps;
}

/** Entries sorted so the first one is the policy's eviction victim. */
function orderForEviction(policy: CachePolicy, entries: readonly Entry[]): Entry[] {
  const copy = [...entries];
  switch (policy) {
    case "lru":
      return copy.sort((a, b) => a.lastUsed - b.lastUsed);
    case "fifo":
      return copy.sort((a, b) => a.inserted - b.inserted);
    case "lfu":
      return copy.sort((a, b) => a.count - b.count || a.lastUsed - b.lastUsed);
  }
}

/** Hit ratio after `upto` steps (all steps when omitted). 0 when nothing has run. */
export function hitRatio(steps: readonly CacheStep[], upto: number = steps.length): number {
  if (upto <= 0 || steps.length === 0) return 0;
  const s = steps[Math.min(upto, steps.length) - 1];
  return s.hits / (s.hits + s.misses);
}

/** "A B C, A d" -> ["A", "B", "C", "A", "D"]. Keys are upper-cased single tokens; at most `max` of them. */
export function parseSequence(text: string, max = 40): string[] {
  return text
    .split(/[\s,;]+/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0)
    .slice(0, max);
}

export const DEFAULT_SEQUENCE = "A B C D A B E A B C D E A B";
