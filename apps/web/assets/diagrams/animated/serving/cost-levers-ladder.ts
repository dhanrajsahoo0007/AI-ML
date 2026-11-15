import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, REFUND_CASE, TOKENS, n } from "@/components/diagrams/presets/production";
import { CACHE, LADDER, SHORT_INPUT, usd } from "@/components/diagrams/presets/production-cost";

// The cost levers on the refund task, cheapest change first (cost-latency-optimization, worked example). Six steps, one
// rung each; every rung keeps the ones before it. Task = three calls, each with the 2,200-token prompt and 250 tokens
// out (illustrative; presets/production-cost.ts holds the working and checks every total):
//   start   3 large calls                              $0.0207
//   1 shorter prompts: 3 chunks, 1,400 in              $0.0159 (saves 23 %)
//   2 prompt caching: call 1 writes (1.25x), calls 2 and 3 read (0.1x)   $0.0116 (saves 44 %)
//   3 routing by step: calls 1 and 2 on the small model (a tenth of the price; own cache), call 3 large   $0.0062 (70 %)
//   4 batching: does not apply to this live task; the nightly summaries go from $1,180 to $590 (batch page)
//   5 quantisation: only for a model you host; an 8 B model's weights go from 16 GB to 4 GB at 4 bits
//   6 fine-tune or distil: ceiling if a tuned small model also writes call 3, $0.0014 (saves 93 %), and only if it
//     passes the 200-ticket golden set.
// Prices are illustrative ($2 in, $10 out per million; small model a tenth). The cache multipliers are Anthropic's
// (read 0.1x, 5-minute write 1.25x, as of November 2026; they differ by provider and model).
//
// Grid (860 wide): rung boxes x 20, w 270, h 46, spaced 62 from y 92; bars from x 316, $0.0207 -> 460 px (22,222 px
// per dollar), bar y = box y + 8, h 30. Start row y 36. Boxes with a bar are pastel; those that do not apply to this
// task (batching, quantisation) are outlined only.
// Colours (PROD_TONE): input orange, output green, rung boxes neutral. Two tones plus neutral.
// Rings: bars and notes are `quiet`; each step rings its rung box.

const BOX_X = 20;
const BOX_W = 270;
const BOX_H = 46;
const BAR_X = 316;
const BAR_H = 30;
const PX = 460 / LADDER.start.total;
const rowY = (i: number) => 92 + i * 62;

const hug = (label: string) => Math.round(Math.max(...label.split("\n").map((l) => l.length)) * 6.5) + 8;
const text = (
  id: string,
  x: number,
  y: number,
  label: string,
  step: number,
  tone?: LayoutShape["tone"]
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w: hug(label),
  h: 20,
  label,
  tone: tone ?? PROD_TONE.infra,
  step,
  quiet: true,
});

const bar = (
  id: string,
  y: number,
  r: { input: number; output: number; total: number },
  step: number
): LayoutShape[] => {
  const inW = Math.round(r.input * PX * 10) / 10;
  const outW = Math.round(r.output * PX * 10) / 10;
  return [
    {
      id: `${id}-in`,
      type: "cell",
      x: BAR_X,
      y,
      w: inW,
      h: BAR_H,
      label: inW > 52 ? usd(r.input) : undefined,
      tone: PROD_TONE.traffic,
      fill: "pastel",
      step,
      quiet: true,
    },
    {
      id: `${id}-out`,
      type: "cell",
      x: BAR_X + inW,
      y,
      w: outW,
      h: BAR_H,
      label: outW > 52 ? usd(r.output) : undefined,
      tone: PROD_TONE.model,
      fill: "pastel",
      step,
      quiet: true,
    },
  ];
};

const rung = (i: number, label: string, sub: string, step: number, applies: boolean): LayoutShape => ({
  id: `rung-${i}`,
  type: "box",
  x: BOX_X,
  y: rowY(i),
  w: BOX_W,
  h: BOX_H,
  label: `${i + 1}  ${label}`,
  sub,
  tone: PROD_TONE.infra,
  fill: applies ? "pastel" : "paper",
  step,
});

