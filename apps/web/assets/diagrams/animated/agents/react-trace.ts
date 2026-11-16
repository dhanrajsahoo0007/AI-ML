import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { HAPPY_PATH, traceRows, traceRowsSize, type TraceRow } from "@/components/diagrams/presets/agents";

// ReAct on the Brightpost refund (agent-architectures, Core concepts): one row per loop, thought → action →
// observation, then the answer (HAPPY_PATH: five model calls, four tool calls). The plan's budget was three loops;
// the fourth (send_email) is kept so this trace and the agent-loop hero tell the same story.
//
// Five steps, one per row. Column widths come from traceRows (the widest label in each column), with 20-unit gaps;
// the three column headings sit above the first row. The answer chip spans all three columns.
//
// Colour (agents legend): thoughts and the answer green, tool calls teal, results blue; row numbers neutral.

const rows: TraceRow[] = HAPPY_PATH.map((turn, i) =>
  turn.answer
    ? { step: i + 1, chips: [{ kind: "answer", label: turn.answer, span: 3 }] }
    : {
        step: i + 1,
        chips: [
          { kind: "thought", label: turn.thought },
          { kind: "action", label: turn.action! },
          { kind: "observation", label: turn.observation! },
        ],
      }
);

const X = 20;
const Y = 44;
const opts = { gap: 20 };
const trace = traceRows("t", X, Y, rows, opts);
const size = traceRowsSize(rows, opts);

// Column headings, centred over the first row's three chips.
const headings: LayoutShape[] = ["Thought", "Action", "Observation"].map((label, j) => {
  const chip = trace.find((s) => s.id === `t-0-${j}`)!;
  return { id: `h${j}`, type: "text", x: chip.x, y: 14, w: chip.w!, h: 20, label, tone: "neutral" };
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A ReAct trace: think, act, observe, until the answer",
  width: Math.ceil(X * 2 + size.width),
  height: Y + size.height + 20,
  steps: [
    { title: "Loop 1: look up the order" },
    { title: "Loop 2: find the refund rule" },
    { title: "Loop 3: ask for the refund (it waits for approval)" },
    { title: "Loop 4: confirm by email" },
    { title: "No tool call: the answer ends the loop" },
  ],
  shapes: [...headings, ...trace],
};

export default spec;
