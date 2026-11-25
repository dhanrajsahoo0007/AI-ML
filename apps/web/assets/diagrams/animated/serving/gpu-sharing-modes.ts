import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { GPU_GB } from "@/components/diagrams/presets/production-gpures";

// "Three ways to share one GPU" on the GPU/TPU Resource Management page: the same 80 GB card as a whole GPU, as four
// time-sliced replicas and as four MIG instances of profile 1g.20gb.
//   MIG facts (NVIDIA MIG user guide, H100 80GB, November 2026): 1g.20gb = 20 GB and 1/7 of the compute, at most 4
//   instances; a card has 7 compute slices, so four 1g.20gb instances use 4/7 of the compute and leave 3/7 idle while
//   every byte of memory is handed out (4 x 20 GB = 80 GB).
//   Time-slicing (NVIDIA GPU Operator docs): replicas of one GPU take equal turns; no memory or fault isolation.
//
// Steps: 1 a whole GPU · 2 time-slicing · 3 MIG.
// Grid: three columns 260 wide at x 20, 310, 600; frames y 44 to 244; three property lines under each at y 256, 276,
// 296; source line at y 326. Colours: pods and instances teal (compute); the compute strip teal (used) and neutral
// (idle); red only for the line that says what breaks without isolation.

const COLS = [20, 310, 600] as const;
const W = 260;
const FRAME_Y = 44;
const FRAME_H = 200;

const shapes: LayoutShape[] = [];
const note = (
  id: string,
  col: number,
  y: number,
  label: string,
  step: number,
  tone: LayoutShape["tone"] = PROD_TONE.infra
): LayoutShape => ({
  id,
  type: "text",
  x: COLS[col],
  y,
  w: W,
  h: 18,
  label,
  tone,
  step,
  quiet: true,
});

// Step 1: one pod owns the whole card.
shapes.push(
  {
    id: "whole-pod",
    type: "box",
    x: COLS[0] + 16,
    y: FRAME_Y + 34,
    w: W - 32,
    h: 120,
    label: "One pod",
    sub: `all ${GPU_GB} GB, every SM`,
    tone: PROD_TONE.compute,
    fill: "pastel",
    step: 1,
  },
  note("whole-n1", 0, 256, `memory: ${GPU_GB} GB, one owner`, 1),
  note("whole-n2", 0, 276, "isolation: the whole card is yours", 1),
  note("whole-n3", 0, 296, "cost: idle SMs are still billed", 1)
);

// Step 2: four pods take turns on one card.
["A", "B", "C", "D"].forEach((p, i) => {
  shapes.push({
    id: `ts-pod-${p}`,
    type: "box",
    x: COLS[1] + 16 + (i % 2) * 118,
    y: FRAME_Y + 34 + Math.floor(i / 2) * 52,
    w: 110,
    h: 44,
    label: `Pod ${p}`,
    tone: PROD_TONE.compute,
    fill: "pastel",
    step: 2,
  });
});
for (let i = 0; i < 8; i++) {
  shapes.push({
    id: `ts-turn-${i}`,
    type: "cell",
    x: COLS[1] + 18 + i * 28,
    y: FRAME_Y + 146,
    w: 26,
    h: 22,
    label: "ABCD"[i % 4],
    tone: PROD_TONE.compute,
    fill: "pastel",
    step: 2,
    quiet: true,
  });
}
shapes.push(
  {
    id: "ts-turn-label",
    type: "text",
    x: COLS[1],
    y: FRAME_Y + 172,
    w: W,
    h: 18,
    label: "turns on the GPU over time",
    tone: PROD_TONE.infra,
    step: 2,
    quiet: true,
  },
  note("ts-n1", 1, 256, "memory: one pool shared by all four", 2),
  note("ts-n2", 1, 276, "isolation: none for memory or faults", 2, PROD_TONE.failure),
  note("ts-n3", 1, 296, "compute: equal turns, no guarantee", 2)
);

// Step 3: four MIG instances with hard walls.
for (let i = 0; i < 4; i++) {
  shapes.push({
    id: `mig-${i}`,
    type: "box",
    x: COLS[2] + 16 + (i % 2) * 118,
    y: FRAME_Y + 34 + Math.floor(i / 2) * 52,
    w: 110,
    h: 44,
    label: "1g.20gb",
    sub: "20 GB",
    tone: PROD_TONE.compute,
    fill: "pastel",
    step: 3,
  });
}
for (let i = 0; i < 7; i++) {
  shapes.push({
    id: `mig-slice-${i}`,
    type: "cell",
    x: COLS[2] + 22 + i * 32,
    y: FRAME_Y + 146,
    w: 30,
    h: 22,
    label: i < 4 ? "1/7" : undefined,
    tone: i < 4 ? PROD_TONE.compute : PROD_TONE.infra,
    fill: i < 4 ? "pastel" : "paper",
    step: 3,
    quiet: true,
  });
}
shapes.push(
  {
    id: "mig-slice-label",
    type: "text",
    x: COLS[2],
    y: FRAME_Y + 172,
    w: W,
    h: 18,
    label: "7 compute slices: 4 used, 3 idle",
    tone: PROD_TONE.infra,
    step: 3,
    quiet: true,
  },
  note("mig-n1", 2, 256, "memory: four hard walls of 20 GB", 3),
  note("mig-n2", 2, 276, "isolation: memory, cache, faults", 3),
  note("mig-n3", 2, 296, "compute: 4 of 7 slices, so 3 sit idle", 3)
);

shapes.push({
  id: "source",
  type: "text",
  x: 20,
  y: 330,
  w: 840,
  h: 18,
  label: "H100 80 GB profile figures from the NVIDIA MIG user guide, checked November 2026",
  tone: PROD_TONE.infra,
  step: 1,
  quiet: true,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three ways to share one 80 GB GPU",
  width: 880,
  height: 362,
  steps: [
    { title: "A whole GPU: one owner" },
    { title: "Time-slicing: turns on one shared pool" },
    { title: "MIG: hardware walls, fixed sizes" },
  ],
  groups: [
    { id: "g-whole", title: "Whole GPU", tone: PROD_TONE.compute, x: COLS[0], y: FRAME_Y, w: W, h: FRAME_H },
    { id: "g-ts", title: "Time-slicing", tone: PROD_TONE.compute, x: COLS[1], y: FRAME_Y, w: W, h: FRAME_H },
    { id: "g-mig", title: "MIG", tone: PROD_TONE.compute, x: COLS[2], y: FRAME_Y, w: W, h: FRAME_H },
  ],
  shapes,
};

export default spec;
