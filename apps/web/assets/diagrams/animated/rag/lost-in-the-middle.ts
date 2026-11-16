import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { RAG_TONE, TOP_K } from "@/components/diagrams/presets/rag";

// "Where RAG fails": answer accuracy against where the relevant chunk sits in the prompt. Liu et al. (2023, "Lost in
// the Middle", arXiv 2307.03172) found a U shape: models use information at the start and the end of a long context
// better than information in the middle. This figure draws the SHAPE ONLY, labelled as such: no number on it comes
// from the paper, and the curve is our own (y = base + depth × sin(π t)), not a trace of the paper's plots.
//
// Under the axis, our prompt's five chunk slots (TOP_K) show where "the middle" is for the running example.
// Tones (three): the curve green (the answer), chunk slots blue, the dip red.

const PLOT = { x: 90, y: 40, w: 600, h: 190 } as const;
const curve: [number, number][] = Array.from({ length: 21 }, (_, i) => {
  const t = i / 20;
  return [Math.round(PLOT.x + 10 + t * (PLOT.w - 20)), Math.round(PLOT.y + 30 + 120 * Math.sin(Math.PI * t))];
});

const SLOT_W = 104;
const SLOT_GAP = (PLOT.w - TOP_K * SLOT_W) / (TOP_K - 1);
const slots: LayoutShape[] = Array.from({ length: TOP_K }, (_, i) => {
  const middle = i === Math.floor(TOP_K / 2);
  return {
    id: `slot${i + 1}`,
    type: "box",
    x: Math.round(PLOT.x + i * (SLOT_W + SLOT_GAP)),
    y: 262,
    w: SLOT_W,
    h: 36,
    label: `Chunk ${i + 1}`,
    tone: middle ? RAG_TONE.failure : RAG_TONE.text,
    fill: "pastel",
  };
});

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone = RAG_TONE.infra
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 20,
  label,
  tone,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Lost in the middle: answers are worse when the key chunk sits mid-prompt",
  width: 760,
  height: 340,
  shapes: [
    // Axes
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
        [PLOT.x + PLOT.w + 20, PLOT.y + PLOT.h],
      ],
      head: true,
    },
    text("y-label", 4, PLOT.y - 6, 84, "accuracy"),
    text("y-hi", 4, PLOT.y + 22, 80, "higher"),
    text("y-lo", 4, PLOT.y + PLOT.h - 30, 80, "lower"),
    { id: "curve", type: "path", x: 0, y: 0, points: curve, smooth: true, tone: RAG_TONE.answer, weight: 0.8 },
    text("start", PLOT.x + 14, PLOT.y + 6, 160, "start: used well", RAG_TONE.answer),
    text("end", PLOT.x + PLOT.w - 174, PLOT.y + 6, 160, "end: used well", RAG_TONE.answer),
    text("dip", PLOT.x + PLOT.w / 2 - 100, PLOT.y + 158, 200, "middle: used least", RAG_TONE.failure),
    text("shape", PLOT.x + PLOT.w / 2 - 150, 4, 300, "Shape only, after Liu et al. (2023)"),
    ...slots,
    text("x-label", PLOT.x, 308, PLOT.w, "Where the relevant chunk sits in the prompt"),
  ],
};

export default spec;
