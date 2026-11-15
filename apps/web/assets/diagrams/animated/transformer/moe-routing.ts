import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE, block, vector } from "@/components/diagrams/presets/transformer";

// Top-2 routing in one mixture-of-experts layer, for one token. Replaces the Mermaid under "Architecture" on the
// Mixture of Experts page. The 8 experts sit in rows, and the router's logit and mixing weight for expert i sit in the
// same row, so a row reads "score → weight → expert".
// Step 1: the token vector x goes into the router (one Linear layer), which gives one logit per expert.
// Step 2: the top 2 logits (experts 2 and 5) go through a softmax; the other 6 get weight 0.
// Step 3: x is sent to experts 2 and 5 only; the other 6 experts do not run for this token.
// Step 4: the two outputs are mixed with the weights, added to the residual stream, and passed to the next block.
//
// Facts checked against Mixtral of Experts (Jiang et al., 2024, arXiv 2401.04088), §2.1: each layer has 8
// feed-forward blocks (experts); "for every token, at each layer, a router network selects two experts"; the gate is
// G(x) = Softmax(TopK(x · W_g)), "the softmax over the Top-K logits of a linear layer"; the output is
// y = Σ G(x)_i · E_i(x), so experts whose gate is 0 need not be computed. The residual add follows the usual
// Transformer block (x + sublayer output).
//
// The logits are illustrative: [0.6, 2.1, 0.3, 1.1, 1.6, 0.4, 0.2, 0.8] for experts 1–8. Top 2: expert 2 (2.1) and
// expert 5 (1.6). Softmax over those two only: e^2.1 = 8.166, e^1.6 = 4.953, sum 13.119 → 0.6225 and 0.3775, shown
// as 0.62 and 0.38 (sum 1.00). Bars are drawn to scale, 110 px for the largest logit.
//
// Simplified: Mixtral is pre-norm, so the router and experts read RMSNorm(x) while the residual carries x itself; the
// norm is left out here to keep the routing in focus.

const LOGITS = [0.6, 2.1, 0.3, 1.1, 1.6, 0.4, 0.2, 0.8];
const K = 2;
const TOP = LOGITS.map((v, i) => ({ v, i }))
  .sort((a, b) => b.v - a.v)
  .slice(0, K)
  .map((t) => t.i)
  .sort((a, b) => a - b); // [1, 4]: experts 2 and 5
const exps = TOP.map((i) => Math.exp(LOGITS[i]));
const expSum = exps.reduce((a, b) => a + b, 0);
const WEIGHT = new Map(TOP.map((i, j) => [i, exps[j] / expSum])); // 1 → 0.6225, 4 → 0.3775
const [FIRST, SECOND] = TOP;
const w2 = (i: number) => WEIGHT.get(i)!.toFixed(2);

// ── Grid ─────────────────────────────────────────────────────────────────────────────────────────────────────
const ROW_TOP = 152;
const ROW_STEP = 48;
const ROW_H = 40;
const rowTop = (i: number) => ROW_TOP + i * ROW_STEP;
const rowMid = (i: number) => rowTop(i) + ROW_H / 2;
const ROWS_BOTTOM = rowTop(7) + ROW_H; // 528
const GROUP_Y = 112;
const GROUP_BOTTOM = ROWS_BOTTOM + 16;
const SPLIT_Y = 572; // where x splits: router, experts, residual
const VEC_Y = 596;

const X = {
  router: 16, // Router block, 100 wide
  group: 144, // router-output group
  name: 150, // "E1" … "E8"
  bar: 188, // logit bars start
  softmax: 376, // tall Softmax block, 60 wide
  weight: 468, // weight cells, 56 wide
  groupRight: 536,
  bus: 556, // x travels up this line to the chosen experts
  expert: 586, // expert boxes, 120 wide
  join: 756, // expert outputs run up/down here into the weighted sum
  sum: 774, // weighted-sum box, 80 wide
  residual: 868,
};
const BAR_MAX = 110;
const ROUTER_W = 100;
const EXPERT_W = 120;
const SUM_W = 80;
const SUM_CX = X.sum + SUM_W / 2;
const ROUTER_CX = X.router + ROUTER_W / 2;
const barW = (v: number) => Math.round((v / Math.max(...LOGITS)) * BAR_MAX);

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone: LayoutTone,
  step: number,
  quiet?: boolean
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet });

