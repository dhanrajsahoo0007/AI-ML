import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { LATENCY, PROD_TONE, TOKENS, TRAFFIC, n } from "@/components/diagrams/presets/production";
import { BATCH_TERMS, PER_REQUEST, PRICE, usd } from "@/components/diagrams/presets/production-batch";

// Batch against real time for Brightpost (batch-vs-realtime-inference): how long until the result, and what one
// request costs. No steps: the two rows are read together.
//
// Top: a log time axis from 0.1 s to 24 h. Real time: the customer's answer ends at 1.5 s (first token 0.4 s), the
// latency SLO (LATENCY in presets/production.ts). Batch: most provider batches finish within 1 hour (Anthropic's docs);
// every batch API promises results within 24 hours (Anthropic, OpenAI, Gemini), then the batch expires. The two
// deadlines are drawn as lime lines (a check: an SLO). 24 h ÷ 1.5 s = 86,400 ÷ 1.5 = 57,600 times apart.
//
// Bottom: cost per request, linear scale, the same 2,200 input + 250 output tokens (TOKENS):
//   list:  2,200 × $2 ÷ 1e6 + 250 × $10 ÷ 1e6 = $0.0044 + $0.0025 = $0.0069 (illustrative prices)
//   batch: $0.0069 × 0.5 = $0.00345 (50 % discount, Anthropic and OpenAI docs, as of November 2026)
//
// Log axis: x = 200 + (log10 t − log10 0.1) ÷ (log10 86,400 − log10 0.1) × 620. Positions: 0.1 s 200 · 0.4 s 263 ·
// 1 s 304 · 1.5 s 323 · 10 s 409 · 1 min 490 · 10 min 595 · 1 h 676 · 24 h 820.
// Cost bars: $0.0069 → 460 px, so $0.00345 → 230 px.
//
// Colours (PROD_TONE): the waiting customer's request orange (traffic), the batch of logged conversations blue
// (data), the two deadlines lime (check), axis and notes neutral.

const AX0 = 200;
const AX1 = 820;
const T0 = 0.1;
const T1 = 86_400;
const x = (seconds: number) =>
  Math.round((AX0 + ((Math.log10(seconds) - Math.log10(T0)) / (Math.log10(T1) - Math.log10(T0))) * (AX1 - AX0)) * 10) /
  10;

const answerS = LATENCY.fullAnswerMs / 1000; // 1.5
const firstS = LATENCY.firstTokenMs / 1000; // 0.4
const hourS = BATCH_TERMS.mostWithinHours * 3600; // 3,600
const windowS = BATCH_TERMS.windowHours * 3600; // 86,400
const apart = windowS / answerS; // 57,600

const AXIS_Y = 224;
const ROW_RT = 66;
const ROW_B = 142;
const BAR_H = 34;
const COST_RT = 330;
const COST_B = 380;
const COST_PX = 460 / PER_REQUEST.realtime;

/** A text box as wide as its label (about 6.2 px per character), so a centred label reads left-aligned. */
const hug = (label: string) => Math.round(label.length * 5.8) + 2;
const note = (id: string, nx: number, ny: number, label: string, tone: LayoutTone = PROD_TONE.infra): LayoutShape => ({
  id,
  type: "text",
  x: nx,
  y: ny,
  w: hug(label),
  h: 20,
  label,
  tone,
});
const centred = (
  id: string,
  cx: number,
  ny: number,
  label: string,
  tone: LayoutTone = PROD_TONE.infra
): LayoutShape => {
  const w = hug(label);
  return { id, type: "text", x: Math.round(cx - w / 2), y: ny, w, h: 20, label, tone };
};
const line = (
  id: string,
  points: [number, number][],
  tone: LayoutTone = PROD_TONE.infra,
  dashed = false
): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points,
  tone,
  dashed,
});

const ticks: [number, string][] = [
  [0.1, "0.1 s"],
  [1, "1 s"],
  [10, "10 s"],
  [60, "1 min"],
  [600, "10 min"],
  [3600, "1 h"],
  [86_400, "24 h"],
];

