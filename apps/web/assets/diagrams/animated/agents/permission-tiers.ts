import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, CODING_TASK } from "@/components/diagrams/presets/agents";

// Permission tiers for an agent's actions (first used on harness-engineering, Core concepts 6; reused by the
// coding-agent and ai-first-environment pages, so it stands alone). Freedom follows how hard an action is to undo:
// reading changes nothing, so it runs at once; a write inside the sandbox can be undone with git, so it runs and is
// then checked; an action outside the sandbox (merge, deploy, email a customer) may not be undoable, so it waits for a
// person. The examples come from the bug-fix coding agent (running example B).
//
// Layout: three columns 240 wide at x 20, 290, 560. Each column, top to bottom: the tier (y 30), the tools in it
// (y 122), the gate the harness puts in front of them (y 214), joined by short arrows. An arrow along the bottom names
// what rises from left to right.
//
// Colour (agents legend, three tones plus neutral): tiers neutral, tools teal, the check lime, the person orange. The
// approval gate is ringed: it is the one gate the model cannot pass on its own.

const COL_X = [20, 290, 560] as const;
const W = 240;
const H = 60;
const ROW_Y = [30, 122, 214] as const;

const TIERS = [
  {
    tier: "Read freely",
    why: "changes nothing",
    tools: "search, read_file",
    example: `e.g. read ${CODING_TASK.file}`,
    gate: "Runs at once",
    gateSub: "no check needed",
    gateTone: AGENT_TONE.infra,
  },
  {
    tier: "Write with a check",
    why: "undo with git",
    tools: "edit_file, run_tests",
    example: `e.g. edit ${CODING_TASK.file}`,
    gate: "Runs, then checked",
    gateSub: "tests, lint, types",
    gateTone: AGENT_TONE.check,
  },
  {
    tier: "Act outside with approval",
    why: "hard or impossible to undo",
    tools: "merge, deploy, email",
    example: "e.g. merge the fix",
    gate: "Waits for a person",
    gateSub: "approves or refuses",
    gateTone: AGENT_TONE.task,
  },
] as const;

const shapes: LayoutShape[] = TIERS.flatMap((t, i) => {
  const x = COL_X[i];
  const approval = t.gateTone === AGENT_TONE.task;
  return [
    {
      id: `tier${i}`,
      type: "box" as const,
      x,
      y: ROW_Y[0],
      w: W,
      h: H,
      label: t.tier,
      sub: t.why,
      tone: AGENT_TONE.infra,
      fill: "soft" as const,
    },
    {
      id: `tools${i}`,
      type: "box" as const,
      x,
      y: ROW_Y[1],
      w: W,
      h: H,
      label: t.tools,
      sub: t.example,
      tone: AGENT_TONE.action,
      fill: "pastel" as const,
    },
    {
      id: `gate${i}`,
      type: "box" as const,
      x,
      y: ROW_Y[2],
      w: W,
      h: H,
      label: t.gate,
      sub: t.gateSub,
      tone: t.gateTone,
      fill: t.gateTone === AGENT_TONE.infra ? ("paper" as const) : ("pastel" as const),
      highlight: approval ? true : undefined,
    },
    { id: `a${i}-1`, type: "arrow" as const, x: 0, y: 0, from: `tier${i}`, to: `tools${i}` },
    { id: `a${i}-2`, type: "arrow" as const, x: 0, y: 0, from: `tools${i}`, to: `gate${i}` },
  ];
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Permission tiers: the harder to undo, the less freedom",
  width: 820,
  height: 340,
  shapes: [
    ...shapes,
    {
      id: "rise",
      type: "arrow",
      x: 20,
      y: 312,
      w: 780,
      h: 0,
      label: "harder to undo, so less freedom",
    },
  ],
};

export default spec;
