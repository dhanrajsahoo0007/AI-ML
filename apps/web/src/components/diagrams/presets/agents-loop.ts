// Constants for the loop-engineering-and-verification-loops figures (assets/diagrams/animated/agents/loop-anatomy,
// tdd-loop, budgets-and-breakers, exit-criteria, checkpoint-resume). The coding agent's task, steps and context come
// from ./agents (CODING_TASK, CODING_STEPS, CODING_CONTEXT); this file adds only what the loop around them decides:
// the goal, the three budgets, the breaker threshold, the two exit checks and the checkpoints of a longer run. Caps,
// times and the longer run are illustrative unless they come from ./agents.

import { CODING_CONTEXT, CODING_STEPS, CODING_TASK } from "./agents";

/** The goal the loop tests after every turn, in a form a program can check. */
export const LOOP_GOAL = {
  label: "Goal",
  test: `all ${CODING_TASK.testsTotal} tests pass`,
} as const;

/** Turns the model took in the bug-fix run: one per proposal (5 tool calls + the summary = 6). */
export const TURNS_USED = CODING_STEPS.filter((s) => s.kind === "action" || s.kind === "answer").length;

/** Tokens in the window at step 9: 2,000 + 1,500 + 300 + 6,400 + 4,000 + 9,800 = 24,000 (CODING_CONTEXT). */
export const TOKENS_USED = Object.values(CODING_CONTEXT.step9).reduce((s, v) => s + v, 0);

/**
 * The three budgets the harness checks before every turn, with what the bug-fix run used. Turn cap and time are
 * illustrative; the token budget is CODING_CONTEXT's 32,000. Turns 6 / 20 = 30 %, tokens 24,000 / 32,000 = 75 %,
 * time 2 / 10 min = 20 %.
 */
export const BUDGETS = [
  { name: "Turns", used: TURNS_USED, cap: 20, unit: "" },
  { name: "Tokens", used: TOKENS_USED, cap: CODING_CONTEXT.budget, unit: "" },
  { name: "Time", used: 2, cap: 10, unit: " min" },
] as const;

/** Share of a budget used, as a whole percentage. */
export const pctUsed = (b: { used: number; cap: number }) => Math.round((b.used / b.cap) * 100);

/**
 * The breaker: the harness fingerprints each failure (test name + error message) and trips when the same fingerprint
 * comes back this many times in a row. In the variant run the second fix keeps failing "parses an empty file" with
 * the same error, so the breaker trips on the third try, at turn 8 of 20: 12 turns the cap alone would have spent.
 */
export const BREAKER = {
  threshold: 3,
  failure: CODING_TASK.secondFailure,
  /** Turn on which the third identical failure arrives in the variant run (turns 6, 7, 8). */
  tripTurn: 8,
} as const;

/** Turns the turn cap alone would still have allowed when the breaker trips: 20 − 8 = 12. */
export const TURNS_SAVED = BUDGETS[0].cap - BREAKER.tripTurn;

/**
 * The two kinds of exit check on the same run. The deterministic one runs the suite; the model-graded one asks a
 * small model whether the pull-request summary names the empty-file case, judging only what is in the transcript.
 */
export const EXIT_CHECKS = {
  deterministic: {
    evidence: "npm test output",
    checker: "Exit code is 0",
    verdict: `${CODING_TASK.testsTotal} passed: met`,
  },
  graded: {
    evidence: "Transcript + summary",
    checker: "Evaluator model",
    verdict: "Met, not yet, or impossible",
  },
} as const;

/**
 * A longer run on the same repository (illustrative): six rounds, a checkpoint (a git commit and a line in the
 * progress file) after every round whose checks pass, here rounds 2 and 4, and a crash in round 5. The resumed run
 * reads the last checkpoint and starts again at round 5: it repeats 1 round, not 5.
 */
export const RESUME_RUN = {
  rounds: 6,
  checkpointsAfter: [2, 4],
  crashAt: 5,
} as const;
