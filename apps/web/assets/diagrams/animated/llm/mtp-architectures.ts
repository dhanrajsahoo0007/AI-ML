import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { block } from "@/components/diagrams/presets/transformer";

// Two ways to add multi-token prediction, side by side, for "Architecture" on the Multi-Token Prediction page.
// Inputs at the bottom, predictions at the top, as in the Transformer paper's figures.
//
// Left, Gloeckle et al. (2024), "Better & Faster Large Language Models via Multi-token Prediction", arXiv 2404.19737:
// - "n independent output heads, operating on top of a shared model trunk" (abstract); each head is a Transformer
//   layer, and all heads share one unembedding matrix (§2). n = 4 in most experiments.
// - To keep the parameter count equal to the baseline, n − 1 layers move from the trunk into the heads (§2).
// - Every head reads the same trunk output z for position t, so the n predictions are independent given z.
//
// Right, DeepSeek-AI (2024), "DeepSeek-V3 Technical Report", arXiv 2412.19437, §2.2:
// - D sequential MTP modules; module k has a shared embedding layer, a shared output head, one Transformer block and
//   a projection matrix M_k (d × 2d).
// - Module k's input at position i: RMSNorm of the previous depth's hidden state (the main model's for k = 1) and
//   RMSNorm of the embedding of token i + k, concatenated and projected by M_k (eq. 21); then the Transformer block
//   (eq. 22) and the shared output head give the distribution for token i + k + 1 (eq. 23).
// - "keep the complete causal chain at each prediction depth"; DeepSeek-V3 sets D = 1 (§4.2), so one module is drawn.
// - At inference the module can be discarded, or used for speculative decoding (§2.2, §5.4.3).
// Colour legend: embedding pink, attention orange, feed-forward blue, Linear violet, softmax green, RMSNorm lime.

const shapes: LayoutShape[] = [];
const arrow = (from: string, to: string, label?: string): LayoutShape => ({
  id: `${from}>${to}`,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  label,
});

// ── Rows (top of each block) ─────────────────────────────────────────────────────────────────────────────────
const Y_SOFT = 96;
const Y_LIN = 148;
const THIN = 30;
const Y_INPUT = 566;
const Y_EMB = 508;

// ── Left: shared trunk + 4 parallel heads ─────────────────────────────────────────────────────────────────────
const HEADS = 4;
const HEAD_W = 86;
const HEAD_GAP = 12;
const L0 = 34;
const headX = (h: number) => L0 + h * (HEAD_W + HEAD_GAP);
const L_SPAN = HEADS * HEAD_W + (HEADS - 1) * HEAD_GAP; // 380
const TRUNK_W = 180;
const TRUNK_X = L0 + (L_SPAN - TRUNK_W) / 2;
const Y_HFFN = 216;
const Y_HATT = 256;

for (let h = 0; h < HEADS; h++) {
  shapes.push(
    block(`soft-${h}`, "softmax", headX(h), Y_SOFT, { w: HEAD_W, h: THIN, label: `P(t + ${h + 1})` }),
    block(`hffn-${h}`, "ffn", headX(h), Y_HFFN, { w: HEAD_W, h: THIN, label: "FFN" }),
    block(`hatt-${h}`, "attention", headX(h), Y_HATT, { w: HEAD_W, h: THIN, label: "Attention" }),
    {
      id: `hatt-${h}>hffn-${h}`,
      type: "arrow",
      x: 0,
      y: 0,
      from: `hatt-${h}`,
      to: `hffn-${h}`,
    },
    {
      id: `hffn-${h}>unemb`,
      type: "arrow",
      x: headX(h) + HEAD_W / 2,
      y: Y_HFFN,
      w: 0,
      h: Y_LIN + THIN - Y_HFFN,
    },
    {
      id: `unemb>soft-${h}`,
      type: "arrow",
      x: headX(h) + HEAD_W / 2,
      y: Y_LIN,
      w: 0,
      h: Y_SOFT + THIN - Y_LIN,
    }
  );
}
shapes.push(block("unemb", "linear", L0, Y_LIN, { w: L_SPAN, h: THIN, label: "Shared unembedding (Linear)" }));

