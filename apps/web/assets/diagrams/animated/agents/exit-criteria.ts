import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { EXIT_CHECKS } from "@/components/diagrams/presets/agents-loop";

// Deterministic against model-graded exit criteria (loop-engineering-and-verification-loops, Deep dive 1), on the
// bug-fix run of running example B. Left: the suite's exit code decides "met" with no model involved. Right: an
// evaluator model reads the goal condition and the transcript (here, whether the pull-request summary names the
// empty-file case) and returns met, not yet or impossible with a reason, as Claude Code's /goal does. Under each, four
// properties in the same order: repeatability, cost, what it can judge, how it is fooled. The order and cost of the
// whole ladder of checks is agents/verification-ladder on harness-engineering; this figure compares only the two
// ways of deciding "done".
//
// Two steps: 1 the deterministic column · 2 the model-graded column (its blind spot ringed).
//
// Layout: two columns 340 wide at x 40 and x 440; evidence (y 70) → checker (y 150) → verdict (y 230), then four
// property cells from y 300, 44 apart. Column headings at y 28.
//
// Colour (agents legend, two tones plus neutral): evidence blue (what came back), checkers and verdicts lime,
// properties neutral. The ringed cell is the model-graded check's blind spot.

const COL_X = [40, 440] as const;
const COL_W = 340;
const BOX_H = 48;

const COLUMNS = [
  {
    key: "det",
    heading: "Deterministic check",
    evidence: { label: EXIT_CHECKS.deterministic.evidence, sub: "18 passed, exit code 0" },
    checker: { label: EXIT_CHECKS.deterministic.checker, sub: "a script, no model" },
    verdict: { label: EXIT_CHECKS.deterministic.verdict, sub: "or not met: nothing else" },
    props: [
      "Same answer on every run",
      "Seconds, no tokens",
      "Checks only what the tests encode",
      "Fooled by weakened tests",
    ],
  },
  {
    key: "llm",
    heading: "Model-graded check",
    evidence: { label: EXIT_CHECKS.graded.evidence, sub: "what the agent has shown so far" },
    checker: { label: EXIT_CHECKS.graded.checker, sub: "goal: the summary names the empty-file case" },
    verdict: { label: EXIT_CHECKS.graded.verdict, sub: "with a short reason" },
    props: [
      "Can differ from run to run",
      "Costs tokens on every turn",
      "Judges what code cannot",
      "Sees only what the transcript shows",
    ],
  },
] as const;

const column = (c: (typeof COLUMNS)[number], i: number): LayoutShape[] => {
  const x = COL_X[i];
  const step = i + 1;
  const box = (id: string, y: number, b: { label: string; sub: string }, tone: LayoutShape["tone"]): LayoutShape => ({
    id: `${c.key}-${id}`,
    type: "box",
    x,
    y,
    w: COL_W,
    h: BOX_H,
    label: b.label,
    sub: b.sub,
    tone,
    fill: "pastel",
    step,
  });
  const arrow = (from: string, to: string): LayoutShape => ({
    id: `${c.key}-${from}-${to}`,
    type: "arrow",
    x: 0,
    y: 0,
    from: `${c.key}-${from}`,
    to: `${c.key}-${to}`,
    step,
  });
  return [
    { id: `${c.key}-hd`, type: "text", x, y: 28, w: COL_W, h: 24, label: c.heading, tone: AGENT_TONE.infra, step },
    box("evidence", 70, c.evidence, AGENT_TONE.result),
    box("checker", 150, c.checker, AGENT_TONE.check),
    box("verdict", 230, c.verdict, AGENT_TONE.check),
    arrow("evidence", "checker"),
    arrow("checker", "verdict"),
    ...c.props.map((p, j): LayoutShape => ({
      id: `${c.key}-p${j}`,
      type: "cell",
      x,
      y: 300 + j * 44,
      w: COL_W,
      h: 40,
      label: p,
      tone: AGENT_TONE.infra,
      fill: "soft",
      highlight: c.key === "llm" && j === 3 ? true : undefined,
      quiet: j > 0 ? true : undefined,
      step,
    })),
  ];
};

const spec: LayoutSpec = {
  kind: "layout",
  title: "Deterministic against model-graded exit criteria",
  width: 820,
  height: 492,
  steps: [
    { title: "Deterministic: the exit code decides" },
    { title: "Model-graded: an evaluator reads the transcript" },
  ],
  shapes: COLUMNS.flatMap(column),
};

export default spec;
