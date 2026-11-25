import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// One next-token distribution at three temperatures, for the "Logits, softmax and temperature" concept on the
// Decoding & Sampling page. The model has read "After the rain, the sky turned" and its output head gives one logit
// per candidate token. For the drawing, the 8 candidates below stand for the whole vocabulary.
//
// Formula (Holtzman et al., 2019, arXiv 1904.09751, eq. 4, "sampling with temperature"):
//   p_i = exp(z_i / T) / Σ_j exp(z_j / T); T < 1 sharpens the distribution, T > 1 flattens it, T = 1 is the plain
//   softmax. T → 0 approaches greedy decoding (all mass on the arg-max).
//
// Logits (illustrative): gray 3.3, blue 3.0, clear 2.4, dark 2.1, pink 1.5, orange 1.1, bright 0.6, green −0.5.
// Working (computed below; shown to 2 decimals, each column sums to 1.00 as displayed):
//   T = 1.0: exp = 27.11, 20.09, 11.02, 8.17, 4.48, 3.00, 1.82, 0.61; sum 76.30
//            p   = 0.355, 0.263, 0.145, 0.107, 0.059, 0.039, 0.024, 0.008
//   T = 0.5: p   = 0.541, 0.297, 0.089, 0.049, 0.015, 0.007, 0.002, 0.000 (sum of exp(2z) = 1359.5)
//   T = 1.5: p   = 0.278, 0.228, 0.153, 0.125, 0.084, 0.064, 0.046, 0.022 (sum of exp(z / 1.5) = 32.43)
// Bars share one scale across the three panels (BAR_PX px per unit of probability), so widths compare directly.

const TOKENS = ["gray", "blue", "clear", "dark", "pink", "orange", "bright", "green"];
const LOGITS = [3.3, 3.0, 2.4, 2.1, 1.5, 1.1, 0.6, -0.5];
const TEMPS = [0.5, 1.0, 1.5];

const softmax = (z: number[], t: number) => {
  const e = z.map((v) => Math.exp(v / t));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
};
const PROBS = TEMPS.map((t) => softmax(LOGITS, t));
const fmt = (p: number) => p.toFixed(2);

// ── Grid ─────────────────────────────────────────────────────────────────────────────────────────────────────
const ROW_TOP = 118;
const ROW_STEP = 34;
const BAR_H = 20;
const rowTop = (i: number) => ROW_TOP + i * ROW_STEP;
const ROWS_BOTTOM = rowTop(TOKENS.length - 1) + ROW_STEP;
const X_TOKEN = 16;
const X_LOGIT = 92;
const PANEL_X = [176, 406, 636];
const PANEL_W = 216;
const BAR_PX = 260;
const PROB_TONE: LayoutTone = ROLE_TONE.softmax;
const LOGIT_TONE: LayoutTone = ROLE_TONE.linear;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone: LayoutTone = "neutral"
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone });

const shapes: LayoutShape[] = [
  text("context", 16, 12, 836, 20, "Next token after “After the rain, the sky turned …” (8 candidates shown)"),
  text("formula", 16, 36, 836, 20, "pᵢ = exp(zᵢ / T) ÷ (sum of exp(z / T) over all candidates)", PROB_TONE),
  text("h-token", X_TOKEN, ROW_TOP - 30, 64, 20, "token"),
  text("h-logit", X_LOGIT - 10, ROW_TOP - 30, 76, 20, "logit z", LOGIT_TONE),
];

TOKENS.forEach((tok, i) => {
  shapes.push(
    text(`tok-${i}`, X_TOKEN, rowTop(i), 64, BAR_H, tok),
    text(`logit-${i}`, X_LOGIT, rowTop(i), 56, BAR_H, LOGITS[i].toFixed(1).replace("-", "−"), LOGIT_TONE)
  );
});

TEMPS.forEach((t, k) => {
  const x0 = PANEL_X[k] + 10;
  PROBS[k].forEach((p, i) => {
    const w = Math.max(3, Math.round(p * BAR_PX));
    shapes.push(
      {
        id: `bar-${k}-${i}`,
        type: "cell",
        x: x0,
        y: rowTop(i),
        w,
        h: BAR_H,
        tone: PROB_TONE,
        fill: "pastel",
      },
      text(`p-${k}-${i}`, x0 + w + 4, rowTop(i), 40, BAR_H, fmt(p), PROB_TONE)
    );
  });
});

const top = PROBS.map((p) => fmt(p[0]));
const last = PROBS.map((p) => fmt(p[p.length - 1]));
shapes.push(
  text(
    "note-low",
    PANEL_X[0],
    ROWS_BOTTOM + 14,
    PANEL_W,
    36,
    `Sharper: “gray” takes ${top[0]}.\nThe tail almost vanishes.`
  ),
  text(
    "note-mid",
    PANEL_X[1],
    ROWS_BOTTOM + 14,
    PANEL_W,
    36,
    `The plain softmax:\n“gray” ${top[1]}, “green” ${last[1]}.`
  ),
  text(
    "note-high",
    PANEL_X[2],
    ROWS_BOTTOM + 14,
    PANEL_W,
    36,
    `Flatter: “gray” drops to ${top[2]};\n“green” rises to ${last[2]}.`
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "One next-token distribution at three temperatures",
  width: 868,
  height: ROWS_BOTTOM + 64,
  groups: TEMPS.map((t, k) => ({
    id: `panel-${k}`,
    title: `T = ${t.toFixed(1)}`,
    tone: k === 1 ? PROB_TONE : "neutral",
    x: PANEL_X[k],
    y: ROW_TOP - 22,
    w: PANEL_W,
    h: ROWS_BOTTOM - ROW_TOP + 22,
  })),
  shapes,
};

export default spec;