const shapes: LayoutShape[] = [];

// ── Step 1: x → router → 8 logits ────────────────────────────────────────────────────────────────────────────
const routerY = (rowMid(0) + rowMid(7)) / 2 - 22;
shapes.push(
  ...vector("x", X.bus - 64, VEC_Y, 8, "neutral", { cell: 16, step: 1 }),
  text("x-label", X.bus - 80, VEC_Y + 20, 160, 36, "Token vector x\n(after attention)", "neutral", 1, true),
  // x fans out along one line: to the router (left), the experts (middle) and the residual (right).
  {
    id: "split",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [ROUTER_CX, SPLIT_Y],
      [X.residual, SPLIT_Y],
    ],
    step: 1,
  },
  {
    id: "x-trunk",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [X.bus, VEC_Y],
      [X.bus, SPLIT_Y],
    ],
    step: 1,
  },
  {
    id: "x>router",
    type: "arrow",
    x: ROUTER_CX,
    y: SPLIT_Y,
    w: 0,
    h: routerY + 44 - SPLIT_Y,
    label: "x",
    step: 1,
    quiet: true,
  },
  block("router", "linear", X.router, routerY, { w: ROUTER_W, label: "Router", sub: "Linear", step: 1 }),
  {
    id: "router>logits",
    type: "arrow",
    x: X.router + ROUTER_W,
    y: routerY + 22,
    w: X.group - X.router - ROUTER_W,
    h: 0,
    step: 1,
  },
  text("h-logit", X.bar, GROUP_Y + 18, BAR_MAX + 40, 18, "logit", ROLE_TONE.linear, 1, true),
  text("h-weight", X.weight - 6, GROUP_Y + 18, 68, 18, "weight", ROLE_TONE.softmax, 2, true)
);
LOGITS.forEach((v, i) => {
  const w = barW(v);
  shapes.push(
    text(`name-${i}`, X.name, rowTop(i), 32, ROW_H, `E${i + 1}`, "neutral", 1, true),
    {
      id: `bar-${i}`,
      type: "cell",
      x: X.bar,
      y: rowMid(i) - 12,
      w,
      h: 24,
      tone: ROLE_TONE.linear,
      fill: "pastel",
      step: 1,
      quiet: true,
    },
    text(`val-${i}`, X.bar + w + 4, rowTop(i), 32, ROW_H, v.toFixed(1), ROLE_TONE.linear, 1, true)
  );
});

// ── Step 2: top 2 → softmax → two weights ────────────────────────────────────────────────────────────────────
const smY = rowTop(FIRST);
const smH = rowTop(SECOND) + ROW_H - smY;
shapes.push(block("softmax", "softmax", X.softmax, smY, { w: 60, h: smH, label: "Softmax\nover\ntop 2", step: 2 }));
TOP.forEach((i) => {
  const from = X.bar + barW(LOGITS[i]) + 36;
  shapes.push(
    {
      id: `top-${i}`,
      type: "arrow",
      x: from,
      y: rowMid(i),
      w: X.softmax - from,
      h: 0,
      step: 2,
      tone: ROLE_TONE.linear,
    },
    {
      id: `sm>w-${i}`,
      type: "arrow",
      x: X.softmax + 60,
      y: rowMid(i),
      w: X.weight - X.softmax - 60,
      h: 0,
      step: 2,
      tone: ROLE_TONE.softmax,
    },
    {
      id: `w-${i}`,
      type: "cell",
      x: X.weight,
      y: rowMid(i) - 12,
      w: 56,
      h: 24,
      label: w2(i),
      tone: ROLE_TONE.softmax,
      fill: "pastel",
      step: 2,
      quiet: true,
    }
  );
});
shapes.push(
  text(
    "note-gate",
    16,
    VEC_Y + 4,
    380,
    36,
    `Only the top ${K} logits enter the softmax.\nThe other ${LOGITS.length - K} experts get weight 0.`,
    "neutral",
    2,
    true
  )
);