const Y_TFFN = 370;
const Y_TATT = 426;
shapes.push(
  block("tffn", "ffn", TRUNK_X, Y_TFFN, { w: TRUNK_W, label: "Feed\nForward" }),
  block("tatt", "attention", TRUNK_X, Y_TATT, { w: TRUNK_W, label: "Multi-Head\nAttention" }),
  block("lemb", "embedding", TRUNK_X, Y_EMB, { w: TRUNK_W, h: THIN }),
  {
    id: "lin",
    type: "text",
    x: TRUNK_X - 20,
    y: Y_INPUT,
    w: TRUNK_W + 40,
    h: 20,
    label: "tokens 1 … t",
    tone: "neutral",
  },
  { id: "lin>lemb", type: "arrow", x: TRUNK_X + TRUNK_W / 2, y: Y_INPUT, w: 0, h: Y_EMB + THIN - Y_INPUT },
  arrow("lemb", "tatt"),
  arrow("tatt", "tffn")
);
// The trunk output z runs up to a bus and into every head.
const Y_BUS = (Y_HATT + THIN + Y_TFFN - 20) / 2;
const TRUNK_CX = TRUNK_X + TRUNK_W / 2;
shapes.push(
  { id: "z-up", type: "arrow", x: TRUNK_CX, y: Y_TFFN, w: 0, h: Y_BUS - Y_TFFN, head: false },
  {
    id: "z-bus",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [headX(0) + HEAD_W / 2, Y_BUS],
      [headX(HEADS - 1) + HEAD_W / 2, Y_BUS],
    ],
    tone: "neutral",
  },
  { id: "z-label", type: "text", x: TRUNK_CX + 6, y: Y_BUS + 2, w: 90, h: 20, label: "z (position t)", tone: "neutral" }
);
for (let h = 0; h < HEADS; h++) {
  shapes.push({
    id: `bus>hatt-${h}`,
    type: "arrow",
    x: headX(h) + HEAD_W / 2,
    y: Y_BUS,
    w: 0,
    h: Y_HATT + THIN - Y_BUS,
  });
}

// ── Right: main model + one sequential MTP module (D = 1) ─────────────────────────────────────────────────────
const A_X = 472;
const A_W = 140;
const B_X = 664;
const B_W = 196;
const NORM_W = 92;
const B_X2 = B_X + B_W - NORM_W;
const Y_AFFN = 220;
const Y_AATT = 280;
const Y_BFFN = 216;
const Y_BATT = 272;
const Y_PROJ = 340;
const Y_NORM = 420;
const BUS_X = (A_X + A_W + B_X) / 2; // 638
const Y_TAP = 196; // between the main model's last layer and its output head

