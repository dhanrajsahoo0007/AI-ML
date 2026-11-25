import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, curve, n } from "@/components/diagrams/presets/production";
import {
  API_EACH,
  BREAK_EVEN,
  GPU,
  MONTH,
  STEP_PER_REPLICA,
  apiMonth,
  fleetMonth,
  usd0,
} from "@/components/diagrams/presets/production-capacity";

// A per-token API bill against a fixed GPU bill as daily volume grows (capacity-planning-and-cost-estimation,
// "API versus self-hosting break-even"). Plot x = requests a day in thousands (0-220), y = dollars a month (0-45,000).
// Three steps:
//   1 two bills. The API bill is a straight line: requests × 30 × $0.0069 (mid-size model, illustrative $2 in / $10 out
//     per million tokens). The fleet is a staircase: replicas × 720 h × $3 = $2,160 each; 2 replicas up to 117,818 a
//     day, then 3 up to 235,636 (same sizing rule as LLM Serving & Inference: peak 5 ×, 60 % target, one spare).
//   2 break-even: the fleet's minimum 2 × $2,160 = $4,320 ÷ ($0.0069 × 30 = $0.207 per daily request) = 20,870 a day,
//     about a tenth of Brightpost's 200,000.
//   3 a model a tenth of the price: $0.00069 a request, $4,140 at 200,000 a day, below the fleet's $6,480 everywhere
//     in range (checked to 700,000 in the preset), so no break-even. Brightpost's three bills are marked at 200,000.
// All prices and the GPU-hour rate are illustrative. Constants from presets/production-capacity.ts.
//
// Grid: plot 16-640 across, 6-400 down; working panel x 664-870. Colours (PROD_TONE): API lines green (the small tier
// dashed), the fleet teal, break-even neutral with the one highlight.

const PLOT = { x: 16, y: 6, w: 632, h: 404 } as const;
const X_MAX = 220; // thousand requests a day
const Y_MAX = 45_000;
const K = 1_000;

const common = {
  width: PLOT.w,
  height: PLOT.h,
  xDomain: [0, X_MAX] as [number, number],
  yDomain: [0, Y_MAX] as [number, number],
  xTicks: [0, 50, 100, 150, 200],
  yTicks: [0, 10_000, 20_000, 30_000, 40_000],
  formatX: (v: number) => (v === 0 ? "0" : `${v} k`),
  formatY: (v: number) => (v === 0 ? "$0" : `$${v / K} k`),
  xLabel: "requests a day (thousands)",
  yLabel: "monthly bill (illustrative prices)",
};

// Fleet staircase, in plot units (thousands of requests a day), for volumes 0 to X_MAX.
const edge1 = STEP_PER_REPLICA / K; // 117.8
const stairs: [number, number][] = [
  [0, fleetMonth(0)],
  [edge1, fleetMonth(0)],
  [edge1, fleetMonth(edge1 * K + 1)],
  [X_MAX, fleetMonth(X_MAX * K)],
];
// API lines end where they leave the plot.
const midEnd = Y_MAX / (30 * API_EACH.mid) / K; // 217.4 thousand a day
const be = BREAK_EVEN / K;

const onlyData = (s: LayoutShape[]) => s.filter((x) => /-(s|m)\d+(-label)?$/.test(x.id));

const shapes: LayoutShape[] = [
  ...curve("be", PLOT.x, PLOT.y, {
    ...common,
    step: 1,
    series: [
      {
        points: [
          [0, 0],
          [midEnd, Y_MAX],
        ],
        tone: PROD_TONE.model,
        label: "API, mid-size model",
      },
      { points: stairs, tone: PROD_TONE.compute, label: "Self-hosted fleet" },
    ],
  }),
  ...onlyData(
    curve("bf", PLOT.x, PLOT.y, {
      ...common,
      step: 2,
      series: [],
      marks: [{ x: be, y: fleetMonth(0), label: "break-even", tone: PROD_TONE.infra, place: "below-right" }],
    })
  ),
  ...onlyData(
    curve("bg", PLOT.x, PLOT.y, {
      ...common,
      step: 3,
      series: [
        {
          points: [
            [0, 0],
            [X_MAX, apiMonth(X_MAX * K, API_EACH.small)],
          ],
          tone: PROD_TONE.model,
          dashed: true,
        },
      ],
      marks: [
        { x: 200, y: MONTH.apiMid, tone: PROD_TONE.model },
        { x: 200, y: MONTH.fleet, tone: PROD_TONE.compute },
        { x: 200, y: MONTH.apiSmall, tone: PROD_TONE.model },
      ],
    })
  ),
];

shapes.forEach((s) => {
  if (!/-s\d+$/.test(s.id) && !s.id.endsWith("-m0")) s.quiet = true;
});
const ring = shapes.find((s) => s.id === "bf-m0");
if (ring) ring.highlight = true;

const PX = 664;
const PW = 206;
const panel = (id: string, y: number, label: string, step: number, tone: LayoutShape["tone"] = PROD_TONE.infra) =>
  label
    .split("\n")
    .reduce<string[]>(
      (acc, line, k) => (k % 3 === 0 ? [...acc, line] : [...acc.slice(0, -1), `${acc[acc.length - 1]}\n${line}`]),
      []
    )
    .forEach((chunk, k) =>
      shapes.push({
        id: `${id}-${k}`,
        type: "text",
        x: PX,
        y: y + k * 54,
        w: PW,
        h: 18 * chunk.split("\n").length,
        label: chunk,
        tone,
        step,
        quiet: true,
      })
    );

panel("p1", 20, `API bill: requests\n× 30 × $${API_EACH.mid}`, 1);
panel(
  "p2",
  76,
  `Fleet: replicas × ${GPU.hoursPerMonth} h\n× $${GPU.perHour} = ${usd0(GPU.perMonth)} each; 2 up to\n${n(STEP_PER_REPLICA)} a day, then 3`,
  1
);
panel(
  "p3",
  166,
  `Break-even, 2 replicas\n${usd0(2 * GPU.perMonth)} ÷ ($${API_EACH.mid} × 30)\n= ${n(BREAK_EVEN)} a day`,
  2
);
panel("p4", 262, `A model a tenth of the price\n(dashed) stays under the\nfleet: no break-even`, 3, PROD_TONE.model);
panel(
  "p5",
  330,
  `Brightpost, ${n(200_000)} a day\nmid API ${usd0(MONTH.apiMid)} · fleet ${usd0(MONTH.fleet)}\nsmall API ${usd0(MONTH.apiSmall)}`,
  3,
  PROD_TONE.model
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "API bill against a fixed GPU bill",
  width: 880,
  height: 424,
  steps: [
    { title: "A bill that grows with volume, a bill that steps" },
    { title: "Where the lines cross" },
    { title: "Against a cheaper model, they never cross" },
  ],
  shapes,
};

export default spec;
