import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";

// "Where quantisation happens" on the Quantization & Optimization page: two lanes, same start (a trained 16-bit model),
// same end (a model with 4- or 8-bit weights and scales), different place in the life of the model.
//   1. Post-training quantisation (PTQ): a trained model plus a few hundred calibration prompts go into a
//      quantiser (GPTQ, AWQ, SmoothQuant) that picks scales and rounds the weights. No training run. GPTQ quantised a
//      175 B model in about four GPU hours (Frantar et al., 2022, arXiv 2210.17323).
//   2. Quantisation-aware training (QAT): training data go through a training loop whose forward pass rounds weights
//      to the target grid ("fake quantisation") while the backward pass updates the 16-bit copies, passing gradients
//      through the rounding as if it were the identity (the straight-through estimate). The weights learn to sit where
//      rounding hurts least. Cost: a training run.
// No numbers are drawn, so none are computed; the only figure is the 175 B / four GPU hours from the paper.
//
// Grid: lane A title y 14, calibration box y 36, main row y 120; lane B title y 226, data box y 248, main row y 332.
// Columns: model x 30 (w 170), quantiser / training loop x 280 (w 250), result x 610 (w 190).
// Colours (PROD_TONE): models green, data blue, the quantiser and training loop teal (compute), arrows neutral. Each
// step rings one box.

const COL = { a: 30, b: 280, c: 610 } as const;
const W = { a: 170, b: 250, c: 190 } as const;
const H = 56;

const text = (
  id: string,
  x: number,
  y: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w: Math.ceil(label.length * 6.2),
  h: 18,
  label,
  tone,
  step,
  quiet: true,
});
const box = (
  id: string,
  col: keyof typeof COL,
  y: number,
  label: string,
  sub: string,
  tone: LayoutTone,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "box",
  x: COL[col],
  y,
  w: W[col],
  h: H,
  label,
  sub,
  tone,
  fill: "pastel",
  step,
  quiet: true,
  ...extra,
});
const arrow = (id: string, from: string, to: string, step: number, label?: string): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  label,
  step,
  quiet: true,
});

const shapes: LayoutShape[] = [
  // Lane A: PTQ
  text("a-title", 30, 12, "Post-training quantisation: after training is done", 1),
  box("a-data", "b", 36, "Calibration data", "a few hundred real prompts", PROD_TONE.data, 1),
  box("a-model", "a", 120, "Trained model", "16-bit weights", PROD_TONE.model, 1),
  box("a-quant", "b", 120, "Quantiser", "GPTQ · AWQ · SmoothQuant", PROD_TONE.compute, 1, {
    highlight: true,
    quiet: false,
  }),
  box("a-out", "c", 120, "Quantised model", "4- or 8-bit weights + scales", PROD_TONE.model, 1),
  arrow("a-e1", "a-model", "a-quant", 1, "weights"),
  arrow("a-e2", "a-data", "a-quant", 1),
  arrow("a-e3", "a-quant", "a-out", 1),
  text(
    "a-note",
    30,
    190,
    "No training run. Scales come from the data; GPTQ quantised a 175 B model in about 4 GPU hours.",
    1,
    PROD_TONE.compute
  ),

  // Lane B: QAT
  text("b-title", 30, 226, "Quantisation-aware training: rounding happens inside training", 2),
  box("b-data", "b", 250, "Training data", "the usual training set", PROD_TONE.data, 2),
  box("b-model", "a", 334, "Model to adapt", "16-bit weights", PROD_TONE.model, 2),
  box("b-train", "b", 334, "Training loop", "forward rounds · backward updates", PROD_TONE.compute, 2, {
    highlight: true,
    quiet: false,
  }),
  box("b-out", "c", 334, "Quantised model", "4- or 8-bit weights + scales", PROD_TONE.model, 2),
  arrow("b-e1", "b-model", "b-train", 2, "weights"),
  arrow("b-e2", "b-data", "b-train", 2),
  arrow("b-e3", "b-train", "b-out", 2),
  text(
    "b-note",
    30,
    404,
    "A real training run. Gradients pass straight through the rounding, so weights learn to sit where rounding hurts least.",
    2,
    PROD_TONE.compute
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Post-training quantisation against quantisation-aware training",
  width: 840,
  height: 436,
  steps: [
    { title: "PTQ: quantise a finished model with calibration data" },
    { title: "QAT: train with the rounding in the loop" },
  ],
  shapes,
};

export default spec;
