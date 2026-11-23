import type { DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST, TOOLS } from "@/components/diagrams/presets/agents";

// What an agent framework gives you (agent-frameworks-compared, Core concepts): your loop in the middle, and the parts
// a framework adds round it, one per step. Each card's sub line says what you would write by hand without one.
//
// Five steps: 1 your loop calls the model and runs the four Brightpost tools (the minimum you always write) · 2 state:
// a checkpoint after each step · 3 retries wrap the tool calls (create_refund times out and runs again) · 4 human
// approval: the £42 refund waits, and the decision resumes the run from the checkpoint · 5 tracing records every step.
// Nodes never move; nothing is replaced, so no `until`.
//
// Layout: a 3 × 3 grid like harness-anatomy, columns x 140, 430, 720 and rows y 90, 230, 370 (node centres), every
// card 190 wide. Middle row: tools, your loop, state. Top: retries over tools, tracing over the loop. Bottom right:
// approval under state. The tool result returns along a lane at y 300, under the middle row.
//
// Colour (agents legend, four tones plus neutral): the loop green (the accent), tools teal, state violet, the
// approver orange; retries and tracing are harness infrastructure, neutral.

const COL = [140, 430, 720] as const;
const ROW = [90, 230, 370] as const;
const W = 190;
const LANE = 300;

const spec: DiagramSpec = {
  title: "What a framework gives you, around your own loop",
  width: 860,
  height: 450,
  steps: [
    { title: "Your loop calls the model and runs the tools" },
    { title: "State: a checkpoint after every step" },
    { title: "Retries wrap each tool call" },
    { title: "Human approval pauses and resumes the run" },
    { title: "Tracing records every step" },
  ],
  zones: [],
  nodes: [
    {
      id: "loop",
      label: "Your agent loop",
      sub: "model → tool → repeat",
      icon: "robot",
      tone: AGENT_TONE.model,
      accent: true,
      x: COL[1],
      y: ROW[1],
      w: W,
    },
    {
      id: "tools",
      label: "Tools",
      sub: "by hand: schemas, calls",
      icon: "tool",
      tone: AGENT_TONE.action,
      fill: "pastel",
      x: COL[0],
      y: ROW[1],
      w: W,
    },
    {
      id: "state",
      label: "State, checkpoints",
      sub: "by hand: save and load",
      icon: "snapshot",
      tone: AGENT_TONE.memory,
      fill: "pastel",
      step: 2,
      x: COL[2],
      y: ROW[1],
      w: W,
    },
    {
      id: "retries",
      label: "Retries",
      sub: "by hand: backoff, keys",
      icon: "timer",
      tone: AGENT_TONE.infra,
      fill: "soft",
      step: 3,
      x: COL[0],
      y: ROW[0],
      w: W,
    },
    {
      id: "approval",
      label: "Human approval",
      sub: "by hand: pause, resume",
      icon: "approval",
      tone: AGENT_TONE.task,
      fill: "pastel",
      step: 4,
      x: COL[2],
      y: ROW[2],
      w: W,
    },
    {
      id: "trace",
      label: "Tracing",
      sub: "by hand: spans, a viewer",
      icon: "trace",
      tone: AGENT_TONE.infra,
      fill: "soft",
      step: 5,
      x: COL[1],
      y: ROW[0],
      w: W,
    },
  ],
  edges: [
    // Step 1: the loop you always write: a tool call goes out, its result comes back along the lower lane.
    { from: "loop", to: "tools", label: "tool call", packet: true },
    {
      from: "tools",
      to: "loop",
      label: "result",
      dashed: true,
      flow: true,
      via: [
        [COL[0], LANE],
        [COL[1], LANE],
      ],
    },

    // Step 2: the whole run is saved after every step.
    { from: "loop", to: "state", label: "checkpoint", packet: true, step: 2 },

    // Step 3: a timed-out tool call runs again, with the same idempotency key.
    { from: "retries", to: "tools", label: `retry ${TOOLS.createRefund.name}`, dashed: true, flow: true, step: 3 },

    // Step 4: the refund over the limit waits for a person; the decision resumes the run from the saved state.
    { from: "state", to: "approval", label: `£${BRIGHTPOST.price} refund waits`, packet: true, step: 4 },
    {
      from: "approval",
      to: "loop",
      label: "approve, resume",
      packet: true,
      via: [
        [COL[1] + 50, ROW[2]],
        [COL[1] + 50, ROW[1] + 40],
      ],
      step: 4,
    },

    // Step 5: every model call and tool call becomes a span.
    { from: "loop", to: "trace", label: "spans", dashed: true, flow: true, step: 5 },
  ],
};

export default spec;
