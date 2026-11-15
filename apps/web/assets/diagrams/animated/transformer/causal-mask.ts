import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// Masking inside scaled dot-product attention, on two 4 × 4 examples (rows = queries, columns = keys):
// - Top row, the causal mask: the decoder input "<s> Ich liebe Tee". A token may attend to itself and earlier tokens
//   only, so the mask is −∞ above the diagonal.
// - Bottom row, the padding mask: a source sentence "I love tea" padded to the batch length of 4 with [PAD]. Every
//   query must ignore the [PAD] key, so the mask is −∞ down the [PAD] column. (The [PAD] row's own output is
//   computed but thrown away later; the mask only has to stop real tokens from reading padding.)
// Step 1 shows the scaled scores, step 2 adds the mask (0 keeps a score, −∞ removes it), step 3 applies the softmax.
//
// Facts, checked against the paper (arXiv 1706.03762 v7): §3.2.3 masks "all values in the input of the softmax which
// correspond to illegal connections" by setting them to −∞, inside scaled dot-product attention, so the mask comes
// after the scale and before the softmax (Figure 2, left). exp(−∞) = 0, so masked positions get weight exactly 0.
//
// The scores are made up for the example (already divided by √d_k = 8). Softmax of each masked row, working:
//   Causal, "<s>":   [1.2]                → exp [3.320], Σ 3.320                        → [1.000]
//           "Ich":   [0.6, 1.5]           → exp [1.822, 4.482], Σ 6.304                 → [0.289, 0.711]
//           "liebe": [0.1, 0.9, 1.3]      → exp [1.105, 2.460, 3.669], Σ 7.234          → [0.153, 0.340, 0.507]
//           "Tee":   [0.2, 0.7, 1.1, 1.6] → exp [1.221, 2.014, 3.004, 4.953], Σ 11.192  → [0.109, 0.180, 0.268, 0.443]
//   Padding, "I":     [1.4, 0.5, 0.3]     → exp [4.055, 1.649, 1.350], Σ 7.054          → [0.575, 0.234, 0.191]
//            "love":  [0.4, 1.2, 0.8]     → exp [1.492, 3.320, 2.226], Σ 7.037          → [0.212, 0.472, 0.316]
//            "tea":   [0.1, 0.7, 1.5]     → exp [1.105, 2.014, 4.482], Σ 7.601          → [0.145, 0.265, 0.590]
//            "[PAD]": [0.3, 0.2, 0.4]     → exp [1.350, 1.221, 1.492], Σ 4.063          → [0.332, 0.301, 0.367]
//   (the [PAD] key's score is left out of every row: exp(−∞) = 0)
// Shown to 2 decimals: 1.00 · 0.29 0.71 · 0.15 0.34 0.51 · 0.11 0.18 0.27 0.44 and 0.58 0.23 0.19 · 0.21 0.47 0.32 ·
// 0.15 0.26 0.59 · 0.33 0.30 0.37. roundRow uses the largest remainder, so a row could never show 0.99 or 1.01.

const CAUSAL_TOKENS = ["<s>", "Ich", "liebe", "Tee"];
const CAUSAL_SCORES = [
  [1.2, 0.4, -0.3, 0.8],
  [0.6, 1.5, 0.2, -0.4],
  [0.1, 0.9, 1.3, 0.5],
  [0.2, 0.7, 1.1, 1.6],
];
const PAD_TOKENS = ["I", "love", "tea", "[PAD]"];
const PAD_SCORES = [
  [1.4, 0.5, 0.3, 0.9],
  [0.4, 1.2, 0.8, 1.0],
  [0.1, 0.7, 1.5, 0.6],
  [0.3, 0.2, 0.4, 0.5],
];

/** True where the mask is −∞. */
const causalMasked = (r: number, c: number) => c > r;
const padMasked = (_r: number, c: number) => PAD_TOKENS[c] === "[PAD]";

