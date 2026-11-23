// Constants and arithmetic for the RLHF, DPO & Preference Tuning page only (finetune/rlhf-*, dpo-*, preference-*).
// Facts: InstructGPT (Ouyang et al. 2022, arXiv 2203.02155): supervised fine-tuning on labeller demonstrations, a reward
// model trained on labeller rankings of outputs, then reinforcement learning with PPO; the 1.3 B InstructGPT was
// preferred to the 175 B GPT-3 on the authors' prompts. DPO (Rafailov et al. 2023, arXiv 2305.18290): the RLHF
// objective solved with a classification loss on preference pairs, no reward model and no sampling during training.
// Every number below that is not a source fact is ILLUSTRATIVE and labelled so on the figures.

/** The sigmoid σ(x) = 1 ÷ (1 + e^−x). */
export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/**
 * RLHF total reward for one answer: r_total = r − β × KL, where KL is the log-ratio log(π ÷ π_ref) of the answer.
 * Illustrative: reward-model score r = 2.4, β = 0.1, log-ratio 9 → penalty 0.9 → 2.4 − 0.9 = 1.5.
 */
export const RLHF = { score: 2.4, beta: 0.1, logRatio: 9 } as const;
export const RLHF_PENALTY = RLHF.beta * RLHF.logRatio;
export const RLHF_TOTAL = RLHF.score - RLHF_PENALTY;

/**
 * One DPO pair on the refund question (illustrative log-ratios, whole-answer sums of token log-probabilities):
 *   chosen   log π_θ(y_w) − log π_ref(y_w) = +2.0   (the policy already likes it more than the reference does)
 *   rejected log π_θ(y_l) − log π_ref(y_l) = −3.0
 *   β = 0.1 → margin = 0.1 × (2.0 − (−3.0)) = 0.5; σ(0.5) = 0.6225; loss = −ln 0.6225 = 0.474.
 *   Before any training both log-ratios are 0, so the margin is 0, σ(0) = 0.5 and the loss is −ln 0.5 = 0.693.
 */
export const DPO = { beta: 0.1, chosen: 2.0, rejected: -3.0 } as const;
export const DPO_MARGIN = DPO.beta * (DPO.chosen - DPO.rejected);
export const DPO_LOSS = -Math.log(sigmoid(DPO_MARGIN));
export const DPO_LOSS_START = -Math.log(sigmoid(0));

/**
 * Where Brightpost's preference pairs come from (illustrative counts):
 *   2,000 from agent edits (the agent's edited reply beats the model's draft) + 6,000 from thumbs and regenerate clicks
 *   + 4,000 from a judge model with a written rubric = 12,000 pairs; filtering drops 3,000 (ties, signals that
 *   disagree, answers that break the refund rule) → 9,000 training pairs. 3,000 ÷ 12,000 = 25 % dropped.
 */
export const PAIRS = { edits: 2_000, thumbs: 6_000, judge: 4_000, dropped: 3_000 } as const;
export const PAIRS_RAW = PAIRS.edits + PAIRS.thumbs + PAIRS.judge;
export const PAIRS_KEPT = PAIRS_RAW - PAIRS.dropped;
