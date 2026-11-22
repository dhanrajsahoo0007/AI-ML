import type { DiagramSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE, REFUND_CASE, n } from "@/components/diagrams/presets/production";

// A model judge grades one Brightpost answer (llm-as-judge-evaluation, Architecture). Three inputs meet in the judge
// prompt: the customer's question, the assistant's answer and the rubric. The judge model writes its reason first and
// then a verdict; the verdict is stored with the ticket; a person spot-checks a sample against it.
//
// Five steps: 1 the three inputs · 2 they become one judge prompt and reach the judge model · 3 the judge writes a
// reason, then a verdict · 4 the verdict is stored for each of the 200 tickets · 5 a person checks a sample.
// Nodes never move between steps.
//
// Layout: inputs in a column at x 110 (rows 90, 200, 310); judge prompt x 370 row 200; judge model x 640 row 200;
// verdict x 640 row 330; results x 370 row 330; person x 110 row 430.
//
// Colour (production legend, four tones plus neutral): the question orange, the answer and the judge model green,
// the rubric blue (data), the verdict lime (a check), results violet (a store), the prompt neutral, the person orange.
// The judge model is the accent.

const spec: DiagramSpec = {
  title: "A model judge: question, answer and rubric in, reason and verdict out",
  width: 820,
  height: 500,
  steps: [
    { title: "Three inputs" },
    { title: "One judge prompt" },
    { title: "Reason first, then a verdict" },
    { title: "Stored for every ticket" },
    { title: "A person checks a sample" },
  ],
  zones: [],
  nodes: [
    {
      id: "question",
      label: "Question",
      sub: `order ${REFUND_CASE.orderId}, £${REFUND_CASE.price} kettle`,
      icon: "chat",
      tone: PROD_TONE.traffic,
      fill: "pastel",
      x: 110,
      y: 90,
      w: 190,
    },
    {
      id: "answer",
      label: "Assistant answer",
      sub: "what we are grading",
      icon: "model",
      tone: PROD_TONE.model,
      fill: "pastel",
      x: 110,
      y: 200,
      w: 190,
    },
    {
      id: "rubric",
      label: "Rubric",
      sub: "pass or fail, with anchors",
      icon: "policy",
      tone: PROD_TONE.data,
      fill: "pastel",
      x: 110,
      y: 310,
      w: 190,
    },
    {
      id: "prompt",
      label: "Judge prompt",
      sub: "all three, one template",
      icon: "prompt",
      tone: PROD_TONE.infra,
      x: 370,
      y: 200,
      w: 180,
      step: 2,
    },
    {
      id: "judge",
      label: "Judge model",
      sub: "a different model family",
      icon: "model",
      tone: PROD_TONE.model,
      accent: true,
      x: 640,
      y: 200,
      w: 186,
      step: 2,
    },
    {
      id: "verdict",
      label: "Verdict",
      sub: "reason, then pass or fail",
      icon: "meter",
      tone: PROD_TONE.check,
      fill: "pastel",
      x: 640,
      y: 330,
      w: 194,
      step: 3,
    },
    {
      id: "results",
      label: "Results store",
      sub: `${n(DATASETS.goldenSet)} tickets per run`,
      icon: "database",
      tone: PROD_TONE.store,
      fill: "pastel",
      x: 370,
      y: 330,
      w: 180,
      step: 4,
    },
    {
      id: "person",
      label: "Person",
      sub: "reads a sample",
      icon: "users",
      tone: PROD_TONE.traffic,
      variant: "glyph",
      x: 110,
      y: 430,
      step: 5,
    },
  ],
  edges: [
    { from: "question", to: "prompt", label: "question", packet: true, labelAt: 0.45 },
    { from: "answer", to: "prompt", label: "answer", packet: true, labelAt: 0.5, delay: 0.4 },
    { from: "rubric", to: "prompt", label: "criteria", packet: true, labelAt: 0.45, delay: 0.8 },
    { from: "prompt", to: "judge", label: "one call", packet: true, step: 2 },
    { from: "judge", to: "verdict", label: "JSON", packet: true, step: 3 },
    { from: "verdict", to: "results", label: "save", packet: true, step: 4 },
    { from: "results", to: "person", label: "sample", dashed: true, flow: true, step: 5 },
  ],
};

export default spec;
