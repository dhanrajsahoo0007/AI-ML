import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import {
  AGENT_TONE,
  CODING_STEPS,
  CODING_TASK,
  traceRows,
  traceRowsSize,
  type TraceRow,
} from "@/components/diagrams/presets/agents";

// A test-driven agent loop (loop-engineering-and-verification-loops, Core concepts 2): the bug-fix run of running
// example B told as loop rounds, one row per round (a round is act, check, decide; it can hold several model turns),
// so the reader sees the check and the decision after every act. The full nine-step trace is agents/coding-agent-trace
// on harness-engineering; this figure leaves out search and read and adds what that one does not show: the decision
// after each check, and why a new failure counts as progress.
//
// Round 0: the harness runs the tests before the model's first turn; "keeps the last line" fails, so the bug is real
// and the goal is testable. Round 1 edits the loop bound; the tests still fail, but on a different test ("parses an
// empty file"), so the decision is "go on". Round 2 returns [] for empty input; all 18 pass with lint and types
// clean, so the loop stops.
//
// Five steps: 1 round 0 · 2 round 1's edit · 3 its check and decision (ringed) · 4 round 2's edit · 5 its check and
// the stop.
//
// Layout: traceRows for the act and check columns (column widths from the widest label), then a neutral decision box
// per row 20 units to the right, joined by a short arrow, as in coding-agent-trace. Column headings over round 0.
//
// Colour (agents legend, three tones plus neutral): acts teal, failing checks red (a failing test is something
// breaking), the passing check lime, decisions neutral. The ringed decision is the one the page is about.

const ACT_SUB = "edit + run_tests()";

/** One row per round: what the model did, what the check said, and what the harness decided. */
const TURNS = [
  {
    act: { kind: "action" as const, label: CODING_STEPS[3].label, sub: "by the harness, first" },
    check: { kind: "failure" as const, label: `1 failed: ${CODING_TASK.failingTest}`, sub: "check" },
    decide: { label: "Not met: go on", sub: "the bug is real" },
  },
  {
    act: { kind: "action" as const, label: CODING_STEPS[2].label, sub: ACT_SUB },
    check: { kind: "failure" as const, label: CODING_STEPS[4].label, sub: "check" },
    decide: { label: "Not met: go on", sub: "new failure = progress", highlight: true },
  },
  {
    act: { kind: "action" as const, label: CODING_STEPS[6].label, sub: ACT_SUB },
    check: { kind: "check" as const, label: CODING_STEPS[7].label, sub: "check" },
    decide: { label: "Met: stop", sub: "open a pull request" },
  },
];

/** Build step of round i's act (its check and decision come one step later; round 0 shows at once). */
const actStep = (i: number) => (i === 0 ? 1 : 2 * i);
const checkStep = (i: number) => (i === 0 ? 1 : 2 * i + 1);

const rows: TraceRow[] = TURNS.map((t, i) => ({ n: String(i), step: actStep(i), chips: [t.act, t.check] }));

const X = 20;
const Y = 52;
const GAP = 20;
const DECIDE_W = 196;
const trace = traceRows("t", X, Y, rows).map((s) =>
  // The check chip and its arrow arrive one step after the act (rounds 1 and 2).
  /^t-\d-(1|a1)$/.test(s.id) ? { ...s, step: checkStep(Number(s.id[2])) } : s
);
const size = traceRowsSize(rows);

const decisions: LayoutShape[] = TURNS.flatMap((t, i) => {
  const chip = trace.find((s) => s.id === `t-${i}-1`)!;
  const step = checkStep(i);
  return [
    {
      id: `d-${i}`,
      type: "box" as const,
      x: chip.x + chip.w! + GAP,
      y: chip.y,
      w: DECIDE_W,
      h: chip.h!,
      label: t.decide.label,
      sub: t.decide.sub,
      tone: AGENT_TONE.infra,
      fill: "soft" as const,
      highlight: "highlight" in t.decide ? true : undefined,
      step,
    },
    { id: `d-${i}-a`, type: "arrow" as const, x: 0, y: 0, from: chip.id, to: `d-${i}`, step },
  ];
});

const heading = (id: string, ref: LayoutShape | { x: number; w: number }, label: string): LayoutShape => ({
  id,
  type: "text",
  x: ref.x,
  y: 20,
  w: ref.w!,
  h: 20,
  label,
  tone: "neutral",
});
const act0 = trace.find((s) => s.id === "t-0-0")!;
const check0 = trace.find((s) => s.id === "t-0-1")!;

const spec: LayoutSpec = {
  kind: "layout",
  title: `A test-driven loop fixes ${CODING_TASK.file}`,
  width: Math.ceil(X * 2 + size.width + GAP + DECIDE_W),
  height: Y + size.height + 20,
  steps: [
    { title: "Round 0: the test fails first" },
    { title: "Round 1: edit the loop bound" },
    { title: "Still failing, but on a new test" },
    { title: "Round 2: handle empty input" },
    { title: "Every check passes: stop" },
  ],
  shapes: [
    heading("hd0", act0, "Act"),
    heading("hd1", check0, "Check"),
    heading("hd2", { x: check0.x + check0.w! + GAP, w: DECIDE_W }, "Decide"),
    ...trace,
    ...decisions,
  ],
};

export default spec;
