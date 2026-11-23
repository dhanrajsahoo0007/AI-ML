import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";

// The four families of quality metric (quality-metrics, "Core concepts"). Each family is a column: a header box with
// its examples, then three boxes: what it needs, what it costs, what it is blind to. Five steps:
//   1 reference-based (blue): exact match, BLEU, ROUGE; needs a reference; costs string arithmetic; blind to a right
//     answer in other words
//   2 embedding-based (pink): BERTScore, cosine similarity; needs a reference and an encoder model; one small model
//     pass; blind to a flipped number or a "no"
//   3 judge-based (green): a rubric score from an LLM; needs a rubric; one model call per score; length and position bias
//   4 task-based (teal): did the job get done; needs an outcome you can check; a test harness or a label; a pass or
//     fail says nothing about why
//   5 an arrow under the columns: usually closer to what the customer wants, and costlier to run (relative, not measured)
// No numbers are drawn.
//
// Grid (880 wide): columns x 10 + 220 c, w 200; header y 14, h 62; rows y 94 + 58 r, h 50; arrow y 290.
// Colours (PROD_TONE): reference blue (the reference is data), embeddings pink, judge green (a model), task teal
// (an action). Four tones plus neutral.

const COL = { x: 10, step: 220, w: 200 } as const;
const rowY = (r: number) => 94 + r * 58;

const families = [
  {
    id: "ref",
    tone: PROD_TONE.data,
    label: "Reference-based",
    sub: "exact match, BLEU, ROUGE",
    rows: [
      ["Needs", "a reference answer"],
      ["Costs", "string maths, no model"],
      ["Blind to", "a right answer, reworded"],
    ],
  },
  {
    id: "emb",
    tone: "pink",
    label: "Embedding-based",
    sub: "BERTScore, cosine similarity",
    rows: [
      ["Needs", "a reference and an encoder"],
      ["Costs", "one small model pass"],
      ["Blind to", "a flipped number or a no"],
    ],
  },
  {
    id: "judge",
    tone: PROD_TONE.model,
    label: "Judge-based",
    sub: "rubric score from an LLM",
    rows: [
      ["Needs", "a rubric, maybe a reference"],
      ["Costs", "one model call per score"],
      ["Blind to", "its own length and order bias"],
    ],
  },
  {
    id: "task",
    tone: PROD_TONE.compute,
    label: "Task-based",
    sub: "did the job get done",
    rows: [
      ["Needs", "an outcome you can check"],
      ["Costs", "a test harness or a label"],
      ["Blind to", "why it failed"],
    ],
  },
] as const;

const shapes: LayoutShape[] = [];
families.forEach((f, c) => {
  const x = COL.x + c * COL.step;
  const step = c + 1;
  shapes.push({
    id: `${f.id}-head`,
    type: "box",
    x,
    y: 14,
    w: COL.w,
    h: 62,
    label: f.label,
    sub: f.sub,
    tone: f.tone,
    fill: "pastel",
    step,
  });
  f.rows.forEach(([label, sub], r) =>
    shapes.push({
      id: `${f.id}-r${r}`,
      type: "box",
      x,
      y: rowY(r),
      w: COL.w,
      h: 50,
      label,
      sub,
      tone: f.tone,
      fill: "paper",
      step,
      quiet: true,
    })
  );
});
shapes.push(
  {
    id: "axis-from",
    type: "cell",
    x: COL.x + 100,
    y: 292,
    w: 8,
    h: 8,
    tone: PROD_TONE.infra,
    fill: "soft",
    step: 5,
    quiet: true,
  },
  {
    id: "axis-to",
    type: "cell",
    x: COL.x + 3 * COL.step + 92,
    y: 292,
    w: 8,
    h: 8,
    tone: PROD_TONE.infra,
    fill: "soft",
    step: 5,
    quiet: true,
  },
  {
    id: "axis",
    type: "arrow",
    x: 0,
    y: 0,
    from: "axis-from",
    to: "axis-to",
    label: "usually closer to what the customer wants, and costlier to run",
    tone: PROD_TONE.infra,
    step: 5,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Four families of quality metric",
  width: 880,
  height: 322,
  steps: [
    { title: "Reference-based: compare words with a reference" },
    { title: "Embedding-based: compare meaning with a reference" },
    { title: "Judge-based: a model grades against a rubric" },
    { title: "Task-based: check the outcome" },
    { title: "Further right is closer to the goal and costlier" },
  ],
  shapes,
};

export default spec;
