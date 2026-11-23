// Constants and arithmetic for the Speculative Decoding page (serving/specdec-*.ts specs and the page's worked
// example). Every number the two figures and the page share comes from here.
//
// Sources:
//   Leviathan, Kalman & Matias (2023, arXiv 2211.17192), "Fast Inference from Transformers via Speculative
//   Decoding": §2.3 acceptance rule (keep x if q(x) ≤ p(x), else reject with probability 1 − p(x)/q(x) and resample
//   from norm(max(0, p − q))); Eq. 1, expected tokens per target run = (1 − α^(γ+1)) / (1 − α) under an i.i.d.
//   acceptance assumption; Theorem 3.8, wall-time improvement = (1 − α^(γ+1)) / ((1 − α)(γc + 1)), where c is the
//   time of one draft-model run divided by the time of one target-model run.
//   Chen et al. (2023, arXiv 2302.01318), "Accelerating Large Language Model Decoding with Speculative Sampling":
//   the same modified rejection sampling (their notation swaps p and q) and up to K + 1 tokens per loop.
//
// The page writes k for the draft length (γ in Leviathan et al., K in Chen et al.).

import { LATENCY, TOKENS } from "./production";

/** Expected tokens per target-model pass for acceptance rate α and draft length k (Leviathan et al., Eq. 1). */
export const expectedTokens = (alpha: number, k: number) => (1 - alpha ** (k + 1)) / (1 - alpha);

/** Expected wall-clock speed-up with draft cost ratio c (Leviathan et al., Theorem 3.8). */
export const wallSpeedup = (alpha: number, k: number, c: number) => expectedTokens(alpha, k) / (k * c + 1);

/**
 * Brightpost's illustrative setting for the worked example (not measured):
 *   α = 0.8: a draft from the same model family on support answers (illustrative; Leviathan et al. Table 2 measure
 *     0.53–0.82 for T5 drafts of an 11B target).
 *   k = 4 draft tokens per round (Chen et al. used K = 4 in their Table 1).
 *   c = 0.1: one draft pass costs a tenth of a target pass (illustrative; Leviathan et al. saw c < 0.05 for drafts two
 *     orders of magnitude smaller).
 *
 * Working (computed below, printed by the figures and the page):
 *   expected tokens per target pass = (1 − 0.8^5) / 0.2 = (1 − 0.32768) / 0.2 = 3.3616 ≈ 3.36
 *   cost of one round = k·c + 1 = 4 × 0.1 + 1 = 1.4 target passes
 *   wall-clock speed-up = 3.3616 / 1.4 = 2.401 ≈ 2.4×
 *   plain decode for 250 tokens at 4.4 ms each = 1,100 ms
 *   speculative decode = 1,100 / 2.401 = 458 ms; per token 4.4 × 1.4 / 3.3616 = 1.83 ms
 *   full answer = 400 ms to first token + 458 ms = 858 ms instead of 1,500 ms
 */
export const SPECDEC = {
  alpha: 0.8,
  k: 4,
  c: 0.1,
  targetMsPerToken: LATENCY.decodeMsPerToken,
  outputTokens: TOKENS.outputPerRequest,
  firstTokenMs: LATENCY.firstTokenMs,
  fullAnswerMs: LATENCY.fullAnswerMs,
} as const;

const tokensPerPass = expectedTokens(SPECDEC.alpha, SPECDEC.k);
const speedup = wallSpeedup(SPECDEC.alpha, SPECDEC.k, SPECDEC.c);
const plainDecodeMs = SPECDEC.outputTokens * SPECDEC.targetMsPerToken;
const specDecodeMs = plainDecodeMs / speedup;

/** The worked example's derived numbers, rounded as the page prints them. */
export const SPECDEC_RESULT = {
  tokensPerPass: Math.round(tokensPerPass * 100) / 100, // 3.36
  roundCost: SPECDEC.k * SPECDEC.c + 1, // 1.4
  speedup: Math.round(speedup * 10) / 10, // 2.4
  plainDecodeMs: Math.round(plainDecodeMs), // 1,100
  specDecodeMs: Math.round(specDecodeMs), // 458
  msPerToken: Math.round(((SPECDEC.targetMsPerToken * (SPECDEC.k * SPECDEC.c + 1)) / tokensPerPass) * 100) / 100, // 1.83
  fullAnswerMs: Math.round(SPECDEC.firstTokenMs + specDecodeMs), // 858
} as const;

/**
 * The draft-and-verify round on one Brightpost answer. The customer's refund of £42 for the cracked kettle needs
 * approval (refunds over £30 do), and the small draft model does not know the policy.
 *   q = the draft model's probability for its own token; p = the target's probability for the same token.
 *   r = the uniform random draw for the accept test (fixed here so the figure is reproducible).
 *   "Your":   p 0.70 ≥ q 0.60 → keep (probability 1)
 *   "refund": p/q = 0.45 / 0.50 = 0.90; r = 0.31 < 0.90 → keep
 *   "is":     p/q = 0.05 / 0.40 = 0.125; r = 0.62 > 0.125 → reject; resample from norm(max(0, p − q)) → "needs"
 *   "on":     after the first rejection, discarded unchecked
 * All probabilities and draws are illustrative.
 */
export const SPECDEC_ROUND = {
  drafts: [
    { token: "Your", q: 0.6, p: 0.7, r: 0.5 },
    { token: "refund", q: 0.5, p: 0.45, r: 0.31 },
    { token: "is", q: 0.4, p: 0.05, r: 0.62 },
    { token: "on", q: 0.55, p: 0.1, r: 0.2 },
  ],
  correction: "needs",
} as const;
