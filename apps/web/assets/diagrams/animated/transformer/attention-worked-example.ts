import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE, vector } from "@/components/diagrams/presets/transformer";
import { CAT_SAT, attend, dot, fix2, num, pair } from "@/components/diagrams/presets/llm-attention";

// The worked example from "Self-attention explained" (section "A worked example"), drawn with the page's own numbers:
// three tokens "the", "cat", "sat" with 2-dimensional queries, keys and values (d_k = 2).
//
//          query    key      value
//   the    (1, 0)   (1, 0)   (1, 0)
//   cat    (0, 1)   (0, 2)   (0, 1)
//   sat    (1, 1)   (1, 1)   (1, 1)
//
// Step 1, raw scores Q · Kᵀ (row = query, column = key):
//   the: (1,0)·(1,0) = 1, (1,0)·(0,2) = 0, (1,0)·(1,1) = 1  → [1, 0, 1]
//   cat: (0,1)·(1,0) = 0, (0,1)·(0,2) = 2, (0,1)·(1,1) = 1  → [0, 2, 1]
//   sat: (1,1)·(1,0) = 1, (1,1)·(0,2) = 2, (1,1)·(1,1) = 2  → [1, 2, 2]
// Step 2, divide by √d_k = √2 = 1.4142:
//   the [0.707, 0, 0.707] · cat [0, 1.414, 0.707] · sat [0.707, 1.414, 1.414]  → shown 0.71 / 1.41
// Step 3, softmax per row (exp(0.707) = 2.028, exp(1.414) = 4.113):
//   the: exp [2.028, 1.000, 2.028], Σ 5.056   → [0.401, 0.198, 0.401] → 0.40 0.20 0.40
//   cat: exp [1.000, 4.113, 2.028], Σ 7.141   → [0.140, 0.576, 0.284] → 0.14 0.58 0.28
//   sat: exp [2.028, 4.113, 4.113], Σ 10.254  → [0.198, 0.401, 0.401] → 0.20 0.40 0.40
//   (roundRow uses the largest remainder, so every shown row adds up to exactly 1.00)
// Step 4, weights × V:
//   the: 0.401·(1,0) + 0.198·(0,1) + 0.401·(1,1) = (0.802, 0.599) → (0.80, 0.60)
//   cat: 0.140·(1,0) + 0.576·(0,1) + 0.284·(1,1) = (0.424, 0.860) → (0.42, 0.86)
//   sat: 0.198·(1,0) + 0.401·(0,1) + 0.401·(1,1) = (0.599, 0.802) → (0.60, 0.80)
// The "sat" row matches the page text: scores 1, 2, 2 → about 0.71, 1.41, 1.41 → about 0.20, 0.40, 0.40 →
// (0.60, 0.80). The tokens, vectors and arithmetic live in presets/llm-attention.ts (shared with
// attention-causal-example). Formula: Attention(Q, K, V) = softmax(Q Kᵀ / √d_k) V (Vaswani et al. 2017, §3.2.1).

const { tokens: TOKENS, q: Q, k: K, v: V, dK: D_K } = CAT_SAT;
const { scale: SCALE, raw: RAW, scaled: SCALED, shownWeights: SHOWN_WEIGHTS, outputs: OUTPUTS } = attend(false);

// ── Geometry ────────────────────────────────────────────────────────────────────────────────────────────────────
// Top tier: the inputs on the left, then raw scores and scaled scores, rows aligned with the input rows.
// Bottom tier: the weights straight under the scaled scores (same columns), then the new vectors; the trace of the
// "sat" row fills the space on the left.
const CELL = 40;
const SIDE = 3 * CELL;
const TOP = 100;
const BOTTOM = 312;
const rowMid = (top: number, r: number) => top + r * CELL + CELL / 2;

const VC = 28; // input vector cell
const QX = 84;
const KX = 156;
const VX = 228;
const SCORES_X = 380;
const SCALED_X = 584;
const OUT_X = 784;

/** Heat of a score on one shared scale (0 → 0.1, 2 → 0.8), so scaled scores look paler than raw ones. */
const heat = (v: number) => Math.round((0.1 + (0.7 * v) / 2) * 100) / 100;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone,
  step: number,
  h = 20,
  quiet = false
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: quiet || undefined });

