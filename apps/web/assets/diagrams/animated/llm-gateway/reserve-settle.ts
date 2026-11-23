import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { PRICES } from "@/components/diagrams/presets/gcase-answer";
import { LABS, RESERVE, WALKTHROUGH } from "@/components/diagrams/presets/gcase-gateway";

// Budgets when the cost is known only after the response (llm-platform-gateway, design sheet §15.1 and Step 2; preset
// RESERVE, WALKTHROUGH, LABS in presets/gcase-gateway.ts; list prices PRICES.mid from gcase-answer, as of November 2026).
//   One support call (the walk-through): money reserved as an UPPER BOUND = WALKTHROUGH.bytes 20,000 bytes × 2.50 (the
//   highest input price the alias can be billed, a 5-minute cache write) + RESERVE.maxTokens 512 × 10.00 per million =
//   0.05000 + 0.00512 = 0.05512 USD. A byte-level tokenizer never makes more tokens than bytes, so no call can bill more.
//   Settled from usage: 2,700 cache read × 0.10 + 2,300 cache write × 2.50 + 30 out × 10.00 = 0.00027 + 0.00575 +
//   0.0003 = 0.00632 USD; refund 0.0488. Rate (an estimate, as the provider's own ITPM is): 5,000 ITPM + 512 OTPM,
//   settled to 2,300 + 30.
//   Labs' day (84 USD): a gateway that charges after the response overshoots by everything in flight,
//   20 × 0.0845 = 1.69 USD (RESERVE.overshoot.chargeAfterShare 2.0%); with a 20 s-stale check + 0.763 a second × 20 s ×
//   0.0845 = 1.29 → 2.98 USD (3.5%, illustrative lag); reserve the upper bound → 0. The cost of reserving is held
//   budget: labs' last ≤ RESERVE.labsHeldMax 6.81 USD (8.1% of its day) is refused until calls settle.
// Steps: 1 count and reserve · 2 send, settle, refund · 3 overshoot on labs' day, three ways.
// Layout (880 wide): a five-stage strip on top (boxes 148 × 46, arrows between); two bars on one money scale
// (x 230 → 830 = 0.05512 USD); three bars on a second scale (x 230 → 830 = 3.5 USD) below; labels left, notes right.
// Colours: input reserve violet (counted bytes), output reserve green (the model's max_tokens), cache read blue, write
// violet, output green, the refund on paper; overshoot bars red, the upper bound green.

const X0 = 230;
const BAR_W = 600;
const usd = (v: number, d = 5) => `${v.toFixed(d)} USD`;

const inputHeld = (WALKTHROUGH.bytes * RESERVE.maxInputPrice) / 1e6; // 0.05
const outputHeld = (RESERVE.maxTokens * PRICES.mid.output) / 1e6; // 0.00512
const read = (WALKTHROUGH.cached * PRICES.mid.cached) / 1e6;
const write = (WALKTHROUGH.written * PRICES.mid.cacheWrite) / 1e6;
const out = (WALKTHROUGH.out * PRICES.mid.output) / 1e6;

const moneyX = (v: number) => X0 + Math.round((v / WALKTHROUGH.reserved) * BAR_W);
const OV_MAX = 3.5;
const ovX = (v: number) => X0 + Math.round((v / OV_MAX) * BAR_W);

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra,
  quiet = true
): LayoutShape => ({ id, type: "text", x, y, w, h: 18, label, tone, step, quiet });

const cell = (
  id: string,
  a: number,
  b: number,
  y: number,
  tone: LayoutTone,
  step: number,
  label?: string,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "cell",
  x: a,
  y,
  w: Math.max(2, b - a),
  h: 26,
  label,
  tone,
  fill: "pastel",
  step,
  quiet: true,
  ...extra,
});

// The stage strip.
const STAGE = { y: 40, w: 148, h: 46, gap: 20 } as const;
const stages = [
  { id: "count", label: "Count bytes", sub: `${n(WALKTHROUGH.bytes)} bytes`, step: 1, tone: PROD_TONE.infra },
  { id: "reserve", label: "Reserve", sub: usd(WALKTHROUGH.reserved), step: 1, tone: GENAI_TONE.check },
  { id: "send", label: "Send", sub: `leaves at ${WALKTHROUGH.leavesAtMs} ms`, step: 2, tone: GENAI_TONE.model },
  { id: "usage", label: "Usage", sub: "message_delta", step: 2, tone: GENAI_TONE.data },
  { id: "settle", label: "Settle, refund", sub: usd(WALKTHROUGH.settled), step: 2, tone: GENAI_TONE.check },
] as const;
const stageX = (i: number) => 26 + i * (STAGE.w + STAGE.gap);
const strip: LayoutShape[] = stages.flatMap((s, i): LayoutShape[] => [
  {
    id: `st-${s.id}`,
    type: "box",
    x: stageX(i),
    y: STAGE.y,
    w: STAGE.w,
    h: STAGE.h,
    label: s.label,
    sub: s.sub,
    tone: s.tone,
    fill: "pastel",
    step: s.step,
    quiet: i !== 0 && i !== 2,
  },
  ...(i > 0
    ? [
        {
          id: `st-arrow-${i}`,
          type: "arrow" as const,
          x: 0,
          y: 0,
          from: `st-${stages[i - 1].id}`,
          to: `st-${s.id}`,
          step: s.step,
          quiet: true,
        },
      ]
    : []),
]);

