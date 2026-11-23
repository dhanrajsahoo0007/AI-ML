import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import {
  AGENT_TONE,
  CODING_CONTEXT,
  CODING_STEPS,
  CODING_TASK,
  traceRows,
  traceRowsSize,
  type TraceRow,
} from "@/components/diagrams/presets/agents";

// The bug-fix coding agent's run, one row per step (running example B; first used on harness-engineering, reused by
// the coding-agent, loop-engineering and ai-first-environment pages, so it stands alone). Task: in brightpost-orders,
// "Order import drops the last line of a CSV file". Left column: the step from CODING_STEPS (tool calls teal, the
// failing test red, the error blue, the passing checks lime, the summary green). Right column: what the harness did
// for that step (neutral), so the reader sees who did what: the model proposed six of the nine steps (the five tool
// calls and the summary) and wrote both edits; the harness ran, allowed, checked and handed over everything.
//
// Nine steps, one per row: search → read → edit → run tests → 1 fails → read the error → edit → all pass → summary.
//
// Layout: traceRows for the left column (its width comes from the widest label), then a neutral box per row at the
// same height, 20 units to the right, joined by a short arrow. Column headings over row 1.
//
// Colour (agents legend): teal, blue, lime, green and red for the failing test (red only where something breaks), with
// the harness column neutral. The failing test is ringed: it is the mistake the harness caught.

/** What the harness did at each of the nine steps (the file read is half of CODING_CONTEXT's two-file 6,400 tokens). */
const HARNESS_DID: readonly string[] = [
  "Searched the repo copy: 2 matches",
  `Returned the file: ${(CODING_CONTEXT.step9.files / 2).toLocaleString("en-GB")} tokens`,
  "Allowed: a write inside the sandbox",
  `Ran all ${CODING_TASK.testsTotal} tests in the container`,
  "Did not accept the fix",
  "Fed back the error and the test",
  "Allowed: a write inside the sandbox",
  "Ran tests, lint and type checks",
  "Opened a pull request for a person",
];

const rows: TraceRow[] = CODING_STEPS.map((s, i) => ({
  step: i + 1,
  chips: [{ kind: s.kind, label: s.label, highlight: s.kind === "failure" ? true : undefined }],
}));

const X = 20;
const Y = 44;
const GAP = 20;
const NOTE_W = 268;
const trace = traceRows("t", X, Y, rows);
const size = traceRowsSize(rows);

const notes: LayoutShape[] = rows.flatMap((row, i) => {
  const chip = trace.find((s) => s.id === `t-${i}-0`)!;
  return [
    {
      id: `h-${i}`,
      type: "box" as const,
      x: chip.x + chip.w! + GAP,
      y: chip.y,
      w: NOTE_W,
      h: chip.h!,
      label: HARNESS_DID[i],
      tone: AGENT_TONE.infra,
      fill: "soft" as const,
      step: row.step,
    },
    {
      id: `h-${i}-a`,
      type: "arrow" as const,
      x: 0,
      y: 0,
      from: chip.id,
      to: `h-${i}`,
      step: row.step,
    },
  ];
});

const first = trace.find((s) => s.id === "t-0-0")!;
const headings: LayoutShape[] = [
  { id: "hd0", type: "text", x: first.x, y: 14, w: first.w!, h: 20, label: "The step", tone: "neutral" },
  {
    id: "hd1",
    type: "text",
    x: first.x + first.w! + GAP,
    y: 14,
    w: NOTE_W,
    h: 20,
    label: "What the harness did",
    tone: "neutral",
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: `A coding agent fixes a bug in ${CODING_TASK.repo}`,
  width: Math.ceil(X * 2 + size.width + GAP + NOTE_W),
  height: Y + size.height + 20,
  steps: [
    { title: "Search the repo for the symptom" },
    { title: `Read ${CODING_TASK.file}` },
    { title: "First edit: the loop bound" },
    { title: "Run the tests" },
    { title: "One test fails" },
    { title: "Read the error" },
    { title: "Second edit: empty input" },
    { title: "Every check passes" },
    { title: "Summarise for review" },
  ],
  shapes: [...headings, ...trace, ...notes],
};

export default spec;
