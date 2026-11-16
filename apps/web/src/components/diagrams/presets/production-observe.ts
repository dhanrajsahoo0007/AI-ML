// Constants and arithmetic for the three observability pages (tracing-logging, latency-token-monitoring,
// cost-tracking-attribution; specs in assets/diagrams/animated/llmops/). Imports the running example from
// presets/production.ts, so a shared Brightpost number (traffic, tokens per request, the 400 ms first token, the
// 1,500 ms answer) is the shared one. Everything else defined here is ILLUSTRATIVE: span timings other than the model
// call, the share of slow requests, the latency spread, prices, resolution rates and the cost of a human reply are
// round numbers chosen to teach, not measurements of any product.

import { LATENCY, TOKENS, TRAFFIC } from "./production";
import { PRICE } from "./production-batch";

const M = 1_000_000;

// ── Tracing ──────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * One Brightpost request as spans, in order. Only the model call is the shared number (the 1,500 ms answer of
 * LATENCY, whose first token comes 400 ms after the call starts); the others are illustrative.
 *   gateway 0-15, cache lookup 15-35, retrieval 35-135, model call 135-1,635, guardrail 1,635-1,695.
 *   Total = 15 + 20 + 100 + 1,500 + 60 = 1,695 ms. The model call is 1,500 ÷ 1,695 = 88.5 % of it.
 *   The customer's first token: 135 + 400 = 535 ms.
 */
export const TRACE = (() => {
  const gateway = { startMs: 0, durationMs: 15 };
  const cache = { startMs: gateway.startMs + gateway.durationMs, durationMs: 20 };
  const retrieval = { startMs: cache.startMs + cache.durationMs, durationMs: 100 };
  const model = { startMs: retrieval.startMs + retrieval.durationMs, durationMs: LATENCY.fullAnswerMs };
  const guardrail = { startMs: model.startMs + model.durationMs, durationMs: 60 };
  const totalMs = guardrail.startMs + guardrail.durationMs;
  return {
    gateway,
    cache,
    retrieval,
    model,
    guardrail,
    totalMs,
    firstTokenMs: model.startMs + LATENCY.firstTokenMs,
    modelShare: model.durationMs / totalMs,
  } as const;
})();

/**
 * Sampling. 200,000 requests a day; 2 % are slow or failed (4,000, illustrative); the rest are ordinary (196,000).
 *   Head sampling keeps 1 % of requests chosen at the first span, before the outcome is known:
 *     2,000 kept in all, 40 of the 4,000 interesting ones and 1,960 ordinary.
 *   Tail sampling keeps every slow or failed trace and 1 % of the ordinary ones, decided when the trace is complete:
 *     4,000 + 1,960 = 5,960 kept, 2.98 % of the day.
 */
export const SAMPLING = (() => {
  const perDay = TRAFFIC.requestsPerDay;
  const interesting = perDay * 0.02;
  const ordinary = perDay - interesting;
  const rate = 0.01;
  const head = { interesting: interesting * rate, ordinary: ordinary * rate };
  const tail = { interesting, ordinary: ordinary * rate };
  return { perDay, interesting, ordinary, rate, head, tail } as const;
})();

// ── Latency distribution ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * End-to-end latency as a log-normal distribution (latencies are positive and skewed to the right): median 1,500 ms
 * (LATENCY.fullAnswerMs) and a spread sigma = 0.5 (illustrative). With z = 1.6449 for the 95th and 2.3263 for the 99th
 * percentile of a standard normal:
 *   p50 = 1,500 · e^0 = 1,500 ms;  p95 = 1,500 · e^(1.6449 × 0.5) = 3,414 ms;  p99 = 1,500 · e^(2.3263 × 0.5) = 4,800 ms.
 *   mean = 1,500 · e^(0.5² / 2) = 1,500 · 1.1331 = 1,700 ms (it sits 13 % above the median and 65 % under the p99).
 *   Of 200,000 requests a day, 5 % = 10,000 take longer than p95 and 1 % = 2,000 longer than p99.
 */
export const DIST = (() => {
  const median = LATENCY.fullAnswerMs;
  const sigma = 0.5;
  const z95 = 1.6449;
  const z99 = 2.3263;
  const q = (z: number) => median * Math.exp(z * sigma);
  const pdf = (x: number) =>
    Math.exp(-(Math.log(x / median) ** 2 / (2 * sigma * sigma))) / (x * sigma * Math.sqrt(2 * Math.PI));
  return {
    median,
    sigma,
    p50: median,
    p95: Math.round(q(z95)),
    p99: Math.round(q(z99)),
    mean: Math.round(median * Math.exp((sigma * sigma) / 2)),
    pdf,
    slowerThanP95: TRAFFIC.requestsPerDay * 0.05,
    slowerThanP99: TRAFFIC.requestsPerDay * 0.01,
  } as const;
})();

/** Decode speed a reader sees: 1,000 ms ÷ 4.4 ms per token = 227 tokens per second. */
export const TPS = Math.round(1000 / LATENCY.decodeMsPerToken);

// ── Tokens ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * One reasoning-on request (illustrative split of the shared sizes): 2,200 input tokens, of which 1,000 are a cached
 * prefix read from the provider's cache; 310 output tokens, of which 60 are reasoning and 250 the visible answer.
 * Cost at the shared illustrative price ($2 in, $10 out per million) and a cache read at 0.1 x the input price:
 *   uncached input 1,200 × $2 ÷ 1 M = $0.0024;  cached input 1,000 × $0.2 ÷ 1 M = $0.0002;
 *   visible output 250 × $10 ÷ 1 M = $0.0025;   reasoning 60 × $10 ÷ 1 M = $0.0006;   total $0.0057.
 */