/** A grid of labelled cells; each `cell(r, c)` gives the label and heat. Cells are quiet. */
function grid(
  id: string,
  x: number,
  y: number,
  rows: number,
  cols: number,
  tone: LayoutTone,
  step: number,
  cell: (r: number, c: number) => { label: string; weight: number }
): LayoutShape[] {
  const out: LayoutShape[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const o = cell(r, c);
      out.push({
        id: `${id}-${r}-${c}`,
        type: "cell",
        x: x + c * CELL,
        y: y + r * CELL,
        w: CELL,
        h: CELL,
        tone,
        label: o.label,
        weight: o.weight,
        step,
        quiet: true,
      });
    }
  return out;
}

/** Token names above the columns of a matrix (keys). */
const colLabels = (id: string, x: number, y: number, step: number) =>
  TOKENS.map((t, c) => text(`${id}-col-${c}`, x + c * CELL, y - 22, CELL, t, "neutral", step, 20, true));

// ── Inputs: Q, K, V for each token ─────────────────────────────────────────────────────────────────────────────
const inputs: LayoutShape[] = [
  text("h-q", QX, TOP - 26, 2 * VC, "Q", ROLE_TONE.query, 1, 20, true),
  text("h-k", KX, TOP - 26, 2 * VC, "K", ROLE_TONE.key, 1, 20, true),
  text("h-v", VX, TOP - 26, 2 * VC, "V", ROLE_TONE.value, 1, 20, true),
  ...TOKENS.flatMap((t, r): LayoutShape[] => {
    const y = rowMid(TOP, r) - VC / 2;
    const opts = (vals: readonly number[]) => ({ cell: VC, labels: vals.map(String), step: 1 });
    return [
      text(`tok-${r}`, 20, rowMid(TOP, r) - 10, 56, t, "neutral", 1, 20, true),
      ...vector(`q-${r}`, QX, y, 2, ROLE_TONE.query, opts(Q[r])),
      ...vector(`k-${r}`, KX, y, 2, ROLE_TONE.key, opts(K[r])),
      ...vector(`v-${r}`, VX, y, 2, ROLE_TONE.value, opts(V[r])),
    ];
  }),
];

// ── Step 1: raw scores ─────────────────────────────────────────────────────────────────────────────────────────
const step1: LayoutShape[] = [
  {
    id: "op-qk",
    type: "arrow",
    x: 302,
    y: rowMid(TOP, 1),
    w: SCORES_X - 6 - 302,
    h: 0,
    label: "Q · Kᵀ",
    step: 1,
  },
  text("t-raw", SCORES_X - 20, TOP - 56, SIDE + 40, "Raw scores", ROLE_TONE.score, 1),
  ...colLabels("raw", SCORES_X, TOP, 1),
  ...grid("raw", SCORES_X, TOP, 3, 3, ROLE_TONE.score, 1, (r, c) => ({
    label: num(RAW[r][c]),
    weight: heat(RAW[r][c]),
  })),
];

// ── Step 2: scaled scores ──────────────────────────────────────────────────────────────────────────────────────
const step2: LayoutShape[] = [
  {
    id: "op-scale",
    type: "arrow",
    x: SCORES_X + SIDE + 6,
    y: rowMid(TOP, 1),
    w: SCALED_X - 6 - (SCORES_X + SIDE + 6),
    h: 0,
    label: `÷ √${D_K}`,
    step: 2,
  },
  text("t-scaled", SCALED_X - 20, TOP - 56, SIDE + 40, "Scaled scores", ROLE_TONE.score, 2),
  ...colLabels("scaled", SCALED_X, TOP, 2),
  ...grid("scaled", SCALED_X, TOP, 3, 3, ROLE_TONE.score, 2, (r, c) => ({
    label: num(SCALED[r][c]),
    weight: heat(SCALED[r][c]),
  })),
];