const endOf = (r: { total: number }) => BAR_X + Math.round(r.total * PX);
const saves = (pct: number) => `saves ${pct} %`;

const shapes: LayoutShape[] = [
  {
    ...text(
      "head",
      BOX_X,
      6,
      `The refund task, ${REFUND_CASE.label}: three calls, cheapest change first. Illustrative prices.`,
      1
    ),
    w: 820,
  },

  // The start: three large calls with the full prompt.
  text("start-name", BOX_X, 44, "Start: 3 large calls, 2,200 tokens in", 1),
  ...bar("start", 40, LADDER.start, 1),
  text("start-total", endOf(LADDER.start) + 10, 46, `${usd(LADDER.start.total)}`, 1),

  // Step 1: shorter prompts.
  rung(0, "Shorter prompts", `3 chunks, not 5: ${n(TOKENS.inputPerRequest)} → ${n(SHORT_INPUT)} in`, 1, true),
  ...bar("r1", rowY(0) + 8, LADDER.r1, 1),
  text("r1-total", endOf(LADDER.r1) + 10, rowY(0) + 14, `${usd(LADDER.r1.total)}, ${saves(LADDER.savingPct.r1)}`, 1),

  // Step 2: prompt caching.
  rung(1, "Prompt caching", `write ${CACHE.writeX}×, read ${CACHE.readX}× the input price`, 2, true),
  ...bar("r2", rowY(1) + 8, LADDER.r2, 2),
  text("r2-total", endOf(LADDER.r2) + 10, rowY(1) + 14, `${usd(LADDER.r2.total)}, ${saves(LADDER.savingPct.r2)}`, 2),

  // Step 3: a smaller model for the easy steps.
  rung(2, "Smaller model, routing", "lookups on the small model", 3, true),
  ...bar("r3", rowY(2) + 8, LADDER.r3, 3),
  text("r3-total", endOf(LADDER.r3) + 10, rowY(2) + 14, `${usd(LADDER.r3.total)}, ${saves(LADDER.savingPct.r3)}`, 3),

  // Step 4: batching does not apply to a live task.
  rung(3, "Batching", "work that can wait: 50 % off", 4, false),
  text(
    "r4-note",
    BAR_X,
    rowY(3) + 14,
    `Not this live task. Nightly summaries: ${usd(LADDER.batch.list)} → ${usd(LADDER.batch.batch)} a night.`,
    4
  ),

  // Step 5: quantisation applies only to a model you host.
  rung(4, "Quantisation", "only for a model you host", 5, false),
  text(
    "r5-note",
    BAR_X,
    rowY(4) + 14,
    `An 8 B model's weights: ${LADDER.weightsGb.bits16} GB → ${LADDER.weightsGb.bits4} GB at 4 bits, before overhead.`,
    5
  ),

  // Step 6: fine-tune or distil, the ceiling.
  rung(5, "Fine-tune or distil", `needs volume and a ${n(200)}-ticket golden set`, 6, true),
  ...bar("r6", rowY(5) + 8, LADDER.r6, 6),
  text(
    "r6-total",
    endOf(LADDER.r6) + 10,
    rowY(5) + 14,
    `${usd(LADDER.r6.total)}, ${LADDER.savingPct.r6} % at best: if the tuned model passes the golden set`,
    6
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The cost levers on one Brightpost task, cheapest change first",
  width: 860,
  height: rowY(5) + BOX_H + 22,
  steps: [
    { title: "Shorter prompts: send fewer chunks" },
    { title: "Prompt caching: pay a tenth to re-read the prefix" },
    { title: "A smaller model for the easy steps" },
    { title: "Batching: only for work that can wait" },
    { title: "Quantisation: only for a model you host" },
    { title: "Fine-tune or distil: the ceiling, after the evals" },
  ],
  shapes,
};

export default spec;
