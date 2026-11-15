import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE, curve } from "@/components/diagrams/presets/production";
import { PASS_RATE, f1, halfWidth } from "@/components/diagrams/presets/production-datasets";

// How wide is the uncertainty on a pass rate, against the number of cases? Normal approximation, 95 %:
//   half-width = 1.96 × √(p (1 − p) / n), p = 0.8, in percentage points
//   n = 50 -> 11.1   n = 100 -> 7.8   n = 200 -> 5.5   n = 400 -> 3.9   n = 800 -> 2.8
//   n = 200: 1.96 × √(0.16 / 200) = 1.96 × 0.02828 = 0.0554 = 5.5 points
//   four times the cases halves the width (200 -> 800: 5.5 -> 2.8)
// Plot x = cases n (0 to 1,000, curve drawn from 50 where the approximation is reasonable: n p and n (1 - p) both at
// least about 10), y = half-width in points (0 to 12). Three steps:
//   1 the curve; 2 Brightpost's 200 tickets: ± 5.5; 3 four times the cases (800) for ± 2.8, and the per-intent view.
// Every point is computed here from the formula; the pass rate 80 % is Brightpost's example, not a measurement.
//
// Grid: plot 16-640 across, 6-360 down; working panel x 664-870. Colours (PROD_TONE): curve lime (a check's
// precision), marks neutral with one highlight.

const PLOT = { x: 16, y: 6, w: 632, h: 360 } as const;
const common = {
  width: PLOT.w,
  height: PLOT.h,
  xDomain: [0, 1000] as [number, number],
  yDomain: [0, 12] as [number, number],
  xTicks: [0, 200, 400, 600, 800, 1000],
  yTicks: [0, 2, 4, 6, 8, 10, 12],
  formatY: (v: number) => `±${v}`,
  xLabel: "cases in the test set (n)",
  yLabel: "95 % interval, half-width in points (pass rate 80 %)",
};
const points: [number, number][] = [];
for (let n = 50; n <= 1000; n += 10) points.push([n, halfWidth(n)]);

const onlyData = (s: LayoutShape[]) => s.filter((x) => /-(s|m)\d+(-label)?$/.test(x.id));
const shapes: LayoutShape[] = [
  ...curve("sz", PLOT.x, PLOT.y, {
    ...common,
    step: 1,
    series: [{ points, tone: PROD_TONE.check }],
  }),
  ...onlyData(
    curve("sy", PLOT.x, PLOT.y, {
      ...common,
      step: 2,
      series: [],
      marks: [
        {
          x: DATASETS.goldenSet,
          y: halfWidth(DATASETS.goldenSet),
          label: `n = ${DATASETS.goldenSet}: ±${f1(halfWidth(DATASETS.goldenSet))}`,
          tone: PROD_TONE.infra,
          place: "above-right",
        },
      ],
    })
  ),
  ...onlyData(
    curve("sx", PLOT.x, PLOT.y, {
      ...common,
      step: 3,
      series: [],
      marks: [
        {
          x: 800,
          y: halfWidth(800),
          label: `n = 800: ±${f1(halfWidth(800))}`,
          tone: PROD_TONE.infra,
          place: "above",
        },
      ],
    })
  ),
];
shapes.forEach((s) => {
  if (!/-s\d+$/.test(s.id) && !/-m\d+$/.test(s.id)) s.quiet = true;
  else if (/-m\d+$/.test(s.id)) s.quiet = false;
});
const ring = shapes.find((s) => s.id === "sy-m0");
if (ring) ring.highlight = true;

const PX = 664;
const PW = 206;
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

panel("p1", 20, `half-width =\n1.96 × √(p (1 − p) / n)\nhere p = ${PASS_RATE}`, 1);
panel("p1b", 90, "Shrinks with the square\nroot of n, not with n", 1);
panel(
  "p2",
  170,
  `n = ${DATASETS.goldenSet}:\n1.96 × √(0.16 ÷ ${DATASETS.goldenSet})\n= 1.96 × 0.0283 = ${f1(halfWidth(DATASETS.goldenSet))} points`,
  2
);
panel("p2b", 240, `80 % measured: the true rate\nlies near 74.5 to 85.5 %`, 2, PROD_TONE.check);
panel("p3", 290, `4× the cases halves it:\nn = 800 gives ±${f1(halfWidth(800))}`, 3);
panel("p4", 340, `One intent, n = 34: ±${f1(halfWidth(34))}\n(rough: n is small)`, 3, PROD_TONE.failure);

const spec: LayoutSpec = {
  kind: "layout",
  title: "How the interval on a pass rate shrinks with the test set",
  width: 880,
  height: 392,
  steps: [
    { title: "The interval narrows with the square root of n" },
    { title: "Brightpost's 200 tickets: plus or minus 5.5 points" },
    { title: "Four times the cases for half the width" },
  ],
  shapes,
};

export default spec;
