import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { SPECDEC, expectedTokens, wallSpeedup } from "@/components/diagrams/presets/production-specdec";

// Expected tokens per target-model pass against the acceptance rate α, for draft lengths k = 2, 4 and 8, for "Acceptance
// rate math and effective speedup" on the Speculative Decoding page. Every point is computed from Leviathan et al.
// (2023, arXiv 2211.17192) Eq. 1, E = (1 − α^(k+1)) / (1 − α), which assumes each draft is accepted independently
// with probability α. Step 3 adds Theorem 3.8, speed-up = E / (k·c + 1), with an illustrative draft cost c = 0.1.
//
// Steps:
//   1. k = 4 alone, with Brightpost's point α = 0.8 marked: (1 − 0.8^5) / 0.2 = 3.36 tokens per pass.
//   2. k = 2 and k = 8 added: at α = 0.6 they give 1.96 and 2.47; at α = 0.9, 2.71 and 6.13. Long drafts pay only
//      when α is high.
//   3. A table of wall-clock speed-ups with c = 0.1:
//        α 0.6: k 2 → 1.96 / 1.2 = 1.63, k 4 → 2.31 / 1.4 = 1.65, k 8 → 2.47 / 1.8 = 1.37
//        α 0.8: k 2 → 2.44 / 1.2 = 2.03, k 4 → 3.36 / 1.4 = 2.40, k 8 → 4.33 / 1.8 = 2.40
//        α 0.9: k 2 → 2.71 / 1.2 = 2.26, k 4 → 4.10 / 1.4 = 2.93, k 8 → 6.13 / 1.8 = 3.40
//      The best k grows with α; at α 0.8, k 8 buys nothing over k 4.
//
// Grid: plot area x 80–560, y 44–300 (α 0.5–0.95 across, 0–8 tokens up); curve labels at x 566; table x 620–844.
// Colours: k = 4 and the marked point green (PROD_TONE.model, the generated answer), k = 2 and k = 8 neutral (k = 8
// dashed), the speed-up table lime (PROD_TONE.check, a metric). One highlight: the marked point.

const PLOT = { x: 80, y: 44, w: 480, h: 256 } as const;
const A_MIN = 0.5;
const A_MAX = 0.95;
const T_MAX = 8;
const X = (a: number) => Math.round((PLOT.x + ((a - A_MIN) / (A_MAX - A_MIN)) * PLOT.w) * 10) / 10;
const Y = (t: number) => Math.round((PLOT.y + PLOT.h - (t / T_MAX) * PLOT.h) * 10) / 10;
const ALPHAS = Array.from({ length: 19 }, (_, i) => Math.round((A_MIN + i * 0.025) * 1000) / 1000);
const curve = (k: number): [number, number][] => ALPHAS.map((a) => [X(a), Y(expectedTokens(a, k))]);

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra,
  h = 20,
  quiet = true
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: quiet || undefined });

const MARK_T = expectedTokens(SPECDEC.alpha, SPECDEC.k); // 3.3616

