import type { DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";

// The anatomy of a harness (harness-engineering, Architecture; replaces the harness-loop flowchart): the model in the
// middle, and the harness built round it one part per step, with the bug-fix coding agent's parts in the sub lines.
//
// Eight steps: 1 context assembly feeds the model · 2 a tool layer turns its proposals into calls (the result goes
// straight back) · 3 calls run in a sandbox · 4 verification checks the output before the model sees it · 5 state
// keeps what passed and feeds progress back; failures go back as errors · 6 guardrails sit between proposal and tool
// · 7 budgets decide whether the next turn starts · 8 observability records every call. Nodes never move; the early
// return paths (steps 2, 3, 4) and the direct model → tools call (steps 2–5) are edges with `until`, replaced later.
//
// Layout: a 3 × 3 grid, columns x 140, 430, 720 and rows y 90, 230, 370; every card 190 wide, so 100 units between
// columns for edge labels. Top row: budgets, observability, guardrails. Middle: context, model, tools. Bottom: state,
// verification, sandbox. Return paths run along a lane at y 305, between the middle and bottom rows.
//
// Colour (agents legend, four tones plus neutral): the model green (the accent), tools teal, state violet,
// verification and guardrails lime; context, sandbox, budgets and observability are harness infrastructure, neutral.

const COL = [140, 430, 720] as const;
const ROW = [90, 230, 370] as const;
const W = 190;
const LANE = 305;

const spec: DiagramSpec = {
  title: "The anatomy of a harness, one part at a time",
  width: 860,
  height: 450,
  steps: [
    { title: "The model sees only the context the harness assembles" },
    { title: "A tool layer turns proposals into calls" },
    { title: "Calls run in a sandbox" },
    { title: "Verification checks every result" },
    { title: "State keeps progress; failures go back as errors" },
    { title: "Guardrails stand between a proposal and an action" },
    { title: "Budgets decide whether the next turn starts" },
    { title: "Observability records every call" },
  ],
  zones: [],
  nodes: [
    {
      id: "context",
      label: "Context assembly",
      sub: "instructions, task, files",
      icon: "prompt",
      tone: AGENT_TONE.infra,
      fill: "soft",
      x: COL[0],
      y: ROW[1],
      w: W,
    },
    {
      id: "model",
      label: "Model",
      sub: "proposes the next step",
      icon: "model",
      tone: AGENT_TONE.model,
      accent: true,
      x: COL[1],
      y: ROW[1],
      w: W,
    },
    {
      id: "tools",
      label: "Tool layer",
      sub: "search, read, edit, test",
      icon: "tool",
      tone: AGENT_TONE.action,
      fill: "pastel",
      step: 2,
      x: COL[2],
      y: ROW[1],
      w: W,
    },
    {
      id: "sandbox",
      label: "Sandbox",
      sub: "container, repo copy",
      icon: "sandbox",
      tone: AGENT_TONE.infra,
      fill: "soft",
      step: 3,
      x: COL[2],
      y: ROW[2],
      w: W,
    },
    {
      id: "verify",
      label: "Verification",
      sub: "tests, lint, types",
      icon: "test-tube",
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 4,
      x: COL[1],
      y: ROW[2],
      w: W,
    },
    {
      id: "state",
      label: "State",
      sub: "plan, progress, diffs",
      icon: "history",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      step: 5,
      x: COL[0],
      y: ROW[2],
      w: W,
    },
    {
      id: "guard",
      label: "Guardrails",
      sub: "permissions, approval",
      icon: "shield",
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 6,
      x: COL[2],
      y: ROW[0],
      w: W,
    },
    {
      id: "budgets",
      label: "Budgets",
      sub: "steps, tokens, time",
      icon: "gauge",
      tone: AGENT_TONE.infra,
      fill: "soft",
      step: 7,
      x: COL[0],
      y: ROW[0],
      w: W,
    },
    {
      id: "observe",
      label: "Observability",
      sub: "every call and its cost",
      icon: "trace",
      tone: AGENT_TONE.infra,
      fill: "soft",
      step: 8,
      x: COL[1],
      y: ROW[0],
      w: W,
    },
  ],
  edges: [
    // Step 1: the harness decides what the model sees.
    { from: "context", to: "model", label: "context", packet: true },

    // Step 2: a proposal becomes a tool call; the raw result goes straight back into the context (replaced in step 3).
    { from: "model", to: "tools", label: "tool call", packet: true, step: 2, until: 5 },
    {
      from: "tools",
      to: "context",
      label: "result",
      packet: true,
      via: [
        [COL[2], LANE],
        [COL[0] + 60, LANE],
      ],
      step: 2,
      until: 2,
    },

    // Step 3: the call runs in the sandbox; its output goes back (replaced in step 4).
    { from: "tools", to: "sandbox", label: "run", packet: true, step: 3 },
    {
      from: "sandbox",
      to: "context",
      label: "output",
      packet: true,
      via: [
        [580, ROW[2]],
        [580, LANE],
        [COL[0] + 60, LANE],
      ],
      step: 3,
      until: 3,
    },

    // Step 4: verification checks the output before anything goes back.
    { from: "sandbox", to: "verify", label: "output", packet: true, step: 4 },
    {
      from: "verify",
      to: "context",
      label: "checked result",
      packet: true,
      via: [
        [COL[1], LANE],
        [COL[0] + 60, LANE],
      ],
      step: 4,
      until: 4,
    },

    // Step 5: what passes is saved and fed back as progress; a failure goes back as an error message.
    { from: "verify", to: "state", label: "pass", packet: true, step: 5 },
    { from: "state", to: "context", label: "progress", packet: true, step: 5 },
    {
      from: "verify",
      to: "context",
      label: "fail: the error",
      dashed: true,
      flow: true,
      via: [
        [COL[1], LANE],
        [COL[0] + 60, LANE],
      ],
      step: 5,
    },

    // Step 6: every proposal passes the guardrails before it reaches a tool.
    { from: "model", to: "guard", label: "proposal", packet: true, step: 6 },
    { from: "guard", to: "tools", label: "allowed", packet: true, step: 6 },

    // Step 7: budgets gate the next turn.
    { from: "budgets", to: "context", label: "go or stop", dashed: true, flow: true, step: 7 },

    // Step 8: every call is traced.
    { from: "model", to: "observe", label: "trace", dashed: true, flow: true, step: 8 },
  ],
};

export default spec;