export const USAGE = (() => {
  const cached = 1_000;
  const uncached = TOKENS.inputPerRequest - cached;
  const visible = TOKENS.outputPerRequest;
  const reasoning = 60;
  const cacheReadX = 0.1;
  const cost = {
    uncached: (uncached * PRICE.inputPerM) / M,
    cached: (cached * PRICE.inputPerM * cacheReadX) / M,
    visible: (visible * PRICE.outputPerM) / M,
    reasoning: (reasoning * PRICE.outputPerM) / M,
  };
  const total = cost.uncached + cost.cached + cost.visible + cost.reasoning;
  if (Math.round(total * 1e4) !== 57) throw new Error(`usage should cost $0.0057, got ${total}`);
  return {
    input: TOKENS.inputPerRequest,
    cached,
    uncached,
    visible,
    reasoning,
    output: visible + reasoning,
    cacheReadX,
    cost,
    total,
  } as const;
})();

// ── Cost ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Dollars for tokens at the shared illustrative price. */
export const dollars = (inputTokens: number, outputTokens: number) =>
  (inputTokens * PRICE.inputPerM + outputTokens * PRICE.outputPerM) / M;

/**
 * Brightpost's day by team and feature (list price, illustrative).
 *   Support: 200,000 requests × $0.0069 = $1,380. Split by feature: order questions 120,000 requests = $828; returns
 *     and refunds 80,000 requests = $552.
 *   Catalogue writer: 16 M in + 8 M out = 16 × $2 + 8 × $10 = $112.
 *   Labs: the gateway lets 30 M of the 45 M tokens it asked for through, in the asked mix (40 : 5):
 *     26.67 M in × $2 + 3.33 M out × $10 = $53.33 + $33.33 = $86.67.
 *   Total = 1,380 + 112 + 86.67 = $1,578.67, written "about $1,579".
 */
export const COST_DAY = (() => {
  const perRequest = dollars(TOKENS.inputPerRequest, TOKENS.outputPerRequest);
  const orders = 120_000;
  const returns = 80_000;
  const support = TRAFFIC.requestsPerDay * perRequest;
  const catalogue = dollars(16 * M, 8 * M);
  const labs = dollars((30 * M * 40) / 45, (30 * M * 5) / 45);
  const total = support + catalogue + labs;
  if (Math.round(support) !== 1_380 || Math.round(catalogue) !== 112 || Math.round(total) !== 1_579) {
    throw new Error(`cost day off: ${support} ${catalogue} ${labs} ${total}`);
  }
  return {
    perRequest,
    support,
    catalogue,
    labs,
    total,
    orders: { requests: orders, cost: orders * perRequest },
    returns: { requests: returns, cost: returns * perRequest },
  } as const;
})();

/**
 * Cost per outcome. 200,000 requests a day are 125,000 tickets (1.6 requests per ticket). Option A is the large model
 * at $0.0069 a request; option B is a model a tenth of the price, $0.00069 (the routing page's ratio). A resolves 70 %
 * of tickets without a person, B 55 %. A ticket the assistant does not resolve goes to a person at $4 (all
 * illustrative).
 *   A: LLM $1,380 a day. Resolved 87,500 → $1,380 ÷ 87,500 = $0.01577 per resolved ticket.
 *      Handed on 37,500 × $4 = $150,000. All-in per ticket = (1,380 + 150,000) ÷ 125,000 = $1.211.
 *   B: LLM $138. Resolved 68,750 → $0.00201 per resolved ticket.
 *      Handed on 56,250 × $4 = $225,000. All-in per ticket = (138 + 225,000) ÷ 125,000 = $1.801.
 */
export const OUTCOME = (() => {
  const tickets = 125_000;
  const humanCost = 4;
  const make = (perRequest: number, resolveRate: number) => {
    const llm = TRAFFIC.requestsPerDay * perRequest;
    const resolved = tickets * resolveRate;
    const handed = tickets - resolved;
    const human = handed * humanCost;
    return {
      perRequest,
      resolveRate,
      llm,
      resolved,
      handed,
      human,
      perResolved: llm / resolved,
      llmPerTicket: llm / tickets,
      humanPerTicket: human / tickets,
      allIn: (llm + human) / tickets,
    };
  };
  const a = make(COST_DAY.perRequest, 0.7);
  const b = make(COST_DAY.perRequest / 10, 0.55);
  if (Math.round(a.allIn * 1000) !== 1211 || Math.round(b.allIn * 1000) !== 1801) throw new Error("outcome off");
  return { tickets, humanCost, a, b } as const;
})();

/**
 * A monthly budget for the support key (illustrative): $45,000, alerts at 50 %, 80 % and 100 %.
 * A normal day costs $1,380 (COST_DAY.support). A loop bug adds $3,000 a day from day 21.
 *   Day 20: 20 × 1,380 = $27,600 (61 %).  From day 21 a day costs 1,380 + 3,000 = $4,380.
 *   Day 22: 27,600 + 2 × 4,380 = $36,360 (80.8 %): the 80 % line ($36,000) was crossed that day.
 *   Day 24: 27,600 + 4 × 4,380 = $45,120: the cap ($45,000) is reached during day 24.
 *   Day 10: 10 × 1,380 = $13,800 (30.7 %); the forecast for the month is 30 × 1,380 = $41,400 (92 %).
 */
export const BUDGET = (() => {
  const monthly = 45_000;
  const perDay = COST_DAY.support;
  const leak = 3_000;
  const spent = (day: number) => perDay * Math.min(day, 20) + (perDay + leak) * Math.max(0, day - 20);
  return {
    monthly,
    perDay,
    leak,
    thresholds: [0.5, 0.8, 1] as const,
    spent,
    forecast: perDay * 30,
  } as const;
})();