// ── Step 3: dispatch x to the chosen experts; the rest stay idle ─────────────────────────────────────────────
LOGITS.forEach((_, i) => {
  const chosen = WEIGHT.has(i);
  shapes.push(
    block(`expert-${i}`, "ffn", X.expert, rowTop(i), {
      w: EXPERT_W,
      h: ROW_H,
      label: `Expert ${i + 1}`,
      sub: chosen ? "FFN, runs" : "not run",
      step: 3,
      highlight: chosen || undefined,
    })
  );
  // One announced shape per step: the first chosen expert; the second and the idle ones are quiet.
  if (i === SECOND) shapes[shapes.length - 1].quiet = true;
  if (!chosen) {
    const idle = shapes[shapes.length - 1];
    idle.fill = "soft";
    idle.tone = "neutral";
    idle.quiet = true;
  }
});
shapes.push(
  {
    id: "x>first",
    type: "arrow",
    x: X.bus,
    y: SPLIT_Y,
    to: `expert-${FIRST}`,
    via: [[X.bus, rowMid(FIRST)]],
    label: "x",
    step: 3,
    quiet: true,
  },
  {
    id: "x>second",
    type: "arrow",
    x: X.bus,
    y: rowMid(SECOND),
    to: `expert-${SECOND}`,
    step: 3,
  },
  text(
    "note-idle",
    X.bus + 84,
    VEC_Y + 4,
    X.residual - X.bus - 80,
    36,
    `${LOGITS.length - K} of ${LOGITS.length} experts skip this token:\nstored in memory, no compute.`,
    "neutral",
    3,
    true
  )
);

// ── Step 4: weighted sum, residual add, next block ───────────────────────────────────────────────────────────
const sumY = (rowMid(FIRST) + rowMid(SECOND)) / 2 - 22;
const ADD_Y = 160;
const plus: LayoutShape = {
  id: "add",
  type: "circle",
  x: SUM_CX,
  y: ADD_Y,
  w: 22,
  symbol: "plus",
  tone: "neutral",
  label: "Add",
  step: 4,
  quiet: true,
};
shapes.push(
  {
    id: "sum",
    type: "box",
    x: X.sum,
    y: sumY,
    w: SUM_W,
    h: 44,
    label: "Weighted\nsum",
    tone: "neutral",
    fill: "pastel",
    step: 4,
  },
  ...TOP.map((i): LayoutShape => ({
    id: `out-${i}`,
    type: "arrow",
    x: 0,
    y: 0,
    from: `expert-${i}`,
    to: "sum",
    via: [
      [X.join, rowMid(i)],
      [X.join, sumY + 22 + (i === FIRST ? -8 : 8)],
    ],
    label: `× ${w2(i)}`,
    tone: ROLE_TONE.softmax,
    step: 4,
    quiet: true,
  })),
  plus,
  { id: "sum>add", type: "arrow", x: 0, y: 0, from: "sum", to: "add", step: 4, quiet: true },
  {
    id: "residual",
    type: "arrow",
    x: X.residual,
    y: SPLIT_Y,
    to: "add",
    via: [[X.residual, ADD_Y]],
    step: 4,
    quiet: true,
  },
  { id: "add>next", type: "arrow", x: SUM_CX, y: ADD_Y - 11, w: 0, h: 80 - (ADD_Y - 11), step: 4, quiet: true },
  text("next", SUM_CX - 60, 56, 120, 22, "to the next block", "neutral", 4, true),
  text(
    "formula",
    16,
    14,
    600,
    22,
    `output = x + ${w2(FIRST)} · Expert ${FIRST + 1}(x) + ${w2(SECOND)} · Expert ${SECOND + 1}(x)`,
    ROLE_TONE.ffn,
    4,
    true
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Top-2 routing in a mixture-of-experts layer",
  width: 880,
  height: VEC_Y + 64,
  steps: [
    { title: "The router scores all 8 experts" },
    { title: "Keep the top 2 and softmax their scores" },
    { title: "Only the 2 chosen experts run" },
    { title: "Mix their outputs and add the residual" },
  ],
  groups: [
    {
      id: "g-router",
      title: "Router output",
      tone: ROLE_TONE.linear,
      x: X.group,
      y: GROUP_Y,
      w: X.groupRight - X.group,
      h: GROUP_BOTTOM - GROUP_Y,
    },
    {
      id: "g-experts",
      title: "8 experts (FFNs)",
      tone: ROLE_TONE.ffn,
      x: X.expert - 14,
      y: GROUP_Y,
      w: EXPERT_W + 28,
      h: GROUP_BOTTOM - GROUP_Y,
    },
  ],
  shapes,
};

export default spec;
