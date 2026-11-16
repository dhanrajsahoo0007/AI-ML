// The running example of "Mixture of Experts (MoE)". Two set-ups, both small enough to check by hand:
//   1. One token routed top-2 over 8 experts, Mixtral-style (`animated/transformer/moe-routing`).
//   2. A batch of 8 tokens, t1 … t8, routed top-1 over 4 experts, Switch-style (`moe-capacity`, `moe-balance-loss`).
// The router logits are illustrative; every number the page quotes is computed below from them.
//
// ── 1. One token, top-2 of 8 (Jiang et al. 2024, arXiv 2401.04088 §2.1: G(x) = Softmax(TopK(x · W_g))) ──────────
// Logits [0.6, 2.1, 0.3, 1.1, 1.6, 0.4, 0.2, 0.8]; top 2 are expert 2 (2.1) and expert 5 (1.6).
//   e^2.1 = 8.166, e^1.6 = 4.953, sum 13.119 → weights 0.6225 and 0.3775 (shown 0.62, 0.38)
//   output = x + 0.62 · E2(x) + 0.38 · E5(x)
// A softmax over all 8 logits first (Switch eq. 1; GShard Algorithm 1 line 2) gives the sum of all eight
// exponentials, 24.234, so p2 = 8.166 / 24.234 = 0.337 and p5 = 4.953 / 24.234 = 0.204 (0.541 together).
// GShard renormalizes the two (Algorithm 1 lines 6 and 16): 0.337 / 0.541 = 0.62, the same weights as Mixtral's.
//
// ── 2. The batch: 8 tokens, 4 experts, top-1 (Fedus et al. 2021, arXiv 2101.03961 §2.1–2.2) ──────────────────────
// Router probabilities, p = softmax(logits) per token (rounded to 3 places; the pick is the largest):
//        E1     E2     E3     E4     pick
//   t1  0.694  0.155  0.094  0.057   E1
//   t2  0.176  0.144  0.584  0.096   E3
//   t3  0.476  0.289  0.130  0.106   E1
//   t4  0.133  0.596  0.162  0.109   E2
//   t5  0.403  0.164  0.134  0.299   E1   (close call: E4 is second at 0.299)
//   t6  0.163  0.099  0.199  0.540   E4
//   t7  0.236  0.476  0.130  0.158   E2
//   t8  0.117  0.158  0.581  0.143   E3
// Picks E1, E3, E1, E2, E1, E4, E2, E3: tokens per expert 3, 2, 2, 1 (the choices `moe-capacity` draws).
// Switch's top-1 output for t1 is 0.694 · E1(t1): the gate value multiplies the expert output (eq. 2).
//
// Load-balancing loss (eq. 4–6): loss = α · N · Σᵢ fᵢ · Pᵢ, fᵢ = share of tokens whose top pick is i,
// Pᵢ = mean router probability for i over the batch.
//   f = 3/8, 2/8, 2/8, 1/8 = 0.375, 0.250, 0.250, 0.125
//   P = column means       = 0.300, 0.260, 0.252, 0.189   (sum 1.000)
//   fᵢ · Pᵢ                = 0.112, 0.065, 0.063, 0.024   sum 0.264
//   N · Σ = 4 × 0.264      = 1.06   (α = 10⁻², so 0.0106 is added to the task loss)
// Perfectly even picks (f = 1/4 each) give 4 × ¼ × ΣPᵢ = 1.00 whatever P is (Switch: Σ = 1/N under uniform routing,
// "multiplied by expert count N to keep the loss constant"). All 8 tokens to E1 with P₁ → 1 gives 4 × 1 × 1 = 4.00.
// f has no gradient; ∂(N · Σ fᵢPᵢ)/∂Pᵢ = N · fᵢ = 1.5, 1.0, 1.0, 0.5: the push down on E1's probability is 3× E4's.
//
// Capacity (eq. 3): capacity = 8 / 4 × capacity factor; slots fill in batch order, overflow is dropped (§2.2).
//   CF 0.5 → 1 slot each:  4 processed (t1, t4, t2, t6), 4 dropped (t3, t5, t7, t8), 0 of 4 slots empty
//   CF 1.0 → 2 slots each: 7 processed, 1 dropped (t5), 1 of 8 slots empty
//   CF 1.5 → 3 slots each: 8 processed, 0 dropped, 4 of 12 slots empty (33 % of expert compute is padding)
//   CF 2.0 → 4 slots each: 8 processed, 0 dropped, 8 of 16 slots empty (50 %)
//
// Shrinking batch (Shazeer et al. 2017, arXiv 1701.06538 §3.1): with k of n experts per token, each expert sees about
// k · b / n of a batch of b tokens: 1 × 8 / 4 = 2 tokens here; Mixtral, top-2 of 8, gives each expert 2/8 = a quarter.
//
// Router z-loss (Zoph et al. 2022, arXiv 2202.08906 eq. 5): z = (1/B) Σ_tokens (log Σⱼ e^{xⱼ})², c_z = 0.001 (§3.3).
//   log-sum-exp per token = 2.365, 2.138, 2.243, 2.318, 2.108, 2.016, 2.043, 2.243 → z = 4.79, c_z · z = 0.0048
//   the same logits × 10 (a sharper router, same picks): z = 251, c_z · z = 0.25, about 52× larger.

