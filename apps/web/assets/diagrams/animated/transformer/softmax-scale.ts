import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";
import { fix2, roundRow, softmax } from "@/components/diagrams/presets/llm-attention";

// Why attention divides the scores by √d_k, for one query and four keys at the original Transformer's head size,
// d_k = 64. Left panel: raw dot products. Right panel: the same scores divided by √64 = 8. Under each, the softmax
// weights as bars, and the slope of the top weight.
//
// Why the raw scores are this far apart (Vaswani et al. 2017, arXiv 1706.03762 v7, §3.2.1 and footnote 4): if the
// components of q and k are independent with mean 0 and variance 1, then q · k has mean 0 and variance d_k, so a
// standard deviation of √64 = 8. The scores below are illustrative, one standard deviation apart: 16, 8, 0, −8.
// The paper: "for large values of d_k, the dot products grow large in magnitude, pushing the softmax function into
// regions where it has extremely small gradients. To counteract this effect, we scale the dot products by 1/√d_k."
//
// Working:
//   raw    [16, 8, 0, −8]  exp [8,886,110.5, 2,981.0, 1, 0.000335]  Σ 8,889,092.5
//          → [0.99966, 0.000335, 1.1e-7, 3.8e-11] → shown 1.00, 0.00, 0.00, 0.00
//   scaled [2, 1, 0, −1]   exp [7.389, 2.718, 1, 0.368]  Σ 11.475
//          → [0.644, 0.237, 0.087, 0.032] → shown 0.64, 0.24, 0.09, 0.03 (largest remainder, sums to 1)
// Slope of the top weight with respect to its own score, ∂p₁/∂s₁ = p₁(1 − p₁):
//   raw 0.999665 × 0.000335 = 0.000335 → "0.0003";  scaled 0.644 × 0.356 = 0.229 → "0.23";
//   0.229 / 0.000335 ≈ 684, about 680× larger.
// A slope near 0 means the gradient that should teach the query and key projections is near 0.
//
// Layout: two panels side by side (neutral for raw, lime, the scale tone, for scaled). In each: a row of four score
// cells (orange), an arrow "softmax", four green bars whose height is the weight (110 px = 1), the weight above each
// bar, the key names under it, and the slope line. Colour: score orange, weight green, scale lime, neutral.

const D_K = 64;
const SCALE = Math.sqrt(D_K);
const RAW = [16, 8, 0, -8];
const SCALED = RAW.map((s) => s / SCALE);

const PANELS = [
  {
    id: "raw",
    x: 16,
    title: `Raw scores, spread about √${D_K} = ${SCALE}`,
    tone: "neutral" as LayoutTone,
    scores: RAW,
  },
  { id: "scaled", x: 456, title: `Divided by √d_k = ${SCALE}`, tone: ROLE_TONE.scale, scores: SCALED },
];

const PANEL_W = 408;
const CELL_W = 64;
const GAP = 20;
const CELLS_W = 4 * CELL_W + 3 * GAP;
const SCORE_Y = 100;
const CELL_H = 36;
const BAR_BOTTOM = 330;
const BAR_H = 110;

const text = (id: string, x: number, y: number, w: number, label: string, tone: LayoutTone, h = 20): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone,
});

/** Integers as integers, −8 with a real minus sign. */
const score = (s: number) => (s < 0 ? `−${Math.abs(s)}` : String(s));

function panel(p: (typeof PANELS)[number]): LayoutShape[] {
  const x0 = p.x + (PANEL_W - CELLS_W) / 2;
  const cx = (i: number) => x0 + i * (CELL_W + GAP);
  const weights = softmax(p.scores);
  const shown = roundRow(weights);
  const slope = weights[0] * (1 - weights[0]);
  const lo = Math.min(...p.scores);
  const hi = Math.max(...p.scores);
  return [
    text(`${p.id}-scores-t`, p.x + 24, SCORE_Y - 26, PANEL_W - 48, "scores q · k for four keys", ROLE_TONE.score),
    ...p.scores.map((s, i): LayoutShape => ({
      id: `${p.id}-s-${i}`,
      type: "cell",
      x: cx(i),
      y: SCORE_Y,
      w: CELL_W,
      h: CELL_H,
      label: score(s),
      tone: ROLE_TONE.score,
      weight: Math.round((0.1 + (0.7 * (s - lo)) / (hi - lo)) * 100) / 100,
      quiet: true,
    })),
    {
      id: `${p.id}-softmax`,
      type: "arrow",
      x: p.x + PANEL_W / 2,
      y: SCORE_Y + CELL_H + 6,
      w: 0,
      h: 44,
      label: "softmax",
    },
    ...weights.map((w, i): LayoutShape => {
      const h = Math.max(2, Math.round(w * BAR_H));
      return {
        id: `${p.id}-bar-${i}`,
        type: "box",
        x: cx(i) + 8,
        y: BAR_BOTTOM - h,
        w: CELL_W - 16,
        h,
        tone: ROLE_TONE.weight,
        fill: "pastel",
      };
    }),
    ...shown.map((w, i) =>
      text(
        `${p.id}-w-${i}`,
        cx(i),
        BAR_BOTTOM - Math.max(2, Math.round(weights[i] * BAR_H)) - 22,
        CELL_W,
        fix2(w),
        ROLE_TONE.weight
      )
    ),
    ...[1, 2, 3, 4].map((k, i) => text(`${p.id}-k-${i}`, cx(i), BAR_BOTTOM + 4, CELL_W, `key ${k}`, "neutral")),
    text(
      `${p.id}-slope`,
      p.x + 12,
      BAR_BOTTOM + 34,
      PANEL_W - 24,
      `slope of the top weight, p(1 − p) = ${slope < 0.01 ? slope.toFixed(4) : fix2(slope)}`,
      slope < 0.01 ? "neutral" : ROLE_TONE.weight
    ),
  ];
}

const spec: LayoutSpec = {
  kind: "layout",
  title: "Why the scores are divided by √d_k",
  width: 880,
  height: BAR_BOTTOM + 78,
  groups: PANELS.map((p) => ({
    id: `g-${p.id}`,
    title: p.title,
    tone: p.tone,
    x: p.x,
    y: 30,
    w: PANEL_W,
    h: BAR_BOTTOM + 64 - 30,
  })),
  shapes: PANELS.flatMap(panel),
};

export default spec;