// Money bars.
const R1 = 128;
const R2 = 178;
const money: LayoutShape[] = [
  text("h-money", 12, 104, 600, `One support call, on one money scale (${usd(WALKTHROUGH.reserved)} = full width)`, 1),
  text("l-reserved", 12, R1 + 4, 210, "Reserved: upper bound", 1),
  cell(
    "c-in",
    moneyX(0),
    moneyX(inputHeld),
    R1,
    GENAI_TONE.store,
    1,
    `${n(WALKTHROUGH.bytes)} bytes × ${RESERVE.maxInputPrice.toFixed(2)} = ${inputHeld.toFixed(4)}`
  ),
  cell("c-out", moneyX(inputHeld), moneyX(WALKTHROUGH.reserved), R1, GENAI_TONE.model, 1),
  text(
    "n-out",
    moneyX(inputHeld) - 214,
    R1 + 30,
    270,
    `+ ${RESERVE.maxTokens} max_tokens × ${PRICES.mid.output.toFixed(2)} = ${outputHeld.toFixed(5)}`,
    1
  ),
  text("l-settled", 12, R2 + 18, 210, "Settled from usage", 2),
  cell("c-read", moneyX(0), moneyX(read), R2 + 14, GENAI_TONE.data, 2),
  cell("c-write", moneyX(read), moneyX(read + write), R2 + 14, GENAI_TONE.store, 2),
  cell("c-o", moneyX(read + write), moneyX(read + write + out), R2 + 14, GENAI_TONE.model, 2),
  cell(
    "c-refund",
    moneyX(WALKTHROUGH.settled),
    moneyX(WALKTHROUGH.reserved),
    R2 + 14,
    PROD_TONE.infra,
    2,
    `refunded ${usd(WALKTHROUGH.refund, 4)}`,
    { fill: "paper", quiet: false }
  ),
  text(
    "n-settled",
    X0,
    R2 + 44,
    600,
    `${n(WALKTHROUGH.cached)} read × ${PRICES.mid.cached.toFixed(2)} + ${n(WALKTHROUGH.written)} write × ${PRICES.mid.cacheWrite.toFixed(2)} + ${WALKTHROUGH.out} out × ${PRICES.mid.output.toFixed(2)} = ${usd(WALKTHROUGH.settled)}`,
    2
  ),
  text(
    "n-rate",
    X0,
    R2 + 62,
    600,
    `Rate, an estimate: 5,000 ITPM + ${RESERVE.maxTokens} OTPM held, settled to ${n(WALKTHROUGH.written)} + ${WALKTHROUGH.out}`,
    2
  ),
];

// Overshoot on labs' day.
const O0 = 296;
const OROW = 34;
const ov = RESERVE.overshoot;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const overshoot: LayoutShape[] = [
  text(
    "h-over",
    12,
    O0,
    700,
    `Overshoot on labs' ${n(LABS.budgetUsd)} USD day, ${LABS.maxParallel} calls in flight`,
    3,
    PROD_TONE.infra,
    false
  ),
  text("l-after", 12, O0 + 26 + 4, 210, "Charge after the response", 3),
  cell(
    "o-after",
    ovX(0),
    ovX(ov.chargeAfterUsd),
    O0 + 26,
    GENAI_TONE.failure,
    3,
    `${ov.chargeAfterUsd.toFixed(2)} USD`
  ),
  text("o-after-n", ovX(ov.chargeAfterUsd) + 8, O0 + 30, 60, pct(ov.chargeAfterShare), 3),
  text("l-lag", 12, O0 + 26 + OROW + 4, 210, `+ a ${ov.lagS} s-stale check`, 3),
  cell(
    "o-lag",
    ovX(0),
    ovX(ov.chargeAfterLaggedUsd),
    O0 + 26 + OROW,
    GENAI_TONE.failure,
    3,
    `${ov.chargeAfterLaggedUsd.toFixed(2)} USD`
  ),
  text("o-lag-n", ovX(ov.chargeAfterLaggedUsd) + 8, O0 + 30 + OROW, 60, pct(ov.chargeAfterLaggedShare), 3),
  text("l-upper", 12, O0 + 26 + 2 * OROW + 4, 210, "Reserve the upper bound", 3),
  cell("o-upper", ovX(0), ovX(0) + 3, O0 + 26 + 2 * OROW, GENAI_TONE.model, 3),
  text("o-upper-n", ovX(0) + 10, O0 + 30 + 2 * OROW, 300, "0 USD: no call can bill more than it held", 3),
  text(
    "n-held",
    12,
    O0 + 26 + 3 * OROW + 6,
    856,
    `The price: held budget. Labs' last ≤ ${RESERVE.labsHeldMax.toFixed(2)} USD (${pct(RESERVE.labsHeldShare)} of its day) is refused until calls settle; nothing is overspent.`,
    3
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: `Reserve the upper bound, settle from usage: ${usd(WALKTHROUGH.reserved)} held, ${usd(WALKTHROUGH.settled)} billed, overshoot 0`,
  width: 880,
  height: O0 + 26 + 3 * OROW + 34,
  steps: [
    { title: `Count bytes and reserve the upper bound: ${usd(WALKTHROUGH.reserved)}` },
    { title: `Send, read usage, settle ${usd(WALKTHROUGH.settled)} and refund ${usd(WALKTHROUGH.refund, 4)}` },
    {
      title: `Overshoot on labs' day: ${pct(ov.chargeAfterShare)} or ${pct(ov.chargeAfterLaggedShare)} charged after, 0 reserved`,
    },
  ],
  shapes: [...strip, ...money, ...overshoot],
};

export default spec;
