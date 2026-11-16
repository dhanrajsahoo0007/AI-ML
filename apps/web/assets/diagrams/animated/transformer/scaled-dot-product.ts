import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE, block, miniMap } from "@/components/diagrams/presets/transformer";

// Figure 2 (left) of "Attention Is All You Need" (Vaswani et al., 2017), redrawn in the site's colour legend: scaled
// dot-product attention, read from the bottom up. A locator on the left rings the encoder's self-attention block, the
// block this panel zooms into (the same arithmetic runs inside every attention block of the model).
//
// Facts drawn here, checked against the paper (arXiv 1706.03762 v7):
// - §3.2.1, Eq. 1: Attention(Q, K, V) = softmax(Q Kᵀ / √d_k) V. Queries and keys go into the first MatMul, the
//   scores are divided by √d_k, then softmax, then a second MatMul with V.
// - Figure 2 (left): the order is MatMul → Scale → Mask (opt.) → SoftMax → MatMul, with V entering the last MatMul.
// - §3.2.3: the mask sets illegal positions to −∞ "inside of scaled dot-product attention"; it comes after the scale
//   and before the softmax, and it is optional (used in the decoder's self-attention).
// - §3.2.2: d_k = d_model / h = 512 / 8 = 64, so √d_k = 8.
// - §3.2.1 (end): the scale exists because large dot products push the softmax into regions with tiny gradients.

const CX = 410; // centre of the zoomed column
const BW = 150;
const BX = CX - BW / 2;
const VX = BX + BW + 50; // x of the line that carries V up the right side
const NOTE_X = VX + 26;
const NOTE_W = 196;

// Bottom to top, as in the paper: top edges of each block.
const Y = { out: 70, mm2: 112, softmax: 172, mask: 232, scale: 306, mm1: 380, inputs: 448 };
const CELL = 32;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  h = 34,
  tone: LayoutTone = ROLE_TONE.masked
) => ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;
const up = (id: string, x: number, from: number, to: number, label?: string): LayoutShape => ({
  id,
  type: "arrow",
  x,
  y: from,
  w: 0,
  h: to - from,
  label,
});
const input = (id: string, cx: number, label: string, tone: LayoutShape["tone"], word: string): LayoutShape[] => [
  { id, type: "cell", x: cx - CELL / 2, y: Y.inputs, w: CELL, h: CELL, label, tone, fill: "pastel" },
  text(`${id}-word`, cx - 40, Y.inputs + CELL + 4, 80, word, 18, tone),
];

const blocks: LayoutShape[] = [
  block("mm2", "matmul", BX, Y.mm2, { h: 30, label: "MatMul" }),
  block("softmax", "softmax", BX, Y.softmax, { h: 30, label: "SoftMax" }),
  block("mask", "mask", BX, Y.mask, { label: "Mask", sub: "(optional)" }),
  block("scale", "scale", BX, Y.scale, { label: "Scale\n÷ √d_k" }),
  block("mm1", "matmul", BX, Y.mm1, { h: 30, label: "MatMul" }),
];

const QX = CX - 40;
const KX = CX + 40;

const flow: LayoutShape[] = [
  ...input("q", QX, "Q", ROLE_TONE.query, "queries"),
  ...input("k", KX, "K", ROLE_TONE.key, "keys"),
  ...input("v", VX, "V", ROLE_TONE.value, "values"),
  up("q>mm1", QX, Y.inputs - 4, Y.mm1 + 34),
  up("k>mm1", KX, Y.inputs - 4, Y.mm1 + 34),
  { id: "mm1>scale", type: "arrow", x: 0, y: 0, from: "mm1", to: "scale" },
  { id: "scale>mask", type: "arrow", x: 0, y: 0, from: "scale", to: "mask" },
  { id: "mask>softmax", type: "arrow", x: 0, y: 0, from: "mask", to: "softmax" },
  { id: "softmax>mm2", type: "arrow", x: 0, y: 0, from: "softmax", to: "mm2" },
  // V climbs the right side and enters the last MatMul from the side.
  { id: "v>mm2", type: "arrow", x: 0, y: 0, from: "v", to: "mm2", via: [[VX, Y.mm2 + 15]] },
  text("out", CX - 90, Y.out - 18, 180, "Attention(Q, K, V)", 20),
  { id: "mm2>out", type: "arrow", x: 0, y: 0, from: "mm2", to: "out" },
];

// Plain-words notes beside each block, right of the V line.
const notes: LayoutShape[] = [
  text("n-mm1", NOTE_X, Y.mm1 - 2, NOTE_W, "scores = Q Kᵀ:\nevery query · every key"),
  text("n-scale", NOTE_X, Y.scale + 5, NOTE_W, "÷ √64 = ÷ 8, so the softmax\ndoes not saturate"),
  text("n-mask", NOTE_X, Y.mask + 5, NOTE_W, "−∞ where a token\nmust not look"),
  text("n-softmax", NOTE_X, Y.softmax - 2, NOTE_W, "each row becomes weights\nthat sum to 1"),
  text("n-mm2", NOTE_X, Y.mm2 - 2, NOTE_W, "weights × V: a weighted\nsum of the values"),
];

// Locator: Figure 1 in miniature, with the encoder's self-attention ringed.
const MAP_X = 28;
const MAP_Y = 160;
const locator: LayoutShape[] = [
  ...miniMap("map", MAP_X, MAP_Y, { width: 150, ring: ["enc-mha"] }),
  text("here", MAP_X - 6, MAP_Y + 178, 162, "you are here:\nencoder self-attention", 34, ROLE_TONE.attention),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Scaled dot-product attention",
  width: 800,
  height: 540,
  groups: [
    { id: "zoom", title: "Scaled Dot-Product Attention", tone: ROLE_TONE.attention, x: 226, y: 22, w: 556, h: 500 },
  ],
  shapes: [...locator, ...blocks, ...flow, ...notes],
};

export default spec;
