import { hash32 } from "./hash";

// Bloom filter: m bits, k hash functions. Adding sets k bits; testing checks them. A clear bit means
// "definitely not in the set"; all set means "probably in the set".

const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));

/**
 * Bit positions for `word` using double hashing: h1 + i·h2 mod m. The step h2 is made coprime with m, so the
 * k positions are distinct whenever k <= m, for any m (an odd step alone is enough only when m is a power of 2).
 */
export function bloomPositions(word: string, k: number, m: number): number[] {
  if (m <= 0 || k <= 0) return [];
  const h1 = hash32(word);
  const h2 = hash32(`${word}\u0001salt`) | 1;
  const out: number[] = [];
  // Reduce both hashes mod m first so every product stays far below 2^53 (no BigInt needed).
  const a = h1 % m;
  let b = (h2 >>> 0) % m;
  if (m > 1) while (b === 0 || gcd(b, m) !== 1) b = (b + 1) % m;
  for (let i = 0; i < k; i++) out.push((a + i * b) % m);
  return out;
}

/** New bit array with the positions set. Never mutates the input. */
export function bloomAdd(bits: readonly boolean[], positions: readonly number[]): boolean[] {
  const next = [...bits];
  for (const p of positions) next[p] = true;
  return next;
}

export function bloomTest(bits: readonly boolean[], positions: readonly number[]): boolean {
  return positions.length > 0 && positions.every((p) => bits[p] === true);
}

/** Rebuild the filter from scratch for the given words. */
export function bloomBuild(words: readonly string[], k: number, m: number): boolean[] {
  let bits = new Array<boolean>(m).fill(false);
  for (const w of words) bits = bloomAdd(bits, bloomPositions(w, k, m));
  return bits;
}

/** Expected false-positive probability after n insertions: (1 − e^(−kn/m))^k. */
export function falsePositiveRate(m: number, k: number, n: number): number {
  if (m <= 0 || k <= 0) return 1;
  if (n <= 0) return 0;
  return Math.pow(1 - Math.exp((-k * n) / m), k);
}

/** Number of hash functions that minimises false positives for m bits and n items: round(m/n · ln 2), at least 1. */
export function optimalK(m: number, n: number): number {
  if (n <= 0 || m <= 0) return 1;
  return Math.max(1, Math.round((m / n) * Math.LN2));
}

export const normalizeWord = (w: string): string => w.trim().toLowerCase();
