// Constants and arithmetic for the LLM-as-Judge page (eval/judge-*.ts and the page's worked example). Brightpost's
// numbers come from presets/production.ts. Counts marked ILLUSTRATIVE are not measured data; figures from the MT-Bench
// paper (Zheng et al., 2023, arXiv 2306.05685) are quoted with their table and checked against the paper on 2026-11-15.

import { DATASETS, accuracy, cohensKappa, precision, recall } from "./production";

/**
 * Judge against human on the 200-ticket golden set (ILLUSTRATIVE counts). Rows are the human verdict, columns the
 * judge's, both fail first (the positive class is a failing answer, the one we need to catch):
 *   human fail  60 = 46 judge fail + 14 judge pass (missed failures);
 *   human pass 140 = 10 judge fail (false alarms) + 130 judge pass.
 *   Agreement pₒ = (46 + 130) ÷ 200 = 0.88.
 *   Chance agreement pₑ = (60 × 56 + 140 × 144) ÷ 200² = (3,360 + 20,160) ÷ 40,000 = 0.588.
 *   Cohen's κ = (0.88 − 0.588) ÷ (1 − 0.588) = 0.292 ÷ 0.412 = 0.709.
 *   Failures caught (recall on fail) = 46 ÷ 60 = 0.767; precision of a fail verdict = 46 ÷ 56 = 0.821.
 * The human column of this table is the adjudicated label set built on the human-evaluation page (60 fail, 140 pass).
 */
export const JUDGE_GRID = [
  [46, 14],
  [10, 130],
];
const sum = JUDGE_GRID.flat().reduce((a, v) => a + v, 0);
if (sum !== DATASETS.goldenSet) throw new Error(`judge grid sums to ${sum}, not ${DATASETS.goldenSet}`);
export const JUDGE_STATS = {
  agreement: accuracy(JUDGE_GRID),
  kappa: cohensKappa(JUDGE_GRID),
  caught: recall(JUDGE_GRID),
  precisionFail: precision(JUDGE_GRID),
  humanFail: JUDGE_GRID[0][0] + JUDGE_GRID[0][1],
  humanPass: JUDGE_GRID[1][0] + JUDGE_GRID[1][1],
} as const;

/**
 * A lazy judge that says "pass" to everything: agreement = 140 ÷ 200 = 0.70 and chance agreement is also 0.70, so
 * κ = (0.70 − 0.70) ÷ 0.30 = 0. Agreement alone flatters a judge on an imbalanced set; kappa does not.
 */
export const LAZY_JUDGE = [
  [0, JUDGE_STATS.humanFail],
  [0, JUDGE_STATS.humanPass],
];

/**
 * Position bias, Zheng et al. 2023, Table 2 ("default" prompt): share of pairs where the judge preferred the
 * first position. GPT-4 30.0 %, GPT-3.5 50.0 %, Claude-v1 75.0 %. (Consistent in both orders: 65.0, 46.2, 23.8 %.)
 * Verbosity, Table 3 ("repetitive list" attack on 23 answers): failure rate Claude-v1 91.3 %, GPT-3.5 91.3 %,
 * GPT-4 8.7 %. Self-enhancement, §3.3 and Figure 2b: GPT-4 wins about 10 points more often for its own answers,
 * Claude-v1 about 25 points; GPT-3.5 shows none; the authors say the data cannot settle whether the bias exists.
 */
export const BIAS = {
  position: [
    { model: "GPT-4", value: 30.0 },
    { model: "GPT-3.5", value: 50.0 },
    { model: "Claude-v1", value: 75.0 },
  ],
  verbosity: [
    { model: "GPT-4", value: 8.7 },
    { model: "GPT-3.5", value: 91.3 },
    { model: "Claude-v1", value: 91.3 },
  ],
  self: [
    { model: "GPT-4", value: 10 },
    { model: "GPT-3.5", value: 0 },
    { model: "Claude-v1", value: 25 },
  ],
} as const;

/**
 * Judge calls to compare k candidates on the 200 golden tickets.
 *   Pointwise: one call per candidate per ticket = 200 × k.
 *   Pairwise with the order swapped: k(k − 1) ÷ 2 pairs × 2 orders × 200 tickets = 200 × k(k − 1).
 *   k = 2: 400 and 400; k = 3: 600 and 1,200; k = 5: 1,000 and 4,000; k = 10: 2,000 and 18,000.
 */
export const CANDIDATES = [2, 3, 5, 10] as const;
export const pointwiseCalls = (k: number) => DATASETS.goldenSet * k;
export const pairwiseCalls = (k: number) => DATASETS.goldenSet * k * (k - 1);
