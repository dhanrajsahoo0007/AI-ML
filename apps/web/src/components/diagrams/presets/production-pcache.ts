// Constants and arithmetic for the Prompt Caching page (serving/pcache-*.ts and the page's worked example).
// Brightpost's traffic and token counts come from presets/production.ts. Everything below that is not a Brightpost
// constant is either a multiplier quoted from a dated provider page or ILLUSTRATIVE, and is labelled so on the figures.

import { LATENCY, TOKENS, TRAFFIC } from "./production";

/**
 * Brightpost's prompt on this page, with tool definitions added. The 2,200 input tokens of presets/production.ts split
 * into a fixed part and a part that changes on every request:
 *   fixed:   200 instructions + 1,000 tool definitions and refund policy = 1,200 tokens (illustrative sizes);
 *   changes: retrieved articles + the customer's question = 2,200 − 1,200 = 1,000 tokens.
 */
export const PCACHE_PROMPT = {
  instructions: 200,
  tools: 1_000,
  get fixed() {
    return this.instructions + this.tools;
  },
  get changing() {
    return TOKENS.inputPerRequest - this.fixed;
  },
} as const;

/**
 * Price multipliers on the base input price, from Anthropic's prompt-caching docs (checked 2026-11-15): a 5-minute
 * write 1.25×, a 1-hour write 2×, a read 0.1× (0.05× on some newer models). Default lifetime 5 minutes, refreshed by
 * every read. Minimum cacheable length 512 to 4,096 tokens depending on the model.
 */
export const PCACHE_PRICE = {
  write5m: 1.25,
  write1h: 2,
  read: 0.1,
  readCheap: 0.05,
  ttlMinutes: 5,
} as const;

/**
 * Share of requests that miss and write the prefix in a normal day: the 5-minute entry expires overnight, after a
 * deploy that changes the prompt, or on a cold replica (ILLUSTRATIVE: 1 %).
 */
export const MISS_RATE = 0.01;

/**
 * One day, in millions of input-token equivalents (1 token at the base price = 1; price per million cancels out).
 *   Without caching: 200,000 × 2,200 = 440 M.
 *   With caching: writes 2,000 × 1,200 × 1.25 = 3.0 M; reads 198,000 × 1,200 × 0.1 = 23.76 M;
 *     changing part 200,000 × 1,000 = 200 M; total 226.76 M, which is 48 % less.
 *   Broken (a date in line 1, every request writes): 200,000 × 1,200 × 1.25 = 300 M + 200 M = 500 M, 14 % more.
 */
const M = 1_000_000;
const perDay = TRAFFIC.requestsPerDay;
export const PCACHE_DAY = {
  none: (perDay * TOKENS.inputPerRequest) / M,
  missRequests: perDay * MISS_RATE,
  hitRequests: perDay * (1 - MISS_RATE),
  get writes() {
    return (this.missRequests * PCACHE_PROMPT.fixed * PCACHE_PRICE.write5m) / M;
  },
  get reads() {
    return (this.hitRequests * PCACHE_PROMPT.fixed * PCACHE_PRICE.read) / M;
  },
  changing: (perDay * PCACHE_PROMPT.changing) / M,
  get cached() {
    return this.writes + this.reads + this.changing;
  },
  get brokenWrites() {
    return (perDay * PCACHE_PROMPT.fixed * PCACHE_PRICE.write5m) / M;
  },
  get broken() {
    return this.brokenWrites + this.changing;
  },
} as const;

/**
 * First token. Prefill costs 0.04 ms per token (presets/production-lb.ts, illustrative): the 2,200-token prompt takes
 * 88 ms of the 400 ms; the other 312 ms is queueing and the network. A hit prefills only the changing 1,000 tokens:
 * 1,000 × 0.04 = 40 ms, so the first token is at 312 + 40 = 352 ms.
 */
export const PCACHE_TTFT = {
  msPerToken: 88 / TOKENS.inputPerRequest,
  get prefillFull() {
    return TOKENS.inputPerRequest * this.msPerToken;
  },
  get other() {
    return LATENCY.firstTokenMs - this.prefillFull;
  },
  get prefillCached() {
    return PCACHE_PROMPT.changing * this.msPerToken;
  },
  get firstTokenCached() {
    return this.other + this.prefillCached;
  },
} as const;
