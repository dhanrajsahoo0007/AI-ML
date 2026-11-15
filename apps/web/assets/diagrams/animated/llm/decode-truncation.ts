import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// Top-k and top-p (nucleus) truncation of one next-token distribution, for the "Top-k, top-p and min-p sampling"
// concept on the Decoding & Sampling page. Same toy example as decode-temperature: after "After the rain, the sky
// turned", 8 candidate tokens stand for the whole vocabulary, at T = 1.0.
// Step 1: the softmax at T = 1.0, sorted from most to least likely.
// Step 2: top-k with k = 3 keeps the 3 most likely tokens, whatever their mass, and renormalizes them.
// Step 3: top-p with p = 0.9 keeps the smallest set whose cumulative probability reaches 0.9 (5 tokens here), and
//         renormalizes them.
//
// Definitions checked against the papers:
// - Top-k: Fan et al. (2018), "Hierarchical Neural Story Generation", arXiv 1805.04833, §5: sample from the k most
//   likely candidates (they use k = 10).
// - Top-p: Holtzman et al. (2019), arXiv 1904.09751, §3.1, eq. 2: V^(p) is "the smallest set such that" the sum of
//   P(x) over V^(p) ≥ p; the distribution is then rescaled over V^(p).
//
// Working (computed below), logits 3.3, 3.0, 2.4, 2.1, 1.5, 1.1, 0.6, −0.5 at T = 1:
//   p          = 0.355, 0.263, 0.145, 0.107, 0.059, 0.039, 0.024, 0.008 (exp sum 76.30)
//   cumulative = 0.355, 0.619, 0.763, 0.870, 0.929, 0.968, 0.992, 1.000 → first ≥ 0.9 at the 5th token
//   top-k = 3: kept mass 0.763; renormalized 0.466, 0.345, 0.189 → shown 0.47, 0.34, 0.19 (sum 1.00)
//   top-p = 0.9: kept mass 0.929; renormalized 0.383, 0.283, 0.156, 0.115, 0.063 → 0.38, 0.28, 0.16, 0.12, 0.06
//   (sum 1.00)
// Bars use one scale (BAR_PX px per unit of probability) in every column.

const TOKENS = ["gray", "blue", "clear", "dark", "pink", "orange", "bright", "green"];
const LOGITS = [3.3, 3.0, 2.4, 2.1, 1.5, 1.1, 0.6, -0.5];
const K = 3;
const P = 0.9;

const exps = LOGITS.map((z) => Math.exp(z));
const expSum = exps.reduce((a, b) => a + b, 0);
const PROBS = exps.map((e) => e / expSum);
const CUM = PROBS.map((_, i) => PROBS.slice(0, i + 1).reduce((a, b) => a + b, 0));
const TOP_P_N = CUM.findIndex((c) => c >= P) + 1; // 5
const renorm = (n: number) => {
  const mass = PROBS.slice(0, n).reduce((a, b) => a + b, 0);
  return { mass, probs: PROBS.slice(0, n).map((p) => p / mass) };
};
const TOP_K = renorm(K);
const TOP_P = renorm(TOP_P_N);
const fmt = (p: number) => p.toFixed(2);

// ── Grid ─────────────────────────────────────────────────────────────────────────────────────────────────────
const ROW_TOP = 140;
const GROUP_Y = ROW_TOP - 52; // title tab above the column headers
const ROW_STEP = 34;
const BAR_H = 20;
const rowTop = (i: number) => ROW_TOP + i * ROW_STEP;
const ROWS_BOTTOM = rowTop(TOKENS.length - 1) + ROW_STEP;
const cutY = (n: number) => rowTop(n) - (ROW_STEP - BAR_H) / 2; // between row n − 1 and row n
const BAR_PX = 260;
const X = { token: 16, bar: 96, kGroup: 262, kBar: 276, pGroup: 516, cum: 540, pBar: 606 };
const K_W = 226;
const P_W = 336;
const PROB: LayoutTone = ROLE_TONE.softmax;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone: LayoutTone,
  step: number,
  quiet = true
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: quiet || undefined });

const bar = (id: string, x: number, i: number, p: number, step: number): LayoutShape[] => {
  const w = Math.max(3, Math.round(p * BAR_PX));
  return [
    { id, type: "cell", x, y: rowTop(i), w, h: BAR_H, tone: PROB, fill: "pastel", step, quiet: true },
    text(`${id}-v`, x + w + 4, rowTop(i), 40, BAR_H, fmt(p), PROB, step),
  ];
};

