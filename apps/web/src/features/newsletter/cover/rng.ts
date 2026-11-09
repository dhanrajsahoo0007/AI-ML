// Seeded randomness for covers: the same seed always draws the same cover, on the server, in the browser (the cover
// gallery) and in build scripts. mulberry32: tiny, fast, and good enough for art.

export type Rng = () => number;

export function rng(seed: number): Rng {
  let a = (seed >>> 0) ^ 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A number in [min, max). */
export const between = (r: Rng, min: number, max: number) => min + r() * (max - min);
/** An integer in [min, max]. */
export const int = (r: Rng, min: number, max: number) => Math.floor(between(r, min, max + 1));
export const pick = <T>(r: Rng, items: readonly T[]): T => items[Math.floor(r() * items.length)];
export const chance = (r: Rng, p: number) => r() < p;
