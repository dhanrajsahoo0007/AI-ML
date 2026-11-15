import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE, n } from "@/components/diagrams/presets/production";
import { QUALITY, RUNS, box, link, note } from "@/components/diagrams/presets/production-ops";

// The experiment record (experiment-tracking-version-control, Architecture). One training run of Brightpost's support
// model is stored as one record: what went in (parameters, data version, code commit, prompt version, base model) and
// what came out (metrics on the golden set, artefacts). If any input is missing, the run cannot be reproduced.
//
// Working: golden-set score 184 of 200 = 92 % (RUNS.a, illustrative, shared with the release pipeline), floor 85 %.
// Fine-tuning set 5,000 tickets (DATASETS.fineTuneSet); the data version tickets-v3 and its hash are invented for the
// figure, as are the commit and the training settings (rank 16, learning rate 2e-4, 3 epochs): all ILLUSTRATIVE.
//
// Steps: 1 the run is one record · 2 what went in (five cells) · 3 what came out (two cells).
// Layout (880 x 330): header box x 15 y 20 (w 850, h 50); inputs group x 15 y 95 (w 570, h 205) with five cells
// (w 170, h 66) at x 35 / 215 / 395, rows y 135 and y 215; outputs group x 625 y 95 (w 240, h 205) with two cells
// (w 200) at x 645, y 135 and y 215; an arrow joins the groups.
// Colour (four tones plus neutral): parameters, commit and base model neutral (settings and code), data and prompt
// blue (versioned data), metrics lime (a check), artefacts violet (a store).

const IN_W = 170;
const IN_H = 66;
const cell = (
  id: string,
  x: number,
  y: number,
  label: string,
  sub: string,
  tone: LayoutTone,
  step: number,
  w = IN_W
): LayoutShape => box(id, x, y, w, IN_H, label, sub, tone, step);

const shapes: LayoutShape[] = [
  box(
    "run",
    15,
    20,
    850,
    50,
    `Run ${RUNS.a.id}`,
    "one record per training run, written when it ends",
    PROD_TONE.infra,
    1
  ),

  cell("params", 35, 135, "Parameters", "LoRA rank 16, 3 epochs", PROD_TONE.infra, 2),
  cell("data", 215, 135, "Data version", `tickets-v3, ${n(DATASETS.fineTuneSet)} tickets`, PROD_TONE.data, 2),
  cell("commit", 395, 135, "Code commit", "a3f9c1e, train.py", PROD_TONE.infra, 2),
  cell("prompt", 35, 215, "Prompt version", RUNS.a.prompt, PROD_TONE.data, 2),
  cell("base", 215, 215, "Base model", "m6, revision pinned", PROD_TONE.infra, 2),

  cell(
    "metrics",
    645,
    135,
    "Metrics",
    `${RUNS.a.pass} of ${DATASETS.goldenSet} = ${Math.round((RUNS.a.pass / DATASETS.goldenSet) * 100)} % pass`,
    PROD_TONE.check,
    3,
    200
  ),
  cell("artefacts", 645, 215, "Artefacts", "model m7, evaluation report", PROD_TONE.store, 3, 200),

  note("in-title", 35, 100, 300, 24, "What went in", 2),
  note("out-title", 645, 100, 200, 24, "What came out", 3),
  link("a-io", "commit", "metrics", 3),
  note("foot", 395, 215, 190, 66, `Floor ${Math.round(QUALITY.floor * 100)} %.\nAll values illustrative.`, 3),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "One experiment record: what went in and what came out",
  width: 880,
  height: 330,
  steps: [
    { title: "A run is one record" },
    { title: "What went in: five things that can change the result" },
    { title: "What came out: metrics and artefacts" },
  ],
  shapes,
};

export default spec;