shapes.push(
  block("asoft", "softmax", A_X, Y_SOFT, { w: A_W, h: THIN, label: "P(token t + 1)" }),
  block("alin", "linear", A_X, Y_LIN, { w: A_W, h: THIN, label: "Output head" }),
  block("affn", "ffn", A_X, Y_AFFN, { w: A_W, label: "Feed\nForward" }),
  block("aatt", "attention", A_X, Y_AATT, { w: A_W, label: "Multi-Head\nAttention" }),
  block("aemb", "embedding", A_X, Y_EMB, { w: A_W, h: THIN }),
  {
    id: "ain",
    type: "text",
    x: A_X - 10,
    y: Y_INPUT,
    w: A_W + 20,
    h: 20,
    label: "tokens 1 … t",
    tone: "neutral",
  },
  { id: "ain>aemb", type: "arrow", x: A_X + A_W / 2, y: Y_INPUT, w: 0, h: Y_EMB + THIN - Y_INPUT },
  arrow("aemb", "aatt"),
  arrow("aatt", "affn"),
  arrow("affn", "alin"),
  arrow("alin", "asoft"),

  block("bsoft", "softmax", B_X, Y_SOFT, { w: B_W, h: THIN, label: "P(token t + 2)" }),
  block("blin", "linear", B_X, Y_LIN, { w: B_W, h: THIN, label: "Output head (shared)" }),
  block("bffn", "ffn", B_X, Y_BFFN, { w: B_W, h: 36, label: "Feed Forward" }),
  block("batt", "attention", B_X, Y_BATT, { w: B_W, h: 36, label: "Attention" }),
  block("bproj", "linear", B_X, Y_PROJ, { w: B_W, h: THIN, label: "Concat → Linear M₁" }),
  block("bnorm-h", "norm", B_X, Y_NORM, { w: NORM_W, h: THIN, label: "RMSNorm" }),
  block("bnorm-e", "norm", B_X2, Y_NORM, { w: NORM_W, h: THIN, label: "RMSNorm" }),
  block("bemb", "embedding", B_X2, Y_EMB, { w: NORM_W, h: THIN, label: "Embedding" }),
  {
    id: "bin",
    type: "text",
    x: B_X2 - 20,
    y: Y_INPUT,
    w: NORM_W + 40,
    h: 20,
    label: "tokens 2 … t + 1",
    tone: "neutral",
  },
  { id: "bin>bemb", type: "arrow", x: B_X2 + NORM_W / 2, y: Y_INPUT, w: 0, h: Y_EMB + THIN - Y_INPUT },
  arrow("bemb", "bnorm-e"),
  {
    id: "bnorm-h>bproj",
    type: "arrow",
    x: B_X + NORM_W / 2,
    y: Y_NORM,
    w: 0,
    h: Y_PROJ + THIN - Y_NORM,
  },
  {
    id: "bnorm-e>bproj",
    type: "arrow",
    x: B_X2 + NORM_W / 2,
    y: Y_NORM,
    w: 0,
    h: Y_PROJ + THIN - Y_NORM,
  },
  arrow("bproj", "batt"),
  arrow("batt", "bffn"),
  arrow("bffn", "blin"),
  arrow("blin", "bsoft"),
  // The main model's last hidden state h⁰ feeds the module.
  {
    id: "tap",
    type: "arrow",
    x: A_X + A_W / 2,
    y: Y_TAP,
    to: "bnorm-h",
    via: [
      [BUS_X, Y_TAP],
      [BUS_X, Y_NORM + THIN / 2],
    ],
    label: "h⁰",
  },
  // Shared parameters.
  {
    id: "share-head",
    type: "arrow",
    x: 0,
    y: 0,
    from: "alin",
    to: "blin",
    head: false,
    dashed: true,
  },
  {
    id: "share-emb",
    type: "arrow",
    x: 0,
    y: 0,
    from: "aemb",
    to: "bemb",
    head: false,
    dashed: true,
    label: "shared",
  }
);

shapes.push(
  {
    id: "head-left",
    type: "text",
    x: 16,
    y: 10,
    w: 412,
    h: 20,
    label: "Meta (Gloeckle et al., 2024): parallel heads",
    tone: "neutral",
  },
  {
    id: "head-right",
    type: "text",
    x: 450,
    y: 10,
    w: 412,
    h: 20,
    label: "DeepSeek-V3 (2024): a sequential module",
    tone: "neutral",
  }
);

// ── Notes ────────────────────────────────────────────────────────────────────────────────────────────────────
const Y_NOTE = 606;
shapes.push(
  {
    id: "note-left",
    type: "text",
    x: 16,
    y: Y_NOTE,
    w: 412,
    h: 36,
    label: "Every head reads the same z, so the 4 guesses\nare made in parallel and independently.",
    tone: "neutral",
  },
  {
    id: "note-right",
    type: "text",
    x: 450,
    y: Y_NOTE,
    w: 412,
    h: 36,
    label:
      "The module also sees the true token t + 1, so its guess\nfor t + 2 is conditioned on it: the causal chain holds.",
    tone: "neutral",
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Parallel heads vs sequential MTP modules",
  width: 880,
  height: Y_NOTE + 52,
  groups: [
    {
      id: "g-heads",
      title: "4 heads, one layer each",
      tone: "neutral",
      x: L0 - 16,
      y: Y_SOFT - 40,
      w: L_SPAN + 32,
      h: Y_HATT + THIN + 16 - (Y_SOFT - 40),
    },
    {
      id: "g-trunk",
      title: "Shared trunk",
      tone: "neutral",
      x: L0 - 16,
      y: Y_TFFN - 20,
      w: L_SPAN + 32,
      h: Y_TATT + 44 + 14 - (Y_TFFN - 20),
    },
    {
      id: "g-main",
      title: "Main model",
      tone: "neutral",
      x: A_X - 12,
      y: Y_SOFT - 40,
      w: A_W + 24,
      h: Y_AATT + 44 + 14 - (Y_SOFT - 40),
    },
    {
      id: "g-mtp",
      title: "MTP module (D = 1)",
      tone: "neutral",
      x: B_X - 12,
      y: Y_SOFT - 40,
      w: B_W + 20,
      h: Y_PROJ + THIN + 14 - (Y_SOFT - 40),
    },
  ],
  shapes,
};

export default spec;
