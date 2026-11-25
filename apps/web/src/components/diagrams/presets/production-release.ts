// Constants and arithmetic for the Rollback & Blue-Green Deployment page and the CI/CD/CT page
// (serving/canary-gates.ts, release-bundle.ts, llmops/pipeline-stages.ts, ct-triggers.ts). Brightpost's numbers come
// from presets/production.ts; this file only derives from them. Everything that is not a Brightpost constant is
// ILLUSTRATIVE and labelled so on the figures.

import { DATASETS, TOKENS, TRAFFIC } from "./production";

// ── Quality rule ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The live bundle passes 90 % of graded answers (illustrative). A candidate may score at most 5 points lower, so the
 * floor is 85 %. The same floor is used by the golden-set gate, the canary gate and the drift alarm, so a number that
 * appears in two figures comes from here.
 */
export const QUALITY = { baseline: 0.9, maxDrop: 0.05, floor: 0.85 } as const;

/** Half-width of the 95 % normal-approximation interval for a pass rate: 1.96 × sqrt(p (1 − p) / n). */
export const halfWidth = (pass: number, graded: number) => {
  const p = pass / graded;
  return 1.96 * Math.sqrt((p * (1 - p)) / graded);
};

export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)} %`;

// ── Canary stages ────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Each stage soaks for one hour at the average rate: 2.3 requests/s × 3,600 s = 8,280 requests an hour.
 *   1 % → 83 requests · 10 % → 828 · 50 % → 4,140.
 * A judge grades a sample of the candidate's answers (illustrative sizes grow with the traffic): 50, 200, 500.
 * Graded passes (illustrative): 46 of 50 = 92 %, 178 of 200 = 89 %, 405 of 500 = 81 %.
 *   Intervals (95 %): ±7.5, ±4.3, ±3.4 points. At 10 % the interval [84.7, 93.3] still contains the 85 % floor, so
 *   the check cannot rule a regression out; at 50 % the upper end is 84.4 %, below the floor, so it blocks.
 * Latency check: p95 time to first token must stay under LATENCY.firstTokenMs (400 ms). The candidate measures
 * 360, 372 and 381 ms (illustrative): every latency check passes, which is the point of the figure.
 */
export const HOURLY_REQUESTS = TRAFFIC.averagePerSecond * 3600;
export const CANARY = [
  { share: 0.01, graded: 50, pass: 46, p95Ms: 360 },
  { share: 0.1, graded: 200, pass: 178, p95Ms: 372 },
  { share: 0.5, graded: 500, pass: 405, p95Ms: 381 },
] as const;
export const stageRequests = (share: number) => Math.round(HOURLY_REQUESTS * share);

// ── The release bundle ───────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Bundle 41 is live; bundle 42 is the candidate. Four of five parts change (guardrails stay at g5). Version labels
 * are Brightpost's own and invented for the figure.
 */
export const BUNDLE_PARTS = ["model", "prompt", "index", "guardrails", "tools"] as const;
export type BundlePart = (typeof BUNDLE_PARTS)[number];
export const BUNDLE = {
  41: { model: "m6", prompt: "p11", index: "i30", guardrails: "g5", tools: "t7" },
  42: { model: "m7", prompt: "p12", index: "i31", guardrails: "g5", tools: "t8" },
} as const;

// ── The pipeline ─────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Evaluation suite on the golden set: 200 tickets. One run sends 200 × 2,200 = 440,000 input tokens and
 * 200 × 250 = 50,000 output tokens to the candidate (the judge's tokens come on top). A day of live traffic is
 * 440,000,000 input tokens, so one run is 440,000 ÷ 440,000,000 = 0.1 % of a day's input.
 * Passing change: 184 of 200 = 92 %. Failing change (prompt p13): 164 of 200 = 82 %. Floor 85 % = 170 of 200.
 */
export const EVAL_RUN = {
  tickets: DATASETS.goldenSet,
  inputTokens: DATASETS.goldenSet * TOKENS.inputPerRequest,
  outputTokens: DATASETS.goldenSet * TOKENS.outputPerRequest,
  floorPass: Math.round(DATASETS.goldenSet * QUALITY.floor),
  goodPass: 184,
  badPass: 164,
  shareOfDay: (DATASETS.goldenSet * TOKENS.inputPerRequest) / TOKENS.inputPerDay,
} as const;

// ── Continuous training triggers ─────────────────────────────────────────────────────────────────────────────────────

/**
 * Schedule: the first of each month (12 runs a year). Drift alarm: a weekly sample of 200 live answers is graded;
 * 166 pass = 83 %, below the 85 % floor, so the alarm fires. New labelled data: 1,000 resolved tickets is 20 % of the
 * 5,000-ticket fine-tuning set (1,000 ÷ 5,000); the counter has just reached it. Guard: at most one run in 7 days, and no new run
 * while one is in flight.
 */
export const CT = {
  scheduleRunsPerYear: 12,
  sampleSize: 200,
  samplePass: 166,
  newTickets: 1_000,
  ticketThreshold: 1_000,
  thresholdShareOfSet: 1_000 / DATASETS.fineTuneSet,
  minDaysBetweenRuns: 7,
} as const;
