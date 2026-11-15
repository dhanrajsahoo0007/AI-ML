import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PROD_TONE, curve, n } from "@/components/diagrams/presets/production";
import { H100, RIDGE, fromLg, lg } from "@/components/diagrams/presets/production-gpu";

// The roofline of one GPU, for "The roofline" on the GPU Performance for LLMs page. Attainable speed =
// min(peak compute, bandwidth × arithmetic intensity) (Williams, Waterman and Patterson, CACM 2009), drawn log-log
// (every gridline is ×10) for the NVIDIA H100 SXM as of November 2026: dense BF16 989 TFLOPS (the datasheet prints
// 1,979 "with sparsity"; dense is half) and 3.35 TB/s of HBM3 bandwidth.
//
// Working (RIDGE comes from presets/production-gpu.ts):
//   memory roof: speed (TFLOPS) = 3.35 TB/s × intensity, so intensity 1 → 3.35 TFLOPS and intensity 100 → 335 TFLOPS
//   compute roof: 989 TFLOPS
//   ridge = 989 × 10^12 ÷ (3.35 × 10^12) = 295.2 FLOPs per byte, where 3.35 × 295.2 = 989
//
// Steps: 1 the memory roof (a rising line) · 2 the compute roof and the ridge point · 3 what each side means, and the
// real kernels below the roof (FlashAttention reaches 25–40 % of peak FLOPS on A100, FlashAttention-2 50–73 %: Dao,
// arXiv 2307.08691).
//
// Grid: plot 20–600 across, 10–400 down (x 1–10,000 FLOPs/byte, y 1–1,000 TFLOPS, both log); working panel x 630–850.
// Colours: memory side violet (a store), compute side teal, the ridge neutral with the one highlight. Axis labels in
// neutral.

const PLOT = { x: 16, y: 6, w: 590, h: 408 } as const;
const X_MAX = 4; // 10^4 FLOPs per byte
const Y_MAX = 3.1; // 10^3.1 TFLOPS
const decade = (v: number) => n(fromLg(v));

const common = {
  width: PLOT.w,
  height: PLOT.h,
  xDomain: [0, X_MAX] as [number, number],
  yDomain: [0, Y_MAX] as [number, number],
  xTicks: [0, 1, 2, 3, 4],
  yTicks: [0, 1, 2, 3],
  formatX: decade,
  formatY: decade,
  xLabel: "arithmetic intensity (FLOPs per byte moved)",
  yLabel: "achievable speed (TFLOPS)",
};

const ridgeX = lg(RIDGE);
const peakY = lg(H100.bf16Tflops);

// Only the series and marks of a later call are kept (its axes are already drawn in step 1).
const onlyData = (shapes: LayoutShape[]) => shapes.filter((s) => /-(s|m)\d+(-label)?$/.test(s.id));

const shapes: LayoutShape[] = [
  ...curve("rf", PLOT.x, PLOT.y, {
    ...common,
    step: 1,
    series: [
      {
        points: [
          [0, lg(H100.bandwidthTBs)],
          [ridgeX, peakY],
        ],
        tone: PROD_TONE.store,
      },
    ],
  }),
  ...onlyData(
    curve("rg", PLOT.x, PLOT.y, {
      ...common,
      step: 2,
      series: [
        {
          points: [
            [ridgeX, peakY],
            [X_MAX, peakY],
          ],
          tone: PROD_TONE.compute,
          label: "compute roof: 989 TFLOPS",
        },
      ],
      marks: [
        {
          x: ridgeX,
          y: peakY,
          label: `ridge: ${Math.round(RIDGE)} FLOPs/byte`,
          tone: PROD_TONE.infra,
          place: "below-right",
        },
      ],
    })
  ),
];

// Axes, ticks and labels arrive quietly; the roof lines and the ridge carry the "new" rings.
shapes.forEach((s) => {
  if (!/-s\d+$/.test(s.id) && s.id !== "rg-m0") s.quiet = true;
});
// Highlight the ridge mark.
const ridge = shapes.find((s) => s.id === "rg-m0");
if (ridge) ridge.highlight = true;

// Where the plot sits: the two zones named on the plot.
const note = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra
) => shapes.push({ id, type: "text", x, y, w, h: 18, label, tone, step, quiet: true });

note("roof-mem", 84, 168, 110, "memory roof", 1, PROD_TONE.store);
note("zone-mem", 120, 300, 200, "memory-bound region", 3, PROD_TONE.store);
note("zone-comp", 400, 300, 200, "compute-bound region", 3, PROD_TONE.compute);

// Working panel.
const PX = 632;
const PW = 224;
const lines: [string, string, number, string?][] = [
  ["p-title", "Ridge point", 2, "head"],
  ["p-l1", "peak ÷ bandwidth", 2],
  ["p-l2", "989 × 10¹² ÷ 3.35 × 10¹²", 2],
  ["p-l3", `= ${RIDGE.toFixed(0)} FLOPs per byte`, 2],
  ["p-m-title", "Left of the ridge", 3, "head-m"],
  ["p-m1", "speed = 3.35 TB/s × intensity", 3],
  ["p-m2", "intensity 1 → 3.35 TFLOPS", 3],
  ["p-c-title", "Right of the ridge", 3, "head-c"],
  ["p-c1", "speed = 989 TFLOPS", 3],
  ["p-c2", "real kernels sit below it", 3],
  ["p-src", `${H100.name}, dense BF16, ${H100.asOf}`, 1],
];
const ys: Record<string, number> = {
  "p-title": 40,
  "p-l1": 62,
  "p-l2": 82,
  "p-l3": 102,
  "p-m-title": 150,
  "p-m1": 172,
  "p-m2": 192,
  "p-c-title": 236,
  "p-c1": 258,
  "p-c2": 278,
  "p-src": 380,
};
for (const [id, label, step, kind] of lines) {
  const tone = kind === "head-m" ? PROD_TONE.store : kind === "head-c" ? PROD_TONE.compute : PROD_TONE.infra;
  shapes.push({ id, type: "text", x: PX, y: ys[id], w: PW, h: 18, label, tone, step, quiet: true });
}

const spec: LayoutSpec = {
  kind: "layout",
  title: "The roofline of one GPU: H100 SXM, dense BF16",
  width: 880,
  height: PLOT.y + PLOT.h + 6,
  steps: [
    { title: "Short of bandwidth: speed rises with intensity" },
    { title: "Out of compute: speed stops at the roof" },
    { title: "Two regions, two kinds of fix" },
  ],
  shapes,
};

export default spec;
