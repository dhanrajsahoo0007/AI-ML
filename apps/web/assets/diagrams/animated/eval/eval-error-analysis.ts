import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import {
  ERROR_MODES,
  ERROR_SAMPLE,
  ERROR_TEST,
  ERROR_TOP,
  ERROR_TOP_SHARE,
  ERROR_TOTAL,
} from "@/components/diagrams/presets/production-eval";

// Error analysis on Brightpost (llm-evaluation-fundamentals, Worked example). Four steps, one idea each:
//   1 read 50 traces: a 10 × 5 grid of blue cells (data), the sample is 50 traces a customer rated thumbs-down or that were
//     handed to a person;
//   2 name the failure modes: seven rows, one phrase each (letters A to G, neutral);
//   3 count them: a bar per mode, 18 px per trace; the largest bar is red (where something breaks);
//     14 + 9 + 8 + 7 + 5 + 4 + 3 = 50 (the sum is computed, and the preset throws if it is not 50);
//   4 write a targeted test: the largest mode, 14 ÷ 50 = 28 %, becomes a lime code check with 14 cases.
// ILLUSTRATIVE counts: the figure shows the method, not measured data.
// Grid: cells 24 px at pitch 28 from x 20, y 50; mode rows x 330 (w 270), bars x 610, rows y 48 + 32 × i (h 26);
// the test card x 330, y 306, w 530, h 56; the arrow runs in the gutter at x 318.
// Colours: blue (traces), neutral (modes), red (the largest mode), lime (the test).

const ROW_Y = (i: number) => 48 + 32 * i;
const shapes: LayoutShape[] = [];

shapes.push({
  id: "head-grid",
  type: "text",
  x: 20,
  y: 20,
  w: 250,
  h: 20,
  label: `${ERROR_SAMPLE} traces to read (illustrative)`,
  tone: PROD_TONE.infra,
  quiet: true,
});
for (let i = 0; i < ERROR_SAMPLE; i++) {
  shapes.push({
    id: `t-${i}`,
    type: "cell",
    x: 20 + (i % 10) * 28,
    y: 50 + Math.floor(i / 10) * 28,
    w: 24,
    h: 24,
    tone: PROD_TONE.data,
    fill: "soft",
    quiet: true,
  });
}
shapes.push({
  id: "note-grid",
  type: "text",
  x: 20,
  y: 200,
  w: 270,
  h: 36,
  label: "Each cell is one trace:\nthe question, the steps, the answer",
  tone: PROD_TONE.data,
  quiet: true,
});

ERROR_MODES.forEach((m, i) => {
  const top = m.id === ERROR_TOP.id;
  shapes.push(
    {
      id: `mode-${m.id}`,
      type: "box",
      x: 330,
      y: ROW_Y(i),
      w: 270,
      h: 26,
      label: `${m.short}  ${m.name}`,
      tone: PROD_TONE.infra,
      fill: "pastel",
      step: 2,
      quiet: true,
    },
    {
      id: `bar-${m.id}`,
      type: "box",
      x: 610,
      y: ROW_Y(i),
      w: m.count * 18,
      h: 26,
      label: String(m.count),
      tone: top ? PROD_TONE.failure : PROD_TONE.data,
      fill: "pastel",
      step: 3,
      quiet: true,
      highlight: (top && undefined) || undefined,
    }
  );
});

shapes.push(
  {
    id: "sum",
    type: "text",
    x: 610,
    y: ROW_Y(ERROR_MODES.length) + 2,
    w: 250,
    h: 20,
    label: `${ERROR_MODES.map((m) => m.count).join(" + ")} = ${ERROR_TOTAL}`,
    tone: PROD_TONE.infra,
    step: 3,
    quiet: true,
  },
  {
    id: "test",
    type: "box",
    x: 330,
    y: 306,
    w: 530,
    h: 56,
    label: `Test: ${ERROR_TEST.name}`,
    sub: `${ERROR_TEST.cases} cases from mode A, ${Math.round(ERROR_TOP_SHARE * 100)} % of the sample, a code check`,
    tone: PROD_TONE.check,
    fill: "pastel",
    step: 4,
    highlight: true,
  },
  {
    id: "to-test",
    type: "arrow",
    x: 0,
    y: 0,
    from: `mode-${ERROR_TOP.id}`,
    to: "test",
    via: [
      [316, ROW_Y(0) + 13],
      [316, 334],
    ],
    step: 4,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Error analysis: read 50 traces, name the failure modes, count them, write a targeted test",
  width: 880,
  height: 380,
  steps: [
    { title: "Read fifty traces by hand" },
    { title: "Name the failure modes" },
    { title: "Count them" },
    { title: "Write a test for the largest" },
  ],
  shapes,
};

export default spec;
