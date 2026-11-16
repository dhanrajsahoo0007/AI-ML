// Constants used only by the planner-generator-evaluator figures (planner-generator-evaluator-loops.mdx). Shared
// names and numbers (the bug-fix coding task, its steps, the legend) come from ./agents; this file adds the four
// acceptance criteria the planner writes, what each round of the loop produces, and the cost of one sourced run.

import { CODING_STEPS, CODING_TASK } from "./agents";

/**
 * The contract: the four acceptance criteria the planner writes for the issue "Order import drops the last line of a
 * CSV file". Each one can be checked by someone who did not write the code.
 */
export const PGE_CRITERIA = [
  { id: "C1", text: `"${CODING_TASK.failingTest}" passes` },
  { id: "C2", text: `All ${CODING_TASK.testsTotal} tests pass` },
  { id: "C3", text: "Lint and types clean" },
  { id: "C4", text: `Diff touches only ${CODING_TASK.file}` },
] as const;

/**
 * Two rounds of the loop on the bug fix, with the edits from CODING_STEPS (steps 3 and 7).
 * - Round 1: the generator changes the loop bound and runs only the test it was fixing; it reports 4 of 4 criteria
 *   met. The evaluator runs all 18 tests: 17 pass and "parses an empty file" fails, so C2 fails (3 of 4 met).
 * - Round 2: the generator returns [] for empty input; all 18 tests pass and lint and types are clean (4 of 4).
 */
export const PGE_ROUNDS = {
  edit1: CODING_STEPS[2].label.replace("edit: ", ""),
  edit2: CODING_STEPS[6].label.replace("edit: ", ""),
  selfReport: "4 of 4 met",
  testsRun1: { passed: CODING_TASK.testsTotal - 1, failed: 1, failing: CODING_TASK.secondFailure },
  verdict1: "3 of 4 met",
  failed1: "C2",
  error1: CODING_STEPS[5].label,
  verdict2: "4 of 4 met",
} as const;

/**
 * Agent runs for the loop: one planner run, then one generator run and one evaluator run per round, so
 * runs = 1 + 2 × rounds. Two rounds = 5 runs; a cap of 3 rounds = at most 7.
 */
export const pgeRuns = (rounds: number) => 1 + 2 * rounds;

/**
 * Cost of one full run of Anthropic's planner-generator-evaluator harness (the digital audio workstation built with
 * the simplified harness, "Harness design for long-running application development", 24 Mar 2026), in US dollars and
 * minutes, by role and round. Sourced, not illustrative.
 * Totals: planner 0.46; generator 71.08 + 36.89 + 5.88 = 113.85; evaluator 3.24 + 3.09 + 4.06 = 10.39;
 * all = 0.46 + 113.85 + 10.39 = 124.70. The evaluator is 10.39 / 124.70 = 8.3 % of the cost.
 * Rounds: 1 = 0.46 + 71.08 + 3.24 = 74.78; 2 = 36.89 + 3.09 = 39.98; 3 = 5.88 + 4.06 = 9.94.
 */
export const HARNESS_RUN = {
  planner: { usd: 0.46, min: 4.7 },
  generator: [
    { usd: 71.08, min: 127 },
    { usd: 36.89, min: 62 },
    { usd: 5.88, min: 10.9 },
  ],
  evaluator: [
    { usd: 3.24, min: 8.8 },
    { usd: 3.09, min: 6.8 },
    { usd: 4.06, min: 9.6 },
  ],
  totalUsd: 124.7,
} as const;

const r2 = (v: number) => Math.round(v * 100) / 100;
const sum = (xs: readonly { usd: number }[]) => r2(xs.reduce((a, x) => a + x.usd, 0));

/** Derived totals for HARNESS_RUN (see the working above). */
export const HARNESS_TOTALS = {
  generator: sum(HARNESS_RUN.generator),
  evaluator: sum(HARNESS_RUN.evaluator),
  rounds: [0, 1, 2].map((i) =>
    r2((i === 0 ? HARNESS_RUN.planner.usd : 0) + HARNESS_RUN.generator[i].usd + HARNESS_RUN.evaluator[i].usd)
  ),
  evaluatorShare: Math.round((sum(HARNESS_RUN.evaluator) / HARNESS_RUN.totalUsd) * 1000) / 10,
} as const;
