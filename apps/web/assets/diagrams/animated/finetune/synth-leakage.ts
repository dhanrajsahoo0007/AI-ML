import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { FINETUNE_TONE as T, PROD_TONE, DATASETS, n } from "@/components/diagrams/presets/production";
import { blockBox, link, note } from "@/components/diagrams/presets/production-finetune";
import {
  LEAK,
  LEAK_CANDIDATES,
  LEAK_INFLATION_POINTS,
  LEAK_INFLATION_TICKETS,
  LEAK_IN_TRAINING,
  LEAK_SHARE,
  LEAK_THRESHOLD,
  SYNTH,
  SYNTH_KEPT,
} from "@/components/diagrams/presets/production-synth";

// How golden-set tickets reach the training set through the synthetic pipeline (synthetic-data-and-dataset-curation,
// Deep dive). Static. Illustrative counts (presets/production-synth.ts):
//   20 of the 150 seeds were copied from the golden set → 8,000 ÷ 150 = 53.3 candidates per seed → 1,067 candidates →
//   × the kept share 0.525 = 560 near copies among the 4,200 kept (13.3 %).
//   The student passes those 20 tickets from memory (20 of 20); an honest 88 % would be 17.6, so the score is inflated
//   by 2.4 tickets = 2.4 ÷ 200 = 1.2 points.
// Layout (880 x 390): five boxes w 140 h 64 at y 60, x 20 / 200 / 380 / 560 / 740; notes under them at y 140; the red
// return line at y 215 from the student back to the golden set; the guard box at y 300.
// Colour: data blue, generator green, student orange (trained weights), the guard lime; red only on the leak.

const BOX_W = 140;
const BOX_Y = 60;
const X = [20, 200, 380, 560, 740];
const NW = 170;
const nx = (i: number) => X[i] + BOX_W / 2 - NW / 2;

const shapes: LayoutShape[] = [
  blockBox("golden", X[0], BOX_Y, BOX_W, 64, "Golden set", T.data, { sub: `${DATASETS.goldenSet} tickets` }),
  blockBox("seeds", X[1], BOX_Y, BOX_W, 64, "Seed pool", T.data, { sub: `${SYNTH.seeds} seeds` }),
  blockBox("gen", X[2], BOX_Y, BOX_W, 64, "Generate", T.model, { sub: `${n(SYNTH.candidates)} candidates` }),
  blockBox("train", X[3], BOX_Y, BOX_W, 64, "Training set", T.data, { sub: `${n(SYNTH_KEPT)} examples` }),
  blockBox("student", X[4], BOX_Y, BOX_W, 64, "Student", T.trained, { sub: "fine-tuned" }),
  { ...link("leak", "golden", "seeds"), tone: PROD_TONE.failure },
  link("a2", "seeds", "gen"),
  link("a3", "gen", "train"),
  link("a4", "train", "student"),
  {
    id: "back",
    type: "arrow",
    x: 0,
    y: 0,
    from: "student",
    to: "golden",
    via: [
      [X[4] + BOX_W / 2, 36],
      [X[0] + BOX_W / 2, 36],
    ],
    tone: PROD_TONE.failure,
    dashed: true,
  },
  note("n-gold", nx(0), 136, NW, "held out, never trained on"),
  note("n-seed", nx(1), 136, NW, `${LEAK.goldenSeeds} of ${SYNTH.seeds} were copied\nfrom the golden set`, {
    tone: PROD_TONE.failure,
    h: 36,
  }),
  note("n-gen", nx(2), 136, NW, `${n(LEAK_CANDIDATES)} variants of those ${LEAK.goldenSeeds}\n(53 per seed)`, {
    tone: PROD_TONE.failure,
    h: 36,
  }),
  note(
    "n-train",
    nx(3),
    136,
    NW,
    `about ${n(LEAK_IN_TRAINING)} near copies\n= ${(LEAK_SHARE * 100).toFixed(1)} % of the set`,
    { tone: PROD_TONE.failure, h: 36 }
  ),
  note("n-stu", nx(4), 136, NW, "has seen the answers", { tone: PROD_TONE.failure }),
  note(
    "n-back",
    120,
    8,
    640,
    `graded on tickets it has seen: ${LEAK.goldenSeeds} of ${LEAK.goldenSeeds}. Honest ${(LEAK.honestPass * 100).toFixed(0)} % would be ${(LEAK.goldenSeeds * LEAK.honestPass).toFixed(1)}: score inflated by ${LEAK_INFLATION_TICKETS.toFixed(1)} tickets = ${LEAK_INFLATION_POINTS.toFixed(1)} points`,
    { tone: PROD_TONE.failure }
  ),
  blockBox("guard", 120, 210, 640, 60, "The guard", T.check, {
    sub: `split the golden set off first, then drop any candidate with ROUGE-L ${LEAK_THRESHOLD} or more to a golden ticket`,
  }),
  note("ill", 20, 284, 840, "all counts illustrative; 0.7 is Self-Instruct's own similarity threshold, reused here"),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "How golden-set tickets reach the training set",
  width: 900,
  height: 315,
  shapes,
};

export default spec;
