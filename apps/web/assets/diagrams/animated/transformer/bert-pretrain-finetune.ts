import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE, block, vector } from "@/components/diagrams/presets/transformer";

// BERT's two-stage recipe (Devlin et al., 2018), drawn on our own example in three steps:
// 1. Masked language model: two of the input tokens are hidden behind [MASK]; a Linear + softmax head over the
//    30,000-token WordPiece vocabulary sits on the output at those two positions only and predicts the original word.
// 2. Next sentence prediction: a second head on the [CLS] output says whether sentence B follows sentence A.
// 3. Fine-tuning: a copy of the same encoder, started from the pre-trained weights, reads a labelled task example
//    ("[CLS] tea was great [SEP]", a review) and a new two-way sentiment head on [CLS] replaces the pre-training heads.
// Fine-tuning gets its own copy of the body because its input differs: one sentence and no [MASK] (the paper's own
// Figure 1 also draws the two stages side by side). Layout shapes cannot be removed in a later step, so the earlier
// heads stay on screen and fade as "old".
//
// Facts checked against arXiv 1810.04805 v2:
// - §3: BERT-base is L = 12 layers, H = 768 hidden size, A = 12 heads, about 110M parameters in total.
// - §3 (input): WordPiece embeddings with a 30,000-token vocabulary; every sequence starts with [CLS]; a sentence
//   pair is packed into one sequence and separated by [SEP] (plus a learned sentence A / B embedding).
// - §3.1 Task #1: 15 % of the WordPiece positions are chosen at random; a chosen token becomes [MASK] 80 % of the
//   time, a random token 10 % and stays unchanged 10 %; "we only predict the masked words rather than
//   reconstructing the entire input"; the final hidden vectors at those positions go into a softmax over the
//   vocabulary, trained with cross-entropy against the original token.
// - §3.1 Task #2: 50 % of the time B is the actual next sentence (IsNext), 50 % a random sentence (NotNext); the
//   [CLS] vector C is used for NSP.
// - §3.2 and §4.1: all parameters are fine-tuned end-to-end; the only new parameters are the classification layer
//   W ∈ R^(K×H), with loss log(softmax(C Wᵀ)). A single sentence is "a degenerate text-∅ pair".
// - RoBERTa (Liu et al., 2019, arXiv 1907.11692) removed NSP and trained longer on more data (the page says so).
// - Simplified: the released code puts a small transform (dense + GELU + LayerNorm, output tied to the embeddings)
//   before the MLM softmax and a tanh "pooler" before the NSP layer; both are drawn here as one Linear. Embeddings,
//   norms and residuals are left out (footnote).
//
// Probabilities are illustrative, computed here. MLM heads: three words are shown and the rest of the 30,000-token
// vocabulary is lumped into one term whose value is the log of the sum of their exponentials (REST):
//   "boiled": boiled 5.2, whistled 4.1, cooled 2.9, rest 4.3 → exp 181.27, 60.34, 18.17, 73.70; Σ 333.48
//             → 0.544, 0.181, 0.054 (rest 0.221) → shown 0.54, 0.18, 0.05
//   "tea":    tea 5.5, water 4.2, milk 3.0, rest 4.0 → exp 244.69, 66.69, 20.09, 54.60; Σ 386.07
//             → 0.634, 0.173, 0.052 (rest 0.141) → shown 0.63, 0.17, 0.05
// Two-way heads (softmax of two logits):
//   NSP:       IsNext 2.4, NotNext −1.0 → 1 / (1 + e^−3.4) = 0.968 → 0.97, 0.03
//   Sentiment: positive 1.9, negative −1.2 → 1 / (1 + e^−3.1) = 0.957 → 0.96, 0.04

// ── Geometry ─────────────────────────────────────────────────────────────────────────────────────────────────
const PITCH = 53; // pre-training token columns
const TOK_W = 50;
const FT_PITCH = 44; // fine-tuning token columns
const FT_TOK_W = 40;
const TOK_H = 30;

