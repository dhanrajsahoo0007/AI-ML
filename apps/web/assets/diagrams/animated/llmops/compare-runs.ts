import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE } from "@/components/diagrams/presets/production";
import { RUNS, costPerRequest, halfWidth, note } from "@/components/diagrams/presets/production-ops";

// Two runs side by side with computed deltas (experiment-tracking-version-control, Deep dive). Run r-0187 (prompt p12)
// against run r-0188 (prompt p13): same data, same base model, same golden set; only the prompt differs.
//
// Working (RUNS in production-ops.ts; counts illustrative, shared with the release pipeline):
//   Pass rate: 184 / 200 = 92 %; 164 / 200 = 82 %; delta -10 points.
//   Refund-limit cases: 12 of 12 for both; delta 0.
//   Mean output tokens: 250 and 290 (illustrative); delta +40 = +16 %.
//   Cost per request at the illustrative list price ($2 in, $10 out per million tokens), input 2,200 tokens:
//     p12 2,200 x 2 / 1e6 + 250 x 10 / 1e6 = $0.0044 + $0.0025 = $0.0069; p13 $0.0044 + 290 x 10 / 1e6 = $0.0073;
//     delta +$0.0004 = +5.8 %, written "+6 %".
//   Noise: 95 % half-width 1.96 x sqrt(p (1 - p) / 200): p = 0.92 -> 3.8 points; p = 0.82 -> 5.3 points; the gap
//   between two independent rates has half-width sqrt(3.8^2 + 5.3^2) = 6.5 points. A 10-point gap is larger.
//
// Steps: 1 what differs (the inputs) · 2 the metrics with deltas · 3 is the gap bigger than the noise.
// Layout (880 x 400): a table of cells; label column x 15 (w 220), columns x 255 / 455 / 655 (w 190); header y 20 (h 40);
// rows y 70 + 56 i (h 48), six rows in total (prompt, data and base, pass rate, refund cases, output tokens, cost);
// a note at y 330 for step 3. Colour (three tones plus neutral): headers neutral, same values lime-free blue for
// inputs, lime for metrics, red on the worse pass-rate delta only.

const COLS = [255, 455, 655] as const;
const ROW0 = 70;
const PITCH = 52;

const hw = (pass: number) => halfWidth(pass, DATASETS.goldenSet) * 100;
const gap = Math.sqrt(hw(RUNS.a.pass) ** 2 + hw(RUNS.b.pass) ** 2);
const pctOf = (pass: number) => Math.round((pass / DATASETS.goldenSet) * 100);
const dPoints = pctOf(RUNS.b.pass) - pctOf(RUNS.a.pass);
const costA = costPerRequest(RUNS.a.outputTokens);
const costB = costPerRequest(RUNS.b.outputTokens);

const cell = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone,
  step: number,
  sub?: string,
  fill: LayoutShape["fill"] = "soft"
): LayoutShape => ({ id, type: "cell", x, y, w, h: 44, label, sub, tone, fill, step, quiet: true });

const shapes: LayoutShape[] = [
  cell("h-0", 15, 20, 220, "", PROD_TONE.infra, 1),
  cell("h-a", COLS[0], 20, 190, `${RUNS.a.id}`, PROD_TONE.infra, 1, `prompt ${RUNS.a.prompt}`, "pastel"),
  cell("h-b", COLS[1], 20, 190, `${RUNS.b.id}`, PROD_TONE.infra, 1, `prompt ${RUNS.b.prompt}`, "pastel"),
  cell("h-d", COLS[2], 20, 190, "Delta", PROD_TONE.infra, 1, "second minus first", "pastel"),
];

const rows: {
  key: string;
  name: string;
  a: string;
  b: string;
  d: string;
  tone: LayoutTone;
  step: number;
  bad?: boolean;
}[] = [
  {
    key: "prompt",
    name: "Prompt version",
    a: RUNS.a.prompt,
    b: RUNS.b.prompt,
    d: "changed",
    tone: PROD_TONE.data,
    step: 1,
  },
  {
    key: "inputs",
    name: "Data and base model",
    a: "tickets-v3, m6",
    b: "tickets-v3, m6",
    d: "same",
    tone: PROD_TONE.data,
    step: 1,
  },
  {
    key: "pass",
    name: "Golden-set pass rate",
    a: `${RUNS.a.pass} of ${DATASETS.goldenSet} = ${pctOf(RUNS.a.pass)} %`,
    b: `${RUNS.b.pass} of ${DATASETS.goldenSet} = ${pctOf(RUNS.b.pass)} %`,
    d: `${dPoints} points`,
    tone: PROD_TONE.check,
    step: 2,
    bad: true,
  },
  {
    key: "refund",
    name: "Refund-limit cases",
    a: `${RUNS.a.refundOk} of 12`,
    b: `${RUNS.b.refundOk} of 12`,
    d: `${RUNS.b.refundOk - RUNS.a.refundOk}`,
    tone: PROD_TONE.check,
    step: 2,
  },
  {
    key: "tokens",
    name: "Output tokens per answer",
    a: `${RUNS.a.outputTokens}`,
    b: `${RUNS.b.outputTokens}`,
    d: `+${RUNS.b.outputTokens - RUNS.a.outputTokens} (+${Math.round(((RUNS.b.outputTokens - RUNS.a.outputTokens) / RUNS.a.outputTokens) * 100)} %)`,
    tone: PROD_TONE.check,
    step: 2,
  },
  {
    key: "cost",
    name: "Cost per answer (illustrative)",
    a: `$${costA.toFixed(4)}`,
    b: `$${costB.toFixed(4)}`,
    d: `+$${(costB - costA).toFixed(4)} (+${Math.round(((costB - costA) / costA) * 100)} %)`,
    tone: PROD_TONE.check,
    step: 2,
  },
];

rows.forEach((r, i) => {
  const y = ROW0 + i * PITCH;
  shapes.push(cell(`${r.key}-n`, 15, y, 220, r.name, PROD_TONE.infra, r.step));
  shapes.push(cell(`${r.key}-a`, COLS[0], y, 190, r.a, r.tone, r.step));
  shapes.push(cell(`${r.key}-b`, COLS[1], y, 190, r.b, r.tone, r.step));
  shapes.push(
    cell(
      `${r.key}-d`,
      COLS[2],
      y,
      190,
      r.d,
      r.bad ? PROD_TONE.failure : r.tone,
      r.step,
      undefined,
      r.bad ? "pastel" : "soft"
    )
  );
});

shapes.push(
  note(
    "noise",
    15,
    ROW0 + rows.length * PITCH + 8,
    850,
    44,
    `95 % ranges: ±${hw(RUNS.a.pass).toFixed(1)} and ±${hw(RUNS.b.pass).toFixed(1)} points, so the gap's own range is ±${gap.toFixed(1)}.\nA ${Math.abs(dPoints)}-point gap is larger than that: the drop is real, not noise.`,
    3
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Two runs side by side with computed deltas",
  width: 880,
  height: 450,
  steps: [
    { title: "Only the prompt differs" },
    { title: "Metrics and deltas, computed" },
    { title: "Is the gap bigger than the noise?" },
  ],
  shapes,
};

export default spec;
