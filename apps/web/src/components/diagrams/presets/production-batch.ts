// Constants and arithmetic for the Batch vs Real-time Inference page only (serving/batch-*). Imports the running
// example from presets/production.ts so every Brightpost number is the shared one.
//
// Provider facts, as of November 2026 (cited on the page under Further reading):
//   Anthropic Message Batches: all usage at 50 % of standard prices; most batches finish within 1 hour; a batch
//     expires if not done within 24 hours; at most 100,000 requests or 256 MB per batch; results kept 29 days.
//   OpenAI Batch API: 50 % discount; completion window "24h"; at most 50,000 requests and 200 MB per input file.
//   Gemini Batch API: 50 % of the standard cost; target turnaround 24 hours.
// Token prices are ILLUSTRATIVE round numbers for a mid-size model, not a quote.

import { DATASETS, TOKENS, TRAFFIC } from "./production";

/** Batch terms from the providers' docs (as of November 2026). */
export const BATCH_TERMS = {
  discount: 0.5,
  windowHours: 24,
  mostWithinHours: 1,
  anthropicMaxRequests: 100_000,
  anthropicMaxMb: 256,
  openaiMaxRequests: 50_000,
  openaiMaxMb: 200,
} as const;

/** Illustrative list prices, US dollars per million tokens. */
export const PRICE = { inputPerM: 2, outputPerM: 10 } as const;

const M = 1_000_000;

/** Dollars for a number of input and output tokens at standard (list) prices. */
export const listCost = (inputTokens: number, outputTokens: number) => ({
  input: (inputTokens * PRICE.inputPerM) / M,
  output: (outputTokens * PRICE.outputPerM) / M,
});

/**
 * One Brightpost answer at list price. Working:
 *   input 2,200 × $2 ÷ 1,000,000 = $0.0044; output 250 × $10 ÷ 1,000,000 = $0.0025; total $0.0069.
 *   The same request through a batch API: × 0.5 = $0.00345.
 */
const one = listCost(TOKENS.inputPerRequest, TOKENS.outputPerRequest);
export const PER_REQUEST = {
  realtime: one.input + one.output,
  batch: (one.input + one.output) * BATCH_TERMS.discount,
} as const;

/**
 * The nightly job: summarise each of yesterday's 200,000 conversations for the support-quality team.
 * Each summary reads the exchange as the assistant saw it: the 2,200-token prompt (with its passages) plus the
 * 250-token answer = 2,450 input tokens; it writes a 100-token summary (illustrative).
 * Working:
 *   input 200,000 × 2,450 = 490,000,000 tokens (490 M); output 200,000 × 100 = 20,000,000 (20 M).
 *   list: 490 × $2 = $980 + 20 × $10 = $200 → $1,180 a night.
 *   batch: × 0.5 → $490 + $100 = $590 a night. Saving $590 a night, × 30 = $17,700 a month.
 */
export const SUMMARY_JOB = (() => {
  const count = TRAFFIC.requestsPerDay;
  const inputEach = TOKENS.inputPerRequest + TOKENS.outputPerRequest;
  const outputEach = 100;
  const inputTokens = count * inputEach;
  const outputTokens = count * outputEach;
  const list = listCost(inputTokens, outputTokens);
  const batch = { input: list.input * BATCH_TERMS.discount, output: list.output * BATCH_TERMS.discount };
  const listTotal = list.input + list.output;
  const batchTotal = batch.input + batch.output;
  return {
    count,
    inputEach,
    outputEach,
    inputTokens,
    outputTokens,
    list,
    batch,
    listTotal,
    batchTotal,
    savingPerNight: listTotal - batchTotal,
    savingPerMonth: (listTotal - batchTotal) * 30,
  };
})();

/**
 * Re-scoring the golden set: 200 tickets, each one Brightpost answer.
 * Working: 200 × $0.0069 = $1.38 at list; × 0.5 = $0.69 through a batch API. Saving $0.69.
 */
export const GOLDEN_JOB = {
  count: DATASETS.goldenSet,
  listTotal: DATASETS.goldenSet * PER_REQUEST.realtime,
  batchTotal: DATASETS.goldenSet * PER_REQUEST.batch,
} as const;

if (Math.round(SUMMARY_JOB.listTotal) !== 1_180) throw new Error(`summary job list cost ${SUMMARY_JOB.listTotal}`);
if (Math.round(SUMMARY_JOB.batchTotal) !== 590) throw new Error(`summary job batch cost ${SUMMARY_JOB.batchTotal}`);
if (Math.round(GOLDEN_JOB.listTotal * 100) !== 138) throw new Error(`golden job ${GOLDEN_JOB.listTotal}`);

/** "$1,180" for whole dollars; "$0.0069" style for small amounts (up to 5 decimals, trailing zeros dropped). */
export const usd = (value: number) =>
  value >= 10
    ? `$${Math.round(value).toLocaleString("en-US")}`
    : `$${Number(value.toFixed(value < 0.1 ? 5 : 2)).toString()}`;