/** Softmax over the unmasked entries of a row; masked entries get exactly 0. */
function maskedSoftmax(row: number[], masked: (c: number) => boolean): number[] {
  const exps = row.map((v, c) => (masked(c) ? 0 : Math.exp(v)));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/** Rounds a row of probabilities to hundredths so the shown values still add up to exactly 1 (largest remainder). */
function roundRow(p: number[]): number[] {
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

const CELL = 36;
const SIDE = 4 * CELL;
const MX = [80, 274, 468, 708]; // left edges of the four matrices: scores, mask, masked scores, weights
const SCORE_MIN = -0.5;
const SCORE_MAX = 1.7;
/** Heat of a raw score: −0.5 → 0.08, 1.7 → 0.85. */
const heat = (v: number) => Math.round((0.08 + (0.77 * (v - SCORE_MIN)) / (SCORE_MAX - SCORE_MIN)) * 100) / 100;
/** Grey of a −∞ cell. */
const MASKED_SHADE = 0.4;
const num = (v: number) => (v < 0 ? `−${Math.abs(v).toFixed(1)}` : v.toFixed(1));

const text = (id: string, x: number, y: number, w: number, label: string, tone: LayoutTone, step: number, h = 20) =>
  ({ id, type: "text", x, y, w, h, label, tone, step }) as LayoutShape;

interface CellOpts {
  label: string;
  tone: LayoutTone;
  weight?: number;
}

/** A 4 × 4 grid at matrix column `m`, top edge `y`, with token labels above (and, for the first, to the left). */
function grid(
  id: string,
  m: number,
  y: number,
  tokens: string[],
  step: number,
  cell: (r: number, c: number) => CellOpts
): LayoutShape[] {
  const x = MX[m];
  const out: LayoutShape[] = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      const o = cell(r, c);
      out.push({
        id: `${id}-${r}-${c}`,
        type: "cell",
        x: x + c * CELL,
        y: y + r * CELL,
        w: CELL,
        h: CELL,
        label: o.label,
        tone: o.tone,
        weight: o.weight,
        step,
        quiet: true,
      });
    }
  const q = (s: LayoutShape): LayoutShape => ({ ...s, quiet: true });
  tokens.forEach((t, c) =>
    out.push(q(text(`${id}-col-${c}`, x + c * CELL - 6, y - 22, CELL + 12, t, "neutral", step)))
  );
  if (m === 0)
    tokens.forEach((t, r) => out.push(q(text(`${id}-row-${r}`, x - 64, y + r * CELL, 60, t, "neutral", step, CELL))));
  return out;
}

/** One row of the figure: scores ⊕ mask = masked scores → softmax → weights. */
function row(pre: string, y: number, tokens: string[], scores: number[][], masked: (r: number, c: number) => boolean) {
  const weights = scores.map((s, r) => roundRow(maskedSoftmax(s, (c) => masked(r, c))));
  const midY = y + SIDE / 2;
  const opX = (m: number) => MX[m] + SIDE + (MX[m + 1] - MX[m] - SIDE) / 2;
  const titleY = y - 48;
  const minusInf: CellOpts = { label: "−∞", tone: ROLE_TONE.masked, weight: MASKED_SHADE };
  return [
    // Step 1: the scaled scores.
    text(`${pre}-t-scores`, MX[0] - 20, titleY, SIDE + 40, "Scaled scores", ROLE_TONE.score, 1),
    ...grid(`${pre}-scores`, 0, y, tokens, 1, (r, c) => ({
      label: num(scores[r][c]),
      tone: ROLE_TONE.score,
      weight: heat(scores[r][c]),
    })),
    // Step 2: add the mask.
    {
      id: `${pre}-plus`,
      type: "circle",
      x: opX(0),
      y: midY,
      w: 24,
      symbol: "plus",
      tone: "neutral",
      label: "plus",
      step: 2,
    },
    text(`${pre}-t-mask`, MX[1] - 20, titleY, SIDE + 40, "Mask", ROLE_TONE.masked, 2),
    ...grid(`${pre}-mask`, 1, y, tokens, 2, (r, c) =>
      masked(r, c) ? minusInf : { label: "0", tone: ROLE_TONE.masked }
    ),
    ...[-4, 4].map((dy, i): LayoutShape => ({
      id: `${pre}-equals-${i}`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [opX(1) - 8, midY + dy],
        [opX(1) + 8, midY + dy],
      ],
      tone: "neutral",
      step: 2,
    })),
    text(`${pre}-t-masked`, MX[2] - 20, titleY, SIDE + 40, "Masked scores", ROLE_TONE.score, 2),
    ...grid(`${pre}-masked`, 2, y, tokens, 2, (r, c) =>
      masked(r, c) ? minusInf : { label: num(scores[r][c]), tone: ROLE_TONE.score, weight: heat(scores[r][c]) }
    ),
    // Step 3: softmax, row by row.
    {
      id: `${pre}-softmax`,
      type: "arrow",
      x: MX[2] + SIDE + 8,
      y: midY,
      w: MX[3] - MX[2] - SIDE - 16,
      h: 0,
      label: "softmax",
      step: 3,
    },
    text(`${pre}-t-weights`, MX[3] - 6, titleY, SIDE + 12, "Weights (rows sum to 1)", ROLE_TONE.weight, 3),
    ...grid(`${pre}-weights`, 3, y, tokens, 3, (r, c) =>
      masked(r, c)
        ? { label: "0", tone: ROLE_TONE.weight, weight: 0 }
        : { label: weights[r][c].toFixed(2), tone: ROLE_TONE.weight, weight: weights[r][c] }
    ),
  ] as LayoutShape[];
}

const ROW1_Y = 104;
const ROW2_Y = 368;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Causal mask and padding mask",
  width: 872,
  height: 548,
  groups: [
    {
      id: "causal",
      title: 'Causal mask: decoder input "<s> Ich liebe Tee"',
      tone: "neutral",
      x: 8,
      y: 36,
      w: 856,
      h: 228,
    },
    {
      id: "padding",
      title: 'Padding mask: source "I love tea" + [PAD]',
      tone: "neutral",
      x: 8,
      y: 300,
      w: 856,
      h: 228,
    },
  ],
  shapes: [
    ...row("c", ROW1_Y, CAUSAL_TOKENS, CAUSAL_SCORES, causalMasked),
    ...row("p", ROW2_Y, PAD_TOKENS, PAD_SCORES, padMasked),
  ],
  steps: [
    { title: "Scaled scores: one row per query, one column per key" },
    { title: "Add the mask: 0 keeps a score, −∞ removes it" },
    { title: "Softmax: removed positions get weight 0" },
  ],
};

export default spec;
