import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE, block } from "@/components/diagrams/presets/transformer";

// Where position information enters a Transformer, in three families. Each panel is the same small stack, read from
// the bottom up: token embedding (pink), then a layer of attention (orange) and feed-forward (blue) repeated N times.
// The ringed shape in each panel is where position enters.
//
// (a) Absolute, sinusoidal (Vaswani et al., 2017, §3.5) or learned (BERT, GPT-2): a position vector is added to the
//     token embedding once, at the bottom of the stack, before the first layer.
// (b) Rotary, RoPE (Su et al., 2021, arXiv 2104.09864, §3.4): inside every attention layer, the query and the key
//     are rotated by an angle proportional to their position; the value is not rotated.
// (c) Bias (ALiBi, Press et al., 2021, arXiv 2108.12409, §3; T5 relative bias, Raffel et al., 2020): nothing is
//     added to the embeddings; in every attention layer a bias that depends on the distance between query position
//     i and key position j is added to the score matrix Q Kᵀ before the softmax.
//
// The bias matrix drawn in (c) is ALiBi's −m · |i − j| for three positions with slope m = 1, so the cells are
//   row 0: [ 0, −1, −2]   row 1: [−1,  0, −1]   row 2: [−2, −1,  0]
// and the shade grows with the distance. In a causal decoder only the lower triangle (j ≤ i) is used, because the
// causal mask removes the rest; real ALiBi slopes differ per head (1/2, 1/4, … 1/256 for 8 heads), and T5 learns one
// bias per distance bucket instead of a fixed line. The figure keeps the general shape: bigger distance, bigger
// penalty.

const PANEL_W = 272;
const PANEL_Y = 40;
const PANEL_H = 478;
const PANELS = [20, 304, 588];

// Shared rows, top edges (bottom to top: embedding, ⊕ / fan, attention, feed-forward).
const Y = { out: 92, ffn: 128, attn: 196, group: 112, groupBottom: 348, add: 382, emb: 426, caption: 472 };
const BW = 120;
const ATTN_H = 44;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  h = 20,
  tone: LayoutTone = "neutral"
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone });

/** A free arrow from (x, y) by (w, h). */
const free = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "arrow",
  x,
  y,
  w,
  h,
  ...extra,
});

/** The stack shared by all three panels: embedding, attention, feed-forward, output arrow, caption. */
function stack(p: string, px: number, subtitle: string, caption: string): LayoutShape[] {
  const cx = px + 100;
  return [
    text(`${p}-sub`, px + 12, 62, PANEL_W - 24, subtitle),
    block(`${p}-emb`, "embedding", cx - BW / 2, Y.emb, { w: BW, h: 30, label: "Token embedding" }),
    block(`${p}-attn`, "attention", cx - BW / 2, Y.attn, { w: BW, h: ATTN_H, label: "Attention" }),
    block(`${p}-ffn`, "ffn", cx - BW / 2, Y.ffn, { w: BW, h: ATTN_H, label: "Feed\nForward" }),
    { id: `${p}-attn>ffn`, type: "arrow", x: 0, y: 0, from: `${p}-attn`, to: `${p}-ffn` },
    free(`${p}-out`, cx, Y.ffn - 4, 0, Y.out - (Y.ffn - 4)),
    text(`${p}-caption`, px + 12, Y.caption, PANEL_W - 24, caption, 34),
  ];
}

// ── (a) Absolute: a position vector added once, below the first layer ────────────────────────────────────────

const A = PANELS[0];
const ACX = A + 100;
const absolute: LayoutShape[] = [
  ...stack("abs", A, "add a vector for each position", "Once, before the first layer"),
  { id: "abs-add", type: "circle", x: ACX, y: Y.add, w: 22, symbol: "plus", tone: ROLE_TONE.position, label: "Add" },
  {
    id: "abs-pe",
    type: "circle",
    x: ACX - 66,
    y: Y.add,
    w: 28,
    symbol: "sine",
    tone: ROLE_TONE.position,
    label: "Positional encoding",
    highlight: true,
  },
  text("abs-pe-name", ACX - 98, Y.add + 22, 64, "position", 16),
  { id: "abs-emb>add", type: "arrow", x: 0, y: 0, from: "abs-emb", to: "abs-add" },
  { id: "abs-pe>add", type: "arrow", x: 0, y: 0, from: "abs-pe", to: "abs-add" },
  { id: "abs-add>attn", type: "arrow", x: 0, y: 0, from: "abs-add", to: "abs-attn" },
];

// ── (b) Rotary: rotate Q and K inside every attention layer ──────────────────────────────────────────────────

