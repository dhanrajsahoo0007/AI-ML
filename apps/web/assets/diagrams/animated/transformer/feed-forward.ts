import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ROLE_TONE, block, vector } from "@/components/diagrams/presets/transformer";

// The position-wise feed-forward network of "Attention Is All You Need" (Vaswani et al., 2017), drawn for the three
// positions of "I love tea" side by side. Bottom to top in each column: the 512-wide vector → Linear (W₁, b₁) to 2048
// → ReLU → Linear (W₂, b₂) back to 512. The three columns use the same four weight tensors; the dashed links between
// the Linear blocks say so.
//
// Facts checked against arXiv 1706.03762 v7, §3.3: FFN(x) = max(0, xW₁ + b₁)W₂ + b₂, "applied to each position
// separately and identically"; "while the linear transformations are the same across different positions, they use
// different parameters from layer to layer"; d_model = 512 in and out, inner dimension d_ff = 2048.
//
// The hidden values are illustrative: pre-activation a(k, d) = 1.2 · sin(1.7d + 2.3k + 0.5) for token k and hidden
// unit d (16 of 2048 shown), then ReLU, max(0, a). Each cell's weight is max(0, a) / 1.2, so the zeros ReLU makes are
// drawn as empty cells. About half the units are zero for each token, and a different half each time.

const COLS = [200, 430, 660]; // column centres
const TOKENS = ["I", "love", "tea"];
const IN_CELL = 14;
const HID_CELL = 12;
const HID_SHOWN = 16;
const BLOCK_W = 128;

const Y = {
  formula: 14,
  group: 58,
  out: 86,
  w2: 148,
  hidden: 232,
  relu: 276,
  w1: 346,
  groupBottom: 412,
  input: 448,
  token: 468,
  note: 504,
};

const preActivation = (k: number, d: number) => 1.2 * Math.sin(1.7 * d + 2.3 * k + 0.5);

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
const vertical = (id: string, x: number, fromY: number, toY: number): LayoutShape => ({
  id,
  type: "arrow",
  x,
  y: fromY,
  w: 0,
  h: toY - fromY,
});
const same = (id: string, from: string, to: string, label: string): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  head: false,
  dashed: true,
  label,
  tone: ROLE_TONE.linear,
});

const shapes: LayoutShape[] = [];

COLS.forEach((cx, k) => {
  const hidden = Array.from({ length: HID_SHOWN }, (_, d) => Math.max(0, preActivation(k, d)) / 1.2);
  shapes.push(
    // Input: the 512-wide vector for this position (8 cells shown).
    ...vector(`in-${k}`, cx - 4 * IN_CELL, Y.input, 8, "neutral", { cell: IN_CELL }),
    text(`tok-${k}`, cx - 60, Y.token, 120, 20, `"${TOKENS[k]}"`),
    vertical(`in-${k}>w1`, cx, Y.input, Y.w1 + 44),
    block(`w1-${k}`, "linear", cx - BLOCK_W / 2, Y.w1, { w: BLOCK_W, label: "Linear", sub: "W₁, b₁: 512 → 2048" }),
    vertical(`w1-${k}>relu`, cx, Y.w1, Y.relu + 26),
    {
      id: `relu-${k}`,
      type: "box",
      x: cx - 32,
      y: Y.relu,
      w: 64,
      h: 26,
      label: "ReLU",
      tone: "neutral",
      fill: "pastel",
    },
    vertical(`relu-${k}>hidden`, cx, Y.relu, Y.hidden + HID_CELL),
    ...vector(`hid-${k}`, cx - (HID_SHOWN * HID_CELL) / 2, Y.hidden, HID_SHOWN, ROLE_TONE.ffn, {
      cell: HID_CELL,
      values: hidden.map((v) => Math.round(v * 100) / 100),
    }),
    vertical(`hidden-${k}>w2`, cx, Y.hidden, Y.w2 + 44),
    block(`w2-${k}`, "linear", cx - BLOCK_W / 2, Y.w2, { w: BLOCK_W, label: "Linear", sub: "W₂, b₂: 2048 → 512" }),
    vertical(`w2-${k}>out`, cx, Y.w2, Y.out + IN_CELL),
    ...vector(`out-${k}`, cx - 4 * IN_CELL, Y.out, 8, ROLE_TONE.ffn, { cell: IN_CELL })
  );
});

// The same weights at every position: dashed links between neighbouring Linear blocks.
shapes.push(
  same("same-w1-a", "w1-0", "w1-1", "same W₁, b₁"),
  same("same-w1-b", "w1-1", "w1-2", "same W₁, b₁"),
  same("same-w2-a", "w2-0", "w2-1", "same W₂, b₂"),
  same("same-w2-b", "w2-1", "w2-2", "same W₂, b₂")
);

shapes.push(
  text("formula", 130, Y.formula, 600, 22, "FFN(x) = max(0, xW₁ + b₁) W₂ + b₂", ROLE_TONE.ffn),
  text(
    "note",
    40,
    Y.note,
    780,
    36,
    "Each position passes through the network on its own, with the same weights. Each of the 6 layers has its\nown W₁, b₁, W₂, b₂. 8 of 512 and 16 of 2048 values shown; ReLU's zeros are the empty cells."
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "The position-wise feed-forward network",
  width: 860,
  height: 554,
  groups: [
    {
      id: "g-ffn",
      title: "Feed-forward network",
      tone: ROLE_TONE.ffn,
      x: 60,
      y: Y.group,
      w: 740,
      h: Y.groupBottom - Y.group,
    },
  ],
  shapes,
};

export default spec;