// ── Step 3: softmax per row → weights ──────────────────────────────────────────────────────────────────────────
const step3: LayoutShape[] = [
  {
    id: "op-softmax",
    type: "arrow",
    x: SCALED_X + SIDE / 2,
    y: TOP + SIDE + 8,
    w: 0,
    h: BOTTOM - 8 - (TOP + SIDE + 8),
    label: "softmax per row",
    step: 3,
  },
  ...TOKENS.map((t, r) => text(`w-row-${r}`, SCALED_X - 64, rowMid(BOTTOM, r) - 10, 60, t, "neutral", 3, 20, true)),
  ...grid("w", SCALED_X, BOTTOM, 3, 3, ROLE_TONE.weight, 3, (r, c) => ({
    label: SHOWN_WEIGHTS[r][c].toFixed(2),
    weight: SHOWN_WEIGHTS[r][c],
  })),
  text("t-weights", SCALED_X - 30, BOTTOM + SIDE + 10, SIDE + 60, "Weights: each row sums to 1", ROLE_TONE.weight, 3),
];

// ── Step 4: weights × V → new vectors ──────────────────────────────────────────────────────────────────────────
const step4: LayoutShape[] = [
  {
    id: "op-v",
    type: "arrow",
    x: SCALED_X + SIDE + 6,
    y: rowMid(BOTTOM, 1),
    w: OUT_X - 6 - (SCALED_X + SIDE + 6),
    h: 0,
    label: "× V",
    step: 4,
  },
  ...grid("out", OUT_X, BOTTOM, 3, 2, ROLE_TONE.attention, 4, (r, c) => ({
    label: fix2(OUTPUTS[r][c]),
    weight: Math.round(OUTPUTS[r][c] * 100) / 100,
  })),
  text("t-out", OUT_X - 4, BOTTOM + SIDE + 10, 2 * CELL + 8, "New vectors", ROLE_TONE.attention, 4, 20, true),
];

// ── The "sat" row, step by step (the numbers in the page text) ─────────────────────────────────────────────────
const S = 2; // index of "sat"
const TRACE_X = 24;
const TRACE_W = 456;
const traceY = (i: number) => BOTTOM + 8 + i * 26;
const trace: LayoutShape[] = [
  text(
    "tr-title",
    TRACE_X,
    BOTTOM - 26,
    TRACE_W,
    'Follow "sat", the bottom row of every grid:',
    "neutral",
    1,
    20,
    true
  ),
  text(
    "tr-1",
    TRACE_X,
    traceY(0),
    TRACE_W,
    `scores: ${K.map((k) => `${pair(Q[S])} · ${pair(k)} = ${num(dot(Q[S], k))}`).join(",  ")}`,
    ROLE_TONE.score,
    1,
    20,
    true
  ),
  text(
    "tr-2",
    TRACE_X,
    traceY(1),
    TRACE_W,
    `scaled: ${RAW[S].map(num).join(", ")}  ÷ ${fix2(SCALE)}  ≈  ${SCALED[S].map(num).join(", ")}`,
    ROLE_TONE.score,
    2,
    20,
    true
  ),
  text(
    "tr-3",
    TRACE_X,
    traceY(2),
    TRACE_W,
    `weights: softmax(${SCALED[S].map(num).join(", ")})  ≈  ${SHOWN_WEIGHTS[S].map(fix2).join(", ")}`,
    ROLE_TONE.weight,
    3,
    20,
    true
  ),
  text(
    "tr-4",
    TRACE_X,
    traceY(3),
    TRACE_W,
    `new vector: ${SHOWN_WEIGHTS[S].map((w, j) => `${fix2(w)} × ${pair(V[j])}`).join(" + ")} = ${pair(
      OUTPUTS[S].map((v) => Math.round(v * 100) / 100)
    )}`,
    ROLE_TONE.attention,
    4,
    20,
    true
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: 'Self-attention, worked through for "the cat sat"',
  width: 872,
  height: 490,
  groups: [{ id: "inputs", title: "Inputs (d_k = 2)", tone: "neutral", x: 8, y: 36, w: 284, h: 200 }],
  shapes: [...inputs, ...trace, ...step1, ...step2, ...step3, ...step4],
  steps: [
    { title: "Score every pair: dot each query with each key (Q · Kᵀ)" },
    { title: "Shrink the scores: divide by √d_k = √2 ≈ 1.41" },
    { title: "Turn each row into weights with a softmax: every row sums to 1" },
    { title: "Blend the values: each new vector is its row of weights × V" },
  ],
};

export default spec;
