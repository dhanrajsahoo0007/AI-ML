import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { MODALITY_TONE, PROD_TONE } from "@/components/diagrams/presets/production";
import { GUIDANCE, guided } from "@/components/diagrams/presets/production-multimodal";

// "Classifier-free guidance, with numbers" on the Image & Video Generation page. At each step the denoiser runs twice:
// once without the prompt (ε_uncond) and once with it (ε_cond). The guided prediction is
//   ε = ε_uncond + w · (ε_cond − ε_uncond)
// (Ho and Salimans, 2022, arXiv 2207.12598, write (1 + w′) · ε_cond − w′ · ε_uncond, the same thing with w = 1 + w′).
// w = 1 gives ε_cond; w > 1 moves further in the direction the prompt pushes. Four numbers stand for four latent cells
// (illustrative values, written in presets/production-multimodal.ts):
//   ε_uncond  = ( 0.10, −0.20,  0.30, 0.00)     ε_cond = (0.30, −0.10, 0.20, 0.40)
//   difference = ( 0.20,  0.10, −0.10, 0.40)
//   w = 1:    (0.30, −0.10, 0.20, 0.40)
//   w = 7.5:  0.10 + 7.5 × 0.20 = 1.60;  −0.20 + 7.5 × 0.10 = 0.55;  0.30 + 7.5 × (−0.10) = −0.45;  0.00 + 7.5 × 0.40 = 3.00
//
// Steps: 1 two predictions · 2 the difference (what the prompt adds) · 3 w = 1 · 4 w = 7.5 overshoots on purpose.
// Grid: label column x 20 (w 250); cells 4 × 68 px at x 290, rows 56 px apart from y 76; notes at x 610-870.
// Colours (MODALITY_TONE): without prompt blue (image side), with prompt orange (text), the guided result green
// (model output), difference neutral. Cell shade is |value| ÷ 3 (shade only).

const COL_X = 290;
const CELL_W = 68;
const CELL_H = 40;
const ROW_Y = (i: number) => 76 + i * 56;
const MAX = 3;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra
): LayoutShape => ({ id, type: "text", x, y, w, h: 18, label, tone, step, quiet: true });

const fmt = (v: number) => (Math.abs(v) < 0.005 ? "0.00" : v.toFixed(2)).replace("-", "−");

const row = (
  id: string,
  rowIndex: number,
  label: string,
  sub: string,
  values: readonly number[],
  tone: LayoutTone,
  step: number,
  highlight = false
): LayoutShape[] => [
  {
    id: `${id}-label`,
    type: "box",
    x: 20,
    y: ROW_Y(rowIndex),
    w: 250,
    h: CELL_H,
    label,
    sub,
    tone,
    fill: "pastel",
    step,
    highlight,
  },
  ...values.map((v, k): LayoutShape => ({
    id: `${id}-${k}`,
    type: "cell",
    x: COL_X + k * CELL_W,
    y: ROW_Y(rowIndex),
    w: CELL_W,
    h: CELL_H,
    label: fmt(v),
    tone,
    weight: Math.min(1, Math.abs(v) / MAX),
    step,
    quiet: true,
  })),
];

const diff = GUIDANCE.cond.map((c, i) => c - GUIDANCE.uncond[i]);

const shapes: LayoutShape[] = [
  text("head", COL_X, 40, 4 * CELL_W, "four latent cells (illustrative numbers)", 1),
  ...row("u", 0, "ε uncond", "denoiser without the prompt", GUIDANCE.uncond, MODALITY_TONE.image, 1),
  ...row("c", 1, "ε cond", "denoiser with the prompt", GUIDANCE.cond, MODALITY_TONE.text, 1),
  ...row("d", 2, "ε cond − ε uncond", "what the prompt adds", diff, PROD_TONE.infra, 2, true),
  ...row("w1", 3, "w = 1", "ε uncond + 1 × difference", guided(1), MODALITY_TONE.model, 3, true),
  ...row("w7", 4, "w = 7.5", "ε uncond + 7.5 × difference", guided(7.5), MODALITY_TONE.model, 4, true),

  text("f1", 610, 76, 260, "ε = ε uncond + w (ε cond − ε uncond)", 1),
  text("n1", 610, 108, 260, "Two denoiser passes per step", 1, MODALITY_TONE.text),
  text("n1b", 610, 126, 260, "(batched together in practice).", 1),
  text("n2", 610, 188, 260, "The difference points where", 2),
  text("n2b", 610, 206, 260, "the prompt pulls the picture.", 2),
  text("n3", 610, 244, 260, "w = 1 is plain conditional.", 3),
  text("n4", 610, 300, 260, "w = 7.5 steps 7.5 times as far:", 4, MODALITY_TONE.model),
  text("n4b", 610, 318, 260, "0.10 + 7.5 × 0.20 = 1.60.", 4, MODALITY_TONE.model),
  text("n4c", 610, 336, 260, "Stronger prompt match, less variety.", 4),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Classifier-free guidance: push further along the prompt",
  width: 880,
  height: ROW_Y(4) + CELL_H + 28,
  steps: [
    { title: "Two predictions: without and with the prompt" },
    { title: "Their difference is the prompt's pull" },
    { title: "w = 1 uses the conditional prediction" },
    { title: "w = 7.5 pushes well past it" },
  ],
  shapes,
};

export default spec;
