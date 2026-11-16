import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE, confusionGrid, n } from "@/components/diagrams/presets/production";
import { ADJUDICATED, ANNOTATOR_GRID, HUMAN_STATS } from "@/components/diagrams/presets/production-human";

// Two annotators against each other on the 200 golden tickets (human-evaluation-and-feedback, Deep dive). A 2 × 2
// `confusionGrid`: rows annotator A (fail, pass), columns annotator B. Counts ILLUSTRATIVE (presets/production-human),
// sum 200. Working:
//   agreement = (52 + 126) ÷ 200 = 0.89, 22 tickets differ
//   chance    = (62 × 64 + 138 × 136) ÷ 200² = 0.5684
//   kappa     = (0.89 − 0.5684) ÷ (1 − 0.5684) = 0.745
//   adjudicated: 22 differ → 8 fail + 14 pass, so the final labels are fail 52 + 8 = 60, pass 126 + 14 = 140.
//
// Three steps: 1 the grid and agreement · 2 agreement beyond chance · 3 the adjudicator and the final labels.
//
// Layout: grid builder at (20, 24), 120 × 64 cells; extra metric box under the builder's; two final-label boxes
// (a sum each) below the grid at step 3.
//
// Colour (production legend): agreement cells and scores lime (a check), disagreement cells soft red, final labels blue
// (data). Two tones plus red.

const pct = (v: number) => `${Math.round(v * 100)} %`;
const GX = 20;
const GY = 24;
const grid = confusionGrid("g", GX, GY, {
  rowLabels: [`Annotator A: fail (${HUMAN_STATS.aFail})`, `Annotator A: pass (${HUMAN_STATS.aPass})`],
  colLabels: ["B: fail", "B: pass"],
  colTitle: "Annotator B says",
  counts: ANNOTATOR_GRID,
  cellW: 120,
  cellH: 64,
  metrics: [{ label: "Agreement", value: pct(HUMAN_STATS.agreement) }],
  step: 1,
});
const m0 = grid.find((s) => s.id === "g-metric-0")!;
m0.w = 230;
const noteY = GY + 22 + 2 * 64 + 28;

const finalBox = (id: string, x: number, label: string, sub: string): LayoutShape => ({
  id,
  type: "box",
  x,
  y: noteY,
  w: 400,
  h: 56,
  label,
  sub,
  tone: PROD_TONE.data,
  fill: "pastel",
  step: 3,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: `Two annotators against each other on ${n(DATASETS.goldenSet)} tickets`,
  width: 860,
  height: noteY + 90,
  steps: [
    { title: "Where the two annotators agree" },
    { title: "Agreement beyond chance" },
    { title: "The adjudicator settles the rest" },
  ],
  shapes: (
    [
      ...grid,
      {
        id: "m-differ",
        type: "cell",
        x: m0.x,
        y: m0.y + 38,
        w: m0.w,
        h: 30,
        label: `${HUMAN_STATS.differ} tickets differ`,
        tone: PROD_TONE.failure,
        fill: "soft",
        step: 2,
      },
      {
        id: "m-kappa",
        type: "cell",
        x: m0.x,
        y: m0.y + 76,
        w: m0.w,
        h: 30,
        label: `Cohen's κ = ${HUMAN_STATS.kappa.toFixed(2)}`,
        tone: PROD_TONE.check,
        fill: "soft",
        step: 2,
      },
      finalBox(
        "fin-fail",
        GX,
        `${HUMAN_STATS.finalFail} fail`,
        `${HUMAN_STATS.agreedFail} agreed + ${ADJUDICATED.fail} adjudicated`
      ),
      finalBox(
        "fin-pass",
        GX + 420,
        `${HUMAN_STATS.finalPass} pass`,
        `${HUMAN_STATS.agreedPass} agreed + ${ADJUDICATED.pass} adjudicated`
      ),
      {
        id: "note",
        type: "text",
        x: GX,
        y: noteY + 66,
        w: 520,
        h: 20,
        label: "Counts are illustrative: the shape of the method, not measured data.",
        tone: PROD_TONE.infra,
        step: 3,
        quiet: true,
      },
    ] as LayoutShape[]
  ).map((sh): LayoutShape => sh),
};

export default spec;
