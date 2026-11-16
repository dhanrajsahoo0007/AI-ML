import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, REFUND_CASE, TOKENS, TRAFFIC, n } from "@/components/diagrams/presets/production";
import { PRICE } from "@/components/diagrams/presets/production-batch";
import { CALLS, ONE_CALL, TASK, usd } from "@/components/diagrams/presets/production-cost";

// Where the money goes in one Brightpost task (cost-latency-optimization, "Where the money goes"). The task is the
// refund case: three model calls, each carrying the 2,200-token prompt and writing 250 tokens (illustrative).
// Three steps:
//   1 one call, priced: 2,200 tokens in cost $0.0044 and 250 out cost $0.0025 = $0.0069. Input is 90 % of the tokens
//     but 64 % of the bill; output is 10 % of the tokens and 36 % of the bill. A day of such calls: 200,000 x $0.0069
//     = $1,380;
//   2 the task makes three calls, to scale: 3 x $0.0069 = $0.0207;
//   3 each part of the bill has its own lever: input (trim, cache), output (concise, capped), calls (fewer, cheaper
//     model per step).
// All numbers come from presets/production-cost.ts, which checks them. Prices are illustrative: $2 in and $10 out per
// million tokens (the output at 5x input, the ratio on Anthropic's price list as of November 2026).
//
// Grid (860 wide): bar from x 40, $0.0207 -> 780 px (37,681 px per dollar), so one call is 260 px; bar y 78, h 44.
// Rows: head y 8 · call names y 36 · bar y 78 · tokens y 128 · share bars y 168 and y 200 (one call wide, 260 px) ·
// totals y 248 · lever boxes y 312.
// Colours (PROD_TONE): input orange (the prompt is traffic), output green (the model's words); the calls lever box
// neutral. Two tones plus neutral.
//
// Rings: segments and working text are `quiet`; each step rings one thing (the one-call total, the task total, the
// three lever boxes).

const BAR_X = 40;
const BAR_Y = 78;
const BAR_H = 44;
const PX = 780 / TASK.total;
const w1 = (v: number) => Math.round(v * PX * 10) / 10;

/** A text box as wide as its longest line (about 6.5 px per character), so a centred label reads left-aligned. */
const hug = (label: string) => Math.round(Math.max(...label.split("\n").map((l) => l.length)) * 6.5) + 8;
const text = (
  id: string,
  x: number,
  y: number,
  label: string,
  step: number,
  opts: { tone?: LayoutShape["tone"]; quiet?: boolean } = {}
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w: hug(label),
  h: 20 * label.split("\n").length,
  label,
  tone: opts.tone ?? PROD_TONE.infra,
  step,
  ...(opts.quiet === false ? {} : { quiet: true }),
});

const inW = w1(ONE_CALL.input); // 0.0044 -> 165.8
const outW = w1(ONE_CALL.output); // 0.0025 -> 94.2
const callW = inW + outW; // 260
const pct = (v: number) => `${Math.round(v * 100)} %`;

const call = (i: number, step: number): LayoutShape[] => {
  const x = BAR_X + i * callW;
  return [
    {
      id: `c${i}-in`,
      type: "cell",
      x,
      y: BAR_Y,
      w: inW,
      h: BAR_H,
      label: `in ${usd(ONE_CALL.input)}`,
      tone: PROD_TONE.traffic,
      fill: "pastel",
      step,
      quiet: true,
    },
    {
      id: `c${i}-out`,
      type: "cell",
      x: x + inW,
      y: BAR_Y,
      w: outW,
      h: BAR_H,
      label: `out ${usd(ONE_CALL.output)}`,
      tone: PROD_TONE.model,
      fill: "pastel",
      step,
      quiet: true,
    },
  ];
};

const callNames = ["look up the order", "check the refund rule", "write the answer"];
const tokensLine = `${n(TOKENS.inputPerRequest)} tokens in · ${TOKENS.outputPerRequest} out`;