const cut = (id: string, x1: number, x2: number, n: number, label: string, step: number): LayoutShape[] => [
  {
    id,
    type: "path",
    x: 0,
    y: 0,
    points: [
      [x1, cutY(n)],
      [x2, cutY(n)],
    ],
    dashed: true,
    tone: "red",
    step,
  },
  text(`${id}-label`, x2 + 4, cutY(n) - 10, 64, 20, label, "red", step),
];

const shapes: LayoutShape[] = [
  text("context", 16, 12, 836, 20, "The same 8 candidates at T = 1.0, sorted from most to least likely", "neutral", 1),
  text("rule", 16, 36, 836, 20, "Cut the tail, then divide the kept probabilities by their sum", PROB, 1),
  text("h-token", X.token, ROW_TOP - 30, 64, 20, "token", "neutral", 1),
  text("h-p", X.bar - 4, ROW_TOP - 30, 140, 20, "p at T = 1.0", PROB, 1, false),
];

TOKENS.forEach((tok, i) => {
  shapes.push(
    text(`tok-${i}`, X.token, rowTop(i), 64, BAR_H, tok, "neutral", 1),
    ...bar(`p-${i}`, X.bar, i, PROBS[i], 1)
  );
});

// ── Step 2: top-k ────────────────────────────────────────────────────────────────────────────────────────────
shapes.push(text("h-k", X.kBar - 4, ROW_TOP - 30, 120, 20, "renormalized", PROB, 2));
TOKENS.forEach((_, i) => {
  if (i < K) shapes.push(...bar(`k-${i}`, X.kBar, i, TOP_K.probs[i], 2));
  else shapes.push(text(`k-${i}-v`, X.kBar - 12, rowTop(i), 40, BAR_H, "0", "neutral", 2));
});
shapes.push(
  ...cut("k-cut", X.kGroup + 8, X.kGroup + K_W - 72, K, `k = ${K}`, 2),
  text(
    "k-note",
    X.kGroup,
    ROWS_BOTTOM + 14,
    K_W,
    36,
    `Keeps ${K} tokens with ${fmt(TOP_K.mass)} of the mass;\neach is divided by ${fmt(TOP_K.mass)}.`,
    "neutral",
    2,
    false
  )
);

// ── Step 3: top-p ────────────────────────────────────────────────────────────────────────────────────────────
shapes.push(
  text("h-cum", X.cum - 10, ROW_TOP - 30, 76, 20, "running sum", "neutral", 3),
  text("h-tp", X.pBar - 4, ROW_TOP - 30, 120, 20, "renormalized", PROB, 3)
);
TOKENS.forEach((_, i) => {
  shapes.push(text(`cum-${i}`, X.cum, rowTop(i), 52, BAR_H, fmt(CUM[i]), i === TOP_P_N - 1 ? "red" : "neutral", 3));
  if (i < TOP_P_N) shapes.push(...bar(`tp-${i}`, X.pBar, i, TOP_P.probs[i], 3));
  else shapes.push(text(`tp-${i}-v`, X.pBar - 12, rowTop(i), 40, BAR_H, "0", "neutral", 3));
});
shapes.push(
  ...cut("p-cut", X.pGroup + 8, X.pGroup + P_W - 72, TOP_P_N, `≥ ${P}`, 3),
  text(
    "p-note",
    X.pGroup,
    ROWS_BOTTOM + 14,
    P_W,
    36,
    `The running sum first reaches ${P} at the ${TOP_P_N}th token.\nKeeps ${TOP_P_N} tokens with ${fmt(TOP_P.mass)} of the mass.`,
    "neutral",
    3,
    false
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Top-k and top-p truncation of one distribution",
  width: 868,
  height: ROWS_BOTTOM + 64,
  steps: [
    { title: "The full distribution at T = 1.0" },
    { title: `Top-k: keep the ${K} most likely tokens` },
    { title: `Top-p: keep tokens until the sum reaches ${P}` },
  ],
  groups: [
    {
      id: "g-topk",
      title: `Top-k, k = ${K}`,
      tone: PROB,
      x: X.kGroup,
      y: GROUP_Y,
      w: K_W,
      h: ROWS_BOTTOM - GROUP_Y,
    },
    {
      id: "g-topp",
      title: `Top-p, p = ${P}`,
      tone: PROB,
      x: X.pGroup,
      y: GROUP_Y,
      w: P_W,
      h: ROWS_BOTTOM - GROUP_Y,
    },
  ],
  shapes,
};

export default spec;
