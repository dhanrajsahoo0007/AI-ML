import type { DiagramSpec } from "@/components/diagrams/types";
import { PROD_TONE, DATASETS, n } from "@/components/diagrams/presets/production";
import { EVAL_RUN, RUN, RUN_TOTAL, pc } from "@/components/diagrams/presets/production-retrain";

// An automated retraining run for Brightpost's fine-tuned model (automated-retraining-finetuning, Architecture). A
// trigger fires (the 1,000-ticket counter from cicd-ct-pipelines), the run collects the new resolved tickets, curates
// them, trains a candidate with replayed old tickets, passes it through a gate (new golden set AND the frozen old
// suite), registers it, and canaries it against the live champion. A failed gate stops the run.
//
// Counts (presets/production-retrain.ts; illustrative except the trigger and the golden set):
//   1,000 new tickets → 700 kept (PII, near duplicates, balance, golden set out) → + 700 replayed = 1,400 to train on.
//   Gate: golden 184 of 200 = 92 % (floor 170); old suite 113 of 120 = 94.2 % (floor 112). Canary 1 %, 10 %, 50 %.
// Steps: 1 the trigger and the new tickets · 2 curate · 3 train a candidate · 4 the gate · 5 register · 6 canary against
// the champion. Nodes never move. Grid: four columns x 100 / 330 / 560 / 790 (w 140); row 1 y 90 (trigger, collect,
// curate, train); row 2 y 260 right to left (gate, registry, canary, champion); the stop node at (790, 410).
// Colour (four tones plus neutral): data blue, compute teal (training), checks lime (gate), stores violet (registry),
// the model green (champion), control neutral (trigger, curation, canary); red only for the stop.

const COL = [100, 330, 560, 790] as const;
const W = 150;
const R1 = 90;
const R2 = 260;

const spec: DiagramSpec = {
  title: "An automated retraining run, from trigger to canary",
  width: 900,
  height: 470,
  steps: [
    { title: "A trigger fires and new tickets are collected" },
    { title: "Curate the new tickets" },
    { title: "Train a candidate, with replay" },
    { title: "The gate: new golden set and the old suite" },
    { title: "Register the candidate with its lineage" },
    { title: "Canary against the champion" },
  ],
  zones: [],
  nodes: [
    {
      id: "trigger",
      label: "Trigger",
      sub: "20 % new data",
      icon: "controller",
      tone: PROD_TONE.infra,
      fill: "pastel",
      x: COL[0],
      y: R1,
      w: W,
    },
    {
      id: "collect",
      label: "Collect",
      sub: "new tickets",
      icon: "database",
      tone: PROD_TONE.data,
      fill: "pastel",
      x: COL[1],
      y: R1,
      w: W,
    },
    {
      id: "curate",
      label: "Curate",
      sub: "PII, dupes",
      icon: "pipeline",
      tone: PROD_TONE.infra,
      fill: "pastel",
      step: 2,
      x: COL[2],
      y: R1,
      w: W,
    },
    {
      id: "train",
      label: "Train",
      sub: "LoRA run",
      icon: "gpu",
      tone: PROD_TONE.compute,
      fill: "pastel",
      step: 3,
      x: COL[3],
      y: R1,
      w: W,
    },
    {
      id: "gate",
      label: "Gate",
      sub: "golden + old",
      icon: "meter",
      tone: PROD_TONE.check,
      accent: true,
      step: 4,
      x: COL[3],
      y: R2,
      w: W,
    },
    {
      id: "stop",
      label: "Stop",
      sub: "ticket opened",
      icon: "shield",
      tone: PROD_TONE.failure,
      fill: "pastel",
      step: 4,
      x: COL[3],
      y: 410,
      w: W,
    },
    {
      id: "registry",
      label: "Registry",
      sub: "not live",
      icon: "registry",
      tone: PROD_TONE.store,
      fill: "pastel",
      step: 5,
      x: COL[2],
      y: R2,
      w: W,
    },
    {
      id: "canary",
      label: "Canary",
      sub: "1, 10, 50 %",
      icon: "router",
      tone: PROD_TONE.infra,
      fill: "pastel",
      step: 6,
      x: COL[1],
      y: R2,
      w: W,
    },
    {
      id: "champion",
      label: "Champion",
      sub: "live bundle",
      icon: "model",
      tone: PROD_TONE.model,
      fill: "pastel",
      step: 6,
      x: COL[0],
      y: R2,
      w: W,
    },
  ],
  edges: [
    { from: "trigger", to: "collect", label: `${n(RUN.newTickets)}`, packet: true },
    { from: "collect", to: "curate", label: `${RUN.kept} kept`, packet: true, step: 2 },
    { from: "curate", to: "train", label: `${n(RUN_TOTAL)} mix`, packet: true, step: 3 },
    { from: "train", to: "gate", label: "candidate", packet: true, step: 4 },
    { from: "gate", to: "stop", label: "fail", tone: PROD_TONE.failure, dashed: true, step: 4 },
    { from: "gate", to: "registry", label: pc(EVAL_RUN.goodPass, DATASETS.goldenSet, 0), packet: true, step: 5 },
    { from: "registry", to: "canary", label: "bundle 42", packet: true, step: 6 },
    { from: "champion", to: "canary", label: "compare", step: 6 },
  ],
};
export default spec;
