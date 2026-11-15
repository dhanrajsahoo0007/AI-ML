import type { DiagramSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE, REFUND_CASE, n } from "@/components/diagrams/presets/production";

// How a thumbs-down becomes a test case (human-evaluation-and-feedback, Worked example). A Brightpost customer who asked
// about order 4471 (the cracked £42 kettle) was told "your refund is on its way" with no approval; she clicks thumbs-down.
// The click and the trace id go to the feedback log; triage redacts personal data and groups duplicates; a reviewer
// reads the case and writes the expected behaviour; the labelled case joins the golden set (200 → 201 tickets); the
// evaluation gate runs it on every later change.
//
// Five steps: 1 the thumbs-down is logged with its trace · 2 triage redacts and groups · 3 a reviewer reads the case ·
// 4 the labelled case joins the golden set · 5 the gate runs it on every change. Nodes never move between steps.
//
// Layout: customer x 100 row 100; answer x 370 row 100; feedback log x 370 row 250; triage x 690 row 250; reviewer
// x 690 row 400; golden set x 370 row 400; gate x 100 row 400.
//
// Colour (production legend, four tones plus neutral): the customer and the reviewer orange, the answer green, the log
// violet (a store), the golden set blue (data), the gate lime (a check), triage neutral. The golden set is the accent.

const spec: DiagramSpec = {
  title: "From a thumbs-down to a test case",
  width: 880,
  height: 500,
  steps: [
    { title: "The thumbs-down is logged with its trace" },
    { title: "Triage removes personal data and duplicates" },
    { title: "A reviewer reads the case" },
    { title: "The labelled case joins the golden set" },
    { title: "The gate runs it on every change" },
  ],
  zones: [],
  nodes: [
    {
      id: "customer",
      label: "Customer",
      sub: `order ${REFUND_CASE.orderId}, £${REFUND_CASE.price}`,
      icon: "users",
      tone: PROD_TONE.traffic,
      variant: "glyph",
      x: 90,
      y: 100,
    },
    {
      id: "answer",
      label: "Assistant answer",
      sub: '"your refund is on its way"',
      icon: "model",
      tone: PROD_TONE.model,
      fill: "pastel",
      x: 385,
      y: 100,
      w: 210,
    },
    {
      id: "log",
      label: "Feedback log",
      sub: "click, trace id, versions",
      icon: "database",
      tone: PROD_TONE.store,
      fill: "pastel",
      x: 385,
      y: 250,
      w: 210,
    },
    {
      id: "triage",
      label: "Triage",
      sub: "redact, group duplicates",
      icon: "shield",
      tone: PROD_TONE.infra,
      x: 705,
      y: 250,
      w: 210,
      step: 2,
    },
    {
      id: "reviewer",
      label: "Reviewer",
      sub: "labels the case",
      icon: "users",
      tone: PROD_TONE.traffic,
      variant: "glyph",
      x: 705,
      y: 400,
      step: 3,
    },
    {
      id: "golden",
      label: "Golden set",
      sub: `${n(DATASETS.goldenSet)} → ${n(DATASETS.goldenSet + 1)} tickets`,
      icon: "database",
      tone: PROD_TONE.data,
      accent: true,
      x: 385,
      y: 400,
      w: 210,
      step: 4,
    },
    {
      id: "gate",
      label: "Evaluation gate",
      sub: "blocks on a fail",
      icon: "approval",
      tone: PROD_TONE.check,
      fill: "pastel",
      x: 90,
      y: 400,
      w: 160,
      step: 5,
    },
  ],
  edges: [
    { from: "answer", to: "customer", label: "shown", packet: true },
    { from: "customer", to: "log", label: "thumbs-down", packet: true, delay: 0.6, labelAt: 0.5 },
    { from: "answer", to: "log", label: "trace id", dashed: true, flow: true },
    { from: "log", to: "triage", label: "daily batch", packet: true, step: 2 },
    { from: "triage", to: "reviewer", label: "20 a day", packet: true, step: 3 },
    { from: "reviewer", to: "golden", label: "labelled case", packet: true, step: 4 },
    { from: "golden", to: "gate", label: "each change", packet: true, step: 5 },
  ],
};

export default spec;
