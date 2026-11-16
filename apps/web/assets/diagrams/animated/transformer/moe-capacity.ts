import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE, block } from "@/components/diagrams/presets/transformer";

// Expert capacity and the training losses in a mixture-of-experts layer. Replaces the Mermaid under "Training loop
// concerns" on the Mixture of Experts page. Bottom to top: a batch of 8 tokens → the router picks one expert per
// token (top-1, as in Switch Transformer, to keep the lines readable) → each of 4 experts has 2 slots → the expert
// FFNs run on the tokens in their slots → the layer output. Expert 1 is picked by 3 tokens, so the third (t5) is over
// capacity: it is dropped from this layer and reaches the output through the residual connection only. On the right,
// the task loss and the load-balancing loss add up and update the experts and the router.
//
// Facts checked against Switch Transformers (Fedus et al., 2021, arXiv 2101.03961), §2.2: expert capacity =
// (tokens per batch / number of experts) × capacity factor; "if too many tokens are routed to an expert (referred to
// later as dropped tokens), computation is skipped and the token representation is passed directly to the next layer
// through the residual connection"; the auxiliary load-balancing loss is α · N · Σᵢ fᵢ · Pᵢ, with fᵢ the fraction of
// tokens sent to expert i and Pᵢ the fraction of router probability given to it. Router z-loss: ST-MoE (Zoph et al.,
// 2022, arXiv 2202.08906), which penalizes large router logits for stability.
//
// Working: capacity = 8 tokens / 4 experts × capacity factor 1.0 = 2 slots per expert. Router choices (illustrative):
// t1 → E1, t2 → E3, t3 → E1, t4 → E2, t5 → E1, t6 → E4, t7 → E2, t8 → E3. Slots fill in batch order:
// E1 gets t1, t3 and is full when t5 arrives (t5 dropped); E2 t4, t7; E3 t2, t8; E4 t6 and one empty slot.
// Tokens per expert: 3, 2, 2, 1 (sum 8); processed 7, dropped 1; slots 8, used 7, empty 1.

const TOKENS = 8;
const EXPERTS = 4;
const CAPACITY_FACTOR = 1.0;
const CAPACITY = (TOKENS / EXPERTS) * CAPACITY_FACTOR; // 2
const CHOICE = [0, 2, 0, 1, 0, 3, 1, 2]; // expert index picked for t1 … t8

// Fill the slots in batch order; tokens that find their expert full are dropped.
const slots: number[][] = Array.from({ length: EXPERTS }, () => []);
const dropped: number[] = [];
CHOICE.forEach((e, t) => (slots[e].length < CAPACITY ? slots[e].push(t) : dropped.push(t)));
const routed = Array.from({ length: EXPERTS }, (_, e) => CHOICE.filter((c) => c === e).length); // [3, 2, 2, 1]
const processed = slots.reduce((a, s) => a + s.length, 0); // 7

// ── Geometry ─────────────────────────────────────────────────────────────────────────────────────────────────
const colX = (e: number) => 230 + e * 125; // expert column centres
const GROUP_W = 110;
const SLOT_W = 44;
const SLOT_GAP = 6;
const slotX = (e: number, s: number) => colX(e) + (s === 0 ? -SLOT_GAP / 2 - SLOT_W : SLOT_GAP / 2);
const TOKEN_W = 48;
const TOKEN_GAP = 14;
const tokenX = (t: number) => 176 + t * (TOKEN_W + TOKEN_GAP);
const Y = {
  formula: 14,
  output: 80,
  group: 160,
  ffn: 196,
  slot: 300,
  groupBottom: 356,
  router: 440,
  token: 500,
  tokenLabel: 536,
};
const DROP_X = 80; // the dropped token's cell, left of Expert 1
const RIGHT = 690; // left edge of the loss column
const RIGHT_W = 176;
const ADD_X = 720;
const ADD_Y = 270;

const text = (id: string, x: number, y: number, w: number, h: number, label: string, tone: LayoutTone = "neutral") =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;

const shapes: LayoutShape[] = [];

// ── Tokens and router ────────────────────────────────────────────────────────────────────────────────────────
const routerX = tokenX(0);
const routerW = tokenX(TOKENS - 1) + TOKEN_W - routerX;
for (let t = 0; t < TOKENS; t++)
  shapes.push(
    {
      id: `tok-${t}`,
      type: "cell",
      x: tokenX(t),
      y: Y.token,
      w: TOKEN_W,
      h: 30,
      label: `t${t + 1}`,
      tone: dropped.includes(t) ? ROLE_TONE.blocked : "neutral",
      fill: "pastel",
    },
    { id: `tok-${t}>router`, type: "arrow", x: tokenX(t) + TOKEN_W / 2, y: Y.token, w: 0, h: Y.router + 30 - Y.token }
  );
shapes.push(
  text("tok-label", routerX, Y.tokenLabel, routerW, 20, `A batch of ${TOKENS} tokens`),
  block("router", "linear", routerX, Y.router, {
    w: routerW,
    h: 30,
    label: "Router: one expert per token (top-1 here)",
  })
);

