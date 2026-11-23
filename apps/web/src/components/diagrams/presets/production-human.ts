// Constants and arithmetic for the Human Evaluation & Feedback page (eval/human-*.ts, eval/feedback-*.ts and the page's
// worked example). Brightpost's numbers come from presets/production.ts. Counts marked ILLUSTRATIVE are not measured
// data and are labelled so on the figures.

import { DATASETS, TRAFFIC, accuracy, cohensKappa } from "./production";
import { JUDGE_STATS } from "./production-judge";

/**
 * Two annotators label the 200 golden tickets pass or fail (ILLUSTRATIVE counts). Rows annotator A, columns annotator B,
 * fail first:
 *   A fail 62 = 52 (B fail) + 10 (B pass); A pass 138 = 12 (B fail) + 126 (B pass).
 *   Agreement pₒ = (52 + 126) ÷ 200 = 0.89; they differ on 10 + 12 = 22 tickets.
 *   Chance pₑ = (62 × 64 + 138 × 136) ÷ 200² = (3,968 + 18,768) ÷ 40,000 = 0.5684.
 *   Cohen's κ = (0.89 − 0.5684) ÷ (1 − 0.5684) = 0.3216 ÷ 0.4316 = 0.745.
 * An adjudicator settles the 22: 8 become fail, 14 pass (ILLUSTRATIVE). Final labels: fail 52 + 8 = 60, pass 126 + 14 =
 * 140, the human column of the judge page's grid (checked below).
 */
export const ANNOTATOR_GRID = [
  [52, 10],
  [12, 126],
];
export const ADJUDICATED = { fail: 8, pass: 14 } as const;

const total = ANNOTATOR_GRID.flat().reduce((a, v) => a + v, 0);
if (total !== DATASETS.goldenSet) throw new Error(`annotator grid sums to ${total}, not ${DATASETS.goldenSet}`);

export const HUMAN_STATS = {
  agreed: ANNOTATOR_GRID[0][0] + ANNOTATOR_GRID[1][1],
  differ: ANNOTATOR_GRID[0][1] + ANNOTATOR_GRID[1][0],
  agreement: accuracy(ANNOTATOR_GRID),
  kappa: cohensKappa(ANNOTATOR_GRID),
  agreedFail: ANNOTATOR_GRID[0][0],
  agreedPass: ANNOTATOR_GRID[1][1],
  finalFail: ANNOTATOR_GRID[0][0] + ADJUDICATED.fail,
  finalPass: ANNOTATOR_GRID[1][1] + ADJUDICATED.pass,
  aFail: ANNOTATOR_GRID[0][0] + ANNOTATOR_GRID[0][1],
  aPass: ANNOTATOR_GRID[1][0] + ANNOTATOR_GRID[1][1],
} as const;
if (HUMAN_STATS.differ !== ADJUDICATED.fail + ADJUDICATED.pass)
  throw new Error("adjudicated count differs from the disagreements");
if (HUMAN_STATS.finalFail !== JUDGE_STATS.humanFail || HUMAN_STATS.finalPass !== JUDGE_STATS.humanPass) {
  throw new Error("final labels do not match the judge page's human column");
}

/**
 * Effort (ILLUSTRATIVE): 3 minutes a label, 2 annotators × 200 tickets = 400 labels = 1,200 minutes = 20 hours;
 * adjudication 5 minutes a disagreement, 22 × 5 = 110 minutes, about 1.8 hours.
 */
export const EFFORT = {
  labels: 2 * DATASETS.goldenSet,
  minutesPerLabel: 3,
  minutesPerAdjudication: 5,
  get labelHours() {
    return (this.labels * this.minutesPerLabel) / 60;
  },
  get adjudicationMinutes() {
    return HUMAN_STATS.differ * this.minutesPerAdjudication;
  },
} as const;

/**
 * Feedback signals per day on Brightpost's 200,000 requests (ILLUSTRATIVE shares of requests):
 *   thumbs 2 % = 4,000 · written reason 0.2 % = 400 · a support agent's edit of a drafted reply 0.75 % = 1,500
 *   retry or rephrase 4 % = 8,000 · copy 30 % = 60,000 · hand-off to a person 5 % = 10,000.
 * Explicit = 4,000 + 400 + 1,500 = 5,900; implicit = 8,000 + 60,000 + 10,000 = 78,000, about 13 times as many.
 */
const day = TRAFFIC.requestsPerDay;
export const SIGNALS = [
  { id: "thumbs", name: "Thumbs up or down", kind: "explicit", share: 0.02, meaning: "Clear direction, no reason" },
  { id: "reason", name: "Written reason", kind: "explicit", share: 0.002, meaning: "Says why; very rare" },
  {
    id: "edit",
    name: "Agent edits a draft",
    kind: "explicit",
    share: 0.0075,
    meaning: "The fix itself: the best label",
  },
  { id: "retry", name: "Retry or rephrase", kind: "implicit", share: 0.04, meaning: "Often: the first answer missed" },
  { id: "copy", name: "Copy the answer", kind: "implicit", share: 0.3, meaning: "Ambiguous: kept it, or filing it" },
  {
    id: "handoff",
    name: "Hand-off to a person",
    kind: "implicit",
    share: 0.05,
    meaning: "Strong: the assistant could not finish",
  },
].map((s) => ({ ...s, perDay: Math.round(s.share * day) }));
export const EXPLICIT_PER_DAY = SIGNALS.filter((s) => s.kind === "explicit").reduce((a, s) => a + s.perDay, 0);
export const IMPLICIT_PER_DAY = SIGNALS.filter((s) => s.kind === "implicit").reduce((a, s) => a + s.perDay, 0);
export const IMPLICIT_RATIO = IMPLICIT_PER_DAY / EXPLICIT_PER_DAY;