const B = PANELS[1];
const BCX = B + 100;
const FAN_DX = 40;
const BAR_Y = 334; // where the input splits into Q, K and V
const ROT = { x: BCX - FAN_DX - 18, y: 262, w: FAN_DX + 36, h: 24 }; // one box across the Q and K lines
const ATTN_IN = Y.attn + ATTN_H + 4;
const rotary: LayoutShape[] = [
  ...stack("rope", B, "rotate Q and K by position", "Every attention layer, on\nqueries and keys only"),
  {
    id: "rope-trunk",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [BCX, Y.emb - 2],
      [BCX, BAR_Y],
    ],
  },
  {
    id: "rope-bar",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [BCX - FAN_DX, BAR_Y],
      [BCX + FAN_DX, BAR_Y],
    ],
  },
  // Q and K pass through the rotation; V goes straight up, unrotated.
  {
    id: "rope-rot",
    type: "box",
    ...ROT,
    label: "rotate",
    tone: ROLE_TONE.position,
    fill: "pastel",
    highlight: true,
  },
  ...(
    [
      ["q", -FAN_DX, "Q"],
      ["k", 0, "K"],
    ] as const
  ).flatMap(([n, dx, label]): LayoutShape[] => [
    free(`rope-${n}-in`, BCX + dx, BAR_Y, 0, ROT.y + ROT.h + 4 - BAR_Y, { label }),
    free(`rope-${n}-up`, BCX + dx, ROT.y, 0, ATTN_IN - ROT.y),
  ]),
  free("rope-v-in", BCX + FAN_DX, BAR_Y, 0, ROT.y + ROT.h - BAR_Y, { head: false, label: "V" }),
  free("rope-v-up", BCX + FAN_DX, ROT.y + ROT.h, 0, ATTN_IN - (ROT.y + ROT.h)),
  text("rope-v-note", BCX + 52, ROT.y - 4, 96, "V is not\nrotated", 34, ROLE_TONE.value),
];

// ── (c) Bias: a distance penalty added to the attention scores in every layer ───────────────────────────────

const C = PANELS[2];
const CCX = C + 100;
const CELL = 22;
const MX = C + 188;
const MY = 254;
const BIAS = [0, 1, 2].map((i) => [0, 1, 2].map((j) => -Math.abs(i - j))); // ALiBi with slope m = 1
const ADD_X = CCX + BW / 2; // ⊕ sits on the attention block's right edge, where the scores are
const ADD_Y = Y.attn + ATTN_H / 2;
const bias: LayoutShape[] = [
  ...stack("bias", C, "add a penalty for distance", "On the score matrix in\nevery layer"),
  { id: "bias-emb>attn", type: "arrow", x: 0, y: 0, from: "bias-emb", to: "bias-attn" },
  ...BIAS.flatMap((row, i) =>
    row.map((b, j): LayoutShape => ({
      id: `bias-m-${i}-${j}`,
      type: "cell",
      x: MX + j * CELL,
      y: MY + i * CELL,
      w: CELL,
      h: CELL,
      tone: ROLE_TONE.position,
      weight: Math.round((-b / 2) * 0.6 * 100) / 100,
      label: b === 0 ? "0" : `−${-b}`,
      quiet: true,
    }))
  ),
  text("bias-m-name", C + 116, MY + 14, 66, "penalty\n−|i − j|", 34),
  free("bias-in", MX + 1.5 * CELL, MY - 4, ADD_X + 13 - (MX + 1.5 * CELL), ADD_Y - (MY - 4), {
    via: [[MX + 1.5 * CELL, ADD_Y]],
  }),
  {
    id: "bias-add",
    type: "circle",
    x: ADD_X,
    y: ADD_Y,
    w: 22,
    symbol: "plus",
    tone: ROLE_TONE.position,
    label: "Add to scores",
    highlight: true,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Where position enters the Transformer",
  width: 880,
  height: 536,
  groups: [
    ...PANELS.map((x, i) => ({
      id: `panel-${i}`,
      title: ["Absolute", "Rotary (RoPE)", "Bias (ALiBi, T5)"][i],
      tone: ROLE_TONE.block,
      x,
      y: PANEL_Y,
      w: PANEL_W,
      h: PANEL_H,
    })),
    ...PANELS.map((x, i) => ({
      id: `layers-${i}`,
      title: "× N",
      tone: ROLE_TONE.block,
      x: x + 12,
      y: Y.group,
      w: PANEL_W - 24,
      h: Y.groupBottom - Y.group,
    })),
  ],
  shapes: [...absolute, ...rotary, ...bias],
};

export default spec;
