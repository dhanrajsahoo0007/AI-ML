import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE, TOKENS } from "@/components/diagrams/presets/production";
import { blockBox, note } from "@/components/diagrams/presets/production-finetune";

// "What changes from MLOps to LLMOps" on the LLMOps and Observability page. Five rows, two columns: classic MLOps in
// neutral, LLMOps in green (the model). No numbers are drawn except Brightpost's shared ones: the 200-ticket golden
// set (DATASETS.goldenSet) and the daily tokens (TOKENS.inputPerDayLabel in, outputPerDayLabel out).
// Layout (860 x 400): column headers at y 8; rows start y 36, pitch 70, boxes h 58; row labels x 14 (w 150), MLOps
// boxes x 180 (w 320), LLMOps boxes x 520 (w 326).
// Colours (PROD_TONE): MLOps neutral (infra), LLMOps green (model). Two tones, no red: nothing breaks here.

const ROWS = [
  [
    "What sets behaviour",
    ["Trained weights", "fixed once training ends"],
    ["Prompt, data, tools and a model", "four things change; the weights are often not yours"],
  ],
  [
    "How you test",
    ["Accuracy on a labelled set", "one right answer per row"],
    ["Rubrics, judges and people", `open-ended answers; a golden set of ${DATASETS.goldenSet} tickets`],
  ],
  [
    "What drifts",
    ["Input features and labels", "your own data moves"],
    ["Queries, documents and the model", "a provider can change it under one name"],
  ],
  [
    "What costs money",
    ["Training and hosting", "cost set by model size"],
    ["Tokens on every request", `${TOKENS.inputPerDayLabel} in and ${TOKENS.outputPerDayLabel} out a day`],
  ],
  [
    "What you release",
    ["A model file", "versioned with data and code"],
    ["A bundle: prompt, model, config", "each versioned, rolled out by canary"],
  ],
] as const;

const Y = (i: number) => 36 + i * 70;
const shapes: LayoutShape[] = [
  note("h-ml", 180, 8, 320, "Classic MLOps", { tone: PROD_TONE.infra }),
  note("h-llm", 520, 8, 326, "LLMOps", { tone: PROD_TONE.model }),
  ...ROWS.flatMap(([label, ml, llm], i) => [
    note(`r-${i}`, 14, Y(i) + 20, 150, label, { tone: PROD_TONE.infra }),
    blockBox(`ml-${i}`, 180, Y(i), 320, 58, ml[0], PROD_TONE.infra, { sub: ml[1] }),
    blockBox(`llm-${i}`, 520, Y(i), 326, 58, llm[0], PROD_TONE.model, { sub: llm[1] }),
  ]),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "What changes from MLOps to LLMOps",
  width: 860,
  height: 396,
  shapes,
};

export default spec;