const PT = { x: 30, w: 566, blockX: 46, blockW: 538, cx0: 78 }; // pre-training body
const FT = { x: 626, w: 246, blockX: 638, blockW: 222, cx0: 661 }; // fine-tuning body
const ptCx = (i: number) => PT.cx0 + i * PITCH;
const ftCx = (i: number) => FT.cx0 + i * FT_PITCH;
/** x of the vertical arrows through each body; clear of the group's title tab and between two token columns. */
const PT_LINE_X = (ptCx(4) + ptCx(5)) / 2; // 316.5, in the gap between columns 4 and 5
const FT_LINE_X = (ftCx(3) + ftCx(4)) / 2; // 815, right of the "Encoder × 12" tab

const CELLS_BOTTOM = 128; // bottom of every head's probability cells
const PCELL_H = 22;
const HEAD_W = 100;
const SM_Y = 152;
const LIN_Y = 206;
const VEC_Y = 286;
const VEC_CELL = 14;
const FT_VEC_CELL = 12; // narrower, so the five fine-tuning vectors keep a gap
const GROUP_Y = 336;
const FFN_Y = 366;
const ATT_Y = 436;
const GROUP_H = 166;
const TOK_Y = 530;
const BRACKET_Y = 566;

// ── Data ─────────────────────────────────────────────────────────────────────────────────────────────────────
interface Tok {
  t: string;
  /** The word hidden behind [MASK] at this position. */
  hidden?: string;
}
const PT_TOKENS: Tok[] = [
  { t: "[CLS]" },
  { t: "the" },
  { t: "kettle" },
  { t: "boiled", hidden: "boiled" },
  { t: "[SEP]" },
  { t: "she" },
  { t: "poured" },
  { t: "the" },
  { t: "tea", hidden: "tea" },
  { t: "[SEP]" },
];
const FT_TOKENS = ["[CLS]", "tea", "was", "great", "[SEP]"];

/** Softmax over the shown logits plus a lump for the rest of the vocabulary (omit `rest` for a closed set). */
function softmax(logits: { label: string; z: number }[], rest?: number) {
  const exps = logits.map((l) => Math.exp(l.z));
  const total = exps.reduce((a, b) => a + b, 0) + (rest === undefined ? 0 : Math.exp(rest));
  return logits.map((l, i) => ({ label: l.label, p: exps[i] / total }));
}

const MLM_PRED: Record<string, { label: string; p: number }[]> = {
  boiled: softmax(
    [
      { label: "boiled", z: 5.2 },
      { label: "whistled", z: 4.1 },
      { label: "cooled", z: 2.9 },
    ],
    4.3
  ),
  tea: softmax(
    [
      { label: "tea", z: 5.5 },
      { label: "water", z: 4.2 },
      { label: "milk", z: 3.0 },
    ],
    4.0
  ),
};
const NSP_PRED = softmax([
  { label: "IsNext", z: 2.4 },
  { label: "NotNext", z: -1.0 },
]);
const FT_PRED = softmax([
  { label: "positive", z: 1.9 },
  { label: "negative", z: -1.2 },
]);

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────────────────────
const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  opts: { h?: number; tone?: LayoutTone; step?: number; quiet?: boolean } = {}
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: opts.h ?? 20,
  label,
  tone: opts.tone ?? "neutral",
  step: opts.step,
  quiet: opts.quiet,
});

const line = (id: string, x: number, y1: number, y2: number, step?: number): LayoutShape => ({
  id,
  type: "arrow",
  x,
  y: y1,
  w: 0,
  h: y2 - y1,
  step,
});

/** A bracket under token columns, from x1 to x2, with a label below it. */
const bracket = (id: string, x1: number, x2: number, label: string, step?: number): LayoutShape[] => [
  {
    id,
    type: "path",
    x: 0,
    y: 0,
    points: [
      [x1, BRACKET_Y],
      [x1, BRACKET_Y + 5],
      [x2, BRACKET_Y + 5],
      [x2, BRACKET_Y],
    ],
    tone: "neutral",
    step,
  },
  text(`${id}-label`, x1, BRACKET_Y + 8, x2 - x1, label, { step, quiet: true }),
];

