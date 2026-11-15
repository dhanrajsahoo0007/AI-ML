// Constants and arithmetic for the Online / Production Evaluation page (eval/online-*.ts). Brightpost's numbers come from
// presets/production.ts and production-eval.ts and production-release.ts. Prices, pass counts, the rare-failure rate
// and the check latency are ILLUSTRATIVE and labelled so on the figures; everything derived is computed here.

import { DATASETS, LATENCY, TOKENS, TRAFFIC } from "./production";
import { GRADER } from "./production-eval";
import { QUALITY, halfWidth } from "./production-release";

/**
 * Sampling. 5 % of 200,000 requests a day = 10,000 judged a day. Per hour at the average rate: 2.3 × 3,600 = 8,280
 * requests, 5 % = 414 judged. Judge input per grade is 2,200 + 250 = 2,450 tokens (GRADER), so a day is
 * 10,000 × 2,450 = 24,500,000 input tokens, 24.5 M ÷ 440 M = 5.6 % of a day's live input. At the illustrative prices
 * of GRADER ($3 and $15 per million tokens) one grade costs about $0.00885, so a day costs 10,000 × 0.00885 = $88.50.
 */
export const SAMPLE_RATE = 0.05;
export const SAMPLED_PER_DAY = TRAFFIC.requestsPerDay * SAMPLE_RATE;
export const HOURLY_REQUESTS = TRAFFIC.averagePerSecond * 3600;
export const SAMPLED_PER_HOUR = Math.round(HOURLY_REQUESTS * SAMPLE_RATE);
export const JUDGE_INPUT_PER_DAY = SAMPLED_PER_DAY * GRADER.judgeInputTokens;
export const JUDGE_SHARE_OF_DAY = JUDGE_INPUT_PER_DAY / TOKENS.inputPerDay;
export const JUDGE_COST_PER_DAY = SAMPLED_PER_DAY * GRADER.judgeCost;

/**
 * Precision of a pass rate from a sample. At a 90 % pass rate (QUALITY.baseline):
 *   one day, 10,000 graded: 1.96 × sqrt(0.9 × 0.1 ÷ 10,000) = ± 0.59 points;
 *   one hour, 414 graded: 1.96 × sqrt(0.9 × 0.1 ÷ 414) = ± 2.9 points.
 * An alarm day (illustrative): 8,350 of 10,000 pass = 83.5 %, ± 0.73 points, so the range is 82.8 to 84.2 %, wholly under
 * the 85 % floor: the alert fires with confidence.
 */
export const HALF_DAY = halfWidth(QUALITY.baseline * SAMPLED_PER_DAY, SAMPLED_PER_DAY) * 100;
export const HALF_HOUR = halfWidth(QUALITY.baseline * SAMPLED_PER_HOUR, SAMPLED_PER_HOUR) * 100;
export const ALARM = { graded: SAMPLED_PER_DAY, pass: 8_350 } as const;
export const ALARM_RATE = (ALARM.pass / ALARM.graded) * 100;
export const ALARM_HALF = halfWidth(ALARM.pass, ALARM.graded) * 100;

/**
 * A rare failure (illustrative): 1 request in 5,000. Per day 200,000 ÷ 5,000 = 40 happen; the 5 % sample holds
 * 40 × 0.05 = 2 of them. The 200-ticket golden set expects 200 ÷ 5,000 = 0.04 of such a case.
 */
export const RARE = { oneIn: 5_000 } as const;
export const RARE_PER_DAY = TRAFFIC.requestsPerDay / RARE.oneIn;
export const RARE_IN_SAMPLE = RARE_PER_DAY * SAMPLE_RATE;
export const RARE_IN_GOLDEN = DATASETS.goldenSet / RARE.oneIn;

/**
 * Blocking against observing. A blocking output check adds its own time to every request: 50 ms (illustrative, as on the
 * guardrails page); a model judge is a full model call (about 2 s, illustrative), longer than the 1,500 ms answer
 * budget, so it cannot sit on the request path. A sampled judge adds 0 ms to the customer and reports within minutes.
 */
export const CHECK_MS = 50;
export const JUDGE_MS = 2_000;
export const ANSWER_BUDGET_MS = LATENCY.fullAnswerMs;
