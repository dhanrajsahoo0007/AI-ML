import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { FINETUNE_TONE as T, PROD_TONE, n } from "@/components/diagrams/presets/production";
import { blockBox, link, note } from "@/components/diagrams/presets/production-finetune";
import {
  SYNTH,
  SYNTH_AFTER_DEDUPE,
  SYNTH_KEPT,
  SYNTH_KEPT_SHARE,
} from "@/components/diagrams/presets/production-synth";

// The synthetic-data pipeline (synthetic-data-and-dataset-curation, Architecture): 150 real seed tickets → a teacher
// writes 8,000 candidates → near duplicates are dropped → format, refund-rule and judge filters → a person reads 100.
// Counts are ILLUSTRATIVE (presets/production-synth.ts): 8,000 − 1,800 = 6,200; 6,200 − 2,000 = 4,200 (52.5 %).
// Steps: one per stage, left to right; nothing moves. Grid: five boxes w 140 h 64 at y 70, x = 20 + i × 172; a note
// under each at y 150 (w 160); the running arithmetic at y 250.
// Colour: seed data blue, generator green (the model), dedupe neutral (control), judge and spot check lime (checks).

const X = (i: number) => 20 + i * 172;
const W = 140;
const NW = 164;
const nx = (i: number) => X(i) + W / 2 - NW / 2;

const stage = (id: string, i: number, label: string, sub: string, tone: LayoutShape["tone"], hi = false) =>
  blockBox(id, X(i), 70, W, 64, label, tone ?? T.frozen, { sub, step: i + 1, highlight: hi });

const shapes: LayoutShape[] = [
  stage("seed", 0, "Seed", `${SYNTH.seeds} real tickets`, T.data),
  stage("gen", 1, "Generate", `${n(SYNTH.candidates)} candidates`, T.model),
  stage("dedupe", 2, "Deduplicate", `${n(SYNTH_AFTER_DEDUPE)} left`, PROD_TONE.infra),
  stage("judge", 3, "Filter + judge", `${n(SYNTH_KEPT)} kept`, T.check),
  stage("spot", 4, "Spot check", `${SYNTH.read} read, ${SYNTH.badFound} bad`, T.check, true),
  link("a1", "seed", "gen", { step: 2 }),
  link("a2", "gen", "dedupe", { step: 3 }),
  link("a3", "dedupe", "judge", { step: 4 }),
  link("a4", "judge", "spot", { step: 5 }),

  note("n1", nx(0), 150, NW, "none from the golden set,\nwritten by support leads", { step: 1, h: 36 }),
  note("n2", nx(1), 150, NW, "the teacher varies topic,\ntone and customer type", { step: 2, h: 36 }),
  note("n3", nx(2), 150, NW, `−${n(SYNTH.dupes)} near copies\n(ROUGE-L or embeddings)`, { step: 3, h: 36 }),
  note("n4", nx(3), 150, NW, `−${n(SYNTH.rejected)} fail format,\nrefund rule or the judge`, { step: 4, h: 36 }),
  note("n5", nx(4), 150, NW, `${SYNTH.badFound} % bad: fix the prompt\nand run again`, {
    step: 5,
    h: 36,
    tone: T.check,
  }),

  note(
    "sum",
    20,
    250,
    840,
    `${n(SYNTH.candidates)} − ${n(SYNTH.dupes)} = ${n(SYNTH_AFTER_DEDUPE)}   ·   ${n(SYNTH_AFTER_DEDUPE)} − ${n(SYNTH.rejected)} = ${n(SYNTH_KEPT)}   ·   kept share ${n(SYNTH_KEPT)} ÷ ${n(SYNTH.candidates)} = ${(SYNTH_KEPT_SHARE * 100).toFixed(1)} %   (all counts illustrative)`,
    { step: 5 }
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "A synthetic-data pipeline for Brightpost's rare cases",
  width: 880,
  height: 300,
  steps: [
    { title: "Start from real seed tickets" },
    { title: "A teacher writes many candidates" },
    { title: "Drop near duplicates" },
    { title: "Filter by rule, then by a judge" },
    { title: "A person reads a sample" },
  ],
  shapes,
};

export default spec;
