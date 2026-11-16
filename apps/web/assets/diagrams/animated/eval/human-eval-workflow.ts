import type { DiagramSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE, n } from "@/components/diagrams/presets/production";
import { HUMAN_STATS } from "@/components/diagrams/presets/production-human";

// How Brightpost builds human labels for its golden set (human-evaluation-and-feedback, Architecture). A sample of 200
// real tickets goes to two annotators who label it alone; their labels are compared; agreement is measured; tickets
// they agree on go straight in; tickets they differ on go to an adjudicator, whose label goes in.
// Counts are ILLUSTRATIVE (presets/production-human.ts): 200 tickets, 178 agree, 22 differ, agreement 89 %, κ 0.75.
//
// Five steps: 1 two annotators label the same tickets alone · 2 their labels are compared · 3 agreement is measured ·
// 4 agreed labels go in the golden set · 5 an adjudicator settles the rest. Nodes never move between steps.
//
// Layout: tickets x 95 row 230; annotators x 330 rows 110 and 350; compare x 570 row 230; agreement x 790 row 100;
// golden set x 790 row 340; adjudicator x 570 row 420.
//
// Colour (production legend, four tones plus neutral): tickets and the golden set blue (data), the people orange, the
// comparison and the agreement lime (a check). The golden set is the accent; arrows neutral.

const pct = (v: number) => `${Math.round(v * 100)} %`;

const spec: DiagramSpec = {
  title: "Human labels: two annotators, a comparison, an adjudicator",
  width: 880,
  height: 500,
  steps: [
    { title: "Two annotators label the same tickets alone" },
    { title: "Their labels are compared" },
    { title: "Agreement is measured" },
    { title: "Agreed labels go in" },
    { title: "An adjudicator settles the rest" },
  ],
  zones: [],
  nodes: [
    {
      id: "pool",
      label: "Real tickets",
      sub: `sample of ${n(DATASETS.goldenSet)}`,
      icon: "folder",
      tone: PROD_TONE.data,
      fill: "pastel",
      x: 95,
      y: 230,
      w: 160,
    },
    {
      id: "a",
      label: "Annotator A",
      sub: "labels alone",
      icon: "users",
      tone: PROD_TONE.traffic,
      variant: "glyph",
      x: 330,
      y: 110,
    },
    {
      id: "b",
      label: "Annotator B",
      sub: "labels alone",
      icon: "users",
      tone: PROD_TONE.traffic,
      variant: "glyph",
      x: 330,
      y: 350,
    },
    {
      id: "compare",
      label: "Compare",
      sub: `${HUMAN_STATS.agreed} agree, ${HUMAN_STATS.differ} differ`,
      icon: "meter",
      tone: PROD_TONE.check,
      fill: "pastel",
      x: 570,
      y: 230,
      w: 180,
      step: 2,
    },
    {
      id: "stats",
      label: `Agreement ${pct(HUMAN_STATS.agreement)}`,
      sub: `Cohen's κ ${HUMAN_STATS.kappa.toFixed(2)}`,
      icon: "chart",
      tone: PROD_TONE.check,
      fill: "pastel",
      x: 790,
      y: 100,
      w: 170,
      step: 3,
    },
    {
      id: "golden",
      label: "Golden set",
      sub: `${n(DATASETS.goldenSet)} final labels`,
      icon: "database",
      tone: PROD_TONE.data,
      accent: true,
      x: 790,
      y: 340,
      w: 170,
      step: 4,
    },
    {
      id: "adj",
      label: "Adjudicator",
      sub: `settles ${HUMAN_STATS.differ} tickets`,
      icon: "users",
      tone: PROD_TONE.traffic,
      variant: "glyph",
      x: 570,
      y: 420,
      step: 5,
    },
  ],
  edges: [
    { from: "pool", to: "a", label: "same 200", packet: true, labelAt: 0.5 },
    { from: "pool", to: "b", label: "same 200", packet: true, labelAt: 0.5, delay: 0.4 },
    { from: "a", to: "compare", label: "labels", packet: true, labelAt: 0.5, step: 2 },
    { from: "b", to: "compare", label: "labels", packet: true, labelAt: 0.5, step: 2 },
    { from: "compare", to: "stats", label: "measure", packet: true, step: 3 },
    { from: "compare", to: "golden", label: `${HUMAN_STATS.agreed} agree`, packet: true, step: 4 },
    { from: "compare", to: "adj", label: `${HUMAN_STATS.differ} differ`, packet: true, step: 5 },
    { from: "adj", to: "golden", label: "final label", packet: true, step: 5 },
  ],
};

export default spec;
