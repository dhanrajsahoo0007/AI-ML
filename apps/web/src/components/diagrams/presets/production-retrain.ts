// Constants and arithmetic for the Automated Retraining & Fine-Tuning page only (finetune/retrain-*, champion-*,
// forgetting-*). Brightpost's set sizes, floor and canary numbers come from presets/production.ts and
// presets/production-release.ts; everything else here is ILLUSTRATIVE and labelled so on the figures.

import { CT, QUALITY, CANARY, EVAL_RUN, halfWidth } from "./production-release";

/**
 * One retraining run. The trigger is 1,000 newly resolved tickets (CT.newTickets). Curation (PII removed, near
 * duplicates dropped, routine intents capped, golden set out) keeps 700 of them (illustrative). To limit forgetting the
 * run mixes in 700 replayed tickets from the old training set (1 : 1): 700 + 700 = 1,400 examples.
 */
export const RUN = { newTickets: CT.newTickets, kept: 700, replay: 700 } as const;
export const RUN_TOTAL = RUN.kept + RUN.replay;
export const RUN_KEPT_SHARE = RUN.kept / RUN.newTickets;

/**
 * The gate. The new-data golden set is the 200-ticket golden set (floor 85 % = 170 passes, EVAL_RUN.floorPass). The old
 * suite is 120 cases from earlier incidents and older capabilities, frozen (illustrative). The champion passes 114 of
 * 120 = 95 %. Rule: a candidate may fall at most 2 points below the champion on the old suite, so the floor is
 * 0.95 − 0.02 = 0.93 × 120 = 111.6, rounded up to 112 passes.
 *   Candidate A (new data only): golden 188 of 200 = 94 %; old suite 99 of 120 = 82.5 % → below 112 → block.
 *   Candidate B (new data + replay): golden 184 of 200 = 92 % (EVAL_RUN.goodPass); old suite 113 of 120 = 94.2 % → promote.
 */
export const OLD_SUITE = { size: 120, championPass: 114, maxDrop: 0.02 } as const;
export const OLD_FLOOR = Math.ceil(
  (OLD_SUITE.championPass / OLD_SUITE.size - OLD_SUITE.maxDrop) * OLD_SUITE.size - 1e-9
);
export const CAND_A = { golden: 188, old: 99 } as const;
export const CAND_B = { golden: EVAL_RUN.goodPass, old: 113 } as const;
export const pc = (num: number, den: number, d = 1) => `${((num / den) * 100).toFixed(d)} %`;

/**
 * Champion and challenger at the 10 % canary stage (release preset CANARY[1]): 828 requests an hour, 200 graded, 178
 * pass = 89 %, 95 % interval ±4.3 points = [84.7, 93.3], which includes the 85 % floor: the check cannot rule a drop out,
 * so the next stage is 50 %. The champion's pass rate is the 90 % baseline.
 */
export const CHALLENGER = CANARY[1];
export const CHALLENGER_RATE = CHALLENGER.pass / CHALLENGER.graded;
export const CHALLENGER_HALF = halfWidth(CHALLENGER.pass, CHALLENGER.graded);
export const CHALLENGER_LOW = CHALLENGER_RATE - CHALLENGER_HALF;
export const CHALLENGER_HIGH = CHALLENGER_RATE + CHALLENGER_HALF;
export { QUALITY, CANARY, EVAL_RUN };
