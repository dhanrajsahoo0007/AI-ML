import type { DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";

// The evaluation harness that guards the agent harness (harness-engineering, Deep dive; replaces the eval flowchart).
// A change to the prompt, tools, model or harness code runs against a fixed set of test cases; graders score each
// run; a gate ships the change only if it beats the baseline with no regressions, and otherwise sends it back with the
// traces to read. Production closes the loop: real failures become new test cases. Test cases are drawn as past
// bug-fix issues for the coding agent (running example B), each with its repo's own tests as the grader.
//
// Four steps: 1 a change runs on every test case · 2 graders score the runs · 3 the gate ships it or sends it back ·
// 4 production failures become new test cases. Nodes never move.
//
// Layout: column x 105 (change at row 135, test cases at row 345), then the main row at y 240: the run (x 300),
// graders (x 535) and the gate (x 770), 75–80 units apart so the edge labels fit. "Read traces, fix" above the gate
// (y 60), "Ship" below it (y 390), production traces at (430, 390). The "back" path runs along the top (y 60) from the
// fix card into the change card; production runs along the bottom.
//
// Colour (agents legend, three tones plus neutral): the agent run green, test cases violet (a store), graders and the
// gate lime (the gate is the accent), everything else neutral.

const spec: DiagramSpec = {
  title: "The eval gate: every harness change is scored before it ships",
  width: 870,
  height: 450,
  steps: [
    { title: "A change runs on every test case" },
    { title: "Graders score each run" },
    { title: "The gate ships it or sends it back" },
    { title: "Production failures become new test cases" },
  ],
  zones: [],
  nodes: [
    {
      id: "change",
      label: "A change",
      sub: "prompt, tools, model",
      icon: "git-commit",
      tone: AGENT_TONE.infra,
      x: 105,
      y: 135,
      w: 190,
    },
    {
      id: "cases",
      label: "Test cases",
      sub: "past issues, fixed seeds",
      icon: "database",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      x: 105,
      y: 345,
      w: 190,
    },
    {
      id: "run",
      label: "Run the agent",
      sub: "same settings",
      icon: "robot",
      tone: AGENT_TONE.model,
      fill: "pastel",
      x: 300,
      y: 240,
      w: 160,
    },
    {
      id: "graders",
      label: "Graders",
      sub: "tests, a judge",
      icon: "test-tube",
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 2,
      x: 535,
      y: 240,
      w: 150,
    },
    {
      id: "gate",
      label: "Release gate",
      sub: "beats baseline?",
      icon: "shield-check",
      tone: AGENT_TONE.check,
      accent: true,
      step: 3,
      x: 770,
      y: 240,
      w: 160,
    },
    {
      id: "fix",
      label: "Read traces, fix",
      sub: "why did it fail?",
      icon: "trace",
      tone: AGENT_TONE.infra,
      step: 3,
      x: 770,
      y: 60,
      w: 170,
    },
    {
      id: "ship",
      label: "Ship",
      sub: "the new baseline",
      icon: "rocket",
      tone: AGENT_TONE.infra,
      step: 3,
      x: 770,
      y: 390,
      w: 160,
    },
    {
      id: "prod",
      label: "Production traces",
      sub: "real runs, real failures",
      icon: "activity",
      tone: AGENT_TONE.infra,
      fill: "soft",
      step: 4,
      x: 430,
      y: 390,
      w: 190,
    },
  ],
  edges: [
    // Step 1: the candidate harness runs every test case.
    { from: "change", to: "run", label: "candidate", packet: true },
    { from: "cases", to: "run", label: "tasks", packet: true },

    // Step 2: graders score the outputs (for the coding agent: the repo's own tests).
    { from: "run", to: "graders", label: "outputs", packet: true, step: 2 },
    { from: "graders", to: "gate", label: "scores", packet: true, step: 2 },

    // Step 3: pass ships; fail goes back with the traces.
    { from: "gate", to: "ship", label: "yes", packet: true, step: 3 },
    { from: "gate", to: "fix", label: "no", packet: true, step: 3 },
    { from: "fix", to: "change", label: "next change", dashed: true, flow: true, via: [[105, 60]], step: 3 },

    // Step 4: production runs feed the suite.
    { from: "ship", to: "prod", label: "runs live", packet: true, step: 4 },
    { from: "prod", to: "cases", label: "new cases", packet: true, step: 4 },
  ],
};

export default spec;
