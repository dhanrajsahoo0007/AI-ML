import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PROD_TONE, curve, n } from "@/components/diagrams/presets/production";
import {
  H100,
  PHASES,
  RIDGE,
  attainableTflops,
  fromLg,
  lg,
  matmulIntensity,
} from "@/components/diagrams/presets/production-gpu";

// Prefill and decode on the H100 roofline, for "Prefill, decode and the roofline" on the GPU Performance for LLMs page.
// The same roof as gpu-roofline (989 TFLOPS dense BF16, 3.35 TB/s, ridge 295 FLOPs/byte; NVIDIA datasheet, November
// 2026), with the three workloads of Brightpost's 70 B model placed on it. Each is one 8,192 × 8,192 weight matrix
// (the hidden size of a Llama-style 70 B) in 16-bit, multiplied by m token rows; intensity comes from matmulIntensity:
// FLOPs = 2·m·k·n, bytes = 2·(m·k + k·n + m·n).
//   decode, batch 1:  m = 1      → 134.2 MFLOP ÷ 134.3 MB = 1.0 FLOPs/byte → 3.35 × 1.0 = 3.3 TFLOPS = 0.3 % of 989
//   decode, batch 32: m = 32     → 4.29 GFLOP ÷ 135.3 MB = 31.75          → 3.35 × 31.75 = 106 TFLOPS = 10.8 %
//   prefill, 2,200-token prompt: m = 2,200 → 295.3 GFLOP ÷ 206.3 MB = 1,431 → above the ridge → 989 TFLOPS = 100 %
//                                of the roof (real kernels reach less)
// A batch of 32 reads the same weights once for 32 tokens, so a decode step takes about as long as at batch 1 and
// makes 32 tokens: that is the 32× in intensity. The prompt is 2,200 tokens (TOKENS.inputPerRequest).
//
// Steps: 1 decode, batch 1 · 2 decode, batch 32 (32× further right, the same roof) · 3 prefill (past the ridge).
// Grid: plot x 16–606 (as gpu-roofline); three result cells at x 636–856, y 60, 150 and 240, one per step.
// Colours: roof memory side violet, compute side teal (as gpu-roofline); decode green (the generated tokens), prefill
// orange (the prompt). One highlight: the newest point.

const PLOT = { x: 16, y: 6, w: 590, h: 408 } as const;
const X_MAX = 4;
const Y_MAX = 3.1;
const decade = (v: number) => n(fromLg(v));
const peakY = lg(H100.bf16Tflops);
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

const onlyData = (shapes: LayoutShape[]) => shapes.filter((s) => /-m\d+(-label)?$/.test(s.id));

const point = (
  prefix: string,
  step: number,
  rows: number,
  tone: LayoutTone,
  label: string,
  place: "above-right" | "below-right" | "below" | "above-left"
) => {
  const intensity = matmulIntensity(rows);
  return onlyData(
    curve(prefix, PLOT.x, PLOT.y, {
      ...common,
      step,
      series: [],
      marks: [{ x: lg(intensity), y: lg(attainableTflops(intensity)), label, tone, place }],
    })
  );
};

const shapes: LayoutShape[] = [
  ...curve("rf", PLOT.x, PLOT.y, {
    ...common,
    step: 1,
    series: [
      {
        points: [
          [0, lg(H100.bandwidthTBs)],
          [lg(RIDGE), peakY],
        ],
        tone: PROD_TONE.store,
      },
      {
        points: [
          [lg(RIDGE), peakY],
          [X_MAX, peakY],
        ],
        tone: PROD_TONE.compute,
      },
    ],
    marks: [
      {
        x: lg(RIDGE),
        y: peakY,
        label: `ridge ${Math.round(RIDGE)} FLOPs/byte`,
        tone: PROD_TONE.infra,
        place: "above-left",
      },
    ],
  }),
  ...point("d1", 1, PHASES.decode1.rows, PROD_TONE.model, "decode, batch 1", "below-right"),
  ...point("d32", 2, PHASES.decode32.rows, PROD_TONE.model, "decode, batch 32", "below-right"),
  ...point("pf", 3, PHASES.prefill.rows, PROD_TONE.traffic, "prefill", "below-right"),
];

shapes.forEach((s) => {
  if (!/^(d1|d32|pf)-m0$/.test(s.id) && !/^rf-s\d+$/.test(s.id)) s.quiet = true;
});
for (const id of ["d1-m0", "d32-m0", "pf-m0"]) {
  const s = shapes.find((x) => x.id === id);
  if (s) s.highlight = true;
}

// Labels for the two roofs, placed by hand so they stay clear of the points.
const note = (id: string, x: number, y: number, w: number, label: string, tone: LayoutTone = PROD_TONE.infra) =>
  shapes.push({ id, type: "text", x, y, w, h: 18, label, tone, step: 1, quiet: true });
note("roof-mem", 150, 232, 110, "memory roof", PROD_TONE.store);
note("roof-comp", 400, 70, 200, "compute roof: 989 TFLOPS", PROD_TONE.compute);

// Result cells.
const rows = [
  { key: "d1", phase: PHASES.decode1, step: 1, tone: PROD_TONE.model },
  { key: "d32", phase: PHASES.decode32, step: 2, tone: PROD_TONE.model },
  { key: "pf", phase: PHASES.prefill, step: 3, tone: PROD_TONE.traffic },
] as const;
rows.forEach((r, i) => {
  const intensity = matmulIntensity(r.phase.rows);
  const speed = attainableTflops(intensity);
  const pct = (speed / H100.bf16Tflops) * 100;
  const intensityLabel = intensity >= 100 ? n(Math.round(intensity)) : intensity.toFixed(intensity < 10 ? 1 : 0);
  const speedLabel = speed >= 989 ? "989" : speed.toFixed(speed < 10 ? 1 : 0);
  shapes.push({
    id: `cell-${r.key}`,
    type: "cell",
    x: 632,
    y: 70 + i * 100,
    w: 232,
    h: 84,
    label: `${r.phase.label}\n${intensityLabel} FLOPs/byte`,
    sub: `${speedLabel} TFLOPS, ${pct >= 99.5 ? "up to 100" : pct.toFixed(1)} % of peak`,
    tone: r.tone,
    fill: "pastel",
    step: r.step,
    quiet: true,
  });
});
shapes.push(
  {
    id: "src",
    type: "text",
    x: 632,
    y: 380,
    w: 232,
    h: 18,
    label: `${H100.name}, dense BF16, ${H100.asOf}`,
    tone: PROD_TONE.infra,
    step: 1,
    quiet: true,
  },
  {
    id: "src2",
    type: "text",
    x: 632,
    y: 398,
    w: 232,
    h: 18,
    label: "one 8,192 × 8,192 matrix, 16-bit",
    tone: PROD_TONE.infra,
    step: 1,
    quiet: true,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Prefill and decode on the H100 roofline",
  width: 880,
  height: PLOT.y + PLOT.h + 6,
  steps: [
    { title: "Decode at batch 1 sits far left, almost idle" },
    { title: "Batch 32 moves it 32 times right on the same roof" },
    { title: "Prefill is past the ridge and uses the compute" },
  ],
  shapes,
};

export default spec;
