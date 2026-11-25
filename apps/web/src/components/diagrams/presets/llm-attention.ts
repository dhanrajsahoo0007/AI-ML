// The running example of "Self-attention explained": three tokens "the", "cat", "sat" with 2-dimensional queries,
// keys and values (d_k = 2). The page's worked-example figures read every number from here, so the prose, the
// unmasked example (`animated/transformer/attention-worked-example`) and the causal one
// (`animated/transformer/attention-causal-example`) cannot drift apart.
//
//          query    key      value
//   the    (1, 0)   (1, 0)   (1, 0)
//   cat    (0, 1)   (0, 2)   (0, 1)
//   sat    (1, 1)   (1, 1)   (1, 1)
//
// Formula: Attention(Q, K, V) = softmax(Q Kᵀ / √d_k) V (Vaswani et al. 2017, arXiv 1706.03762, §3.2.1, Eq. 1). The
// causal mask sets the score of every key after the query to −∞ before the softmax (§3.2.3), so its weight is 0.

export const CAT_SAT = {
  tokens: ["the", "cat", "sat"],
  q: [
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  k: [
    [1, 0],
    [0, 2],
    [1, 1],
  ],
  v: [
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  dK: 2,
} as const;

export const dot = (a: readonly number[], b: readonly number[]) => a.reduce((s, v, i) => s + v * b[i], 0);

/** Softmax of one row; −Infinity entries (masked keys) get weight exactly 0. */
export function softmax(row: readonly number[]): number[] {
  const e = row.map((v) => (v === -Infinity ? 0 : Math.exp(v)));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
}

/** Rounds a row of probabilities to hundredths so the shown values still add up to exactly 1 (largest remainder). */
export function roundRow(p: readonly number[]): number[] {
  const cents = p.map((v) => Math.floor(v * 100));
  let left = 100 - cents.reduce((a, b) => a + b, 0);
  const order = p.map((v, i) => ({ i, rest: v * 100 - cents[i] })).sort((a, b) => b.rest - a.rest);
  for (const { i } of order) {
    if (left <= 0) break;
    cents[i] += 1;
    left -= 1;
  }
  return cents.map((c) => c / 100);
}

/** One full self-attention pass over the example, with or without the causal mask. */
export function attend(causal: boolean) {
  const { q, k, v, dK } = CAT_SAT;
  const scale = Math.sqrt(dK);
  const raw = q.map((qi) => k.map((kj) => dot(qi, kj)));
  const scaled = raw.map((row) => row.map((s) => s / scale));
  const masked = scaled.map((row, i) => row.map((s, j) => (causal && j > i ? -Infinity : s)));
  const weights = masked.map(softmax);
  const outputs = weights.map((w) => v[0].map((_, d) => w.reduce((acc, wj, j) => acc + wj * v[j][d], 0)));
  return { scale, raw, scaled, masked, weights, shownWeights: weights.map(roundRow), outputs };
}

export const fix2 = (v: number) => (Math.round(v * 100) / 100).toFixed(2);
/** Integers stay integers ("2"), everything else gets 2 decimals ("0.71"); −∞ for a masked score. */
export const num = (v: number) => (v === -Infinity ? "−∞" : Number.isInteger(v) ? String(v) : fix2(v));
export const pair = (v: readonly number[]) => `(${v.map(num).join(", ")})`;
