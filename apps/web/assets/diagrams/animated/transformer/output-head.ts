import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ROLE_TONE, block, vector } from "@/components/diagrams/presets/transformer";

// The output head of "Attention Is All You Need" (Vaswani et al., 2017), for the last decoder position of the worked
// example ("<s> Ich liebe" → next token). Bottom to top: the final 512-wide vector → Linear (512 → 37,000) → one
// logit per vocabulary token → Softmax → next-token probabilities.
//
// Facts checked against arXiv 1706.03762 v7:
// - §3.4: "We also use the usual learned linear transformation and softmax function to convert the decoder output to
//   predicted next-token probabilities", and "we share the same weight matrix between the two embedding layers and
//   the pre-softmax linear transformation". So the paper itself ties these weights.
// - §5.1: shared source–target vocabulary of about 37,000 tokens; d_model = 512.
//
// The logits are illustrative. Five tokens are shown; the other 36,995 are lumped into one term whose value is the
// log of the sum of their exponentials (REST_LSE = 4.66). Softmax over the 5 shown logits plus that lump:
//   exp: Tee e^6.0 = 403.43, Kaffee e^4.2 = 66.69, dich e^3.6 = 36.60, es e^3.1 = 22.20, den e^2.8 = 16.44,
//        other e^4.66 = 105.64; total 650.99
//   p:   Tee 0.620, Kaffee 0.102, dich 0.056, es 0.034, den 0.025, other 0.162 (sum 1.000)
// Shown with two decimals: 0.62, 0.10, 0.06, 0.03, 0.03 (sum of the five: 0.84 < 1) and 0.16 for the rest.

const LOGITS = [
  { token: "Tee", logit: 6.0 },
  { token: "Kaffee", logit: 4.2 },
  { token: "dich", logit: 3.6 },
  { token: "es", logit: 3.1 },
  { token: "den", logit: 2.8 },
];
const REST_LSE = 4.66;
const VOCAB = 37000;

const total = LOGITS.reduce((a, l) => a + Math.exp(l.logit), 0) + Math.exp(REST_LSE);
const PROBS = [
  ...LOGITS.map((l) => ({ label: `"${l.token}"`, p: Math.exp(l.logit) / total })),
  { label: `other ${(VOCAB - LOGITS.length).toLocaleString("en-US")} tokens`, p: Math.exp(REST_LSE) / total },
];

const XC = 290; // the data path runs up this line
const shapes: LayoutShape[] = [];

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone = "neutral"
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: tone as LayoutShape["tone"],
});

// ── Bottom: the final decoder vector ─────────────────────────────────────────────────────────────────────────
const VEC_CELL = 20;
const VEC_Y = 560;
shapes.push(
  ...vector("final", XC - 4 * VEC_CELL, VEC_Y, 8, "neutral", { cell: VEC_CELL }),
  text(
    "final-label",
    XC - 200,
    VEC_Y + 28,
    400,
    36,
    'Decoder output at the last position ("liebe")\n512 values, 8 shown'
  )
);

// ── Linear, with the weight-tying note ───────────────────────────────────────────────────────────────────────
const LIN_Y = 452;
shapes.push(
  block("linear", "linear", XC - 75, LIN_Y, { label: "Linear", sub: "512 → 37,000" }),
  {
    id: "final>linear",
    type: "arrow",
    x: XC,
    y: VEC_Y,
    w: 0,
    h: LIN_Y + 44 - VEC_Y,
    label: "512",
  },
  block("emb-table", "embedding", 560, LIN_Y, { label: "Embedding table", sub: "37,000 × 512" }),
  {
    id: "tie",
    type: "arrow",
    x: 0,
    y: 0,
    from: "linear",
    to: "emb-table",
    head: false,
    dashed: true,
    label: "same weights",
  },
  text(
    "tie-note",
    500,
    LIN_Y + 56,
    270,
    52,
    "Many models reuse the embedding table\nas this Linear layer (weight tying).",
    ROLE_TONE.embedding
  ),
  text(
    "tie-paper",
    500,
    LIN_Y + 96,
    270,
    52,
    "The 2017 paper does this too: one matrix\nserves both embedding layers and this\nLinear layer (§3.4)."
  )
);

// ── Logits: one slot per vocabulary token, five shown ────────────────────────────────────────────────────────
const SLOT_W = 74;
const SLOT_H = 42;
const LOGIT_Y = 352;
const slotsX = XC - (SLOT_W * (LOGITS.length + 1)) / 2;
LOGITS.forEach((l, i) =>
  shapes.push({
    id: `logit-${i}`,
    type: "cell",
    x: slotsX + i * SLOT_W,
    y: LOGIT_Y,
    w: SLOT_W,
    h: SLOT_H,
    label: l.token,
    sub: l.logit.toFixed(1),
    tone: ROLE_TONE.linear,
    fill: "pastel",
  })
);
shapes.push(
  {
    id: "logit-rest",
    type: "cell",
    x: slotsX + LOGITS.length * SLOT_W,
    y: LOGIT_Y,
    w: SLOT_W,
    h: SLOT_H,
    label: "…",
    sub: "36,995 more",
    tone: ROLE_TONE.linear,
    fill: "paper",
  },
  {
    id: "linear>logits",
    type: "arrow",
    x: XC,
    y: LIN_Y,
    w: 0,
    h: LOGIT_Y + SLOT_H - LIN_Y,
    label: "37,000 logits",
  }
);

// ── Softmax and the probabilities ────────────────────────────────────────────────────────────────────────────
const SM_Y = 278;
shapes.push(block("softmax", "softmax", XC - 75, SM_Y, { h: 30 }), {
  id: "logits>softmax",
  type: "arrow",
  x: XC,
  y: LOGIT_Y,
  w: 0,
  h: SM_Y + 30 - LOGIT_Y,
});

const BAR_X = 210;
const BAR_MAX = 360; // width of p = 1
const BAR_H = 22;
const BAR_STEP = 32;
const BARS_Y = 56;
const CHAR = 6.9; // approximate width of a 12.5 px character, to right-align the token names
PROBS.forEach((row, i) => {
  const y = BARS_Y + i * BAR_STEP;
  const w = Math.max(6, Math.round(row.p * BAR_MAX));
  const isRest = i === PROBS.length - 1;
  const nameW = Math.ceil(row.label.length * CHAR) + 4;
  shapes.push(
    text(`p-name-${i}`, BAR_X - 10 - nameW, y, nameW, BAR_H, row.label),
    {
      id: `p-bar-${i}`,
      type: "cell",
      x: BAR_X,
      y,
      w,
      h: BAR_H,
      tone: isRest ? "neutral" : ROLE_TONE.softmax,
      fill: i === 0 ? undefined : "pastel",
      highlight: i === 0 || undefined,
    },
    text(`p-val-${i}`, BAR_X + w + 6, y, 40, BAR_H, row.p.toFixed(2), isRest ? "neutral" : ROLE_TONE.softmax)
  );
});
const BARS_BOTTOM = BARS_Y + (PROBS.length - 1) * BAR_STEP + BAR_H;
shapes.push(text("p-title", BAR_X - 160, 14, 520, 20, 'Next-token probabilities after "<s> Ich liebe"'), {
  id: "softmax>probs",
  type: "arrow",
  x: XC,
  y: SM_Y,
  w: 0,
  h: BARS_BOTTOM + 10 - SM_Y,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The output head: Linear, then softmax over the vocabulary",
  width: 800,
  height: 640,
  shapes,
};

export default spec;
