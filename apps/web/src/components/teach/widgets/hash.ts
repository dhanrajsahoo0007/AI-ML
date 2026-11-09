// Deterministic hashing and pseudo-random numbers for the teaching widgets. Nothing here reads the clock or
// Math.random, so a widget renders the same on the server and in the browser.

/**
 * MurmurHash3 (x86, 32-bit) fed one character at a time. FNV-1a, even with a finaliser, left near-collisions
 * for strings that differ in one middle character ("S1#0" and "S2#0" landed a degree apart), which makes a hash
 * ring look broken; mixing every character spreads them.
 */
export function hash32(input: string): number {
  let h = 0x9747b28c;
  for (let i = 0; i < input.length; i++) {
    let k = Math.imul(input.charCodeAt(i), 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, 0x1b873593);
    h ^= k;
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) | 0;
  }
  h ^= input.length;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Largest value `hash32` can return plus one; the size of the hash space. */
export const HASH_SPACE = 2 ** 32;

/** Seeded linear congruential generator. Returns a function that yields numbers in [0, 1). */
export function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / HASH_SPACE;
  };
}

/** Integer in [min, max] drawn from a `lcg` function. */
export function randInt(next: () => number, min: number, max: number): number {
  return min + Math.floor(next() * (max - min + 1));
}
