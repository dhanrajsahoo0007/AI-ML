import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { MODALITY_TONE, PROD_TONE } from "@/components/diagrams/presets/production";
import { gaussians, noisyGrid } from "@/components/diagrams/presets/production-multimodal";
import { matrix } from "@/components/diagrams/presets/transformer";

// "Noise becomes an image" on the Image & Video Generation page. A diffusion model is trained on pictures that were
// mixed with noise by the DDPM forward process (Ho et al., 2020, arXiv 2006.11239): T = 1000 steps, β rising linearly
// from 1e-4 to 0.02, and
//   x_t = √ᾱ_t · x_0 + √(1 − ᾱ_t) · ε,   ᾱ_t = ∏ (1 − β_s)
// where x_0 is the clean picture, ε is standard-normal noise and ᾱ_t is the share of signal left at step t. Generation
// runs the path backwards: a network predicts ε at each step and a sampler removes part of it. The figure draws an
// 8 × 8 toy picture (a kettle shape, x_0 = ±1 per cell) at five values of t, computed with that formula and one fixed
// noise sample; the cell shade is x_t mapped from [−2, 2] to [0, 1]. Real samplers use far fewer than 1,000 steps; the
// five panels are snapshots, not sampler steps.
//   t = 1000: ᾱ = 0.00004 (signal 0.01) · t = 500: 0.08 (0.28) · t = 300: 0.40 (0.63) · t = 150: 0.79 (0.89) · t = 0.
//
// Steps: 1 pure noise · 2 a shape appears · 3 the lid and body · 4 nearly clean · 5 the image.
// Grid: five panels of 8 × 8 cells of 16 px (128 px) at x 40 + 168 × i, y 80; labels under each panel.
// Colours (MODALITY_TONE): the picture's cells blue (image); the formula and labels neutral.

const TIMES = [1000, 500, 300, 150, 0] as const;
const noise = gaussians(64, 11);
const CELL = 16;
const PANEL = 8 * CELL;
const GAP = 40;
const X0 = 40;
const Y0 = 80;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra
): LayoutShape => ({ id, type: "text", x, y, w, h: 18, label, tone, step, quiet: true });

const shapes: LayoutShape[] = [
  text("formula", 40, 20, 800, "x_t = √ᾱ_t · x_0 + √(1 − ᾱ_t) · ε   (DDPM: T = 1000, β from 0.0001 to 0.02)", 1),
];

TIMES.forEach((t, i) => {
  const step = i + 1;
  const x = X0 + i * (PANEL + GAP);
  const g = noisyGrid(t, noise);
  shapes.push(
    ...matrix(`p${i}`, x, Y0, g.grid, MODALITY_TONE.image, { cell: CELL, step }),
    {
      id: `p${i}-t`,
      type: "text",
      x: x - 10,
      y: Y0 + PANEL + 10,
      w: PANEL + 20,
      h: 20,
      label: t === 0 ? "t = 0: the image" : `t = ${t}`,
      tone: MODALITY_TONE.image,
      step,
      highlight: true,
    },
    text(`p${i}-s`, x - 14, Y0 + PANEL + 34, PANEL + 28, `signal ${g.signal.toFixed(2)}`, step),
    text(`p${i}-n`, x - 14, Y0 + PANEL + 52, PANEL + 28, `noise ${g.noiseShare.toFixed(2)}`, step)
  );
  if (i > 0) {
    shapes.push({
      id: `ar${i}`,
      type: "arrow",
      x: x - GAP + 6,
      y: Y0 + PANEL / 2,
      w: GAP - 12,
      h: 0,
      step,
    });
  }
});

shapes.push(
  text(
    "note1",
    40,
    Y0 + PANEL + 84,
    800,
    "Training adds noise right to left; generation walks left to right: a network predicts the noise, the sampler removes some.",
    2
  ),
  text(
    "note2",
    40,
    Y0 + PANEL + 104,
    800,
    "Signal and noise are √ᾱ and √(1 − ᾱ) at that step; one fixed noise sample, toy 8 × 8 picture.",
    2
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "From noise to an image, snapshot by snapshot",
  width: 880,
  height: Y0 + PANEL + 134,
  steps: [
    { title: "t = 1000: almost pure noise" },
    { title: "t = 500: a faint shape" },
    { title: "t = 300: the body and the lid" },
    { title: "t = 150: nearly clean" },
    { title: "t = 0: the image" },
  ],
  shapes,
};

export default spec;
