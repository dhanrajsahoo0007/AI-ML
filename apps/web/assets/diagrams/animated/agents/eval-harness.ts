import type { DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";

// The evaluation harness for an agent (agentic-ai-evaluation, Architecture; replaces the eval-runner Mermaid). A
// runner takes every task from a versioned dataset and runs the agent version under test on it k times, in a sandbox
// that holds a simulated user and mock tools. Every run's trace is stored; three graders read the traces (outcome,
// trajectory, and a model judge for open-ended quality); a release gate compares the scores with the baseline. A
// failing change goes back with its traces; a passing one ships, and production failures become new tasks.
//
// Seven steps: 1 load the tasks and the agent version · 2 run each task k times in the sandbox · 3 store every trace ·
// 4 grade · 5 the gate compares with the baseline · 6 fail: read the traces, fix, run again · 7 pass: ship;
// production failures become tasks. Nodes never move.
//
// Layout: column x 110 (agent version row 70, dataset row 220, production row 420); column x 370 (sandbox row 70,
// runner row 220, traces row 420); graders at x 600 (rows 320, 420, 520); the gate (x 795, row 420) with the fix card
// above it (row 220). The fix edge runs along the top (y 18) back to the agent version; the ship edge runs along the
// bottom (y 585) to production.
//
// Colour (agents legend, four tones plus neutral): the agent version green, the dataset and traces violet (stores),
// the sandbox teal (tools), graders and the gate lime (the gate is the accent); runner, fix and production neutral.

const COL = { a: 110, b: 370, c: 600, d: 795 } as const;

const spec: DiagramSpec = {
  title: "The evaluation harness: run, record, grade, gate",
  width: 880,
  height: 610,
  steps: [
    { title: "Load the tasks and the agent version" },
    { title: "Run each task k times in a sandbox" },
    { title: "Store every trace" },
    { title: "Grade the outcome, the path and the quality" },
    { title: "The gate compares with the baseline" },
    { title: "Fail: read the traces, fix, run again" },
    { title: "Pass: ship; production failures become tasks" },
  ],
  zones: [],
  nodes: [
    {
      id: "agent",
      label: "Agent version",
      sub: "prompt, tools, model",
      icon: "robot",
      tone: AGENT_TONE.model,
      fill: "pastel",
      x: COL.a,
      y: 70,
      w: 180,
    },
    {
      id: "dataset",
      label: "Eval dataset",
      sub: "tasks, goal states",
      icon: "database",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      x: COL.a,
      y: 220,
      w: 170,
    },
    {
      id: "runner",
      label: "Runner",
      sub: "each task × k runs",
      icon: "server",
      tone: AGENT_TONE.infra,
      x: COL.b,
      y: 220,
      w: 170,
    },
    {
      id: "sandbox",
      label: "Sandbox",
      sub: "simulated user, mock tools",
      icon: "sandbox",
      tone: AGENT_TONE.action,
      fill: "pastel",
      step: 2,
      x: COL.b,
      y: 70,
      w: 210,
    },
    {
      id: "traces",
      label: "Traces",
      sub: "steps, calls, cost, time",
      icon: "trace",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      step: 3,
      x: COL.b,
      y: 420,
      w: 200,
    },
    ...(
      [
        ["outcome", "Outcome", "end state = goal?", 320],
        ["trajectory", "Trajectory", "tools, order, policy", 420],
        ["judge", "Model judge", "rubric, calibrated", 520],
      ] as const
    ).map(([id, label, sub, y]) => ({
      id,
      label,
      sub,
      icon: "test-tube",
      tone: AGENT_TONE.check,
      fill: "pastel" as const,
      step: 4,
      x: COL.c,
      y,
      w: 170,
    })),
    {
      id: "gate",
      label: "Release gate",
      sub: "beats baseline?",
      icon: "shield-check",
      tone: AGENT_TONE.check,
      accent: true,
      step: 5,
      x: COL.d,
      y: 420,
      w: 150,
    },
    {
      id: "fix",
      label: "Read failures",
      sub: "then fix",
      icon: "trace",
      tone: AGENT_TONE.infra,
      step: 6,
      x: COL.d,
      y: 220,
      w: 150,
    },
    {
      id: "prod",
      label: "Production",
      sub: "monitoring, sampled review",
      icon: "activity",
      tone: AGENT_TONE.infra,
      fill: "soft",
      step: 7,
      x: COL.a,
      y: 420,
      w: 200,
    },
  ],
  edges: [
    // Step 1: the runner loads every task and the version under test.
    { from: "dataset", to: "runner", label: "tasks", packet: true },
    { from: "agent", to: "runner", label: "candidate", packet: true },

    // Step 2: each run talks to the simulated user and calls mock tools.
    { from: "runner", to: "sandbox", label: "k runs", packet: true, bidirectional: true, step: 2 },

    // Step 3: every run's trace is stored.
    { from: "runner", to: "traces", label: "record", packet: true, step: 3 },

    // Step 4: three graders read the traces.
    { from: "traces", to: "outcome", packet: true, step: 4 },
    { from: "traces", to: "trajectory", packet: true, step: 4 },
    { from: "traces", to: "judge", packet: true, step: 4 },

    // Step 5: scores go to the gate.
    { from: "outcome", to: "gate", packet: true, step: 5 },
    { from: "trajectory", to: "gate", packet: true, step: 5 },
    { from: "judge", to: "gate", packet: true, step: 5 },

    // Step 6: a regression goes back with its traces.
    { from: "gate", to: "fix", label: "no", packet: true, step: 6 },
    {
      from: "fix",
      to: "agent",
      label: "next version",
      dashed: true,
      flow: true,
      via: [
        [COL.d, 18],
        [COL.a, 18],
      ],
      labelAt: 0.5,
      step: 6,
    },

    // Step 7: a pass ships; production failures become new tasks.
    {
      from: "gate",
      to: "prod",
      label: "yes: ship",
      packet: true,
      via: [
        [COL.d, 585],
        [COL.a, 585],
      ],
      labelAt: 0.5,
      step: 7,
    },
    { from: "prod", to: "dataset", label: "new tasks", packet: true, step: 7 },
  ],
};

export default spec;
