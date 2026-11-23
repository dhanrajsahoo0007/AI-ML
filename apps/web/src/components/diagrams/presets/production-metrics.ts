// Constants and arithmetic for the Quality Metrics page only (eval/metric-*). One Brightpost refund question, one
// reference answer, two candidate answers, scored four ways. The text-overlap numbers are computed here from the
// words, so a figure and the page cannot drift. The embedding cosines were MEASURED on 2026-11-15 with
// BAAI/bge-small-en-v1.5 (CLS vector, L2-normalised, cosine; transformers 5.23, CPU); they are constants because the
// model is not run at build time. The judge verdicts are ILLUSTRATIVE (what a judge model typically returns for a
// rubric like this), and the score is computed from them.

import { REFUND_CASE } from "./production";

export const QUESTION = `My kettle from order ${REFUND_CASE.orderId} arrived cracked. Can I get my £${REFUND_CASE.price} back?`;
/** The golden-set reference answer. */
export const REFERENCE =
  "Sorry the kettle arrived cracked. I have sent your £42 refund for approval, because refunds over £30 need it.";
/** Answer A reads well but skips the approval step: it promises the refund outright. */
export const ANSWER_A = "Sorry your kettle arrived cracked. I have refunded the £42 to your card.";
/** Answer B is correct, in different words. */
export const ANSWER_B =
  "I am sorry the kettle was damaged. A refund of £42 needs approval as it is over £30, so I have passed it on.";

/** Lower-case, drop full stops and commas, split on spaces. £42 stays one token. */
export const tokens = (s: string) => s.toLowerCase().replace(/[.,]/g, "").split(/\s+/).filter(Boolean);

const counts = (t: string[]) => t.reduce((m, w) => m.set(w, (m.get(w) ?? 0) + 1), new Map<string, number>());

/** Token-overlap F1 (the SQuAD-style score; equals ROUGE-1 F1): common tokens counted with multiplicity. */
export function overlap(candidate: string, reference: string) {
  const c = tokens(candidate);
  const r = tokens(reference);
  const rc = counts(r);
  let common = 0;
  counts(c).forEach((v, k) => {
    common += Math.min(v, rc.get(k) ?? 0);
  });
  const precision = common / c.length;
  const recall = common / r.length;
  const f1 = common === 0 ? 0 : (2 * common) / (c.length + r.length); // = 2PR / (P + R)
  return { c: c.length, r: r.length, common, precision, recall, f1 };
}

/** BLEU with one reference, no smoothing: brevity penalty × geometric mean of clipped n-gram precisions, n = 1..4. */
export function bleu(candidate: string, reference: string) {
  const c = tokens(candidate);
  const r = tokens(reference);
  const grams = (t: string[], n: number) => t.slice(0, t.length - n + 1).map((_, i) => t.slice(i, i + n).join(" "));
  const p: { clipped: number; total: number }[] = [];
  for (let n = 1; n <= 4; n++) {
    const rc = counts(grams(r, n));
    let clipped = 0;
    counts(grams(c, n)).forEach((v, k) => {
      clipped += Math.min(v, rc.get(k) ?? 0);
    });
    p.push({ clipped, total: Math.max(c.length - n + 1, 0) });
  }
  const bp = c.length > r.length ? 1 : Math.exp(1 - r.length / c.length);
  const zero = p.some((x) => x.clipped === 0);
  const score = zero ? 0 : bp * Math.exp(p.reduce((s, x) => s + Math.log(x.clipped / x.total), 0) / 4);
  return { p, bp, score };
}

/** Exact match after the same normalisation. */
export const exactMatch = (a: string, b: string) => (tokens(a).join(" ") === tokens(b).join(" ") ? 1 : 0);

/**
 * Embedding cosine against the reference, measured with bge-small-en-v1.5: answer A 0.9607, answer B 0.9665, and two
 * off-topic sentences ("The Brightpost help centre has 1,200 articles ..." 0.5381; "Your order will arrive on
 * Tuesday." 0.5911) as a scale anchor: this model's scores crowd between about 0.5 and 1.
 */
export const EMBED = {
  a: 0.9607,
  b: 0.9665,
  offTopicLow: 0.5381,
  offTopicHigh: 0.5911,
  model: "bge-small-en-v1.5",
} as const;

/** A three-line rubric and the (illustrative) verdicts of a judge model. Score = lines passed ÷ lines. */
export const RUBRIC = [
  "acknowledges the damage",
  "states £42",
  "sends for approval, does not promise payment",
] as const;
export const VERDICT_A = [true, true, false] as const;
export const VERDICT_B = [true, true, true] as const;
export const rubricScore = (v: readonly boolean[]) => v.filter(Boolean).length / v.length;

/** Task check: a refund over £30 must go for approval; answer A grants £42 outright (no approval requested). */
export const taskPass = (amount: number, requestsApproval: boolean) =>
  amount <= REFUND_CASE.approvalLimit || requestsApproval;
export const TASK_A = taskPass(REFUND_CASE.price, false) ? 1 : 0; // 42 > 30 and no approval -> 0
export const TASK_B = taskPass(REFUND_CASE.price, true) ? 1 : 0; // approval requested -> 1

export const SCORES = {
  a: {
    f1: overlap(ANSWER_A, REFERENCE),
    bleu: bleu(ANSWER_A, REFERENCE),
    cosine: EMBED.a,
    judge: rubricScore(VERDICT_A),
    task: TASK_A,
  },
  b: {
    f1: overlap(ANSWER_B, REFERENCE),
    bleu: bleu(ANSWER_B, REFERENCE),
    cosine: EMBED.b,
    judge: rubricScore(VERDICT_B),
    task: TASK_B,
  },
} as const;

// Hand checks (A: 13 tokens, reference 19, 9 shared -> F1 0.5625; BLEU 0.211; B: 24 tokens, 11 shared -> F1 0.512).
const near = (x: number, y: number) => Math.abs(x - y) < 0.0005;
if (
  SCORES.a.f1.c !== 13 ||
  SCORES.a.f1.r !== 19 ||
  SCORES.a.f1.common !== 9 ||
  !near(SCORES.a.f1.f1, 0.5625) ||
  !near(SCORES.a.bleu.score, 0.2111) ||
  SCORES.b.f1.c !== 24 ||
  SCORES.b.f1.common !== 11 ||
  !near(SCORES.b.f1.f1, 0.5116) ||
  SCORES.b.bleu.score !== 0
) {
  throw new Error("production-metrics: the worked example no longer matches the hand calculation");
}
export const f2 = (v: number) => v.toFixed(2);
