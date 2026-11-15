// Constants and arithmetic for the Capacity Planning & Cost Estimation page only (serving/capacity-*). Imports the
// running example from presets/production.ts and the replica sizing from presets/production-serving.ts, so Brightpost's
// traffic, tokens and "2 replicas + 1 spare at 12 requests/s" are the shared ones. Everything defined here that is not
// derived from those is ILLUSTRATIVE: the user count, the GPU-hour rate and the API prices are round numbers chosen to
// teach, not quotes (GPU rental on specialist clouds sat around $2 to $4 an hour and on the large clouds above $6 in
// sources checked November 2026; API prices change often).

import { TOKENS, TRAFFIC } from "./production";
import { PRICE } from "./production-batch";
import { ROUTE_PRICE } from "./production-routing";
import { SIZING } from "./production-serving";

/**
 * From users to requests (illustrative): 50,000 customers open the chat on a day and make 4 requests each,
 * 50,000 × 4 = 200,000 = TRAFFIC.requestsPerDay.
 */
export const USERS = { perDay: 50_000, requestsEach: 4 } as const;
if (USERS.perDay * USERS.requestsEach !== TRAFFIC.requestsPerDay) {
  throw new Error("production-capacity: users × requests no longer equals the daily requests");
}

const M = 1_000_000;
const DAYS = 30;
const HOURS = 24 * DAYS; // 720

/** One request at the two illustrative API prices ($ per million tokens). Mid-size: $2 in, $10 out. Small: a tenth. */
const perRequest = (p: { inputPerM: number; outputPerM: number }) =>
  (TOKENS.inputPerRequest * p.inputPerM + TOKENS.outputPerRequest * p.outputPerM) / M;
export const API_EACH = { mid: perRequest(PRICE), small: perRequest(ROUTE_PRICE.small) } as const; // 0.0069, 0.00069

/** GPU rental, illustrative: $3 per GPU-hour, so one GPU for a 30-day month = 720 × 3 = $2,160. */
export const GPU = { perHour: 3, hoursPerMonth: HOURS, perMonth: 3 * HOURS } as const;

/**
 * Replicas needed for a daily volume, by the same rule as the serving page: peak = 5 × average; prefill GPU-seconds
 * per request = 35.2 TFLOP ÷ 400 TFLOP/s = 0.088; keep prefill under 60 % of each GPU; one spare; never fewer than 2.
 *   at 200,000 a day: avg 2.31/s, peak 11.57/s, × 0.088 = 1.02 GPU-s/s, ÷ 0.6 = 1.70 → 2, + 1 spare = 3.
 * One more replica for every 0.6 ÷ (5 × 0.088 ÷ 86,400) = 117,818 requests a day.
 */
const PREFILL_S = SIZING.prefillTflopPerRequest / SIZING.sustainedTflops; // 0.088
export const STEP_PER_REPLICA = Math.round((0.6 * TRAFFIC.secondsPerDay) / (TRAFFIC.peakFactor * PREFILL_S)); // 117,818
export const replicasFor = (perDay: number) =>
  Math.max(2, Math.ceil((TRAFFIC.peakFactor * (perDay / TRAFFIC.secondsPerDay) * PREFILL_S) / 0.6 - 1e-9) + 1);

/** Monthly bills at a daily volume. */
export const apiMonth = (perDay: number, each: number) => perDay * DAYS * each;
export const fleetMonth = (perDay: number) => replicasFor(perDay) * GPU.perMonth;

/**
 * Break-even against the mid-size API: the volume where the API bill reaches the fleet's (2 replicas, the minimum):
 * 2 × 2,160 = $4,320 ÷ ($0.0069 × 30 = $0.207 per request-a-day) = 20,870 requests a day.
 */
export const BREAK_EVEN = Math.round((replicasFor(0) * GPU.perMonth) / (DAYS * API_EACH.mid)); // 20,870

/** Brightpost's month on each path. */
export const MONTH = {
  fleetReplicas: replicasFor(TRAFFIC.requestsPerDay), // 3
  fleet: fleetMonth(TRAFFIC.requestsPerDay), // 6,480
  apiMid: apiMonth(TRAFFIC.requestsPerDay, API_EACH.mid), // 41,400
  apiSmall: apiMonth(TRAFFIC.requestsPerDay, API_EACH.small), // 4,140
  gpuHours: replicasFor(TRAFFIC.requestsPerDay) * HOURS, // 2,160
  inputTokens: TOKENS.inputPerDay * DAYS, // 13.2 B
  outputTokens: TOKENS.outputPerDay * DAYS, // 1.5 B
} as const;

if (MONTH.fleetReplicas !== SIZING.replicasAtPeak) {
  throw new Error("production-capacity: fleet size disagrees with the serving page");
}
if (Math.round(MONTH.apiMid) !== 41_400 || MONTH.fleet !== 6_480 || Math.round(MONTH.apiSmall) !== 4_140) {
  throw new Error("production-capacity: monthly bills changed");
}
if (BREAK_EVEN !== 20_870) throw new Error(`production-capacity: break-even should be 20,870, got ${BREAK_EVEN}`);
// The small-tier API never crosses the fleet within the plotted range (up to 700,000 requests a day).
for (let v = 1_000; v <= 700_000; v += 1_000) {
  if (apiMonth(v, API_EACH.small) >= fleetMonth(v)) throw new Error(`small tier crosses the fleet at ${v}`);
}

/** Dollars with thousands separators: "$41,400". */
export const usd0 = (v: number) => `$${Math.round(v).toLocaleString("en-GB")}`;
