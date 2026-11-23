import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";

// Anatomy of one reasoning-model response, for "Cost, latency and when not to use reasoning" on the Reasoning Models
// & Test-Time Compute page. Token counts, prices and speed are illustrative; every derived number is computed below.
//
// Facts the drawing relies on (checked November 2026):
// - OpenAI reasoning guide: reasoning tokens are not visible through the API, take up context window space and are
//   billed as output tokens; counts appear in usage.output_tokens_details.reasoning_tokens; summaries are opt-in.
// - Anthropic "Steering thinking" pricing: thinking tokens are billed as output tokens; with display "summarized" you
//   are billed for the full thinking tokens, not the visible summary ("The billed output token count does not match
//   the visible token count"); earlier turns' thinking blocks that stay in context are billed as input tokens.
// - Gemini thinking docs: response pricing is output tokens plus thinking tokens; billed for full thoughts even when
//   only summaries are returned.
//
// Working (prices $2 per million input tokens and $10 per million output tokens; decode speed 100 tokens per second):
//   input  1,200 × $2 / 1M            = $0.0024
//   output (6,000 + 400) × $10 / 1M   = $0.064
//   total                             = $0.0664
//   same answer, no thinking: 1,200 × $2 / 1M + 400 × $10 / 1M = $0.0024 + $0.004 = $0.0064 → 10.4× cheaper
//   wait before the first answer token ≈ 6,000 / 100 = 60 s of thinking (plus prefill)

const PROMPT = 1200;
const THINK = 6000;
const ANSWER = 400;
const PRICE_IN = 2; // $ per million tokens
const PRICE_OUT = 10;
const SPEED = 100; // tokens per second

const inCost = (PROMPT * PRICE_IN) / 1e6;
const outCost = ((THINK + ANSWER) * PRICE_OUT) / 1e6;
const total = inCost + outCost;
const plain = inCost + (ANSWER * PRICE_OUT) / 1e6;
const ratio = total / plain;
const waitS = THINK / SPEED;

const n = (v: number) => v.toLocaleString("en-US");
const usd = (v: number) => `$${v.toFixed(4).replace(/0+$/, "")}`;

const T = {
  input: "blue",
  think: "violet",
  answer: "green",
  hidden: "neutral",
  cost: "orange",
} as const satisfies Record<string, LayoutTone>;

// ── Geometry: one token bar drawn to scale ──────────────────────────────────────────────────────────────────
const PX = 0.1; // px per token
const X0 = 60;
const xP = X0 + PROMPT * PX; // end of prompt
const xT = xP + THINK * PX; // end of thinking
const xA = xT + ANSWER * PX; // end of answer
const GX = 24;
const GW = 812;

const text = (id: string, x: number, y: number, w: number, h: number, label: string, tone: LayoutTone = "neutral") =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;
const cell = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  tone: LayoutTone,
  label?: string
): LayoutShape => ({
  id,
  type: "cell",
  x,
  y,
  w,
  h,
  tone,
  fill: "pastel",
  label,
});
const path = (id: string, points: [number, number][], tone: LayoutTone, head = false): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points,
  tone,
  weight: 0.6,
  head: head || undefined,
});

const G1 = 40;
const G2 = 170;
const G3 = 300;
const G4 = 450;

const shapes: LayoutShape[] = [
  // 1 · One request, to scale.
  text("r1-in", X0 - 20, G1 + 24, xP - X0 + 40, 20, "Prompt (input)", T.input),
  text("r1-think", xP, G1 + 24, xT - xP, 20, "Thinking (output)", T.think),
  text("r1-ans", xT - 20, G1 + 24, 80, 20, "Answer", T.answer),
  cell("r1-p", X0, G1 + 48, xP - X0, 36, T.input, n(PROMPT)),
  cell("r1-t", xP, G1 + 48, xT - xP, 36, T.think, `${n(THINK)} thinking tokens`),
  cell("r1-a", xT, G1 + 48, xA - xT, 36, T.answer, n(ANSWER)),

  // 2 · What the user sees.
  cell("r2-p", X0, G2 + 48, xP - X0, 36, T.input, "Prompt"),
  cell("r2-t", xP, G2 + 48, xT - xP, 36, T.hidden, "Raw thinking hidden; some APIs return a short summary instead"),
  cell("r2-a", xT, G2 + 48, xA - xT, 36, T.answer, n(ANSWER)),
  text("r2-note", xP, G2 + 22, xT - xP, 20, "A long pause unless a summary or progress note streams", T.hidden),

  // 3 · What you pay for.
  path(
    "r3-in",
    [
      [X0, G3 + 30],
      [X0, G3 + 38],
      [xP, G3 + 38],
      [xP, G3 + 30],
    ],
    T.input
  ),
  path(
    "r3-out",
    [
      [xP + 4, G3 + 30],
      [xP + 4, G3 + 38],
      [xA, G3 + 38],
      [xA, G3 + 30],
    ],
    T.cost
  ),
  text("r3-in-t", X0 - 30, G3 + 46, xP - X0 + 60, 36, `Input ${n(PROMPT)}\n× $${PRICE_IN}/M = ${usd(inCost)}`, T.input),
  text(
    "r3-out-t",
    xP + 40,
    G3 + 46,
    xA - xP - 80,
    36,
    `Output: ${n(THINK)} thinking + ${n(ANSWER)} answer = ${n(THINK + ANSWER)} tokens\n× $${PRICE_OUT}/M = ${usd(outCost)}, billed whether or not you see the thinking`,
    T.cost
  ),
  text(
    "r3-total",
    X0,
    G3 + 90,
    xA - X0,
    20,
    `Total ${usd(total)}. The same 400-token answer with no thinking: ${usd(plain)}, about ${Math.round(ratio)}× less.`
  ),

  // 4 · How long the user waits.
  text("r4-prefill", X0 - 20, G4 + 30, xP - X0 + 40, 36, "Prefill:\nreads the prompt"),
  {
    id: "r4-wait",
    type: "arrow",
    x: xP,
    y: G4 + 48,
    w: xT - xP,
    h: 0,
    label: `${n(THINK)} thinking tokens ÷ ${SPEED} tokens/s ≈ ${waitS} s before the answer starts`,
  },
  text("r4-stream", xT - 70, G4 + 62, 120, 20, "Answer streams", T.answer),

  text(
    "next-turn",
    GX,
    G4 + 104,
    GW,
    20,
    "Next turn: some APIs keep earlier thinking in the context and bill it again as input tokens."
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "What one reasoning response costs and when you see it",
  width: 860,
  height: G4 + 134,
  groups: [
    { id: "g1", title: "1 · One request, drawn to scale", tone: T.think, x: GX, y: G1, w: GW, h: 100 },
    { id: "g2", title: "2 · What the user sees", tone: T.hidden, x: GX, y: G2, w: GW, h: 100 },
    {
      id: "g3",
      title: `3 · What you pay (illustrative: $${PRICE_IN} per million input, $${PRICE_OUT} per million output tokens)`,
      tone: T.cost,
      x: GX,
      y: G3,
      w: GW,
      h: 120,
    },
    {
      id: "g4",
      title: `4 · How long the user waits (illustrative: ${SPEED} output tokens per second)`,
      tone: T.answer,
      x: GX,
      y: G4,
      w: GW,
      h: 90,
    },
  ],
  shapes,
};

export default spec;
