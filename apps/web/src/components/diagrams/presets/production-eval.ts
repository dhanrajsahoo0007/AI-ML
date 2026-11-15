// Constants and arithmetic for the evaluation fundamentals and offline benchmarks pages (eval/eval-*.ts, eval/bench-*.ts
// and the pages' worked examples). Brightpost's numbers come from presets/production.ts. Everything below that is not a
// Brightpost constant is either a figure quoted from a dated primary source or ILLUSTRATIVE, and is labelled so.

import { DATASETS, REFUND_CASE, TOKENS } from "./production";

// ── Error analysis ───────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Fifty Brightpost traces, read by hand and sorted into failure modes (ILLUSTRATIVE counts: the page says "shape of the
 * method, not measured data"). The sample is 50 traces that a customer rated thumbs-down or handed to a person.
 * The counts must sum to 50; the spec and the test assert it.
 */
export const ERROR_SAMPLE = 50;
export const ERROR_MODES = [
  { id: "approval", name: "Refund over £30 with no approval", short: "A", count: 14 },
  { id: "invented", name: "Invented a policy", short: "B", count: 9 },
  { id: "order", name: "Wrong order id in a tool call", short: "C", count: 8 },
  { id: "handoff", name: "Did not hand off to a person", short: "D", count: 7 },
  { id: "tone", name: "Tone or length off", short: "E", count: 5 },
  { id: "retrieval", name: "Right article not retrieved", short: "F", count: 4 },
  { id: "other", name: "Other or unclear", short: "G", count: 3 },
] as const;
export const ERROR_TOTAL = ERROR_MODES.reduce((sum, m) => sum + m.count, 0);
if (ERROR_TOTAL !== ERROR_SAMPLE) throw new Error(`error modes sum to ${ERROR_TOTAL}, not ${ERROR_SAMPLE}`);
/** The largest mode and its share: 14 ÷ 50 = 28 %. */
export const ERROR_TOP = ERROR_MODES[0];
export const ERROR_TOP_SHARE = ERROR_TOP.count / ERROR_SAMPLE;
/** The targeted test written for it: refunds above the £30 limit must call the approval tool (a code check). */
export const ERROR_TEST = {
  name: `Refund over £${REFUND_CASE.approvalLimit} must call the approval tool`,
  cases: 14,
} as const;

// ── Grader ladder ────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Cost per grade, ILLUSTRATIVE:
 *   code check: a few lines of code, no per-grade charge (compute is negligible);
 *   model judge: one call that reads the question, the answer and the rubric (2,200 + 250 = 2,450 input tokens) and
 *     writes a 100-token verdict, at an illustrative $3 per million input and $15 per million output tokens:
 *     2,450 × 3 ÷ 1,000,000 = $0.00735; 100 × 15 ÷ 1,000,000 = $0.0015; total $0.00885, about $0.009;
 *   person: 3 minutes per answer at an illustrative $30 an hour = 3 ÷ 60 × 30 = $1.50.
 * For the 200-ticket golden set: code $0; judge 200 × 0.00885 = $1.77; person 200 × 1.5 = $300.
 */
export const GRADER = {
  inputPrice: 3,
  outputPrice: 15,
  judgeInputTokens: TOKENS.inputPerRequest + TOKENS.outputPerRequest,
  judgeOutputTokens: 100,
  humanMinutes: 3,
  humanHourly: 30,
  get judgeCost() {
    return (this.judgeInputTokens * this.inputPrice + this.judgeOutputTokens * this.outputPrice) / 1_000_000;
  },
  get humanCost() {
    return (this.humanMinutes / 60) * this.humanHourly;
  },
  get judgeSet() {
    return DATASETS.goldenSet * this.judgeCost;
  },
  get humanSet() {
    return DATASETS.goldenSet * this.humanCost;
  },
} as const;

// ── Benchmarks ───────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Sizes from the primary sources (checked 2026-11-15):
 *   MMLU: 15,908 questions in 57 subjects, test set 14,079 (Hendrycks et al., 2020, arXiv 2009.03300);
 *   GPQA: 448 questions (main set), Diamond subset 198 (Rein et al., 2023, arXiv 2311.12022);
 *   SWE-bench Verified: 500 human-validated tasks, announced 13 August 2024 (OpenAI with the SWE-bench authors).
 */
export const BENCH = {
  mmlu: { questions: 15_908, test: 14_079, subjects: 57 },
  gpqa: { main: 448, diamond: 198 },
  sweVerified: { tasks: 500 },
} as const;

/**
 * Contamination, ILLUSTRATIVE: a 40-item test set, 11 items found in a training corpus by an n-gram overlap check.
 * The model answers 10 of the 11 leaked items and 22 of the 29 clean ones.
 *   all items: (10 + 22) ÷ 40 = 80.0 %;  clean items: 22 ÷ 29 = 75.9 %;  leaked items: 10 ÷ 11 = 90.9 %;
 *   leaked share: 11 ÷ 40 = 27.5 %;  inflation of the headline score: 80.0 − 75.9 = 4.1 points.
 */
export const LEAK = { items: 40, leaked: 11, leakedRight: 10, cleanRight: 22 } as const;
export const LEAK_CALC = {
  clean: LEAK.items - LEAK.leaked,
  overall: (LEAK.leakedRight + LEAK.cleanRight) / LEAK.items,
  cleanScore: LEAK.cleanRight / (LEAK.items - LEAK.leaked),
  leakedScore: LEAK.leakedRight / LEAK.leaked,
  share: LEAK.leaked / LEAK.items,
} as const;

/**
 * Three hypothetical models (ILLUSTRATIVE, not real products). Public benchmark accuracy against the number of the 200
 * golden tickets answered correctly:
 *   A: 88 % public, 150/200 = 75 %;  B: 85 % public, 136/200 = 68 %;  C: 79 % public, 168/200 = 84 %.
 * The 95 % interval half-width at n = 200 is 1.96 × sqrt(p × (1 − p) ÷ 200): C 5.1 points, A 6.0, B 6.5.
 */
export const MODELS = [
  { name: "Model A", publicScore: 88, golden: 150 },
  { name: "Model B", publicScore: 85, golden: 136 },
  { name: "Model C", publicScore: 79, golden: 168 },
] as const;
export const goldenPct = (correct: number) => (correct / DATASETS.goldenSet) * 100;
export const halfWidth = (correct: number) => {
  const p = correct / DATASETS.goldenSet;
  return 1.96 * Math.sqrt((p * (1 - p)) / DATASETS.goldenSet) * 100;
};
