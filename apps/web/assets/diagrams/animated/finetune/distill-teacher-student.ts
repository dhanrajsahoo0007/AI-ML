import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { FINETUNE_TONE as T, PROD_TONE } from "@/components/diagrams/presets/production";
import {
  DISTILL_T,
  DISTILL_TOKENS,
  STUDENT_LOGITS,
  TEACHER_LOGITS,
  kl,
  leftNote,
  note,
  softmax,
} from "@/components/diagrams/presets/production-finetune";

// "Soft labels with temperature" on the Distillation & Small Models page (Architecture). Hinton, Vinyals and Dean
// (2015, arXiv 1503.02531): q_i = exp(z_i ÷ T) ÷ Σ_j exp(z_j ÷ T); T is normally 1 and a higher T gives a softer
// distribution; the soft-target gradients shrink by 1/T², so that term is multiplied by T²; the student trains on a
// weighted average of the soft-target loss and the ordinary loss on the true label.
// Four candidate first words of a reply to the refund case. Logits (illustrative): teacher 6, 4, 2, 0; student part-way
// through training 3, 3, 1, 0.
//   Teacher T = 1: 0.865, 0.117, 0.016, 0.002 · Teacher T = 4 (logits ÷ 4 = 1.5, 1, 0.5, 0): 0.455, 0.276, 0.167, 0.102.
//   Student T = 4: 0.325, 0.325, 0.197, 0.153. KL(teacher ‖ student) at T = 4 = 0.039 nats; × T² = 16 → 0.63.
// Steps: 1 the teacher at T = 1 (nearly one-hot) · 2 the teacher at T = 4 (the runners-up show) · 3 the student at T = 4
// and the loss. Grid: rows 44 apart from y 80, bars x 130, 370, 610 (200 px = probability 1.0).
// Colours: teacher green (the model), student orange (the weights being trained), the loss lime (a check).

const COLS = [
  { id: "t1", x: 130, title: "Teacher, T = 1", step: 1, tone: PROD_TONE.model, probs: softmax(TEACHER_LOGITS, 1) },
  {
    id: "t4",
    x: 370,
    title: `Teacher, T = ${DISTILL_T}`,
    step: 2,
    tone: PROD_TONE.model,
    probs: softmax(TEACHER_LOGITS, DISTILL_T),
  },
  {
    id: "s4",
    x: 610,
    title: `Student, T = ${DISTILL_T}`,
    step: 3,
    tone: T.trained,
    probs: softmax(STUDENT_LOGITS, DISTILL_T),
  },
];
const BAR = 200;
const ROW = (i: number) => 84 + i * 44;
const klT = kl(softmax(TEACHER_LOGITS, DISTILL_T), softmax(STUDENT_LOGITS, DISTILL_T));

const shapes: LayoutShape[] = [];
DISTILL_TOKENS.forEach((tok, i) => shapes.push(note(`tok-${i}`, 30, ROW(i) + 5, 90, tok, { step: 1 })));
COLS.forEach((c) => {
  shapes.push(note(`h-${c.id}`, c.x, 40, 200, c.title, { tone: c.tone, step: c.step }));
  c.probs.forEach((p, i) => {
    const w = Math.max(3, Math.round(p * BAR));
    shapes.push(
      {
        id: `${c.id}-${i}`,
        type: "cell",
        x: c.x,
        y: ROW(i),
        w,
        h: 28,
        tone: c.tone,
        fill: "pastel",
        step: c.step,
        quiet: true,
      },
      note(`${c.id}-v${i}`, c.x + w + 6, ROW(i) + 5, 44, p.toFixed(3), { tone: c.tone, step: c.step })
    );
  });
});
shapes.push(
  leftNote("f1", 30, 270, "Logits ÷ T, then softmax: q = exp(z ÷ T) ÷ Σ exp(z ÷ T).", { step: 1 }),
  note(
    "f2",
    30,
    296,
    700,
    "A higher T flattens the teacher: 0.865 for “Refund” becomes 0.455, and the runners-up show.",
    { step: 2 }
  ),
  note(
    "f3",
    30,
    330,
    760,
    `KL(teacher ‖ student) at T = ${DISTILL_T}: ${klT.toFixed(3)}, × T² = ${DISTILL_T ** 2} → ${(klT * DISTILL_T ** 2).toFixed(2)}.`,
    {
      tone: PROD_TONE.check,
      step: 3,
    }
  ),
  note(
    "f4",
    30,
    356,
    760,
    "Loss = α · T² · KL(soft targets) + (1 − α) · cross-entropy(true label). Logits are illustrative.",
    {
      tone: PROD_TONE.check,
      step: 3,
    }
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Soft labels: the teacher at two temperatures and a student",
  width: 880,
  height: 390,
  steps: [
    { title: "At T = 1 the teacher is almost certain" },
    { title: "At T = 4 the runners-up show" },
    { title: "The student matches the soft targets" },
  ],
  shapes,
};

export default spec;
