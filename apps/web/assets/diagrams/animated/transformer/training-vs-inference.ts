import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE, block } from "@/components/diagrams/presets/transformer";

// Why training is one pass and generation is many, with the page's worked example: English "I love tea" → German
// "Ich liebe Tee".
//
// Left, training (teacher forcing): the decoder gets the true target shifted right by a start token,
// "<s> Ich liebe Tee", all four positions at once. The causal mask lets position i see positions 1..i only, so each
// position predicts the next target token ("Ich", "liebe", "Tee", "</s>") and every position contributes a loss.
// Right, inference: the model has no target, so it runs once per new token and feeds its own output back in. Each
// pass computes every position but only the last position's distribution picks the next token.
//
// Facts checked against Vaswani et al. (2017, arXiv 1706.03762):
// - §3.1: the decoder's self-attention is masked and "the output embeddings are offset by one position", so the
//   prediction for position i depends only on outputs before i.
// - §3.2.3: masking sets illegal connections to −∞ before the softmax (drawn here as neutral cells).
// - In the encoder-decoder model the encoder output feeds every decoder layer in every pass (footnote).
// - Generated tokens are drawn green (the legend's probability tone) on both sides of the feedback loop; true target
//   tokens fed in during training are neutral.

const TOKEN_TONE: LayoutTone = "neutral";
const OUT_TONE: LayoutTone = ROLE_TONE.softmax;

const text = (id: string, x: number, y: number, w: number, h: number, label: string): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: "neutral",
});

const cell = (id: string, x: number, y: number, w: number, label: string, tone: LayoutTone): LayoutShape => ({
  id,
  type: "cell",
  x,
  y,
  w,
  h: 30,
  label,
  tone,
  fill: "pastel",
});

const arrow = (id: string, from: string, to: string, extra: Partial<LayoutShape> = {}): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  ...extra,
});

// ── Left: training, one pass ─────────────────────────────────────────────────────────────────────────────────
const L = { x: 30, w: 400, cellW: 56, cellX: 96 };
const TRAIN_IN = ["<s>", "Ich", "liebe", "Tee"];
const TRAIN_OUT = ["Ich", "liebe", "Tee", "</s>"];
const trainDec = block("train-dec", "block", L.cellX, 176, {
  w: L.cellW * 4,
  label: "Decoder\nall four positions in one pass",
});

/** The causal mask, 4 × 4: row i (query position) may see columns 0..i (green); the rest are −∞ (neutral). */
const MASK = { x: 340, y: 170, cell: 14 };
const mask: LayoutShape[] = TRAIN_IN.flatMap((_, r) =>
  TRAIN_IN.map((_, c): LayoutShape => ({
    id: `mask-${r}-${c}`,
    type: "cell",
    x: MASK.x + c * MASK.cell,
    y: MASK.y + r * MASK.cell,
    w: MASK.cell,
    h: MASK.cell,
    tone: c <= r ? ROLE_TONE.weight : ROLE_TONE.masked,
    weight: c <= r ? 0.7 : undefined,
  }))
);

const training: LayoutShape[] = [
  text("train-head", L.cellX - 40, 84, L.cellW * 4 + 80, 20, "Targets: a loss at every position"),
  ...TRAIN_OUT.map((t, i) => cell(`train-out-${i}`, L.cellX + i * L.cellW, 112, L.cellW, t, OUT_TONE)),
  trainDec,
  ...TRAIN_IN.map((t, i) => cell(`train-in-${i}`, L.cellX + i * L.cellW, 250, L.cellW, t, TOKEN_TONE)),
  ...TRAIN_IN.flatMap((_, i) => {
    const x = L.cellX + (i + 0.5) * L.cellW;
    return [
      { id: `train-up-${i}`, type: "arrow" as const, x, y: 246, w: 0, h: -26 },
      { id: `train-pred-${i}`, type: "arrow" as const, x, y: 172, w: 0, h: -26 },
    ];
  }),
  text(
    "train-foot",
    L.cellX - 40,
    290,
    L.cellW * 4 + 80,
    36,
    "Input: the true target, shifted right,\nall at once (teacher forcing)"
  ),
  ...mask,
  text("mask-label", MASK.x - 4, 230, 64, 32, "causal\nmask"),
];

// ── Right: inference, one token per pass ─────────────────────────────────────────────────────────────────────
const R = { x: 450, w: 380, cellW: 42, inEnd: 634, decX: 660, decW: 88, outX: 774, outW: 46 };
const PASSES = [
  { input: ["<s>"], next: "Ich" },
  { input: ["<s>", "Ich"], next: "liebe" },
  { input: ["<s>", "Ich", "liebe"], next: "Tee" },
];
const ROW_Y = [92, 176, 260];
const DEC_H = 40;

const inference: LayoutShape[] = PASSES.flatMap((pass, k): LayoutShape[] => {
  const y = ROW_Y[k];
  const mid = y + DEC_H / 2;
  const n = pass.input.length;
  const cells = pass.input.map((t, i) =>
    // Right-aligned so the newest token always sits next to the decoder; generated tokens are green.
    cell(`inf-${k}-in-${i}`, R.inEnd - (n - i) * R.cellW, mid - 15, R.cellW, t, i === 0 ? TOKEN_TONE : OUT_TONE)
  );
  return [
    text(`inf-${k}-label`, R.x + 6, mid - 10, 48, 20, `Pass ${k + 1}`),
    ...cells,
    block(`inf-${k}-dec`, "block", R.decX, y, { w: R.decW, h: DEC_H, label: "Decoder" }),
    cell(`inf-${k}-out`, R.outX, mid - 15, R.outW, pass.next, OUT_TONE),
    { id: `inf-${k}-feed`, type: "arrow", x: R.inEnd + 4, y: mid, w: R.decX - R.inEnd - 8, h: 0 },
    arrow(`inf-${k}-pred`, `inf-${k}-dec`, `inf-${k}-out`),
  ];
});

// The dashed loop: each pass's output becomes the newest input of the next pass.
const loops: LayoutShape[] = [0, 1].map((k) => {
  const gapY = (ROW_Y[k] + DEC_H + ROW_Y[k + 1]) / 2;
  return arrow(`inf-loop-${k}`, `inf-${k}-out`, `inf-${k + 1}-in-${k + 1}`, {
    dashed: true,
    via: [
      [R.outX + R.outW / 2, gapY],
      [R.inEnd - R.cellW / 2, gapY],
    ],
  });
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Training in one pass, inference one token per pass",
  width: 860,
  height: 400,
  groups: [
    { id: "training", title: "Training: one pass", tone: ROLE_TONE.block, x: L.x, y: 60, w: L.w, h: 290 },
    { id: "inference", title: "Inference: one token per pass", tone: ROLE_TONE.block, x: R.x, y: 60, w: R.w, h: 290 },
  ],
  shapes: [
    ...training,
    ...inference,
    ...loops,
    text(
      "inf-foot",
      R.x,
      310,
      R.w,
      36,
      "Each pass feeds its output back in and uses\nonly the last position's distribution."
    ),
    text(
      "foot",
      30,
      364,
      800,
      20,
      'In the encoder-decoder model, every pass also reads the encoder\'s output for "I love tea".'
    ),
  ],
};

export default spec;