const softmax = (row: number[]) => {
  const e = row.map(Math.exp);
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
};
const logSumExp = (row: number[]) => Math.log(row.reduce((a, v) => a + Math.exp(v), 0));
const argmax = (row: number[]) => row.indexOf(Math.max(...row));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

// ── 1. One token, top-2 of 8 ─────────────────────────────────────────────────────────────────────────────────────
/** Router logits for the token in `moe-routing`, experts 1–8. */
export const ROUTING_LOGITS = [0.6, 2.1, 0.3, 1.1, 1.6, 0.4, 0.2, 0.8];

const fullSoftmax = softmax(ROUTING_LOGITS);
const top2 = ROUTING_LOGITS.map((v, i) => ({ v, i }))
  .sort((a, b) => b.v - a.v)
  .slice(0, 2)
  .map((t) => t.i);

/** Full softmax vs softmax over the top 2, for the same token. */
export const ROUTING = {
  top2, // [1, 4]: experts 2 and 5
  top2Weights: softmax(top2.map((i) => ROUTING_LOGITS[i])), // [0.6225, 0.3775]
  fullTop2: top2.map((i) => fullSoftmax[i]), // [0.337, 0.204]
};

// ── 2. The batch ─────────────────────────────────────────────────────────────────────────────────────────────────
const N = 4;
const T = 8;

/** Illustrative router logits, one row per token t1 … t8, one column per expert E1 … E4. */
const BATCH_LOGITS = [
  [2.0, 0.5, 0.0, -0.5],
  [0.4, 0.2, 1.6, -0.2],
  [1.5, 1.0, 0.2, 0.0],
  [0.3, 1.8, 0.5, 0.1],
  [1.2, 0.3, 0.1, 0.9],
  [0.2, -0.3, 0.4, 1.4],
  [0.6, 1.3, 0.0, 0.2],
  [0.1, 0.4, 1.7, 0.3],
];

/** p(x) per token: softmax over all 4 experts (Switch eq. 1). */
export const BATCH_PROBS = BATCH_LOGITS.map(softmax);
/** Expert index each token picks (top-1): [0, 2, 0, 1, 0, 3, 1, 2]. */
export const BATCH_CHOICE = BATCH_PROBS.map(argmax);

const routed = Array.from({ length: N }, (_, e) => BATCH_CHOICE.filter((c) => c === e).length);
const f = routed.map((n) => n / T);
const P = Array.from({ length: N }, (_, e) => sum(BATCH_PROBS.map((row) => row[e])) / T);
const terms = f.map((fi, i) => fi * P[i]);
const ALPHA = 0.01;

/** The Switch load-balancing loss on the batch. */
export const BALANCE = {
  experts: N,
  tokens: T,
  routed, // [3, 2, 2, 1]
  f, // [0.375, 0.25, 0.25, 0.125]
  P, // [0.300, 0.260, 0.252, 0.189]
  terms, // [0.112, 0.065, 0.063, 0.024]
  sum: sum(terms), // 0.264
  loss: N * sum(terms), // 1.056
  balanced: 1, // N · Σ (1/N) · Pᵢ = ΣPᵢ = 1
  collapsed: N, // all tokens and all probability on one expert
  alpha: ALPHA,
  added: ALPHA * N * sum(terms), // 0.0106
  grad: f.map((fi) => N * fi), // [1.5, 1, 1, 0.5]
};

/** Fill each expert's slots in batch order at a capacity factor; overflow is dropped. */
function fill(capacityFactor: number) {
  const capacity = (T / N) * capacityFactor;
  const slots: number[][] = Array.from({ length: N }, () => []);
  const dropped: number[] = [];
  BATCH_CHOICE.forEach((e, t) => (slots[e].length < capacity ? slots[e].push(t) : dropped.push(t)));
  const processed = T - dropped.length;
  return { capacityFactor, capacity, processed, dropped, slots: capacity * N, empty: capacity * N - processed };
}

/** Capacity factor 0.5, 1.0, 1.5 and 2.0 on the same batch. */
export const CAPACITY_SWEEP = [0.5, 1, 1.5, 2].map(fill);

const lse = BATCH_LOGITS.map(logSumExp);
const zOf = (scale: number) => sum(BATCH_LOGITS.map((row) => logSumExp(row.map((v) => v * scale)) ** 2)) / T;
const C_Z = 0.001;

/** Router z-loss (ST-MoE eq. 5) on the batch, and on the same logits made 10× sharper. */
export const Z_LOSS = {
  lse, // per-token log-sum-exp
  z: zOf(1), // 4.79
  cz: C_Z,
  added: C_Z * zOf(1), // 0.0048
  zSharp: zOf(10), // 251
  ratio: zOf(10) / zOf(1), // ≈ 52
};
