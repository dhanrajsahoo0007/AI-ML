import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, curve, n } from "@/components/diagrams/presets/production";
import { BASELINE, JUDGE_FLIP, observedRate, sampleSizePerArm } from "@/components/diagrams/presets/production-ab";

// Requests per arm needed to detect a lift (ab-testing-prompts-models, Core concepts: sample size). Plot x = absolute
// lift in resolution rate, 2 to 10 points, from a 70 % baseline; y = requests per arm. Two-sided α = 0.05, power 0.8,
// the standard two-proportion formula (presets/production-ab.ts sampleSizePerArm):
//   n = (1.959964 + 0.841621)² × (p1 q1 + p2 q2) ÷ (p2 − p1)² = 7.849 × (p1 q1 + p2 q2) ÷ δ².
// Three steps:
//   1 the curve: 10 points 291, 5 points 1,248, 2 points 8,077 (all rounded up). Halving the lift roughly quadruples n.
//   2 the working for 5 points: 7.849 × (0.21 + 0.1875) ÷ 0.0025 = 1,248.
//   3 a judge-scored metric that flips 10 % of verdicts at random (illustrative) turns 0.70 into 0.66 and a 5-point
//     lift into 4 points (0.66 → 0.70), so the dashed curve needs 2,131 per arm at the same true lift.
// Grid: plot x 16-576, y 6-400; working panel x 600-870. Colours (PROD_TONE): ideal curve lime (a statistical check),
// judge-noise curve green (the model grades), marks neutral with one highlight.

const PLOT = { x: 16, y: 6, w: 560, h: 404 } as const;
const common = {
  width: PLOT.w,
  height: PLOT.h,
  xDomain: [2, 10] as [number, number],
  yDomain: [0, 14_000] as [number, number],
  xTicks: [2, 4, 6, 8, 10],
  yTicks: [0, 4_000, 8_000, 12_000],
  formatX: (v: number) => `${v}`,
  xLabel: "lift to detect, in percentage points (from a 70 % baseline)",
  yLabel: "requests per arm",
};
const lifts = Array.from({ length: 17 }, (_, i) => 2 + i * 0.5);
const ideal = lifts.map((pt): [number, number] => [pt, sampleSizePerArm(BASELINE, pt / 100)]);
const noisy = lifts.map((pt): [number, number] => {
  const p1 = observedRate(BASELINE);
  return [pt, sampleSizePerArm(p1, (1 - 2 * JUDGE_FLIP) * (pt / 100))];
});
const at = (pt: number) => ideal.find(([x]) => x === pt)![1];
const noisyAt5 = noisy.find(([x]) => x === 5)![1];

const onlyData = (s: LayoutShape[]) => s.filter((x) => /-(s|m)\d+(-label)?$/.test(x.id));

const shapes: LayoutShape[] = [
  ...curve("ss", PLOT.x, PLOT.y, {
    ...common,
    step: 1,
    series: [{ points: ideal, tone: PROD_TONE.check }],
    marks: [
      { x: 2, y: at(2), label: `2 points: ${n(at(2))}`, place: "above-right", nudge: [40, 0] },
      { x: 5, y: at(5), label: `5 points: ${n(at(5))}`, place: "below-left" },
      { x: 10, y: at(10), label: `10 points: ${n(at(10))}`, place: "above-left", nudge: [0, -12] },
    ],
  }),
  ...onlyData(
    curve("sn", PLOT.x, PLOT.y, {
      ...common,
      step: 3,
      series: [{ points: noisy, tone: PROD_TONE.model, dashed: true }],
      marks: [
        { x: 5, y: noisyAt5, label: `${n(noisyAt5)} with a noisy judge`, tone: PROD_TONE.model, place: "above-right" },
      ],
    })
  ),
];
shapes.forEach((s) => {
  if (!/-s\d+$/.test(s.id) && !/-m\d+$/.test(s.id)) s.quiet = true;
});
const ring = shapes.find((s) => s.id === "ss-m1");
if (ring) ring.highlight = true;

const PX = 600;
const PW = 272;
const panel = (id: string, y: number, label: string, step: number, tone: LayoutShape["tone"] = PROD_TONE.infra) =>
  shapes.push({
    id,
    type: "text",
    x: PX,
    y,
    w: PW,
    h: 18 * label.split("\n").length,
    label,
    tone,
    step,
    quiet: true,
  });

panel("p1", 24, "Per arm, to see a lift from a\n70 % baseline (α = 0.05,\npower 0.8, two-sided)", 1);
panel(
  "p2",
  108,
  `Halve the lift and you need about\nfour times the requests: ${n(at(10))} at\n10 points, ${n(at(5))} at 5 points`,
  1
);
panel("p3", 212, "n = 7.849 × (p₁q₁ + p₂q₂) ÷ δ²\nwhere 7.849 = (1.960 + 0.842)²", 2);
panel("p4", 270, `5 points, 0.70 → 0.75:\n7.849 × (0.21 + 0.1875) ÷ 0.0025\n= ${n(at(5))} per arm`, 2);
panel(
  "p5",
  352,
  `A judge that flips 10 % of verdicts\nreads 0.70 as 0.66, 0.75 as 0.70:\na 4-point lift needs ${n(noisyAt5)}`,
  3,
  PROD_TONE.model
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Requests per arm to detect a lift",
  width: 880,
  height: 424,
  steps: [
    { title: "The smaller the lift, the more requests" },
    { title: "The formula, worked for 5 points" },
    { title: "A noisy judge shrinks the lift you can see" },
  ],
  shapes,
};

export default spec;