/** One body: an "Encoder × 12" group with attention and feed-forward, tokens below, a vector per token above. */
function body(
  pre: string,
  g: typeof PT,
  tokens: { t: string; tone: LayoutTone; fill?: "pastel" }[],
  cx: (i: number) => number,
  tokW: number,
  lineX: number,
  vecCell: number,
  step: number,
  quiet: boolean
): LayoutShape[] {
  const q = (s: LayoutShape): LayoutShape => (quiet ? { ...s, quiet: true } : s);
  const shapes: LayoutShape[] = [
    q(
      block(`${pre}-attn`, "attention", g.blockX, ATT_Y, {
        w: g.blockW,
        label: "Bidirectional self-attention",
        step,
      })
    ),
    q(block(`${pre}-ffn`, "ffn", g.blockX, FFN_Y, { w: g.blockW, label: "Feed-forward", step })),
  ];
  tokens.forEach((tok, i) => {
    shapes.push({
      id: `${pre}-tok-${i}`,
      type: "cell",
      x: cx(i) - tokW / 2,
      y: TOK_Y,
      w: tokW,
      h: TOK_H,
      label: tok.t,
      tone: tok.tone,
      fill: tok.fill,
      step,
      quiet: true,
    });
    shapes.push(...vector(`${pre}-vec-${i}`, cx(i) - (3 * vecCell) / 2, VEC_Y, 3, "neutral", { cell: vecCell, step }));
  });
  // One line through the stack: tokens → attention → feed-forward → output vectors.
  shapes.push(
    line(`${pre}-in`, lineX, TOK_Y, ATT_Y + 44, step),
    line(`${pre}-mid`, lineX, ATT_Y, FFN_Y + 44, step),
    line(`${pre}-out`, lineX, FFN_Y, VEC_Y + vecCell, step)
  );
  return shapes;
}

/** A head on the output vector of one column: Linear, softmax, then one probability cell per class (top = first). */
function head(
  pre: string,
  cx: number,
  fromVec: string,
  sub: string,
  title: string,
  preds: { label: string; p: number }[],
  step: number
): LayoutShape[] {
  const x = cx - HEAD_W / 2;
  const n = preds.length;
  const top = CELLS_BOTTOM - n * PCELL_H;
  const shapes: LayoutShape[] = [
    block(`${pre}-lin`, "linear", x, LIN_Y, { w: HEAD_W, label: "Linear", sub, step }),
    block(`${pre}-sm`, "softmax", x, SM_Y, { w: HEAD_W, h: 30, step }),
    { id: `${pre}-vec>lin`, type: "arrow", x: 0, y: 0, from: fromVec, to: `${pre}-lin`, step },
    { id: `${pre}-lin>sm`, type: "arrow", x: 0, y: 0, from: `${pre}-lin`, to: `${pre}-sm`, step },
    { id: `${pre}-sm>p`, type: "arrow", x: 0, y: 0, from: `${pre}-sm`, to: `${pre}-p-${n - 1}`, step },
    text(`${pre}-title`, x - 20, top - 22, HEAD_W + 40, title, { step, quiet: true }),
  ];
  preds.forEach((row, i) =>
    shapes.push({
      id: `${pre}-p-${i}`,
      type: "cell",
      x,
      y: top + i * PCELL_H,
      w: HEAD_W,
      h: PCELL_H,
      label: `${row.label} ${row.p.toFixed(2)}`,
      tone: ROLE_TONE.softmax,
      weight: Math.round(row.p * 100) / 100,
      step,
      quiet: true,
    })
  );
  return shapes;
}

// ── Step 1: the body and the masked-language-model heads ─────────────────────────────────────────────────────
const ptTokens = PT_TOKENS.map((tok) =>
  tok.hidden
    ? { t: "[MASK]", tone: ROLE_TONE.mask as LayoutTone, fill: "pastel" as const }
    : { t: tok.t, tone: "neutral" as LayoutTone, fill: tok.t.startsWith("[") ? ("pastel" as const) : undefined }
);
const NOTE_X = ptCx(3) + HEAD_W / 2 + 8; // the free column between the two MLM heads
const NOTE_W = ptCx(8) - HEAD_W / 2 - 8 - NOTE_X;

