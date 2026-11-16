// The running example of "Positional encodings": RoPE applied to one 2-D pair of dimensions, using the query of
// "sat" and the key of "cat" from the "the cat sat" example of "Self-attention explained" (presets/llm-attention.ts),
// so the two pages share their numbers. The page's RoPE figures (`animated/transformer/rope-worked-example`,
// `animated/transformer/rope-angle-range`) and its prose read every number from here.
//
// RoPE (Su et al., 2021, RoFormer, arXiv 2104.09864, Eq. 15–16): pair i of a query at position m is rotated by m·θᵢ,
// pair i of a key at position n by n·θᵢ, with θᵢ = 10000^(−2i/d) for i = 0 … d/2 − 1 (the paper counts i from 1 and
// writes −2(i − 1)/d). Then (R(mθ) q) · (R(nθ) k) = qᵀ R((n − m)θ) k (Eq. 16): the score depends on n − m only.
// Rotation: R(a)(x, y) = (x cos a − y sin a, x sin a + y cos a); angles in radians, 1 rad ≈ 57.3°.
//
// The example: q = (1, 1) ("sat", at 45°, length √2 ≈ 1.41), k = (0, 2) ("cat", at 90°, length 2).
// Pair 0 has θ₀ = 10000⁰ = 1 rad per position, the fastest pair of every RoPE model with this formula.
//   No position:            q · k = 1·0 + 1·2 = 2.00 (angle between them 45°).
//   "the cat sat", m = 2 (sat), n = 1 (cat): q turned 2 rad (114.6°) → (−1.325, 0.493), now at 159.6°;
//                           k turned 1 rad (57.3°)   → (−1.683, 1.081), now at 147.3°;
//                           score = 2.230 + 0.533 = 2.76 (angle between 12.3°; √2 · 2 · cos 12.3° = 2.76).
//   Same words 100 places later, m = 102, n = 101: 102 rad ≡ 84.2° (102 − 16 · 2π = 1.469 rad), 101 rad ≡ 26.9°;
//                           q → (−0.893, 1.096) at 129.2°, k → (−0.904, 1.784) at 116.9°; score 2.76 again.
//   Gap of 2, m = 3, n = 1: q turned 3 rad (171.9°) → (−1.131, −0.849) at 216.9°; k as before; score 0.99.
//   Order reversed, m = 1, n = 2 (an encoder, which may read later tokens): score −0.60.
// A slow pair: pair 32 of a 128-wide head has θ₃₂ = 10000^(−64/128) = 0.01 rad per position. Gap 1 gives 2.02,
// almost the unrotated 2.00; gap 100 turns it 100 · 0.01 = 1 rad, so it gives 2.76, what pair 0 gives at gap 1.
//
// Why extrapolation fails (d = 128, base 10,000, trained on L = 4,096 positions, asked for 16,384):
//   pair  0: θ = 1        wavelength 2π/θ = 6.3       angle at 4,096 = 4,096 rad = 652 turns: every angle seen
//   pair 32: θ = 0.01     wavelength 628              40.96 rad = 6.5 turns: every angle seen
//   pair 48: θ = 0.001    wavelength 6,283            4.10 rad = 0.65 turn (235°); at 16,384: 16.4 rad = 2.6 turns
//   pair 63: θ = 1.15e−4  wavelength 54,410           0.47 rad (27°); at 16,384: 1.89 rad (108°)
// Pairs 46 to 63 (18 of 64) have wavelengths over 4,096 (pair 46: 4,712), so in training they never turned a full
// circle; past 4,096 they reach angles never seen. Position interpolation divides positions by s = 16,384 / 4,096 = 4,
// so position 16,384 gets the angles of 4,096 in every pair, but neighbours in pair 0 sit 1/4 rad (14.3°) apart
// instead of 1 rad (57.3°). YaRN calls these wavelength-longer-than-context pairs the ones that "not perform a full
// rotation" (Peng et al., 2023, arXiv 2309.00071, §3.2) and interpolates them fully.
// YaRN also divides the attention logits by a temperature t, with √(1/t) = 0.1 · ln(s) + 1 (§3.3, Eq. 15); applied
// to both q and k, so the logits are multiplied by (0.1 · ln s + 1)²: s = 4 → 1.139² = 1.30; s = 16 → 1.63.
//
// ALiBi, for comparison (Press et al., 2021, arXiv 2108.12409, §3): no rotation; each head adds −m · (i − j) to the
// score of query i and key j, with slopes m = 1/2, 1/4, … 1/256 for 8 heads (the geometric sequence 2^(−8h/n)).
// A key 1,000 places back loses 1,000 · 1/2 = 500 in head 1 (effectively invisible) and 1,000 / 256 = 3.9 in head 8.

import { CAT_SAT } from "@/components/diagrams/presets/llm-attention";

export const ROPE = {
  /** Width of one attention head: 64 pairs (LLaMA 7B: 4,096 wide, 32 heads; Touvron et al., 2023, Table 2). */
  dHead: 128,
  base: 10000,
  trained: 4096,
  target: 16384,
} as const;

/** The query of "sat" and the key of "cat" from "Self-attention explained". */
export const Q_SAT: readonly [number, number] = [CAT_SAT.q[2][0], CAT_SAT.q[2][1]];
export const K_CAT: readonly [number, number] = [CAT_SAT.k[1][0], CAT_SAT.k[1][1]];

/** Rotation speed of pair i, in radians per position: θᵢ = base^(−2i/d). */
export const theta = (i: number, d: number = ROPE.dHead, base: number = ROPE.base) => Math.pow(base, (-2 * i) / d);

/** Positions per full turn of pair i. */
export const wavelength = (i: number) => (2 * Math.PI) / theta(i);

export function rotate(v: readonly number[], a: number): [number, number] {
  return [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
}

const dot2 = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1];

/** RoPE score of one pair: the query at position m and the key at position n, both rotated, then dotted. */
export const ropeScore = (m: number, n: number, t = 1, q = Q_SAT, k = K_CAT) =>
  dot2(rotate(q, m * t), rotate(k, n * t));

/** Direction of a 2-D vector in degrees, 0–360, counter-clockwise from the x-axis. */
export function direction(v: readonly number[]): number {
  const d = (Math.atan2(v[1], v[0]) * 180) / Math.PI;
  return d < 0 ? d + 360 : d;
}

/** An angle in radians as degrees in 0–360. */
export function wrapDeg(a: number): number {
  const d = ((a * 180) / Math.PI) % 360;
  return d < 0 ? d + 360 : d;
}

/** The four cases of the worked example, in the order the stepper shows them. m = query ("sat"), n = key ("cat"). */
export const ROPE_CASES = [
  { title: "No position", m: 0, n: 0, rotated: false },
  { title: "“the cat sat”", m: 2, n: 1, rotated: true },
  { title: "100 places later", m: 102, n: 101, rotated: true },
  { title: "One word between", m: 3, n: 1, rotated: true },
] as const;

export const fmt2 = (v: number) => v.toFixed(2).replace("-", "−");
