// Constants and arithmetic for the Automated Regression Testing page (eval/regress-*.ts). Brightpost's numbers come
// from presets/production.ts and production-release.ts. Pass counts and run-to-run counts are ILLUSTRATIVE and are
// labelled so on the figures; everything derived from them is computed here.

import { DATASETS, TOKENS } from "./production";
import { EVAL_RUN, QUALITY } from "./production-release";

/**
 * The live prompt p11 is run five times on the 200-ticket golden set at temperature above zero. Pass counts (illustrative):
 *   177, 181, 180, 183, 179. Sum 900, mean 180 (90 %, QUALITY.baseline).
 *   Squared deviations 9, 1, 0, 9, 1 = 20; sample variance 20 ÷ 4 = 5; sd = sqrt(5) = 2.236 cases.
 *   Noise band = mean ± 2 sd = 180 ± 4.47 = 175.5 to 184.5 cases, or ± 2.2 points (4.47 ÷ 200).
 *   Two runs of one prompt disagree on about 2 × variance = 10 cases (each unstable case with pass chance p
 *   contributes 2p(1 − p) to that, and p(1 − p) adds up to the variance 5).
 */
export const NOISE_RUNS = [177, 181, 180, 183, 179] as const;
export const NOISE_K = NOISE_RUNS.length;
export const NOISE_MEAN = NOISE_RUNS.reduce((a, v) => a + v, 0) / NOISE_K;
export const NOISE_VAR = NOISE_RUNS.reduce((a, v) => a + (v - NOISE_MEAN) ** 2, 0) / (NOISE_K - 1);
export const NOISE_SD = Math.sqrt(NOISE_VAR);
export const BAND = { low: NOISE_MEAN - 2 * NOISE_SD, high: NOISE_MEAN + 2 * NOISE_SD, half: 2 * NOISE_SD } as const;
export const BAND_POINTS = BAND.half / DATASETS.goldenSet;
export const NOISE_FLIPS = Math.round(2 * NOISE_VAR);

/**
 * Candidate p12 against baseline p11, case by case (illustrative). Baseline passes 180; p12 passes 184 (EVAL_RUN.goodPass).
 *   fixed 10 (fail → pass), broken 6 (pass → fail), both pass 174, both fail 10.
 *   174 + 6 = 180 baseline passes; 174 + 10 = 184 candidate passes; 174 + 10 + 10 + 6 = 200.
 *   Net change +4 cases = +2 points; cases that changed: 10 + 6 = 16; unchanged 184.
 */
export const FLIPS = { bothPass: 174, bothFail: 10, fixed: 10, broken: 6 } as const;
export const FLIPS_TOTAL = FLIPS.bothPass + FLIPS.bothFail + FLIPS.fixed + FLIPS.broken;
export const FLIPS_BASE_PASS = FLIPS.bothPass + FLIPS.broken;
export const FLIPS_CAND_PASS = FLIPS.bothPass + FLIPS.fixed;
export const FLIPS_NET = FLIPS_CAND_PASS - FLIPS_BASE_PASS;
export const FLIPS_CHANGED = FLIPS.fixed + FLIPS.broken;
export const FLIPS_UNCHANGED = FLIPS.bothPass + FLIPS.bothFail;
if (FLIPS_TOTAL !== DATASETS.goldenSet) throw new Error(`flips sum to ${FLIPS_TOTAL}`);
if (FLIPS_BASE_PASS !== NOISE_MEAN) throw new Error("baseline pass count must equal the noise mean");
if (FLIPS_CAND_PASS !== EVAL_RUN.goodPass) throw new Error("candidate must score EVAL_RUN.goodPass");

/** Cost of k runs: k × 440,000 input tokens, as a share of a day's 440 M. k = 5: 2,200,000 = 0.5 %. */
export const KRUN_INPUT = NOISE_K * EVAL_RUN.inputTokens;
export const KRUN_SHARE = KRUN_INPUT / TOKENS.inputPerDay;

/** The gate: absolute floor, no drop beyond the band, and zero broken must-pass cases (12 refund-limit cases). */
export const GATE = {
  floorPass: EVAL_RUN.floorPass,
  mustPass: 12,
  floorPct: QUALITY.floor,
  badPass: EVAL_RUN.badPass,
  badDrop: EVAL_RUN.badPass - NOISE_MEAN,
} as const;
export const TOKENS_PER_TICKET = TOKENS.inputPerRequest + TOKENS.outputPerRequest;
