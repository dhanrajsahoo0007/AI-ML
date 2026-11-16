import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";

// Context rot (context-engineering, Core concepts "Context rot and distraction"): answer accuracy against the length
// of the input. Hong, Troynikov and Huber (Chroma, "Context Rot", 14 Jul 2025) tested 18 models and found that
// performance degrades as input length grows, even on simple tasks, that a single distractor lowers accuracy against
// the needle-only baseline, and that four distractors lower it further. The report gives no single accuracy curve for
// all models, so this figure draws the SHAPE ONLY, labelled as such: no number on it comes from the report, and the
// curves are our own (y = start + drop × t^p), not traces of the report's plots.
//
// Two steps: 1 the needle-only baseline falls as the input grows · 2 one and four distractors pull it lower, faster.
//
// Layout: plot area x 90–610, y 40–240; curve labels to the right of each curve's end (x 618); axis words on the
// left; the x-axis label under the plot; a "shape only" line at the top.
//
// Colour (agents legend, two tones plus neutral): the model's accuracy green (baseline solid, one distractor dashed);
// four distractors red dashed, the case where the answer breaks; axes and text neutral.

const PLOT = { x: 90, y: 40, w: 520, h: 200 } as const;

const curve = (start: number, drop: number, p: number): [number, number][] =>
  Array.from({ length: 13 }, (_, i) => {
    const t = i / 12;
    return [Math.round(PLOT.x + 10 + t * (PLOT.w - 20)), Math.round(PLOT.y + start + drop * t ** p)];
  });

const BASE = curve(16, 50, 1.6);
const ONE = curve(30, 96, 1.3);
const FOUR = curve(44, 140, 1.15);
const endY = (c: [number, number][]) => c[c.length - 1][1];

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone = AGENT_TONE.infra,
  step = 1
): LayoutShape => ({ id, type: "text", x, y, w, h: 20, label, tone, step });

const spec: LayoutSpec = {
  kind: "layout",
  title: "Context rot: accuracy falls as the input grows",
  width: 780,
  height: 284,
  steps: [{ title: "Longer input, lower accuracy" }, { title: "Distractors pull it lower, faster" }],
  shapes: [
    {
      id: "y-axis",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [PLOT.x, PLOT.y + PLOT.h],
        [PLOT.x, PLOT.y],
      ],
      head: true,
    },
    {
      id: "x-axis",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [PLOT.x, PLOT.y + PLOT.h],
        [PLOT.x + PLOT.w + 10, PLOT.y + PLOT.h],
      ],
      head: true,
    },
    text("y-label", 4, PLOT.y - 6, 80, "accuracy"),
    text("y-hi", 4, PLOT.y + 22, 80, "higher"),
    text("y-lo", 4, PLOT.y + PLOT.h - 30, 80, "lower"),
    text("shape", PLOT.x + 60, 4, 400, "Shape only, after Hong et al. (Chroma, 2025)"),
    text("x-label", PLOT.x, PLOT.y + PLOT.h + 14, PLOT.w, "Input length: shorter → longer"),

    { id: "base", type: "path", x: 0, y: 0, points: BASE, smooth: true, tone: AGENT_TONE.model, weight: 0.8 },
    text("base-l", 618, endY(BASE) - 10, 136, "needle only", AGENT_TONE.model),

    {
      id: "one",
      type: "path",
      x: 0,
      y: 0,
      points: ONE,
      smooth: true,
      dashed: true,
      tone: AGENT_TONE.model,
      weight: 0.8,
      step: 2,
    },
    text("one-l", 618, endY(ONE) - 10, 136, "one distractor", AGENT_TONE.model, 2),
    {
      id: "four",
      type: "path",
      x: 0,
      y: 0,
      points: FOUR,
      smooth: true,
      dashed: true,
      tone: AGENT_TONE.failure,
      weight: 0.8,
      step: 2,
    },
    text("four-l", 618, endY(FOUR) - 10, 136, "four distractors", AGENT_TONE.failure, 2),
  ],
};

export default spec;
