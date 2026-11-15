// Constants and arithmetic for the Cost and Latency Optimization page only (serving/cost-*). Imports the running
// example from presets/production.ts and the shared illustrative list price from presets/production-batch.ts, so a
// number that appears on two pages comes from one constant.
//
// Provider facts, as of November 2026 (cited on the page under Further reading):
//   Anthropic prompt caching: a cache read costs 0.1 x the base input price for most models (some newer models
//     0.05 x or lower); a write costs 1.25 x (5-minute lifetime, the default) or 2 x (1-hour lifetime); a prompt
//     shorter than the model's minimum (512 to 4,096 tokens, by model) is processed without caching.
//   OpenAI prompt caching: automatic from 1,024 tokens; cached input is discounted by up to 95 %.
//   Batch APIs: 50 % off (see production-batch.ts).
//   Output tokens cost 5 x input tokens on every model row of Anthropic's price list (for example $4 in and $20 out
//     per million tokens): the $2 in and $10 out used here keeps that ratio.
// Prices and the small model's price (a tenth of the large one, as on the routing page) are ILLUSTRATIVE.

import { DATASETS, TOKENS } from "./production";
import { PRICE, SUMMARY_JOB } from "./production-batch";

const M = 1_000_000;

/** Cache multipliers on the base input price (Anthropic, 5-minute cache, most models). Illustrative for the page. */
export const CACHE = { writeX: 1.25, readX: 0.1 } as const;

/** Dollars per million tokens: the large model at the shared illustrative price, the small model a tenth of it. */
export const MODEL_PRICE = {
  large: { inputPerM: PRICE.inputPerM, outputPerM: PRICE.outputPerM },
  small: { inputPerM: PRICE.inputPerM / 10, outputPerM: PRICE.outputPerM / 10 },
} as const;

/**
 * The prompt after retrieving 3 chunks instead of 5: 200 instruction tokens + 3 x 400 + 15 for the question = 1,415,
 * written "about 1,400" (the 2,215 of presets/rag.ts PROMPT, minus two 400-token chunks, rounded the way that file
 * rounds).
 */
export const SHORT_INPUT = 1_400;

type Model = keyof typeof MODEL_PRICE;
type CacheUse = "none" | "write" | "read";

/** Dollars for one call: input tokens at the model's price (times the cache multiplier), output tokens at its price. */
export function callCost(model: Model, inputTokens: number, outputTokens: number, cache: CacheUse = "none") {
  const p = MODEL_PRICE[model];
  const x = cache === "write" ? CACHE.writeX : cache === "read" ? CACHE.readX : 1;
  return { input: (inputTokens * p.inputPerM * x) / M, output: (outputTokens * p.outputPerM) / M };
}

const sum = (calls: { input: number; output: number }[]) => {
  const input = calls.reduce((a, c) => a + c.input, 0);
  const output = calls.reduce((a, c) => a + c.output, 0);
  return { input, output, total: input + output };
};

const OUT = TOKENS.outputPerRequest;
const full = TOKENS.inputPerRequest;
const short = SHORT_INPUT;

/**
 * One answer at list price. Working: input 2,200 x $2 / 1 M = $0.0044; output 250 x $10 / 1 M = $0.0025; $0.0069.
 * Tokens: 2,200 of 2,450 are input (90 %), 250 are output (10 %). The bill: 0.0044 / 0.0069 = 64 % input, 36 % output.
 * A day of 200,000 such answers: 200,000 x $0.0069 = $1,380 (the all-large day on the routing page).
 */
export const ONE_CALL = (() => {
  const c = callCost("large", full, OUT);
  const total = c.input + c.output;
  const tokens = full + OUT;
  if (Math.round(total * 1e6) !== 6900) throw new Error(`one call should cost $0.0069, got ${total}`);
  return {
    ...c,
    total,
    tokenShareIn: full / tokens,
    tokenShareOut: OUT / tokens,
    billShareIn: c.input / total,
    billShareOut: c.output / total,
    perDay: total * 200_000,
  } as const;
})();

/**
 * The refund task (order 4471, a cracked kettle, GBP 42, over the GBP 30 approval limit) as three model calls, each
 * carrying the same 2,200-token prompt and writing 250 tokens (a simplification, illustrative):
 *   call 1 reads the question and looks up the order; call 2 checks the refund rule; call 3 writes the answer.
 * Working: 3 x $0.0069 = $0.0207; input 3 x $0.0044 = $0.0132 (64 %), output 3 x $0.0025 = $0.0075 (36 %).
 */
