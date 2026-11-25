import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ROLE_TONE, block } from "@/components/diagrams/presets/transformer";

// Where the normalisation sits around one sub-layer (attention or feed-forward), drawn bottom to top like the paper.
// Left: Post-LN, the 2017 paper's "Add & Norm": add the input back, then normalise. Right: Pre-LN, used by most
// modern LLMs: normalise a copy of the input, run the sub-layer, add the untouched input back.
//
// Facts checked:
// - Vaswani et al. (2017, arXiv 1706.03762) §3.1: "the output of each sub-layer is LayerNorm(x + Sublayer(x))".
// - Pre-LN, x + Sublayer(Norm(x)): GPT-2 (Radford et al., 2019) moved layer norm to the input of each sub-block;
//   Xiong et al. (2020, arXiv 2002.04745) show Pre-LN trains stably without the warm-up Post-LN needs. Llama
//   (Touvron et al., 2023) normalises the input of each sub-layer with RMSNorm.
// - The skip path carries x itself in both; only in Post-LN does the sum then pass through a norm.

/** Gap between stacked parts, and the column centres of the two panels. */
const GAP = 30;
const LEFT = 200;
const RIGHT = 560;
/** x of each skip line's vertical run, left of its column. */
const SKIP_DX = 110;
/** y of the input label, the tap where the skip leaves the main line, and the output label. */
const IN_Y = 354;
const TAP_Y = 330;
const OUT_Y = 94;

const text = (id: string, x: number, y: number, w: number, label: string, h = 20): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: "neutral",
});

const arrow = (id: string, from: string, to: string): LayoutShape => ({ id, type: "arrow", x: 0, y: 0, from, to });

const adder = (id: string, cx: number, cy: number): LayoutShape => ({
  id,
  type: "circle",
  x: cx,
  y: cy,
  w: 24,
  symbol: "plus",
  tone: ROLE_TONE.block,
  label: "Add",
});

/** The skip: from the tap on the main line, out to the left, up and into the adder's left side. */
const skip = (id: string, cx: number, add: LayoutShape): LayoutShape => ({
  id,
  type: "arrow",
  x: cx,
  y: TAP_Y,
  to: add.id,
  via: [
    [cx - SKIP_DX, TAP_Y],
    [cx - SKIP_DX, add.y],
  ],
  label: "x",
});

const SUBLAYER = "Sublayer\n(attention or FFN)";

// Post-LN, bottom up: Sublayer (44), gap, ⊕ (24), gap, LayerNorm (44), gap, output.
const postSub = block("post-sub", "attention", LEFT - 75, IN_Y - 18 - GAP - 44 + 4, { label: SUBLAYER });
const postAdd = adder("post-add", LEFT, postSub.y - GAP - 12);
const postNorm = block("post-norm", "norm", LEFT - 75, postAdd.y - 12 - GAP - 44, {
  label: "LayerNorm\n(after the add)",
});

// Pre-LN, bottom up: Norm (44), gap, Sublayer (44), gap, ⊕ (24), gap, output. Same total height as the left.
const preNorm = block("pre-norm", "norm", RIGHT - 75, IN_Y - 18 - GAP - 44 + 4, { label: "RMSNorm or\nLayerNorm" });
const preSub = block("pre-sub", "attention", RIGHT - 75, preNorm.y - GAP - 44, { label: SUBLAYER });
const preAdd = adder("pre-add", RIGHT, preSub.y - GAP - 12);

const shapes: LayoutShape[] = [
  // Post-LN
  text("post-in", LEFT - 40, IN_Y, 80, "x"),
  postSub,
  postAdd,
  postNorm,
  text("post-out", LEFT - 60, OUT_Y, 120, "output"),
  arrow("post-in>sub", "post-in", "post-sub"),
  arrow("post-sub>add", "post-sub", "post-add"),
  arrow("post-add>norm", "post-add", "post-norm"),
  arrow("post-norm>out", "post-norm", "post-out"),
  skip("post-skip", LEFT, postAdd),
  text("post-formula", 40, 422, 320, "LayerNorm(x + Sublayer(x))"),
  text("post-note", 40, 444, 320, "The sum passes through the norm."),
  // Pre-LN
  text("pre-in", RIGHT - 40, IN_Y, 80, "x"),
  preNorm,
  preSub,
  preAdd,
  text("pre-out", RIGHT - 60, OUT_Y, 120, "output"),
  arrow("pre-in>norm", "pre-in", "pre-norm"),
  arrow("pre-norm>sub", "pre-norm", "pre-sub"),
  arrow("pre-sub>add", "pre-sub", "pre-add"),
  arrow("pre-add>out", "pre-add", "pre-out"),
  skip("pre-skip", RIGHT, preAdd),
  text("pre-formula", 400, 422, 320, "x + Sublayer(Norm(x))"),
  text("pre-note", 400, 444, 320, "The skip path never passes through a norm."),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Post-LN and Pre-LN: where the norm sits",
  width: 760,
  height: 480,
  groups: [
    { id: "post", title: "Post-LN (the 2017 paper)", tone: ROLE_TONE.block, x: 40, y: 50, w: 320, h: 352 },
    { id: "pre", title: "Pre-LN (most modern LLMs)", tone: ROLE_TONE.block, x: 400, y: 50, w: 320, h: 352 },
  ],
  shapes,
};

export default spec;