const shapes: LayoutShape[] = [
  note("head", 20, 12, "How long until the result? (log scale)"),

  // The two deadlines, lime.
  line(
    "slo",
    [
      [x(answerS), 50],
      [x(answerS), AXIS_Y],
    ],
    PROD_TONE.check,
    true
  ),
  centred("slo-label", x(answerS), 30, `latency SLO ${answerS} s`, PROD_TONE.check),
  line(
    "window",
    [
      [AX1, 50],
      [AX1, AXIS_Y],
    ],
    PROD_TONE.check,
    true
  ),
  { id: "window-label", type: "text", x: 760, y: 30, w: 96, h: 20, label: "24 h window", tone: PROD_TONE.check },

  // Real time.
  note("rt-name", 20, ROW_RT - 2, "Real time", PROD_TONE.traffic),
  note("rt-sub", 20, ROW_RT + 16, "a customer is waiting"),
  {
    id: "rt-bar",
    type: "cell",
    x: AX0,
    y: ROW_RT,
    w: x(answerS) - AX0,
    h: BAR_H,
    label: `${answerS} s`,
    tone: PROD_TONE.traffic,
    fill: "pastel",
  },
  note(
    "rt-note",
    x(answerS) + 14,
    ROW_RT + 7,
    `first token ${firstS} s · whole answer ${answerS} s · ${TRAFFIC.peakPerSecond} a second at peak`
  ),

  // Batch.
  note("b-name", 20, ROW_B - 2, "Batch", PROD_TONE.data),
  note("b-sub", 20, ROW_B + 16, "nobody is waiting"),
  {
    id: "b-bar",
    type: "cell",
    x: AX0,
    y: ROW_B,
    w: x(hourS) - AX0,
    h: BAR_H,
    label: "most batches finish within 1 hour",
    tone: PROD_TONE.data,
    fill: "pastel",
  },
  line(
    "b-tail",
    [
      [x(hourS), ROW_B + BAR_H / 2],
      [AX1, ROW_B + BAR_H / 2],
    ],
    PROD_TONE.data,
    true
  ),
  note("b-note", AX1 - hug("or up to 24 h; then it expires"), ROW_B + BAR_H + 4, "or up to 24 h; then it expires"),

  // Axis.
  line("axis", [
    [AX0, AXIS_Y],
    [AX1, AXIS_Y],
  ]),
  ...ticks.flatMap(([t, label], i): LayoutShape[] => [
    line(`tick-${i}`, [
      [x(t), AXIS_Y],
      [x(t), AXIS_Y + 6],
    ]),
    centred(`tick-${i}-label`, x(t), AXIS_Y + 8, label),
  ]),
  note("apart", AX0, AXIS_Y + 32, `The two deadlines are ${n(apart)} times apart: 86,400 s ÷ ${answerS} s.`),

  // Cost per request.
  note(
    "cost-head",
    20,
    COST_RT - 36,
    `Cost per request: ${n(TOKENS.inputPerRequest)} tokens in, ${TOKENS.outputPerRequest} out ` +
      `(illustrative $${PRICE.inputPerM} / $${PRICE.outputPerM} per million)`
  ),
  note("c-rt-name", 20, COST_RT + 6, "Real time", PROD_TONE.traffic),
  {
    id: "c-rt-bar",
    type: "cell",
    x: AX0,
    y: COST_RT,
    w: Math.round(PER_REQUEST.realtime * COST_PX),
    h: BAR_H,
    label: usd(PER_REQUEST.realtime),
    tone: PROD_TONE.traffic,
    fill: "pastel",
  },
  note("c-rt-note", AX0 + Math.round(PER_REQUEST.realtime * COST_PX) + 12, COST_RT + 7, "list price"),
  note("c-b-name", 20, COST_B + 6, "Batch API", PROD_TONE.data),
  {
    id: "c-b-bar",
    type: "cell",
    x: AX0,
    y: COST_B,
    w: Math.round(PER_REQUEST.batch * COST_PX),
    h: BAR_H,
    label: usd(PER_REQUEST.batch),
    tone: PROD_TONE.data,
    fill: "pastel",
  },
  note(
    "c-b-note",
    AX0 + Math.round(PER_REQUEST.batch * COST_PX) + 12,
    COST_B + 7,
    `${BATCH_TERMS.discount * 100} % off list (Anthropic, OpenAI, as of November 2026)`
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Batch against real time: seconds against hours, full price against half",
  width: 860,
  height: COST_B + BAR_H + 20,
  shapes,
};

export default spec;
