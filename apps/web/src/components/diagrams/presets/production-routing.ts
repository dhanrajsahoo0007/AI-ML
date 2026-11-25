// Constants and arithmetic for the Multi-Model Routing & Fallbacks page only (serving/route-*). Imports the running
// example from presets/production.ts, so traffic and tokens per request are the shared ones. Everything defined
// here that is not derived from those constants is ILLUSTRATIVE: the share of easy questions, the small model's
// price and the breaker settings are round numbers chosen to teach, not measurements of any product.
//
// Research facts the page relies on (checked November 2026, cited under Further reading):
//   RouteLLM (Ong et al., arXiv 2406.18665): routers choose between a strong and a weak model, trained on human
//     preference data; four router types (similarity-weighted ranking, matrix factorisation, BERT classifier,
//     causal-LLM classifier); on MT Bench 3.66x cheaper than a random router at 95 % of GPT-4 quality.
//   FrugalGPT (Chen, Zaharia, Zou, arXiv 2305.05176): an LLM cascade with a learned scoring function; matches the
//     best single model with up to 98 % lower cost, or beats GPT-4 by 4 % at the same cost.

import { DATASETS, TOKENS, TRAFFIC } from "./production";
import { PRICE } from "./production-batch";

/**
 * Illustrative prices, US dollars per million tokens. The large model uses the track's shared list price
 * (production-batch PRICE: $2 in, $10 out); the small model costs a tenth of it (illustrative).
 */
export const ROUTE_PRICE = {
  large: { inputPerM: PRICE.inputPerM, outputPerM: PRICE.outputPerM },
  small: { inputPerM: PRICE.inputPerM / 10, outputPerM: PRICE.outputPerM / 10 },
} as const;

const M = 1_000_000;
const perRequest = (p: { inputPerM: number; outputPerM: number }) =>
  (TOKENS.inputPerRequest * p.inputPerM + TOKENS.outputPerRequest * p.outputPerM) / M;

/**
 * Share of Brightpost's questions that are easy (opening hours, order status, "where is my parcel"): 70 %
 * (illustrative). On the 200-ticket golden set that is 140 easy and 60 hard tickets.
 *
 * Working:
 *   one request, large: 2,200 × $2 ÷ 1 M + 250 × $10 ÷ 1 M = $0.0044 + $0.0025 = $0.0069;
 *   one request, small: a tenth, $0.00069;
 *   a day, all on large: 200,000 × $0.0069 = $1,380;
 *   a day, routed: 140,000 × $0.00069 = $96.60 on small + 60,000 × $0.0069 = $414 on large = $510.60;
 *   saving $1,380 − $510.60 = $869.40 a day, 869.40 ÷ 1,380 = 63 %; over 30 days $26,082.
 * The router's own cost is left out: a small classifier adds well under 1 % of the saving.
 */
export const ROUTING = (() => {
  const easyShare = 0.7;
  const perDay = TRAFFIC.requestsPerDay;
  const easy = Math.round(perDay * easyShare);
  const hard = perDay - easy;
  const largeEach = perRequest(ROUTE_PRICE.large);
  const smallEach = perRequest(ROUTE_PRICE.small);
  const allLarge = perDay * largeEach;
  const smallPart = easy * smallEach;
  const largePart = hard * largeEach;
  const routed = smallPart + largePart;
  const saving = allLarge - routed;
  const savingPct = Math.round((saving / allLarge) * 100);
  const goldenEasy = Math.round(DATASETS.goldenSet * easyShare);
  if (Math.round(allLarge) !== 1380) throw new Error(`all-large day should be $1,380, got ${allLarge}`);
  if (Math.round(routed * 100) !== 51060) throw new Error(`routed day should be $510.60, got ${routed}`);
  if (savingPct !== 63) throw new Error(`routing should save 63 %, got ${savingPct} %`);
  return {
    easyShare,
    easy,
    hard,
    goldenEasy,
    goldenHard: DATASETS.goldenSet - goldenEasy,
    largeEach,
    smallEach,
    allLarge,
    smallPart,
    largePart,
    routed,
    saving,
    savingPct,
    savingPerMonth: saving * 30,
    /** Hard requests the router wrongly sends to the small model if it misses 10 % of them (illustrative). */
    missRate: 0.1,
    missedPerDay: Math.round(hard * 0.1),
  } as const;
})();

/** Dollars as the figures print them: 1380 → "$1,380", 96.6 → "$96.60", 414 → "$414", 0.00069 → "$0.00069". */
export const usd = (v: number) => {
  const cents = Math.round(v * 100) / 100;
  if (v >= 1) {
    const whole = Number.isInteger(cents);
    return `$${cents.toLocaleString("en-GB", { minimumFractionDigits: whole ? 0 : 2 })}`;
  }
  return `$${Number(v.toPrecision(2))}`;
};

/**
 * Circuit-breaker settings (illustrative; the states and transitions are the standard pattern).
 *   Trip: at least 10 calls in the window and half of the last 20 failed (failure = 429, 5xx or no first token
 *   within 2 s).
 *   Open: 30 s, the same cooldown as the gateway-fallback figure; every request goes straight to the fallback.
 *   Half-open: let 3 probe requests through, one at a time. All 3 succeed: closed. Any fails: open for another 30 s.
 *   Saving: at the 12 requests/s peak, 30 s open sends 12 × 30 = 360 requests straight to B (0.4 s to first token)
 *   instead of through A's 3.45 s detour: 360 × 3.05 s = 1,098 s of waiting avoided.
 */
export const BREAKER = (() => {
  const window = 20;
  const failuresToTrip = 10;
  const minCalls = 10;
  const openS = 30;
  const probes = 3;
  const detourMs = 3_050;
  const requestsWhileOpen = TRAFFIC.peakPerSecond * openS;
  return {
    window,
    failuresToTrip,
    minCalls,
    openS,
    probes,
    requestsWhileOpen,
    detourMs,
    waitAvoidedS: (requestsWhileOpen * detourMs) / 1000,
  } as const;
})();
