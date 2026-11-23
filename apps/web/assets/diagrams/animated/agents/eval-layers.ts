import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import {
  AGENT_TONE,
  BRIGHTPOST,
  HAPPY_PATH,
  TOOLS,
  traceRows,
  traceRowsSize,
  type TraceRow,
} from "@/components/diagrams/presets/agents";

// Three layers of grading on one Brightpost refund run (agentic-ai-evaluation, Deep dive; replaces the three-layers
// Mermaid). The run's trace (HAPPY_PATH: four tool calls with their results, then the answer) sits in the middle. A
// component grader checks one tool call, create_refund (right order, right amount); a trajectory grader down the side
// reads every row (right tools, right order, approval before the refund, no extra calls); an outcome grader compares
// the sandbox's end state with the task's goal (one refund of £42 on order 4471, one email).
//
// Four steps: 1 the trace · 2 the component grader on create_refund · 3 the trajectory grader · 4 the end state and
// the outcome grader (ringed: the headline metric).
//
// Layout: the trace from x 230, y 50 (traceRows, no row numbers, columns sized to their widest chip, gap 20); the
// column headings above it. Component grader at the left of row 3 (x 20). Trajectory grader a tall box at the right
// (x 709) with one short arrow from each row. The end state centred under the trace (y 350), the outcome grader
// under the trajectory grader.
//
// Colour (agents legend, four tones plus neutral): tool calls teal, results blue, the answer green, graders lime; the
// sandbox's end state neutral (infrastructure). Arrows neutral.

const rows: TraceRow[] = HAPPY_PATH.map((turn) =>
  turn.answer
    ? { chips: [{ kind: "answer", label: turn.answer, span: 2 }] }
    : {
        chips: [
          { kind: "action", label: turn.action! },
          { kind: "observation", label: turn.observation! },
        ],
      }
);

const X = 230;
const Y = 50;
const opts = { gap: 20, numbers: false, step: 1 };
const trace = traceRows("t", X, Y, rows, opts);
const size = traceRowsSize(rows, opts);
const REFUND_ROW = HAPPY_PATH.findIndex((t) => t.action === TOOLS.createRefund.call);
const ROW_Y = (i: number) => Y + i * 54;
const SIDE_X = X + size.width + 30;
const SIDE_W = 140;
const BOTTOM = Y + size.height + 40;

const headings: LayoutShape[] = ["Tool call", "Result"].map((label, j) => {
  const chip = trace.find((s) => s.id === `t-0-${j}`)!;
  return { id: `h${j}`, type: "text", x: chip.x, y: 20, w: chip.w!, h: 20, label, tone: AGENT_TONE.infra };
});

// One arrow from the last chip of each row into the trajectory grader.
const toSide: LayoutShape[] = rows.map((row, i) => ({
  id: `side-a${i}`,
  type: "arrow",
  x: 0,
  y: 0,
  from: `t-${i}-${row.chips.length - 1}`,
  to: "trajectory",
  via: [[SIDE_X - 4, ROW_Y(i) + 22]],
  step: 3,
}));

const spec: LayoutSpec = {
  kind: "layout",
  title: "Three layers of grading on one refund run",
  width: SIDE_X + SIDE_W + 20,
  height: BOTTOM + 70,
  steps: [
    { title: "The run leaves a trace" },
    { title: "Component: grade one tool call" },
    { title: "Trajectory: grade the path" },
    { title: "Outcome: grade the end state" },
  ],
  shapes: [
    ...headings,
    ...trace,
    {
      id: "component",
      type: "box",
      x: 20,
      y: ROW_Y(REFUND_ROW),
      w: 180,
      h: 44,
      label: "Component grader",
      sub: `order ${BRIGHTPOST.orderId}? £${BRIGHTPOST.price}.00?`,
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 2,
    },
    { id: "component-a", type: "arrow", x: 0, y: 0, from: `t-${REFUND_ROW}-0`, to: "component", step: 2 },
    {
      id: "trajectory",
      type: "box",
      x: SIDE_X,
      y: Y,
      w: SIDE_W,
      h: size.height,
      label: "Trajectory\ngrader",
      sub: "the whole path",
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 3,
    },
    ...toSide,
    {
      id: "state",
      type: "box",
      x: Math.round(X + size.width / 2 - 140),
      y: BOTTOM,
      w: 280,
      h: 48,
      label: "End state (sandbox)",
      sub: `1 refund ${BRIGHTPOST.refundId}, £${BRIGHTPOST.price} · 1 email`,
      tone: AGENT_TONE.infra,
      fill: "soft",
      step: 4,
    },
    {
      id: "state-a",
      type: "arrow",
      x: 0,
      y: 0,
      from: `t-${rows.length - 1}-0`,
      to: "state",
      step: 4,
    },
    {
      id: "outcome",
      type: "box",
      x: SIDE_X,
      y: BOTTOM,
      w: SIDE_W,
      h: 48,
      label: "Outcome grader",
      sub: "matches the goal?",
      tone: AGENT_TONE.check,
      fill: "pastel",
      highlight: true,
      step: 4,
    },
    { id: "outcome-a", type: "arrow", x: 0, y: 0, from: "state", to: "outcome", step: 4 },
  ],
};

export default spec;
