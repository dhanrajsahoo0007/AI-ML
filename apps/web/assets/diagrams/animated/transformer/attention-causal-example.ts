import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";
import { CAT_SAT, attend, fix2, num, pair } from "@/components/diagrams/presets/llm-attention";

// The "the cat sat" worked example from "Self-attention explained", run again with a causal mask, as a decoder does.
// Same tokens, queries, keys and values as attention-worked-example (all from presets/llm-attention.ts, d_k = 2).
//
// Step 1, the scaled scores of the unmasked example (Q · Kᵀ ÷ √2):
//   the [0.71, 0, 0.71] · cat [0, 1.41, 0.71] · sat [0.71, 1.41, 1.41]
// Step 2, the causal mask: −∞ wherever the key comes after the query (column > row), the upper triangle:
//   the [0.71, −∞, −∞] · cat [0, 1.41, −∞] · sat [0.71, 1.41, 1.41]
// Step 3, softmax per row; exp(−∞) = 0, so masked keys get weight exactly 0:
//   the: exp [2.028]                    → [1, 0, 0]
//   cat: exp [1.000, 4.113], Σ 5.113    → [0.196, 0.804, 0] → 0.20 0.80 0
//   sat: exp [2.028, 4.113, 4.113]      → [0.198, 0.401, 0.401] → 0.20 0.40 0.40 (unchanged)
// Step 4, weights × V:
//   the: 1 · (1, 0) = (1, 0)                              (unmasked: (0.80, 0.60))
//   cat: 0.196 · (1, 0) + 0.804 · (0, 1) = (0.20, 0.80)   (unmasked: (0.42, 0.86))
//   sat: (0.60, 0.80)                                     (unmasked: the same, it is the last token)
// The point: the last row never changes, and no earlier row depends on a later token, so a decoder can compute each
// token's row once and keep its keys and values (the KV cache).
//
// Facts checked against arXiv 1706.03762 v7, §3.2.3: decoder self-attention lets "each position in the decoder ...
// attend to all positions in the decoder up to and including that position", implemented "inside of scaled
// dot-product attention by masking out (setting to −∞) all values in the input of the softmax which correspond to
// illegal connections". So the mask comes after the scale and before the softmax (Figure 2, left).
//
// Layout: four grids in one row (scaled scores, masked scores, weights, new vectors), rows aligned with the token
// names on the left; a trace of the "cat" row underneath. Colour: scores orange, masked cells neutral, weights green,
// new vectors orange (the attention output), the mask arrow pink (the mask tone).

const TOKENS = CAT_SAT.tokens;
const PLAIN = attend(false);
const CAUSAL = attend(true);

const CELL = 40;
const SIDE = 3 * CELL;
const TOP = 96;
const rowMid = (r: number) => TOP + r * CELL + CELL / 2;
const SCALED_X = 76;
const MASKED_X = 296;
const W_X = 516;
const OUT_X = 736;

/** Heat of a score on the worked example's scale (0 → 0.1, 2 → 0.8). */
const heat = (v: number) => Math.round((0.1 + (0.7 * v) / 2) * 100) / 100;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone,
  step: number,
  quiet = false,
  h = 20
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: quiet || undefined });

function grid(
  id: string,
  x: number,
  cols: number,
  step: number,
  cell: (r: number, c: number) => { label: string; weight: number; tone: LayoutTone }
): LayoutShape[] {
  const out: LayoutShape[] = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < cols; c++) {
      const o = cell(r, c);
      out.push({
        id: `${id}-${r}-${c}`,
        type: "cell",
        x: x + c * CELL,
        y: TOP + r * CELL,
        w: CELL,
        h: CELL,
        tone: o.tone,
        label: o.label,
        weight: o.weight,
        step,
        quiet: true,
      });
    }
  return out;
}

const colLabels = (id: string, x: number, step: number) =>
  TOKENS.map((t, c) => text(`${id}-col-${c}`, x + c * CELL, TOP - 22, CELL, t, "neutral", step, true));

const arrow = (id: string, from: number, to: number, label: string, step: number, tone?: LayoutTone): LayoutShape => ({
  id,
  type: "arrow",
  x: from + 6,
  y: rowMid(1),
  w: to - 6 - (from + 6),
  h: 0,
  label,
  step,
  ...(tone ? { tone } : {}),
});

const rows: LayoutShape[] = TOKENS.map((t, r) => text(`tok-${r}`, 12, rowMid(r) - 10, 56, t, "neutral", 1, true));

