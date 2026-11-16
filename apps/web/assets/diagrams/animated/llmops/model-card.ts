import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE, REFUND_CASE, n } from "@/components/diagrams/presets/production";
import { RUNS, box, note } from "@/components/diagrams/presets/production-ops";

// A model card for Brightpost's model m7 (model-registry-governance, Deep dive). The nine sections follow Mitchell et
// al., "Model Cards for Model Reporting" (FAT* 2019, arXiv 1810.03993): Model Details, Intended Use, Factors, Metrics,
// Evaluation Data, Training Data, Quantitative Analyses, Ethical Considerations, Caveats and Recommendations. The
// entries are Brightpost's own and illustrative, except the numbers that come from the running example:
//   golden set 200 tickets; fine-tuning set 5,000 tickets; m7 scored 184 of 200 = 92 % (RUNS.a); refunds over £30 need
//   approval (REFUND_CASE.approvalLimit).
//
// Steps: 1 who built it and what for (row 1) · 2 how it was measured (row 2) · 3 what the numbers say and where it
// fails (row 3).
// Layout (880 x 380): three columns x 15 / 305 / 595 (w 270, h 86), rows y 30 / 140 / 250; a note at y 345.
// Colour (three tones plus neutral): descriptive sections neutral, data blue, checks lime.

const COL = [15, 305, 595] as const;
const ROWS = [30, 140, 250] as const;

const cards: { id: string; label: string; sub: string; tone: LayoutTone }[] = [
  { id: "details", label: "Model details", sub: "m7, fine-tuned from m6, Nov 2026", tone: PROD_TONE.infra },
  { id: "use", label: "Intended use", sub: "answer help questions, draft refunds", tone: PROD_TONE.infra },
  { id: "factors", label: "Factors", sub: "ticket type, language, order value", tone: PROD_TONE.infra },
  { id: "metrics", label: "Metrics", sub: "pass rate, refund-limit cases", tone: PROD_TONE.check },
  { id: "evaldata", label: "Evaluation data", sub: `golden set, ${DATASETS.goldenSet} tickets`, tone: PROD_TONE.data },
  {
    id: "traindata",
    label: "Training data",
    sub: `tickets-v3, ${n(DATASETS.fineTuneSet)} resolved tickets`,
    tone: PROD_TONE.data,
  },
  {
    id: "quant",
    label: "Quantitative analyses",
    sub: `${RUNS.a.pass} of ${DATASETS.goldenSet} = ${Math.round((RUNS.a.pass / DATASETS.goldenSet) * 100)} %, by ticket type`,
    tone: PROD_TONE.check,
  },
  { id: "ethics", label: "Ethical considerations", sub: "tickets hold personal data", tone: PROD_TONE.infra },
  {
    id: "caveats",
    label: "Caveats and recommendations",
    sub: `refunds over £${REFUND_CASE.approvalLimit} need approval`,
    tone: PROD_TONE.infra,
  },
];

const shapes: LayoutShape[] = cards.map((c, i) =>
  box(c.id, COL[i % 3], ROWS[Math.floor(i / 3)], 270, 86, c.label, c.sub, c.tone, Math.floor(i / 3) + 1)
);
shapes.push(note("foot", 15, 345, 850, 24, "Section names follow Mitchell et al., 2019. Entries are illustrative.", 3));

const spec: LayoutSpec = {
  kind: "layout",
  title: "A model card for Brightpost's model m7: nine sections",
  width: 880,
  height: 380,
  steps: [
    { title: "Who built it and what it is for" },
    { title: "How it was measured, and on what" },
    { title: "What the numbers say, and where it fails" },
  ],
  shapes,
};

export default spec;
