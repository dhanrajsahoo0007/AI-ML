import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE } from "@/components/diagrams/presets/production";
import { MODELS, goldenPct, halfWidth } from "@/components/diagrams/presets/production-eval";

// The public ranking against the ranking on Brightpost's 200-ticket golden set (offline-evaluation-benchmarks, Worked
// example). THREE HYPOTHETICAL MODELS, ILLUSTRATIVE SCORES. Left: public benchmark accuracy, bars 2.6 px per point.
// Right: tickets answered correctly out of 200, bars 2.6 px per point.
//   Model A 88 % public, 150/200 = 75.0 % (95 % interval ± 6.0 points)
//   Model B 85 % public, 136/200 = 68.0 % (± 6.5)
//   Model C 79 % public, 168/200 = 84.0 % (± 5.1);  half-width = 1.96 × sqrt(p (1 − p) ÷ 200).
// The order is A, B, C on the left and C, A, B on the right; arrows join each model's two bars, so they cross.
// Grid: left bars x 20, right bars x 580, rows y 70 | 130 | 190 (h 44). Model C is the accent (ring on both bars).
// Colours: green (the model), neutral arrows; the lime heading marks the golden set as the check that counts.

const SCALE = 2.6;
const ROW = (i: number) => 70 + 60 * i;
const byPublic = [...MODELS].sort((a, b) => b.publicScore - a.publicScore);
const byGolden = [...MODELS].sort((a, b) => b.golden - a.golden);
const id = (side: string, name: string) => `${side}-${name.replace(" ", "-").toLowerCase()}`;

const shapes: LayoutShape[] = [
  {
    id: "h-left",
    type: "text",
    x: 20,
    y: 24,
    w: 330,
    h: 20,
    label: "Public benchmark (accuracy, illustrative)",
    tone: PROD_TONE.infra,
    quiet: true,
  },
  {
    id: "h-right",
    type: "text",
    x: 580,
    y: 24,
    w: 300,
    h: 20,
    label: `Brightpost golden set, ${DATASETS.goldenSet} tickets`,
    tone: PROD_TONE.check,
    quiet: true,
  },
];

byPublic.forEach((m, i) =>
  shapes.push({
    id: id("l", m.name),
    type: "box",
    x: 20,
    y: ROW(i),
    w: Math.round(m.publicScore * SCALE),
    h: 44,
    label: `${i + 1}. ${m.name}`,
    sub: `${m.publicScore} %`,
    tone: PROD_TONE.model,
    fill: "pastel",
    highlight: m.name === "Model C" || undefined,
  })
);
byGolden.forEach((m, i) =>
  shapes.push({
    id: id("r", m.name),
    type: "box",
    x: 580,
    y: ROW(i),
    w: Math.round(goldenPct(m.golden) * SCALE),
    h: 44,
    label: `${i + 1}. ${m.name}`,
    sub: `${m.golden}/${DATASETS.goldenSet} = ${goldenPct(m.golden).toFixed(1)} % ± ${halfWidth(m.golden).toFixed(1)}`,
    tone: PROD_TONE.model,
    fill: "pastel",
    highlight: m.name === "Model C" || undefined,
  })
);
MODELS.forEach((m) =>
  shapes.push({
    id: `x-${m.name.replace(" ", "-").toLowerCase()}`,
    type: "arrow",
    x: 0,
    y: 0,
    from: id("l", m.name),
    to: id("r", m.name),
  })
);
shapes.push({
  id: "foot",
  type: "text",
  x: 20,
  y: 264,
  w: 760,
  h: 20,
  label:
    "Three hypothetical models. The interval is the 95 % range at 200 tickets. Pick the model on the right-hand column.",
  tone: PROD_TONE.infra,
  quiet: true,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The public ranking and the ranking on Brightpost's golden set differ",
  width: 880,
  height: 298,
  shapes,
};

export default spec;