const step1: LayoutShape[] = [
  text("pt-heading", PT.x, 6, 120, "Pre-training", { quiet: true }),
  ...body("pt", PT, ptTokens, ptCx, TOK_W, PT_LINE_X, VEC_CELL, 1, false),
  ...PT_TOKENS.flatMap((tok, i) =>
    tok.hidden
      ? head(`mlm-${i}`, ptCx(i), `pt-vec-${i}-1`, "768 → 30,000", `original: "${tok.hidden}"`, MLM_PRED[tok.hidden], 1)
      : []
  ),
  text("mlm-chosen", NOTE_X, 40, NOTE_W, "About 15 % of tokens\nare chosen (2 here).", {
    h: 36,
    tone: ROLE_TONE.mask,
  }),
  text("mlm-rule", NOTE_X, 86, NOTE_W, "80 % → [MASK]\n10 % → a random token\n10 % → left unchanged", {
    h: 52,
    tone: ROLE_TONE.mask,
    quiet: true,
  }),
  text("mlm-loss", NOTE_X, 160, NOTE_W, "Loss only at the\nmasked positions", { h: 36, quiet: true }),
  ...bracket("pt-a", ptCx(1) - TOK_W / 2, ptCx(3) + TOK_W / 2, "sentence A", 1),
  ...bracket("pt-b", ptCx(5) - TOK_W / 2, ptCx(8) + TOK_W / 2, "sentence B", 1),
  text(
    "foot",
    16,
    664,
    848,
    "BERT-base: 12 layers, hidden size 768, 12 heads, about 110M parameters. Embeddings, norms and residuals are left out.",
    { quiet: true }
  ),
];

// ── Step 2: next sentence prediction on [CLS] ────────────────────────────────────────────────────────────────
const step2: LayoutShape[] = [
  ...head("nsp", ptCx(0), "pt-vec-0-1", "768 → 2", "label: IsNext", NSP_PRED, 2),
  text(
    "nsp-note",
    PT.x,
    604,
    PT.w,
    "Half the time B is the real next sentence (IsNext), half the time a random one\n(NotNext). The head reads only the [CLS] output. RoBERTa later dropped NSP.",
    { h: 36, step: 2, quiet: true }
  ),
];

// ── Step 3: fine-tuning, the same encoder with a new head ────────────────────────────────────────────────────
const step3: LayoutShape[] = [
  text("ft-heading", FT.x, 6, 120, "Fine-tuning", { step: 3, quiet: true }),
  ...body(
    "ft",
    FT,
    FT_TOKENS.map((t) => ({
      t,
      tone: "neutral" as LayoutTone,
      fill: t.startsWith("[") ? ("pastel" as const) : undefined,
    })),
    ftCx,
    FT_TOK_W,
    FT_LINE_X,
    FT_VEC_CELL,
    3,
    true
  ),
  {
    id: "copy",
    type: "arrow",
    x: 0,
    y: 0,
    from: "pt-attn",
    to: "ft-attn",
    dashed: true,
    label: "copy",
    step: 3,
  },
  ...head("ft-head", ftCx(0), "ft-vec-0-1", "768 → 2", "label: positive", FT_PRED, 3),
  ...bracket("ft-s", ftCx(1) - FT_TOK_W / 2, ftCx(3) + FT_TOK_W / 2, "one review", 3),
  text(
    "ft-note",
    FT.x,
    600,
    FT.w,
    "Starts from the pre-trained weights.\nAll weights are updated; the head\nis new. The pre-training heads go.",
    { h: 52, step: 3, quiet: true }
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "BERT: pre-train once, fine-tune per task",
  width: 880,
  height: 692,
  groups: [
    { id: "pt-enc", title: "Encoder × 12", tone: ROLE_TONE.block, x: PT.x, y: GROUP_Y, w: PT.w, h: GROUP_H },
    { id: "ft-enc", title: "Encoder × 12", tone: ROLE_TONE.block, x: FT.x, y: GROUP_Y, w: FT.w, h: GROUP_H },
  ],
  shapes: [...step1, ...step2, ...step3],
  steps: [
    { title: "Masked language model: predict the hidden words" },
    { title: "Next sentence prediction: does B follow A?" },
    { title: "Fine-tuning: the same encoder, a new head on [CLS]" },
  ],
};

export default spec;
