// Constants used only by the evaluation figures (agentic-ai-evaluation.mdx). Shared names and numbers (the Brightpost
// task, the tools, the legend, PASS_K) come from ./agents; this file adds the judge-calibration counts and the
// agreement numbers derived from them.

/**
 * A model judge checked against a person on 50 graded Brightpost runs. Illustrative counts (the same split as the
 * newsletter issue "Evals for LLM apps"): the person failed 21 runs and passed 29; the judge agreed on 16 failures and
 * 27 passes, passed 5 runs the person failed (missed failures) and failed 2 the person passed (false alarms).
 */
export const JUDGE_CALIBRATION = {
  total: 50,
  bothFail: 16,
  missed: 5,
  falseAlarm: 2,
  bothPass: 27,
} as const;

const J = JUDGE_CALIBRATION;
const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Derived numbers. Agreement = (16 + 27) / 50 = 0.86. Failures caught = 16 / (16 + 5) = 0.76. Cohen's kappa:
 * chance agreement = (18 × 21 + 32 × 29) / 50² = 1,306 / 2,500 = 0.5224, so κ = (0.86 − 0.5224) / (1 − 0.5224) = 0.71.
 */
export const JUDGE_AGREEMENT = (() => {
  const personFail = J.bothFail + J.missed;
  const personPass = J.falseAlarm + J.bothPass;
  const judgeFail = J.bothFail + J.falseAlarm;
  const judgePass = J.missed + J.bothPass;
  const agree = J.bothFail + J.bothPass;
  const observed = agree / J.total;
  const chance = (judgeFail * personFail + judgePass * personPass) / J.total ** 2;
  return {
    personFail,
    personPass,
    agree,
    agreement: r2(observed),
    failuresCaught: r2(J.bothFail / personFail),
    kappa: r2((observed - chance) / (1 - chance)),
  };
})();