// ── Experts: 2 slots each, then the FFN ──────────────────────────────────────────────────────────────────────
const groups: LayoutSpec["groups"] = [];
for (let e = 0; e < EXPERTS; e++) {
  const cx = colX(e);
  groups.push({
    id: `g-expert-${e}`,
    title: `Expert ${e + 1}`,
    tone: ROLE_TONE.ffn,
    x: cx - GROUP_W / 2,
    y: Y.group,
    w: GROUP_W,
    h: Y.groupBottom - Y.group,
  });
  const n = slots[e].length;
  shapes.push(
    block(`ffn-${e}`, "ffn", cx - 47, Y.ffn, { w: 94, h: 36, label: "FFN" }),
    // The pill says how many of the tokens routed here fit in the slots.
    {
      id: `slots-${e}>ffn`,
      type: "arrow",
      x: cx,
      y: Y.slot,
      w: 0,
      h: Y.ffn + 36 - Y.slot,
      label: routed[e] > n ? `${n} of ${routed[e]} fit` : `${n} token${n === 1 ? "" : "s"}`,
    }
  );
  for (let s = 0; s < CAPACITY; s++) {
    const t = slots[e][s];
    shapes.push({
      id: `slot-${e}-${s}`,
      type: "cell",
      x: slotX(e, s),
      y: Y.slot,
      w: SLOT_W,
      h: 30,
      label: t === undefined ? "empty" : `t${t + 1}`,
      tone: t === undefined ? "neutral" : ROLE_TONE.ffn,
      fill: t === undefined ? "paper" : "pastel",
    });
  }
  // FFN output up to the layer output.
  shapes.push({ id: `ffn-${e}>out`, type: "arrow", x: cx, y: Y.ffn, w: 0, h: Y.output + 36 - Y.ffn });
}

// Routing lines: router top → the token's slot (or the dropped cell).
CHOICE.forEach((e, t) => {
  const s = slots[e].indexOf(t);
  const isDropped = s < 0;
  const endX = isDropped ? DROP_X + 22 : slotX(e, s) + SLOT_W / 2;
  const startX = tokenX(t) + TOKEN_W / 2;
  shapes.push({
    id: `route-${t}`,
    type: "arrow",
    x: startX,
    y: Y.router,
    w: endX - startX,
    h: Y.slot + 31 - Y.router,
    tone: isDropped ? ROLE_TONE.blocked : "neutral",
  });
});

// The dropped token: over capacity, skips the experts, carried by the residual only.
const d = dropped[0];
shapes.push(
  {
    id: "dropped",
    type: "cell",
    x: DROP_X,
    y: Y.slot,
    w: 44,
    h: 30,
    label: `t${d + 1}`,
    tone: ROLE_TONE.blocked,
    fill: "pastel",
    highlight: true,
  },
  text("dropped-label", 12, Y.slot - 3, 64, 36, "over\ncapacity", ROLE_TONE.blocked),
  {
    id: "dropped>out",
    type: "arrow",
    x: DROP_X + 22,
    y: Y.slot,
    w: 0,
    h: Y.output + 36 - Y.slot,
    dashed: true,
    tone: ROLE_TONE.blocked,
    label: "residual only",
  }
);

// ── Layer output ─────────────────────────────────────────────────────────────────────────────────────────────
shapes.push({
  id: "output",
  type: "box",
  x: 40,
  y: Y.output,
  w: colX(EXPERTS - 1) + GROUP_W / 2 - 40,
  h: 36,
  label: `Layer output: ${processed} tokens from experts, t${d + 1} from the residual`,
  tone: "neutral",
  fill: "pastel",
});

// ── Losses and the update ────────────────────────────────────────────────────────────────────────────────────
const TASK_Y = Y.output - 4;
const BAL_Y = Y.router - 7;
const plus: LayoutShape = {
  id: "add",
  type: "circle",
  x: ADD_X,
  y: ADD_Y,
  w: 22,
  symbol: "plus",
  tone: "neutral",
  label: "Add",
};
shapes.push(
  {
    id: "task",
    type: "box",
    x: RIGHT,
    y: TASK_Y,
    w: RIGHT_W,
    h: 44,
    label: "Task loss",
    sub: "next-token prediction",
    tone: "neutral",
    fill: "pastel",
  },
  { id: "output>task", type: "arrow", x: 0, y: 0, from: "output", to: "task" },
  {
    id: "balance",
    type: "box",
    x: RIGHT,
    y: BAL_Y,
    w: RIGHT_W,
    h: 44,
    label: "Load-balancing loss",
    sub: `pushes toward ${CAPACITY} per expert`,
    tone: "neutral",
    fill: "pastel",
  },
  { id: "router>balance", type: "arrow", x: 0, y: 0, from: "router", to: "balance", dashed: true },
  text(
    "balance-note",
    RIGHT - 10,
    BAL_Y + 50,
    RIGHT_W + 20,
    36,
    `It sees the share per expert:\n${routed.join(", ")} of ${TOKENS} tokens.`
  ),
  plus,
  { id: "task>add", type: "arrow", x: ADD_X, y: TASK_Y + 44, w: 0, h: ADD_Y - 11 - TASK_Y - 44 },
  { id: "balance>add", type: "arrow", x: ADD_X, y: BAL_Y, w: 0, h: ADD_Y + 11 - BAL_Y },
  {
    id: "update",
    type: "box",
    x: 760,
    y: ADD_Y - 22,
    w: 106,
    h: 44,
    label: "Update experts\nand router",
    tone: "neutral",
    fill: "pastel",
  },
  { id: "add>update", type: "arrow", x: 0, y: 0, from: "add", to: "update" },
  text(
    "z-note",
    RIGHT - 10,
    Y.tokenLabel - 16,
    RIGHT_W + 20,
    52,
    "Many models also add a router\nz-loss that keeps the router's\nlogits small, for stability."
  ),
  text(
    "formula",
    16,
    Y.formula,
    660,
    22,
    `Capacity = ${TOKENS} tokens ÷ ${EXPERTS} experts × capacity factor ${CAPACITY_FACTOR.toFixed(1)} = ${CAPACITY} slots per expert`
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Expert capacity, dropped tokens and the balancing loss",
  width: 880,
  height: Y.tokenLabel + 50,
  groups,
  shapes,
};

export default spec;
