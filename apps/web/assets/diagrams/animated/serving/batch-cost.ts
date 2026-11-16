import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { BATCH_TERMS, GOLDEN_JOB, PRICE, SUMMARY_JOB, usd } from "@/components/diagrams/presets/production-batch";

// The arithmetic of a provider batch discount on Brightpost's nightly job (batch-vs-realtime-inference, worked
// example). Four steps, in the order the sum is built:
//   1 the night's work in tokens: 200,000 conversations × 2,450 tokens in = 490 M; × 100 tokens out = 20 M
//     (the 2,450 is the 2,200-token prompt + the 250-token answer; the 100-token summary is illustrative);
//   2 at list price: 490 × $2 = $980 in + 20 × $10 = $200 out = $1,180 a night (illustrative prices);
//   3 through a batch API at 50 % off (Anthropic, OpenAI and Gemini docs, as of November 2026): $490 + $100 = $590,
//     saving $590 a night, × 30 = $17,700 a month;
//   4 the same discount on the 200-ticket golden set: 200 × $0.0069 = $1.38 → $0.69; at this scale (0.47 px per
//     dollar) $1.38 is under one pixel, so it is written, not drawn.
// All numbers come from presets/production-batch.ts, which checks them.
//
// Grid: names at x 20; bars from x 200, $1,180 → 560 px. Rows: work y 48 · list y 132 · batch y 214 · golden y 302.
// Colours (PROD_TONE): input tokens orange (the prompt is traffic), output tokens green (the model's words); names,
// totals and working neutral. Two tones plus neutral.
//
// NEW rings: names, working lines and bar segments are `quiet`; each step rings one thing (step 1 the two token
// boxes, steps 2 and 3 the nightly total, step 4 the golden-set sum), so rings never pile up.

const BAR_X = 200;
const BAR_H = 40;
const PX = 560 / SUMMARY_JOB.listTotal; // ≈ 0.4746 px per dollar
const ROW = { work: 48, list: 132, batch: 214, golden: 302 } as const;

/** A text box as wide as its longest line (about 5.8 px per character), so a centred label reads left-aligned. */
const hug = (label: string) => Math.round(Math.max(...label.split("\n").map((l) => l.length)) * 5.8) + 2;
const text = (
  id: string,
  x: number,
  y: number,
  label: string,
  step: number,
  quiet = true,
  tone: LayoutShape["tone"] = PROD_TONE.infra
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w: hug(label),
  h: 20 * label.split("\n").length,
  label,
  tone,
  step,
  ...(quiet ? { quiet: true } : {}),
});
const w = (dollars: number) => Math.round(dollars * PX * 10) / 10;
const bar = (
  id: string,
  x: number,
  y: number,
  width: number,
  dollars: number,
  tone: LayoutShape["tone"],
  step: number
): LayoutShape => ({
  id,
  type: "cell",
  x,
  y,
  w: width,
  h: BAR_H,
  label: usd(dollars),
  tone,
  fill: "pastel",
  step,
  quiet: true,
});
const M = (tokens: number) => `${n(tokens / 1e6)} M`;

const listIn = w(SUMMARY_JOB.list.input); // 465.1
const listOut = w(SUMMARY_JOB.list.output); // 94.9
const batchIn = w(SUMMARY_JOB.batch.input); // 232.5
const batchOut = w(SUMMARY_JOB.batch.output); // 47.5

const shapes: LayoutShape[] = [
  text(
    "head",
    20,
    12,
    `Nightly job: summarise yesterday's ${n(SUMMARY_JOB.count)} conversations · illustrative prices ` +
      `$${PRICE.inputPerM} in, $${PRICE.outputPerM} out per million tokens`,
    1
  ),

  // Step 1: the work in tokens.
  text("work-name", 20, ROW.work + 14, "The work", 1),
  {
    id: "work-in",
    type: "box",
    x: BAR_X,
    y: ROW.work,
    w: 300,
    h: 48,
    label: `${M(SUMMARY_JOB.inputTokens)} tokens in`,
    sub: `${n(SUMMARY_JOB.count)} × ${n(SUMMARY_JOB.inputEach)} (prompt + answer)`,
    tone: PROD_TONE.traffic,
    fill: "pastel",
    step: 1,
  },
  {
    id: "work-out",
    type: "box",
    x: BAR_X + 320,
    y: ROW.work,
    w: 240,
    h: 48,
    label: `${M(SUMMARY_JOB.outputTokens)} tokens out`,
    sub: `${n(SUMMARY_JOB.count)} × ${SUMMARY_JOB.outputEach}-token summary`,
    tone: PROD_TONE.model,
    fill: "pastel",
    step: 1,
  },

  // Step 2: list price.
  text("list-name", 20, ROW.list, "Standard API\nlist price", 2),
  bar("list-in", BAR_X, ROW.list, listIn, SUMMARY_JOB.list.input, PROD_TONE.traffic, 2),
  bar("list-out", BAR_X + listIn, ROW.list, listOut, SUMMARY_JOB.list.output, PROD_TONE.model, 2),
  text("list-total", BAR_X + listIn + listOut + 12, ROW.list + 10, `${usd(SUMMARY_JOB.listTotal)} a night`, 2, false),
  text(
    "list-working",
    BAR_X,
    ROW.list + BAR_H + 4,
    `${M(SUMMARY_JOB.inputTokens)} × $${PRICE.inputPerM} + ${M(SUMMARY_JOB.outputTokens)} × ` +
      `$${PRICE.outputPerM}, per million`,
    2
  ),

  // Step 3: the batch discount.
  text(
    "batch-name",
    20,
    ROW.batch,
    `Batch API\n${BATCH_TERMS.discount * 100} % off, within ${BATCH_TERMS.windowHours} h`,
    3
  ),
  bar("batch-in", BAR_X, ROW.batch, batchIn, SUMMARY_JOB.batch.input, PROD_TONE.traffic, 3),
  bar("batch-out", BAR_X + batchIn, ROW.batch, batchOut, SUMMARY_JOB.batch.output, PROD_TONE.model, 3),
  text(
    "batch-total",
    BAR_X + batchIn + batchOut + 12,
    ROW.batch + 10,
    `${usd(SUMMARY_JOB.batchTotal)} a night`,
    3,
    false
  ),
  text(
    "batch-saving",
    BAR_X,
    ROW.batch + BAR_H + 4,
    `saves ${usd(SUMMARY_JOB.savingPerNight)} a night, ${usd(SUMMARY_JOB.savingPerMonth)} over 30 nights`,
    3
  ),

  // Step 4: the small job.
  text("golden-name", 20, ROW.golden, `Golden set\n${GOLDEN_JOB.count} tickets`, 4),
  text(
    "golden-sum",
    BAR_X,
    ROW.golden,
    `${usd(GOLDEN_JOB.listTotal)} at list, ${usd(GOLDEN_JOB.batchTotal)} in a batch: saves ` +
      `${Math.round((GOLDEN_JOB.listTotal - GOLDEN_JOB.batchTotal) * 100)} cents (under 1 px at this scale)\n` +
      "If the result gates a release, do not wait up to 24 h for it.",
    4,
    false
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "A batch discount on Brightpost's nightly summaries",
  width: 860,
  height: ROW.golden + 56,
  steps: [
    { title: "The night's work in tokens" },
    { title: "What it costs at list price" },
    { title: "The same work through a batch API" },
    { title: "The same discount on a small job" },
  ],
  shapes,
};

export default spec;
