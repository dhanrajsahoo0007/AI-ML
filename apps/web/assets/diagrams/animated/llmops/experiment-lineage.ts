import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE } from "@/components/diagrams/presets/production";
import { QUALITY, RUNS, box, link, note } from "@/components/diagrams/presets/production-ops";

// Lineage of one candidate model (experiment-tracking-version-control, Deep dive). Three inputs (dataset tickets-v3,
// prompt p12, base model m6) go into one run, which produces model m7; the golden set scores it. Step 5 changes only
// the prompt (p13): a second run, a second model and a worse score, so the lineage shows which input to blame.
// (The rag/lineage figure traces one RAG answer back to a source document; this one traces a model to its inputs, so
// it is drawn here instead.)
//
// Working (RUNS in production-ops.ts; counts illustrative, shared with the release pipeline):
//   r-0187: 184 of 200 = 92 %. r-0188: 164 of 200 = 82 %. Floor 85 % = 170 of 200. Gap 20 answers = 10 points.
//   Dataset tickets-v3 = the 5,000 resolved tickets (DATASETS.fineTuneSet).
//
// Steps: 1 three inputs · 2 the run · 3 the model it produces · 4 the score on the golden set · 5 change one input.
// Layout (880 x 450): inputs x 15 (w 180, h 56) at y 40 / 120 / 200; run x 255 y 120 (w 150, h 56); model x 465 y 120
// (w 150, h 56); score x 675 y 120 (w 190, h 56); golden set x 675 y 215 (w 190, h 50). Second chain at y 350:
// prompt p13 x 15, run r-0188 x 255, model m8 x 465, score x 675 (red).
// Colour (four tones plus neutral): data and prompt blue, base model neutral, run teal, model green, score lime
// (red for the failing score), golden set blue.

const shapes: LayoutShape[] = [
  box(
    "in-data",
    15,
    40,
    180,
    56,
    "Dataset tickets-v3",
    `${DATASETS.fineTuneSet.toLocaleString("en-GB")} resolved tickets`,
    PROD_TONE.data,
    1
  ),
  box("in-prompt", 15, 120, 180, 56, `Prompt ${RUNS.a.prompt}`, "refund wording", PROD_TONE.data, 1),
  box("in-base", 15, 200, 180, 56, "Base model m6", "revision pinned", PROD_TONE.infra, 1),

  box("run", 255, 120, 150, 56, `Run ${RUNS.a.id}`, "commit a3f9c1e", PROD_TONE.compute, 2),
  link("a-d", "in-data", "run", 2),
  link("a-p", "in-prompt", "run", 2),
  link("a-b", "in-base", "run", 2),

  box("model", 465, 120, 150, 56, "Model m7", "adapter weights", PROD_TONE.model, 3),
  link("a-run-model", "run", "model", 3),

  box(
    "score",
    675,
    120,
    190,
    56,
    `Score ${RUNS.a.pass} of ${DATASETS.goldenSet}`,
    `${Math.round((RUNS.a.pass / DATASETS.goldenSet) * 100)} %, floor ${Math.round(QUALITY.floor * 100)} %`,
    PROD_TONE.check,
    4
  ),
  box("golden", 675, 215, 190, 50, "Golden set", `${DATASETS.goldenSet} tickets, fixed`, PROD_TONE.data, 4),
  link("a-model-score", "model", "score", 4),
  link("a-golden-score", "golden", "score", 4),

  note("fork", 15, 300, 600, 24, "Change one input: the same data and base model, a different prompt", 5),
  box("in-prompt2", 15, 350, 180, 56, "Prompt p13", "new refund wording", PROD_TONE.data, 5),
  box("run2", 255, 350, 150, 56, `Run ${RUNS.b.id}`, "commit a3f9c1e", PROD_TONE.compute, 5),
  box("model2", 465, 350, 150, 56, "Model m8", "adapter weights", PROD_TONE.model, 5),
  box(
    "score2",
    675,
    350,
    190,
    56,
    `Score ${RUNS.b.pass} of ${DATASETS.goldenSet}`,
    `${Math.round((RUNS.b.pass / DATASETS.goldenSet) * 100)} %, under the floor`,
    PROD_TONE.failure,
    5
  ),
  link("b-p", "in-prompt2", "run2", 5),
  link("b-run", "run2", "model2", 5),
  link("b-model", "model2", "score2", 5),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Lineage of a candidate model: inputs, run, model, score",
  width: 880,
  height: 440,
  steps: [
    { title: "Three inputs: data, prompt, base model" },
    { title: "One run reads them" },
    { title: "The run produces a model" },
    { title: "The golden set scores it" },
    { title: "Change one input, and the lineage shows which" },
  ],
  shapes,
};

export default spec;
