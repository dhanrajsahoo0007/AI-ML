import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { DATASETS, FINETUNE_TONE as T, PROD_TONE, TOKENS, n } from "@/components/diagrams/presets/production";
import { PRICE, dailyCost, leftNote, note } from "@/components/diagrams/presets/production-finetune";

// "Brightpost's daily cost on the teacher and on the student" on the Distillation & Small Models page (Deep dive).
// Traffic from presets/production.ts: 440 M input and 50 M output tokens a day. Prices per million tokens are
// ILLUSTRATIVE (teacher $3 in, $15 out; student $0.15 in, $0.60 out), not any provider's list.
//   teacher: 440 × 3 + 50 × 15 = 1,320 + 750 = $2,070 a day · student: 440 × 0.15 + 50 × 0.60 = 66 + 30 = $96 a day.
//   ratio 2,070 ÷ 96 = 21.6; a year (× 365): $755,550 against $35,040.
//   One-off labelling of the 5,000 training prompts by the teacher: 5,000 × 2,200 = 11 M in, 5,000 × 250 = 1.25 M out:
//   11 × 3 + 1.25 × 15 = 33 + 18.75 = $51.75.
// Quality is ILLUSTRATIVE: on the 200-ticket golden set the teacher passes 184 (92 %), the student 176 (88 %).
// Steps: 1 daily cost bars · 2 the ratio and a year · 3 quality on the golden set and the one-off labelling cost.
// Grid: cost bars x 150 (2,070 → 440 px), rows y 70 and 130; quality bars x 150 (200 tickets → 440 px), rows y 250, 300.
// Colours: teacher green, student orange (the weights being trained), quality checks lime.

const inM = TOKENS.inputPerDay / 1e6;
const outM = TOKENS.outputPerDay / 1e6;
const teacher = dailyCost(PRICE.teacher, inM, outM);
const student = dailyCost(PRICE.student, inM, outM);
const labelling =
  ((DATASETS.fineTuneSet * TOKENS.inputPerRequest) / 1e6) * PRICE.teacher.in +
  ((DATASETS.fineTuneSet * TOKENS.outputPerRequest) / 1e6) * PRICE.teacher.out;
const usd = (v: number) => `$${n(Math.round(v * 100) / 100)}`;
const BAR_X = 150;
const COST_W = 440;
const costW = (v: number) => Math.max(8, Math.round((v / teacher) * COST_W));
const gold = DATASETS.goldenSet;
const passT = 184;
const passS = 176;
const qW = (v: number) => Math.round((v / gold) * COST_W);

const bar = (id: string, y: number, w: number, tone: LayoutShape["tone"], step: number, hl = false): LayoutShape => ({
  id,
  type: "cell",
  x: BAR_X,
  y,
  w,
  h: 32,
  tone,
  fill: "pastel",
  step,
  highlight: hl || undefined,
});

const shapes: LayoutShape[] = [
  leftNote("h-cost", 30, 28, "Daily cost for 440 M input and 50 M output tokens (prices illustrative)", { step: 1 }),
  note("l-t", 30, 78, 110, "Teacher", { tone: PROD_TONE.model, step: 1 }),
  bar("c-t", 70, costW(teacher), PROD_TONE.model, 1),
  note("v-t", BAR_X + costW(teacher) + 8, 78, 70, usd(teacher), { tone: PROD_TONE.model, step: 1 }),
  leftNote(
    "w-t",
    BAR_X,
    106,
    `440 × $${PRICE.teacher.in} + 50 × $${PRICE.teacher.out} = ${usd(inM * PRICE.teacher.in)} + ${usd(outM * PRICE.teacher.out)}`,
    { step: 1 }
  ),
  note("l-s", 30, 142, 110, "Student", { tone: T.trained, step: 1 }),
  bar("c-s", 134, costW(student), T.trained, 1, true),
  note("v-s", BAR_X + costW(student) + 8, 142, 60, usd(student), { tone: T.trained, step: 1 }),
  leftNote(
    "w-s",
    BAR_X,
    170,
    `440 × $${PRICE.student.in} + 50 × $${PRICE.student.out.toFixed(2)} = ${usd(inM * PRICE.student.in)} + ${usd(outM * PRICE.student.out)}`,
    { step: 1 }
  ),
  note(
    "ratio",
    30,
    204,
    780,
    `${(teacher / student).toFixed(1)} times cheaper a day. A year: ${usd(teacher * 365)} against ${usd(student * 365)}.`,
    {
      tone: T.trained,
      step: 2,
    }
  ),
  leftNote("h-q", 30, 244, "Pass rate on the 200-ticket golden set (illustrative)", {
    tone: PROD_TONE.check,
    step: 3,
  }),
  note("ql-t", 30, 276, 110, "Teacher", { tone: PROD_TONE.model, step: 3 }),
  bar("q-t", 268, qW(passT), PROD_TONE.check, 3),
  note("qv-t", BAR_X + qW(passT) + 8, 276, 110, `${passT} of ${gold} (${((passT / gold) * 100).toFixed(0)} %)`, {
    tone: PROD_TONE.check,
    step: 3,
  }),
  note("ql-s", 30, 320, 110, "Student", { tone: T.trained, step: 3 }),
  bar("q-s", 312, qW(passS), PROD_TONE.check, 3),
  note("qv-s", BAR_X + qW(passS) + 8, 320, 110, `${passS} of ${gold} (${((passS / gold) * 100).toFixed(0)} %)`, {
    tone: PROD_TONE.check,
    step: 3,
  }),
  note(
    "once",
    30,
    362,
    780,
    `One-off: the teacher labels ${n(DATASETS.fineTuneSet)} prompts for ${usd(labelling)}, plus the training run. Whether a 4-point gap is acceptable is the product decision.`,
    {
      step: 3,
    }
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Daily cost on the teacher and on the student",
  width: 830,
  height: 400,
  steps: [
    { title: "Daily cost, teacher and student" },
    { title: "The gap over a year" },
    { title: "What the student gives up" },
  ],
  shapes,
};

export default spec;
