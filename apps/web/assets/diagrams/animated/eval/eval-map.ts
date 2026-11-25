import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { DATASETS, PROD_TONE, REFUND_CASE, miniLifecycle } from "@/components/diagrams/presets/production";

// The map of evaluation (llm-evaluation-fundamentals, hero). Two moments (rows) against three things graded (columns).
//   Rows: offline = before release, on a fixed set, lime (a check); online = after release, on real traffic, orange.
//   Columns: a single output (one answer), a path (the steps an agent or pipeline took), the whole system (retrieval,
//   model, tools and the customer's outcome). Every cell names the Brightpost check that lives there.
//   The golden-set cell is the accent (ring). A dashed arrow runs from online to offline: a failure found in live
//   traffic becomes a test case. A mini lifecycle at the top right rings the Evaluate stage.
// Grid: columns x 150 | 390 | 630 (w 230); header row y 62 (h 40); rows y 116 and 262 (h 96); the arrow runs in the 54 px gap.
// Colours: lime (offline), orange (online), neutral (labels), plus the mini map's own legend tones.

const COLS = [150, 390, 630] as const;
const W = 230;
const ROWS = [116, 262] as const;
const H = 96;

const heads = [
  { label: "A single output", sub: "one answer" },
  { label: "A path", sub: "the steps taken to get there" },
  { label: "The whole system", sub: "retrieval, model, tools, outcome" },
] as const;

const cells = [
  [
    { label: `Golden set: ${DATASETS.goldenSet} tickets`, sub: "answer against a reference" },
    { label: "Scripted refund run", sub: `tool order, approval at £${REFUND_CASE.price}` },
    { label: "Release regression suite", sub: "the whole pipeline, before ship" },
  ],
  [
    { label: "Judge on live samples", sub: "a slice of real answers" },
    { label: "Trace checks", sub: `approval ran on refunds over £${REFUND_CASE.approvalLimit}` },
    { label: "Outcome signals", sub: "thumbs-down, hand-offs, A/B tests" },
  ],
] as const;

const shapes: LayoutShape[] = [
  {
    id: "title",
    type: "text",
    x: 20,
    y: 16,
    w: 330,
    h: 20,
    label: "Two moments, three things to grade",
    tone: PROD_TONE.infra,
    quiet: true,
  },
  ...miniLifecycle("loc", 690, 10, { width: 160, ring: ["eval"] }),
  {
    id: "loc-note",
    type: "text",
    x: 530,
    y: 20,
    w: 150,
    h: 18,
    label: "Where this sits:",
    tone: PROD_TONE.infra,
    quiet: true,
  },
];

heads.forEach((h, c) =>
  shapes.push({
    id: `head-${c}`,
    type: "box",
    x: COLS[c],
    y: 62,
    w: W,
    h: 42,
    label: h.label,
    sub: h.sub,
    tone: PROD_TONE.infra,
    fill: "soft",
  })
);

const rowLabels = [
  { label: "Offline", sub: "before release", tone: PROD_TONE.check },
  { label: "Online", sub: "real traffic", tone: PROD_TONE.traffic },
] as const;
rowLabels.forEach((r, i) =>
  shapes.push({
    id: `row-${i}`,
    type: "box",
    x: 20,
    y: ROWS[i],
    w: 116,
    h: H,
    label: r.label,
    sub: r.sub,
    tone: r.tone,
    fill: "soft",
  })
);

cells.forEach((row, r) =>
  row.forEach((cell, c) =>
    shapes.push({
      id: `cell-${r}-${c}`,
      type: "box",
      x: COLS[c],
      y: ROWS[r],
      w: W,
      h: H,
      label: cell.label,
      sub: cell.sub,
      tone: rowLabels[r].tone,
      fill: "pastel",
      highlight: (r === 0 && c === 0) || undefined,
    })
  )
);

shapes.push(
  {
    id: "learn",
    type: "arrow",
    x: 0,
    y: 0,
    from: "cell-1-0",
    to: "cell-0-0",
    dashed: true,
    label: "a failure found live becomes a test case",
  },
  {
    id: "foot",
    type: "text",
    x: 150,
    y: 376,
    w: 560,
    h: 20,
    label: "Offline is cheap and repeatable. Online is the only place the real customers are.",
    tone: PROD_TONE.infra,
    quiet: true,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "The map of LLM evaluation: offline against online, output against path against system",
  width: 880,
  height: 410,
  shapes,
};

export default spec;
