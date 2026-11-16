import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE, confusionGrid, cohensKappa, accuracy, n } from "@/components/diagrams/presets/production";
import { JUDGE_GRID, JUDGE_STATS, LAZY_JUDGE } from "@/components/diagrams/presets/production-judge";

// Judge against human on Brightpost's 200-ticket golden set (llm-as-judge-evaluation, Deep dive). A 2 × 2 grid from
// `confusionGrid`: rows are the human verdict (fail, pass), columns the judge's. Counts are ILLUSTRATIVE
// (presets/production-judge.ts) and sum to 200 (the preset throws if not). Working:
//   agreement  = (46 + 130) ÷ 200 = 0.88
//   chance     = (60 × 56 + 140 × 144) ÷ 200² = 0.588
//   kappa      = (0.88 − 0.588) ÷ (1 − 0.588) = 0.709
//   caught     = 46 ÷ 60 = 0.767 of the human-fail tickets
//   always-pass judge: agreement 140 ÷ 200 = 0.70, chance 0.70, kappa 0.
//
// Three steps: 1 the grid and agreement · 2 failures caught and kappa · 3 a judge that always says pass.
//
// Layout: the grid builder at (20, 24) with 110 × 60 cells; extra metric boxes under the builder's, same column; the
// always-pass note below the grid across the full width.
//
// Colour (production legend): agreement cells and scores lime (a check), disagreement cells soft red, the lazy-judge
// note neutral. One tone plus red and neutral.

const pct = (v: number) => `${Math.round(v * 100)} %`;
const GX = 20;
const GY = 24;
const grid = confusionGrid("g", GX, GY, {
  rowLabels: [`Human: fail (${JUDGE_STATS.humanFail})`, `Human: pass (${JUDGE_STATS.humanPass})`],
  colLabels: ["Fail", "Pass"],
  colTitle: "Judge says",
  counts: JUDGE_GRID,
  cellW: 120,
  cellH: 64,
  metrics: [{ label: "Agreement", value: pct(accuracy(JUDGE_GRID)) }],
  step: 1,
});
const m0 = grid.find((s) => s.id === "g-metric-0")!;
m0.w = 210;

const extra = (id: string, i: number, label: string, step: number): LayoutShape => ({
  id,
  type: "cell",
  x: m0.x,
  y: m0.y + i * 38,
  w: m0.w,
  h: 30,
  label,
  tone: PROD_TONE.check,
  fill: "soft",
  step,
});

const lazyAgree = accuracy(LAZY_JUDGE);
const lazyKappa = Math.abs(cohensKappa(LAZY_JUDGE)) < 1e-9 ? 0 : cohensKappa(LAZY_JUDGE);
const noteY = GY + 22 + 2 * 64 + 28;

const note = (id: string, y: number, label: string): LayoutShape => ({
  id,
  type: "text",
  x: GX,
  y,
  w: 800,
  h: 20,
  label,
  tone: PROD_TONE.infra,
  step: 3,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: `A model judge against a person on ${n(DATASETS.goldenSet)} tickets`,
  width: 860,
  height: noteY + 90,
  steps: [
    { title: "Where the judge and the person agree" },
    { title: "Failures caught, and agreement beyond chance" },
    { title: "Why agreement alone is not enough" },
  ],
  shapes: (
    [
      ...grid,
      extra("m-caught", 1, `Failures caught = ${pct(JUDGE_STATS.caught)}`, 2),
      extra("m-kappa", 2, `Cohen's κ = ${JUDGE_STATS.kappa.toFixed(2)}`, 2),
      {
        id: "lazy",
        type: "box",
        x: GX,
        y: noteY,
        w: 560,
        h: 54,
        label: `A judge that says "pass" to everything: agreement ${pct(lazyAgree)}, κ = ${lazyKappa.toFixed(2)}`,
        sub: "140 of 200 tickets pass, so it is right 70 % of the time by luck",
        tone: PROD_TONE.infra,
        fill: "paper",
        step: 3,
      },
      note("note", noteY + 64, "Counts are illustrative: the shape of the method, not measured data."),
    ] as LayoutShape[]
  ).map((sh): LayoutShape => (sh.id === "note" ? { ...sh, quiet: true } : sh)),
};

export default spec;