const shapes: LayoutShape[] = [
  {
    ...text(
      "head",
      BAR_X,
      6,
      `${REFUND_CASE.label}, over the £${REFUND_CASE.approvalLimit} limit · illustrative prices $${PRICE.inputPerM} in, $${PRICE.outputPerM} out per million tokens`,
      1
    ),
    w: 780,
  },

  // The three calls, drawn to scale. Call 1 is step 1; calls 2 and 3 join at step 2.
  ...[0, 1, 2].flatMap((i) => [
    ...call(i, i === 0 ? 1 : 2),
    text(`c${i}-name`, BAR_X + i * callW, 34, `Call ${i + 1}\n${callNames[i]}`, i === 0 ? 1 : 2),
    text(`c${i}-tokens`, BAR_X + i * callW, BAR_Y + BAR_H + 4, tokensLine, i === 0 ? 1 : 2),
  ]),

  // Step 1: tokens against bill for one call, to scale (one call is 260 px wide).
  {
    id: "tok-in",
    type: "cell",
    x: BAR_X,
    y: 168,
    w: Math.round(ONE_CALL.tokenShareIn * callW * 10) / 10,
    h: 24,
    label: `in ${pct(ONE_CALL.tokenShareIn)}`,
    tone: PROD_TONE.traffic,
    fill: "pastel",
    step: 1,
    quiet: true,
  },
  {
    id: "tok-out",
    type: "cell",
    x: BAR_X + Math.round(ONE_CALL.tokenShareIn * callW * 10) / 10,
    y: 168,
    w: Math.round(ONE_CALL.tokenShareOut * callW * 10) / 10,
    h: 24,
    tone: PROD_TONE.model,
    fill: "pastel",
    step: 1,
    quiet: true,
  },
  text(
    "tok-note",
    BAR_X + callW + 12,
    170,
    `of the tokens: ${pct(ONE_CALL.tokenShareIn)} in, ${pct(ONE_CALL.tokenShareOut)} out (2,200 of 2,450)`,
    1
  ),
  {
    id: "bill-in",
    type: "cell",
    x: BAR_X,
    y: 200,
    w: inW,
    h: 24,
    label: `in ${pct(ONE_CALL.billShareIn)}`,
    tone: PROD_TONE.traffic,
    fill: "pastel",
    step: 1,
    quiet: true,
  },
  {
    id: "bill-out",
    type: "cell",
    x: BAR_X + inW,
    y: 200,
    w: outW,
    h: 24,
    label: `out ${pct(ONE_CALL.billShareOut)}`,
    tone: PROD_TONE.model,
    fill: "pastel",
    step: 1,
    quiet: true,
  },
  text(
    "bill-note",
    BAR_X + callW + 12,
    202,
    `of the bill: ${pct(ONE_CALL.billShareIn)} in, ${pct(ONE_CALL.billShareOut)} out (a token out costs 5x a token in)`,
    1
  ),
  {
    id: "one-total",
    type: "box",
    x: BAR_X,
    y: 248,
    w: 330,
    h: 36,
    label: `One call: ${usd(ONE_CALL.total)}`,
    sub: `× ${n(TRAFFIC.requestsPerDay)} a day = ${usd(ONE_CALL.perDay)}`,
    tone: PROD_TONE.model,
    fill: "pastel",
    step: 1,
  },

  // Step 2: the task is three calls.
  {
    id: "task-total",
    type: "box",
    x: BAR_X + 350,
    y: 248,
    w: 430,
    h: 36,
    label: `The task: ${CALLS} calls × ${usd(ONE_CALL.total)} = ${usd(TASK.total)}`,
    sub: `input ${usd(TASK.input)} (${pct(TASK.billShareIn)}) + output ${usd(TASK.output)} (${pct(TASK.billShareOut)})`,
    tone: PROD_TONE.infra,
    fill: "pastel",
    step: 2,
  },

  // Step 3: one lever for each part of the bill.
  {
    id: "lever-in",
    type: "box",
    x: BAR_X,
    y: 312,
    w: 240,
    h: 56,
    label: `Input tokens: ${usd(TASK.input)}`,
    sub: "trim the prompt · cache the prefix",
    tone: PROD_TONE.traffic,
    fill: "pastel",
    step: 3,
  },
  {
    id: "lever-out",
    type: "box",
    x: BAR_X + 270,
    y: 312,
    w: 240,
    h: 56,
    label: `Output tokens: ${usd(TASK.output)}`,
    sub: "concise format · cap the length",
    tone: PROD_TONE.model,
    fill: "pastel",
    step: 3,
  },
  {
    id: "lever-calls",
    type: "box",
    x: BAR_X + 540,
    y: 312,
    w: 240,
    h: 56,
    label: `Number of calls: ${CALLS}`,
    sub: "fewer steps · cheaper model per step",
    tone: PROD_TONE.infra,
    fill: "pastel",
    step: 3,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Where the money goes in one Brightpost task",
  width: 860,
  height: 392,
  steps: [
    { title: "One call: input is most of the tokens and most of the bill" },
    { title: "The refund task makes three calls" },
    { title: "Each part of the bill has its own lever" },
  ],
  shapes,
};

export default spec;