const shapes: LayoutShape[] = [
  // Axes and ticks
  {
    id: "y-axis",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [PLOT.x, PLOT.y + PLOT.h],
      [PLOT.x, PLOT.y - 8],
    ],
    head: true,
    step: 1,
  },
  {
    id: "x-axis",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [PLOT.x, PLOT.y + PLOT.h],
      [PLOT.x + PLOT.w + 12, PLOT.y + PLOT.h],
    ],
    head: true,
    step: 1,
  },
  text("y-title", 16, 8, 260, "tokens per large-model pass", 1, PROD_TONE.infra, 20, false),
  text("x-title", PLOT.x, PLOT.y + PLOT.h + 26, PLOT.w, "acceptance rate α (chance each draft is kept)", 1),
  // Plain decoding: one token per pass.
  {
    id: "baseline",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [PLOT.x, Y(1)],
      [PLOT.x + PLOT.w, Y(1)],
    ],
    dashed: true,
    step: 1,
  },
  text("baseline-label", PLOT.x + PLOT.w - 170, Y(1) - 20, 170, "plain decoding: 1", 1),
  // k = 4 with Brightpost's point.
  {
    id: "curve-4",
    type: "path",
    x: 0,
    y: 0,
    points: curve(4),
    smooth: true,
    tone: PROD_TONE.model,
    weight: 0.9,
    step: 1,
  },
  text("label-4", PLOT.x + PLOT.w + 6, Y(expectedTokens(A_MAX, 4)) - 10, 50, "k = 4", 1, PROD_TONE.model),
  {
    id: "mark",
    type: "circle",
    x: X(SPECDEC.alpha),
    y: Y(MARK_T),
    w: 12,
    tone: PROD_TONE.model,
    fill: "pastel",
    highlight: true,
    step: 1,
    quiet: true,
  },
  text(
    "mark-label",
    X(SPECDEC.alpha) - 200,
    Y(MARK_T) - 66,
    190,
    `α ${SPECDEC.alpha}, k ${SPECDEC.k}: ${MARK_T.toFixed(2)} tokens`,
    1,
    PROD_TONE.model,
    20,
    false
  ),
  {
    id: "mark-lead",
    type: "arrow",
    x: X(SPECDEC.alpha) - 60,
    y: Y(MARK_T) - 44,
    w: 52,
    h: 36,
    step: 1,
    quiet: true,
  },
  // ── Step 2: k = 2 and k = 8 ──────────────────────────────────────────────────────────────────────────────────
  {
    id: "curve-2",
    type: "path",
    x: 0,
    y: 0,
    points: curve(2),
    smooth: true,
    tone: PROD_TONE.infra,
    weight: 0.7,
    step: 2,
  },
  {
    id: "curve-8",
    type: "path",
    x: 0,
    y: 0,
    points: curve(8),
    smooth: true,
    dashed: true,
    tone: PROD_TONE.infra,
    weight: 0.7,
    step: 2,
  },
  text("label-2", PLOT.x + PLOT.w + 6, Y(expectedTokens(A_MAX, 2)) - 10, 50, "k = 2", 2, PROD_TONE.infra, 20, false),
  text("label-8", PLOT.x + PLOT.w + 6, Y(expectedTokens(A_MAX, 8)) - 10, 50, "k = 8", 2),
  ...[0.6, 0.9].map((a, i) =>
    text(
      `gap-note-${i}`,
      PLOT.x + 12,
      Y(7) + i * 22,
      280,
      `α ${a}: k 8 gives ${expectedTokens(a, 8).toFixed(2)}, k 2 gives ${expectedTokens(a, 2).toFixed(2)}`,
      2
    )
  ),
];

// Ticks
for (let t = 1; t <= T_MAX; t++) shapes.push(text(`yt-${t}`, PLOT.x - 34, Y(t) - 10, 28, String(t), 1));
for (const a of [0.5, 0.6, 0.7, 0.8, 0.9])
  shapes.push(text(`xt-${a}`, X(a) - 20, PLOT.y + PLOT.h + 4, 40, a.toFixed(1), 1));

// ── Step 3: wall-clock speed-up table ──────────────────────────────────────────────────────────────────────────
const T_X = 620;
const CELL_W = 52;
const CELL_H = 36;
const ROW_HEAD_W = 60;
const KS = [2, 4, 8];
const TABLE_ALPHAS = [0.6, 0.8, 0.9];
const cellX = (j: number) => T_X + ROW_HEAD_W + 4 + j * (CELL_W + 2);
const cellY = (i: number) => 112 + i * (CELL_H + 4);
shapes.push(
  text("table-title", T_X, 40, 224, "Wall-clock speed-up", 3, PROD_TONE.check, 20, false),
  text("table-sub", T_X, 60, 224, `draft cost c = ${SPECDEC.c} (illustrative)`, 3)
);
KS.forEach((k, j) => shapes.push(text(`th-${k}`, cellX(j), 88, CELL_W, `k = ${k}`, 3)));
TABLE_ALPHAS.forEach((a, i) => {
  shapes.push(text(`rh-${i}`, T_X, cellY(i) + 8, ROW_HEAD_W, `α ${a}`, 3));
  KS.forEach((k, j) => {
    const s = wallSpeedup(a, k, SPECDEC.c);
    shapes.push({
      id: `cell-${i}-${j}`,
      type: "cell",
      x: cellX(j),
      y: cellY(i),
      w: CELL_W,
      h: CELL_H,
      label: `${s.toFixed(2)}×`,
      tone: PROD_TONE.check,
      weight: Math.min(1, Math.max(0, (s - 1) / 3)),
      step: 3,
      quiet: true,
    });
  });
});
shapes.push(
  text("table-note-1", T_X, cellY(3) + 4, 224, "The best k grows with α.", 3),
  text("table-note-2", T_X, cellY(3) + 24, 224, "At α 0.8, k 8 adds nothing over k 4.", 3),
  text("table-note-3", T_X, cellY(3) + 44, 224, "Speed-up = tokens per pass ÷ (k·c + 1)", 3)
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Tokens per large-model pass against acceptance rate",
  width: 860,
  height: PLOT.y + PLOT.h + 56,
  steps: [
    { title: "Four drafts: tokens per large-model pass rise with α" },
    { title: "Longer drafts pay off only when α is high" },
    { title: "Add the drafting cost: the wall-clock speed-up" },
  ],
  shapes,
};

export default spec;
