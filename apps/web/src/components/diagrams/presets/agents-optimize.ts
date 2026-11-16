// Constants for the automated-prompt-optimization figures (agents/optimization-loop, agents/overfitting-to-the-dev-set,
// agents/few-shot-selection). One task: Brightpost's refund reply, optimised from the live prompt v12. The fixed set,
// its floor and v12's score come from presets/agents-prompts.ts (OFFLINE), so this page and
// prompt-management-versioning quote the same gate. The optimiser budget follows DSPy's GEPA docs (checked
// 16 Nov 2026). Every score below except the fixed-set gate is ILLUSTRATIVE and labelled so on the figures and page.

import { BRIGHTPOST } from "./agents";
import { OFFLINE, PROMPT_VERSIONS } from "./agents-prompts";
import { TOKENS } from "./production";

/**
 * The optimisation data: 300 labelled refund chats taken from production traces, none of them in the fixed set
 * (checked by hash). GEPA's guidance is to keep as much as possible in the training split and make the validation
 * split the smallest sample that still represents traffic: 200 train + 100 val = 300. The fixed set (200, floor 170)
 * stays outside the optimiser and is read once, at the end.
 */
export const SPLITS = { pool: 300, train: 200, val: 100 } as const;
if (SPLITS.train + SPLITS.val !== SPLITS.pool) throw new Error("splits must sum to the pool");

/** The gate from prompt-management-versioning: 200 cases, floor 170 (85 %), v12 passes 184. */
export const GATE = { cases: OFFLINE.cases, floor: OFFLINE.floor, live: OFFLINE.live } as const;

/**
 * GEPA with auto="light": 6 proposed candidates after the seed (DSPy docs: light / medium / heavy = 6 / 12 / 18), about
 * 1,330 metric calls for a 100-example validation set (DSPy's estimate, for two predictors), 3 failing chats per
 * reflection. Each metric call runs the task model once: 1,330 × 2,200 input tokens ≈ 2.9 M tokens (illustrative,
 * TOKENS.inputPerRequest from the production track), plus 6 calls to the reflection model.
 */
export const BUDGET = {
  candidates: 6,
  metricCalls: 1_330,
  minibatch: 3,
  inputTokens: 1_330 * TOKENS.inputPerRequest,
  inputTokensLabel: "2.9 M",
} as const;

/**
 * One GEPA run, the seed c0 (= v12) and six candidates. `train` is out of 200, `val` out of 100 (illustrative).
 * The train score keeps rising because the reflection model reads training failures and writes rules for them; the
 * validation score peaks at c3 and falls as the rules get specific to the training chats.
 *   c0 v12 as live.                                  train 168 (84 %)  val 82
 *   c1 + "pending refunds: say a person will confirm" train 176 (88 %)  val 85
 *   c2 + "quote the amount from get_order"           train 182 (91 %)  val 87
 *   c3 + "if get_order shows it approved, say so"    train 186 (93 %)  val 89   ← best on val (selected)
 *   c4 + 4 rules about named items (kettles, …)      train 190 (95 %)  val 88
 *   c5 + 7 more item- and phrase-specific rules      train 194 (97 %)  val 86
 *   c6 + 5 more; the prompt is 3× longer             train 196 (98 %)  val 84   ← best on train
 */
export const RUN = [
  { id: "c0", train: 168, val: 82 },
  { id: "c1", train: 176, val: 85 },
  { id: "c2", train: 182, val: 87 },
  { id: "c3", train: 186, val: 89 },
  { id: "c4", train: 190, val: 88 },
  { id: "c5", train: 194, val: 86 },
  { id: "c6", train: 196, val: 84 },
] as const;
if (RUN.length !== BUDGET.candidates + 1) throw new Error("one seed plus the budgeted candidates");

/** The selected candidate (best on val) and the one picking by training score would have shipped. */
export const PICK = { byVal: 3, byTrain: 6 } as const;

/**
 * The held-out check on the fixed set, read once for the selected candidate: 189 of 200, above the floor (170) and
 * above v12 (184), so it passes the gate. For this page c6 was also run once, to show the gap: 181 of 200, above the
 * floor but below v12, so the gate would block it. Paired with v12 case by case, c3 passes 7 cases v12 failed and
 * fails 2 that v12 passed: 184 + 7 − 2 = 189 (illustrative).
 */
export const HELD_OUT = { selected: 189, byTrain: 181, newlyPassing: 7, newlyFailing: 2 } as const;
if (GATE.live + HELD_OUT.newlyPassing - HELD_OUT.newlyFailing !== HELD_OUT.selected) throw new Error("paired counts");

/** The rule c3 found: the return-visit fix (v14 on prompt-management-versioning) found from failing traces. */
export const C3_RULE = PROMPT_VERSIONS.fixRule;

/**
 * The metric's feedback on one failing training chat (GEPA reads score and feedback). The return visit: the customer
 * asks whether refund R-2291 went through; get_order shows it approved; c2 still said a support agent will confirm.
 */
export const FEEDBACK = {
  chat: "train-117",
  score: 0,
  feedback: `get_order shows refund ${BRIGHTPOST.refundId} approved; the reply said a support agent will confirm it. Confirm the approved refund and give its id.`,
} as const;

/**
 * Few-shot selection (BootstrapFewShot): the teacher (v12 on the task model) runs five training chats; the metric passes
 * three and fails two; the three passing traces become demonstrations. t4 is v12's known failure (a refund over £30
 * called "on its way" while it still waits for the support agent); t3 is a return visit, which v12 handles. DSPy
 * defaults: up to 4 bootstrapped demos and up to 16 in total per predictor. Labels are short so they fit their cells
 * (illustrative chats).
 */
export const BOOTSTRAP = [
  {
    id: "t1",
    chat: `Cracked ${BRIGHTPOST.item}, £${BRIGHTPOST.price}`,
    pass: true,
    verdict: "pass",
    demo: BRIGHTPOST.item,
  },
  { id: "t2", chat: "Late toaster, £18", pass: true, verdict: "pass", demo: "toaster" },
  { id: "t3", chat: `Did ${BRIGHTPOST.refundId} go through?`, pass: true, verdict: "pass", demo: "return visit" },
  { id: "t4", chat: "Broken iron, £36", pass: false, verdict: 'fail: "on its way" too soon', demo: "" },
  { id: "t5", chat: "Kettle + mug, one cracked", pass: false, verdict: "fail: refunded both items", demo: "" },
] as const;
export const DEMO_LIMITS = { bootstrapped: 4, total: 16 } as const;