export const CALLS = 3;
export const TASK = (() => {
  const calls = [callCost("large", full, OUT), callCost("large", full, OUT), callCost("large", full, OUT)];
  const s = sum(calls);
  if (Math.round(s.total * 1e6) !== 20_700) throw new Error(`task should cost $0.0207, got ${s.total}`);
  return { calls, ...s, billShareIn: s.input / s.total, billShareOut: s.output / s.total } as const;
})();

/**
 * The ladder on the refund task, cheapest change first. Each rung keeps the ones before it.
 *   Start:    3 large calls, 2,200 in, 250 out: $0.0207.
 *   Rung 1, shorter prompts (3 chunks, 1,400 in): 3 x (1,400 x $2 + 250 x $10) / 1 M = 3 x $0.0053 = $0.0159.
 *   Rung 2, prompt caching (all three calls share the 1,400-token prompt; call 1 writes, calls 2 and 3 read):
 *     call 1 input 1,400 x $2 x 1.25 = $0.0035; calls 2 and 3 input 1,400 x $2 x 0.1 = $0.00028 each;
 *     input $0.00406 + output 3 x $0.0025 = $0.0075: $0.01156.
 *   Rung 3, routing by step (calls 1 and 2 are lookups on the small model, a tenth of the price; the small model has
 *     its own cache, so call 1 writes and call 2 reads there; call 3 writes the customer's answer on the large model
 *     and is not cached, because it is the only call that reads that prefix on that model):
 *     call 1 small write: 1,400 x $0.2 x 1.25 = $0.00035 in, 250 x $1 = $0.00025 out;
 *     call 2 small read: 1,400 x $0.2 x 0.1 = $0.000028 in, $0.00025 out;
 *     call 3 large, no cache: 1,400 x $2 = $0.0028 in, $0.0025 out; total $0.006178.
 *   Rung 6, a tuned small model for call 3 as well (the ceiling, if it passes the golden set): call 3 on the small
 *     model, no cache: 1,400 x $0.2 = $0.00028 in, $0.00025 out; total $0.001408.
 *   Rungs 4 (batching) and 5 (quantisation) do not apply to this live task: batching is for work that can wait, and
 *   quantisation is for models you host.
 */
export const LADDER = (() => {
  const start = TASK;
  const r1 = sum([callCost("large", short, OUT), callCost("large", short, OUT), callCost("large", short, OUT)]);
  const r2 = sum([
    callCost("large", short, OUT, "write"),
    callCost("large", short, OUT, "read"),
    callCost("large", short, OUT, "read"),
  ]);
  const r3 = sum([
    callCost("small", short, OUT, "write"),
    callCost("small", short, OUT, "read"),
    callCost("large", short, OUT),
  ]);
  const r6 = sum([
    callCost("small", short, OUT, "write"),
    callCost("small", short, OUT, "read"),
    callCost("small", short, OUT),
  ]);
  const check = (name: string, got: number, want: number) => {
    if (Math.round(got * 1e6) !== want) throw new Error(`${name} should be ${want / 1e6}, got ${got}`);
  };
  check("rung 1", r1.total, 15_900);
  check("rung 2", r2.total, 11_560);
  check("rung 3", r3.total, 6_178);
  check("rung 6", r6.total, 1_408);
  const saving = (t: number) => Math.round((1 - t / start.total) * 100);
  return {
    start: { input: start.input, output: start.output, total: start.total },
    r1,
    r2,
    r3,
    r6,
    savingPct: { r1: saving(r1.total), r2: saving(r2.total), r3: saving(r3.total), r6: saving(r6.total) },
    /** Rung 4: the nightly summaries from the batch page, list price against a batch API (50 % off). */
    batch: { list: SUMMARY_JOB.listTotal, batch: SUMMARY_JOB.batchTotal },
    /** Rung 5: an 8 B model's weights, 16-bit against 4-bit: 8 x 10^9 x 2 bytes = 16 GB; x 0.5 byte = 4 GB. */
    weightsGb: { bits16: 16, bits4: 4 },
    /** Rung 6: the fine-tuning set. */
    fineTuneSet: DATASETS.fineTuneSet,
  } as const;
})();

/** Dollars as these figures print them: 0.0207 -> "$0.0207", 0.01156 -> "$0.0116", 0.006178 -> "$0.0062", 1380 -> "$1,380". */
export const usd = (v: number) => {
  if (v >= 1) return `$${v.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
  return `$${v.toFixed(4)}`;
};