const step1: LayoutShape[] = [
  text("t-scaled", SCALED_X - 20, TOP - 50, SIDE + 40, "Scaled scores", ROLE_TONE.score, 1),
  ...colLabels("scaled", SCALED_X, 1),
  ...grid("scaled", SCALED_X, 3, 1, (r, c) => ({
    label: num(PLAIN.scaled[r][c]),
    weight: heat(PLAIN.scaled[r][c]),
    tone: ROLE_TONE.score,
  })),
];

const step2: LayoutShape[] = [
  arrow("op-mask", SCALED_X + SIDE, MASKED_X, "+ mask", 2, ROLE_TONE.mask),
  text("t-masked", MASKED_X - 30, TOP - 50, SIDE + 60, "Masked: −∞ above the diagonal", ROLE_TONE.score, 2),
  ...colLabels("masked", MASKED_X, 2),
  ...grid("masked", MASKED_X, 3, 2, (r, c) => {
    const v = CAUSAL.masked[r][c];
    return v === -Infinity
      ? { label: num(v), weight: 0, tone: ROLE_TONE.masked }
      : { label: num(v), weight: heat(v), tone: ROLE_TONE.score };
  }),
];

const step3: LayoutShape[] = [
  arrow("op-softmax", MASKED_X + SIDE, W_X, "softmax", 3),
  text("t-weights", W_X - 30, TOP - 50, SIDE + 60, "Weights: masked keys get 0", ROLE_TONE.weight, 3),
  ...colLabels("w", W_X, 3),
  ...grid("w", W_X, 3, 3, (r, c) => {
    const w = CAUSAL.shownWeights[r][c];
    return { label: w === 0 ? "0" : fix2(w), weight: w, tone: ROLE_TONE.weight };
  }),
];

const step4: LayoutShape[] = [
  arrow("op-v", W_X + SIDE, OUT_X, "× V", 4),
  text("t-out", OUT_X - 14, TOP - 50, 2 * CELL + 28, "New vectors", ROLE_TONE.attention, 4),
  ...grid("out", OUT_X, 2, 4, (r, c) => ({
    label: fix2(CAUSAL.outputs[r][c]),
    weight: Math.round(CAUSAL.outputs[r][c] * 100) / 100,
    tone: ROLE_TONE.attention,
  })),
];

// The "cat" row, step by step, and what the mask changed.
const C = 1;
const TRACE_X = 24;
const TRACE_W = 812;
const traceY = (i: number) => TOP + SIDE + 34 + i * 26;
const round2 = (v: readonly number[]) => v.map((x) => Math.round(x * 100) / 100);
const kept = CAUSAL.shownWeights[C].filter((w) => w > 0);
const trace: LayoutShape[] = [
  text("tr-title", TRACE_X, traceY(0), TRACE_W, "Follow “cat”, the middle row:", "neutral", 1, true),
  text(
    "tr-2",
    TRACE_X,
    traceY(1),
    TRACE_W,
    `masked: ${PLAIN.scaled[C].map(num).join(", ")}  →  ${CAUSAL.masked[C].map(num).join(", ")}   (“sat” comes later, so it is hidden)`,
    ROLE_TONE.score,
    2,
    true
  ),
  text(
    "tr-3",
    TRACE_X,
    traceY(2),
    TRACE_W,
    `weights: softmax(${CAUSAL.masked[C].filter((s) => s !== -Infinity)
      .map(num)
      .join(", ")})  ≈  ${kept.map(fix2).join(", ")}, and 0 for “sat”`,
    ROLE_TONE.weight,
    3,
    true
  ),
  text(
    "tr-4",
    TRACE_X,
    traceY(3),
    TRACE_W,
    `new vector: ${kept.map((w, j) => `${fix2(w)} × ${pair(CAT_SAT.v[j])}`).join(" + ")} = ${pair(
      round2(CAUSAL.outputs[C])
    )}, was ${pair(round2(PLAIN.outputs[C]))} without the mask`,
    ROLE_TONE.attention,
    4,
    true
  ),
  text(
    "tr-5",
    TRACE_X,
    traceY(4),
    TRACE_W,
    `“sat” is last, so its row is unchanged: ${pair(round2(CAUSAL.outputs[2]))} with or without the mask`,
    ROLE_TONE.attention,
    4,
    true
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The same example with a causal mask",
  width: 860,
  height: traceY(4) + 36,
  shapes: [...rows, ...trace, ...step1, ...step2, ...step3, ...step4],
  steps: [
    { title: "Start from the scaled scores of the worked example" },
    { title: "Add the causal mask: −∞ wherever the key comes after the query" },
    { title: "Softmax per row: every masked key gets weight 0" },
    { title: "Blend the values: no token reads a later one" },
  ],
};

export default spec;
