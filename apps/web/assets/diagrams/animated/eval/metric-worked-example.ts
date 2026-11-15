import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, REFUND_CASE } from "@/components/diagrams/presets/production";
import {
  ANSWER_A,
  EMBED,
  QUESTION,
  REFERENCE,
  RUBRIC,
  SCORES,
  VERDICT_A,
  f2,
} from "@/components/diagrams/presets/production-metrics";

// One Brightpost answer scored four ways (quality-metrics, worked example). The question is the cracked kettle,
// order 4471, £42. Answer A reads well but promises the refund without approval (refunds over £30 need it). Six steps:
//   1 the question, the golden-set reference and answer A
//   2 token overlap: 13 answer tokens, 19 reference tokens, 9 shared. P = 9 ÷ 13 = 0.69, R = 9 ÷ 19 = 0.47,
//     F1 = 2 × 9 ÷ (13 + 19) = 0.5625 -> 0.56. Exact match 0; BLEU (n = 1..4, one reference, no smoothing) 0.21
//   3 embedding cosine 0.96 (measured with bge-small-en-v1.5; two off-topic sentences score 0.54 and 0.59)
//   4 judge rubric: three lines, verdicts yes, yes, no (illustrative): 2 ÷ 3 = 0.67
//   5 task check: 42 > 30 and no approval requested: 0
//   6 the verdict: the answer is wrong; three metrics score it 0.56 to 0.96, one gives 0
// Every number comes from presets/production-metrics.ts, which checks them against the hand calculation.
//
// Grid (880 wide): tag boxes x 20, w 110; text from x 150; metric rows y 190 + 64 r (name box x 20, w 170; working text
// from x 210; score cell x 780, w 80). Colours (PROD_TONE): reference blue, answer green, scores lime, the verdict red.
// Three tones plus neutral.

const hug = (label: string) => Math.round(label.length * 7.2) + 8;
const text = (
  id: string,
  x: number,
  y: number,
  label: string,
  step: number,
  tone: LayoutShape["tone"] = PROD_TONE.infra
): LayoutShape => ({ id, type: "text", x, y, w: hug(label), h: 20, label, tone, step, quiet: true });

const tag = (id: string, y: number, h: number, label: string, tone: LayoutShape["tone"]): LayoutShape => ({
  id,
  type: "box",
  x: 20,
  y,
  w: 110,
  h,
  label,
  tone,
  fill: "pastel",
  step: 1,
});

const rowY = (r: number) => 190 + r * 64;
const a = SCORES.a;
const half = (s: string) => {
  const words = s.split(" ");
  const cut = Math.ceil(words.length / 2) + 1;
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
};
const [ref1, ref2] = half(`“${REFERENCE}”`);

const rows = [
  {
    id: "overlap",
    label: "Token overlap",
    sub: "exact match, BLEU, ROUGE",
    score: f2(a.f1.f1),
    lines: [
      `${a.f1.common} shared tokens. Precision ${a.f1.common} ÷ ${a.f1.c} = ${f2(a.f1.precision)}, recall ${a.f1.common} ÷ ${a.f1.r} = ${f2(a.f1.recall)}`,
      `F1 = 2 × ${a.f1.common} ÷ (${a.f1.c} + ${a.f1.r}) = ${f2(a.f1.f1)}. Exact match 0, BLEU ${f2(a.bleu.score)}`,
    ],
  },
  {
    id: "embed",
    label: "Embedding similarity",
    sub: "cosine of two vectors",
    score: f2(EMBED.a),
    lines: [
      `${EMBED.model} vectors for answer and reference, cosine = ${f2(EMBED.a)}`,
      `Two off-topic sentences score ${f2(EMBED.offTopicLow)} and ${f2(EMBED.offTopicHigh)} on the same model`,
    ],
  },
  {
    id: "judge",
    label: "Judge rubric",
    sub: "three yes or no lines",
    score: f2(a.judge),
    lines: [
      `${RUBRIC.map((r, i) => `${r.split(",")[0]}: ${VERDICT_A[i] ? "yes" : "no"}`).join(" · ")}`,
      `Score = ${VERDICT_A.filter(Boolean).length} ÷ ${VERDICT_A.length} = ${f2(a.judge)} (verdicts illustrative)`,
    ],
  },
  {
    id: "task",
    label: "Task success",
    sub: "was the refund handled right",
    score: `${a.task}`,
    lines: [
      `Rule: a refund over £${REFUND_CASE.approvalLimit} needs approval; this reply grants £${REFUND_CASE.price} outright`,
      `${REFUND_CASE.price} > ${REFUND_CASE.approvalLimit} and no approval requested, so the task fails: ${a.task}`,
    ],
  },
];

const shapes: LayoutShape[] = [
  tag("q-tag", 8, 36, "Question", PROD_TONE.infra),
  text("q-text", 150, 16, `“${QUESTION}”`, 1),
  tag("r-tag", 54, 48, "Reference", PROD_TONE.data),
  text("r-text1", 150, 56, ref1, 1),
  text("r-text2", 150, 78, ref2, 1),
  tag("a-tag", 114, 36, "Answer A", PROD_TONE.model),
  text("a-text", 150, 122, `“${ANSWER_A}”`, 1),
  text("score-head", 780, 164, "Score", 2, PROD_TONE.check),
];

rows.forEach((r, i) => {
  const step = i + 2;
  shapes.push(
    {
      id: `${r.id}-name`,
      type: "box",
      x: 20,
      y: rowY(i),
      w: 170,
      h: 52,
      label: r.label,
      sub: r.sub,
      tone: PROD_TONE.infra,
      fill: "pastel",
      step,
    },
    text(`${r.id}-l0`, 210, rowY(i) + 5, r.lines[0], step),
    text(`${r.id}-l1`, 210, rowY(i) + 27, r.lines[1], step, PROD_TONE.check),
    {
      id: `${r.id}-score`,
      type: "cell",
      x: 780,
      y: rowY(i),
      w: 80,
      h: 52,
      label: r.score,
      tone: PROD_TONE.check,
      fill: "pastel",
      step,
      quiet: true,
    }
  );
});
shapes.push({
  id: "verdict",
  type: "box",
  x: 20,
  y: rowY(3) + 70,
  w: 840,
  h: 48,
  label: `Answer A is wrong: it promises £${REFUND_CASE.price} with no approval`,
  sub: "Three metrics score it 0.56 to 0.96; only the task check gives 0",
  tone: PROD_TONE.failure,
  fill: "pastel",
  step: 6,
  highlight: true,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "One Brightpost answer scored four ways",
  width: 880,
  height: rowY(3) + 70 + 48 + 16,
  steps: [
    { title: "A question, a reference and an answer" },
    { title: "Token overlap: count shared words" },
    { title: "Embedding similarity: compare meaning" },
    { title: "Judge rubric: three yes or no lines" },
    { title: "Task success: check the outcome" },
    { title: "Three metrics score a wrong answer well" },
  ],
  shapes,
};

export default spec;
