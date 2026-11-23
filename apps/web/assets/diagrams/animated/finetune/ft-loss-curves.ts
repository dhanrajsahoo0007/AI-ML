import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { FINETUNE_TONE as T, PROD_TONE, curve } from "@/components/diagrams/presets/production";

// Training and validation loss over epochs (Fine-Tuning LLMs, Deep dive). SHAPE ONLY: the curves are invented
// functions, not Brightpost measurements.
//   training   = 0.25 + 1.75 * exp(-0.9 e)                      falls for ever
//   validation = 0.55 + 1.45 * exp(-1.4 e) + 0.06 * max(0, e - 2)^2   falls, bottoms out, then rises
// The validation minimum is found in code (about epoch 2.5); that point is where to stop and keep the checkpoint.
// Layout (860 x 380): plot at (10, 6), 600 x 360; three boxes in a column at x 640 (w 210, h 74) from y 24, pitch 100.
// Colours: training orange (the weights being trained), validation lime (a check), overfitting red (it breaks).

const train = (e: number) => 0.25 + 1.75 * Math.exp(-0.9 * e);
const val = (e: number) => 0.55 + 1.45 * Math.exp(-1.4 * e) + 0.06 * Math.max(0, e - 2) ** 2;
const es: number[] = [];
for (let e = 0; e <= 6.0001; e += 0.25) es.push(e);
const best = es.reduce((a, b) => (val(b) < val(a) ? b : a));

const box = (id: string, y: number, label: string, sub: string, tone: LayoutShape["tone"]): LayoutShape => ({
  id,
  type: "box",
  x: 640,
  y,
  w: 210,
  h: 74,
  label,
  sub,
  tone,
  fill: "pastel",
});

const shapes: LayoutShape[] = [
  ...curve("lc", 10, 6, {
    width: 610,
    height: 360,
    xDomain: [0, 6],
    yDomain: [0, 2.1],
    xTicks: [0, 1, 2, 3, 4, 5, 6],
    yTicks: [],
    formatX: (v) => `${v}`,
    xLabel: "epochs (passes over the training set)",
    yLabel: "loss",
    shapeOnly: true,
    series: [
      { points: es.map((e) => [e, train(e)] as [number, number]), tone: T.trained, smooth: true, label: "training" },
      {
        points: es.map((e) => [e, val(e)] as [number, number]),
        tone: T.check,
        smooth: true,
        label: "validation",
      },
    ],
    marks: [{ x: best, y: val(best), label: "best checkpoint", tone: T.check, place: "below-right" }],
  }),
  box("b-train", 24, "Training loss", "keeps falling as the model memorises", T.trained),
  box("b-val", 124, "Validation loss", "bottoms out, then rises", T.check),
  box("b-over", 224, "Overfitting", "the gap after the best checkpoint", PROD_TONE.failure),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Training loss falls while validation loss turns back up",
  width: 860,
  height: 380,
  shapes,
};

export default spec;
