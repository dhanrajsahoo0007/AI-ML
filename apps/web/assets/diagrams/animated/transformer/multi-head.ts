import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE, block } from "@/components/diagrams/presets/transformer";

// Figure 2 (right) of "Attention Is All You Need" (Vaswani et al., 2017), redrawn in the site's colour legend:
// multi-head attention, read from the bottom up. V, K and Q each go through h = 8 learned Linear projections (drawn
// as a stack of three offset copies, standing for all eight), each head runs scaled dot-product attention, the eight
// head outputs are concatenated and a last Linear mixes them.
//
// Numbers on the arrows (per token), checked against the paper (arXiv 1706.03762 v7):
// - §3.2.2: MultiHead(Q, K, V) = Concat(head_1, …, head_h) W^O, head_i = Attention(Q W_i^Q, K W_i^K, V W_i^V).
// - §3.2.2: h = 8 parallel heads; d_k = d_v = d_model / h = 512 / 8 = 64. So each projection maps 512 → 64.
// - §3.2.2: W^O ∈ R^(h·d_v × d_model) = R^(512 × 512): the concat is 8 × 64 = 512 wide and the output is 512.
// - §3.2.2: "the total computational cost is similar to that of single-head attention with full dimensionality".
// - Weights per attention layer (no biases), whatever h is: W^Q, W^K, W^V are h slices of 512 × 64 = one 512 × 512 each,
//   and W^O is 512 × 512, so 4 × 512 × 512 = 1,048,576 ≈ 1.05M. With h = 1 the same four 512 × 512 matrices exist.

const STACK = 10; // offset of each copy behind the front one: up and to the right, as in the paper
const COPIES = 3;

/**
 * A block with two outline copies behind it, offset up and to the right: the paper's "h parallel layers". The copies
 * are paths (shapes may not overlap); each draws only the part of its outline the copy in front does not cover.
 */
function stack(b: LayoutShape): LayoutShape[] {
  const w = b.w!;
  const h = b.h!;
  const ghosts: LayoutShape[] = [];
  for (let i = 1; i < COPIES; i++) {
    const x = b.x + i * STACK;
    const y = b.y - i * STACK;
    ghosts.push({
      id: `${b.id}-copy${i}`,
      type: "path",
      x: 0,
      y: 0,
      tone: b.tone,
      points: roundedOutline(x, y, w, h),
    });
  }
  return [...ghosts, b];
}

/**
 * The visible part of a copy's outline, clockwise from the left edge (just above the copy in front) over the top and
 * down the right edge to the bottom, with corners rounded like a box (radius 10, sampled every 22.5°).
 */
function roundedOutline(x: number, y: number, w: number, h: number): [number, number][] {
  const r = 10;
  const arc = (cx: number, cy: number, from: number): [number, number][] =>
    [0, 1, 2, 3, 4].map((i) => {
      const a = ((from + i * 22.5) * Math.PI) / 180;
      return [Math.round((cx + r * Math.cos(a)) * 10) / 10, Math.round((cy + r * Math.sin(a)) * 10) / 10];
    });
  return [
    [x, y + STACK],
    ...arc(x + r, y + r, 180),
    ...arc(x + w - r, y + r, 270),
    ...arc(x + w - r, y + h - r, 0),
    [x + w - STACK, y + h],
  ];
}

// Columns: the three projection stacks (front blocks) are centred on LC; arrows leave from the middle of each stack.
const LW = 120;
const LC = [160, 310, 460];
const MID = (c: number) => c + ((COPIES - 1) * STACK) / 2;
const CX = MID(340); // centre line of the attention stack, Concat and the last Linear

const Y = {
  out: 16,
  linear: 84,
  concat: 172,
  attn: 308,
  proj: 450,
  inputs: 540,
};
const STACK_TOP = (y: number) => y - (COPIES - 1) * STACK;
const CELL = 30;

const text = (id: string, x: number, y: number, w: number, label: string, h = 34, tone: LayoutTone = "neutral") =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;
const line = (id: string, x: number, from: number, to: number, label?: string): LayoutShape => ({
  id,
  type: "arrow",
  x,
  y: from,
  w: 0,
  h: to - from,
  label,
});

const lanes = [
  { id: "v", label: "V", tone: ROLE_TONE.value, word: "values" },
  { id: "k", label: "K", tone: ROLE_TONE.key, word: "keys" },
  { id: "q", label: "Q", tone: ROLE_TONE.query, word: "queries" },
];

const attn = block("attn", "attention", CX - 165 - STACK, Y.attn, { w: 330, label: "Scaled Dot-Product\nAttention" });

const shapes: LayoutShape[] = [
  // Inputs and their h projections.
  ...lanes.flatMap((l, i): LayoutShape[] => [
    {
      id: `in-${l.id}`,
      type: "cell",
      x: LC[i] - CELL / 2,
      y: Y.inputs,
      w: CELL,
      h: CELL,
      label: l.label,
      tone: l.tone,
      fill: "pastel",
    },
    text(`in-${l.id}-word`, LC[i] - 40, Y.inputs + CELL + 4, 80, l.word, 18, l.tone),
    line(`in-${l.id}>proj`, LC[i], Y.inputs - 4, Y.proj + 34, "512"),
    ...stack(block(`proj-${l.id}`, "linear", LC[i] - LW / 2, Y.proj, { w: LW, h: 30, label: "Linear" })),
    line(`proj-${l.id}>attn`, MID(LC[i]), STACK_TOP(Y.proj) - 4, Y.attn + 48, "64"),
  ]),
  // Eight heads in parallel, then Concat and the output Linear.
  ...stack(attn),
  line("attn>concat", CX, STACK_TOP(Y.attn) - 4, Y.concat + 34, "8 × 64 = 512"),
  block("concat", "concat", CX - 100, Y.concat, { w: 200, h: 30, label: "Concat" }),
  block("linear", "linear", CX - 75, Y.linear, { h: 30, label: "Linear" }),
  { id: "concat>linear", type: "arrow", x: 0, y: 0, from: "concat", to: "linear", label: "512" },
  text("out", CX - 90, Y.out, 180, "MultiHead(Q, K, V)", 20),
  { id: "linear>out", type: "arrow", x: 0, y: 0, from: "linear", to: "out" },
  text("heads", attn.x + attn.w! + 2 * STACK + 8, Y.attn - 16, 90, "× 8 heads", 20, ROLE_TONE.attention),
];

// Plain-words notes in a column on the right, level with each stage.
const NOTE_X = 610;
const NOTE_W = 200;
const notes: LayoutShape[] = [
  text("n-linear", NOTE_X, Y.linear - 2, NOTE_W, "a last Linear mixes\nthe heads: 512 → 512"),
  text("n-concat", NOTE_X, Y.concat - 2, NOTE_W, "join the 8 head outputs\nside by side: 8 × 64 = 512"),
  text("n-attn", NOTE_X, Y.attn + 5, NOTE_W, "each head attends on its own,\nall 8 at the same time"),
  text("n-proj", NOTE_X, Y.proj - 2, NOTE_W, "each head has its own Linear\nper input: 512 → 64"),
  text("n-in", NOTE_X, Y.inputs - 2, NOTE_W, "every token's vector is\n512 wide (d_model)"),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Multi-head attention",
  width: 830,
  height: 600,
  shapes: [...shapes, ...notes],
};

export default spec;
