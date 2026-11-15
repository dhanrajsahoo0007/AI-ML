import type { DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";

// The page's own design (agent-architectures, Architecture; replaces the old router flowchart): a router sends each
// Brightpost message to the cheapest structure that can handle it. Simple questions go through a prompt chain, known
// multi-step tasks through a workflow, and only open-ended ones (a refund, a complaint) to a ReAct agent. An evaluator
// checks the agent's result before the reply goes out, and sends it back when it fails.
//
// Five steps, matching the numbered list under the figure: 1 the router sorts the request · 2 simple requests take
// the chain · 3 known tasks take the workflow · 4 open-ended tasks take the agent · 5 an evaluator checks the agent.
// Nodes never move; the agent's direct line to the reply is an edge with `until: 4`, replaced by the evaluator.
//
// Layout: customer x 62 · router x 258 · the three routes x 525 (rows 90, 220, 350) · reply x 760 (row 220) ·
// evaluator x 760 (row 350). About 100 units between the router and the routes so the route labels fit. Route labels sit at 0.55 on the router's three edges, clear of the router card.
//
// Colour (agents legend, three tones plus neutral): the customer orange, model-driven parts green (the agent is the
// accent), the evaluator lime, the code-driven workflow neutral.

const spec: DiagramSpec = {
  title: "A mixed system: route each request to the cheapest structure that works",
  width: 850,
  height: 430,
  steps: [
    { title: "A router sorts each request" },
    { title: "Simple requests take a prompt chain" },
    { title: "Known multi-step tasks take a workflow" },
    { title: "Open-ended tasks take the agent" },
    { title: "An evaluator checks the agent's answer" },
  ],
  zones: [],
  nodes: [
    {
      id: "customer",
      label: "Customer",
      sub: "any message",
      icon: "users",
      tone: AGENT_TONE.task,
      variant: "glyph",
      x: 62,
      y: 205,
    },
    {
      id: "router",
      label: "Router",
      sub: "sorts the request",
      icon: "model",
      tone: AGENT_TONE.model,
      fill: "pastel",
      x: 258,
      y: 220,
      w: 160,
    },
    {
      id: "chain",
      label: "Prompt chain",
      sub: "retrieve, answer, check",
      icon: "pipeline",
      tone: AGENT_TONE.model,
      fill: "pastel",
      step: 2,
      x: 525,
      y: 90,
      w: 196,
    },
    { id: "reply", label: "Reply", icon: "chat", tone: AGENT_TONE.model, step: 2, x: 760, y: 220, w: 140 },
    {
      id: "workflow",
      label: "Workflow",
      sub: "fixed steps in code",
      icon: "pipeline",
      tone: AGENT_TONE.infra,
      fill: "soft",
      step: 3,
      x: 525,
      y: 220,
      w: 196,
    },
    {
      id: "agent",
      label: "ReAct agent",
      sub: "tools, budget, loop",
      icon: "robot",
      tone: AGENT_TONE.model,
      accent: true,
      step: 4,
      x: 525,
      y: 350,
      w: 196,
    },
    {
      id: "evaluator",
      label: "Evaluator",
      sub: "meets the criteria?",
      icon: "policy",
      tone: AGENT_TONE.check,
      fill: "pastel",
      step: 5,
      x: 760,
      y: 350,
      w: 160,
    },
  ],
  edges: [
    { from: "customer", to: "router", packet: true },
    { from: "router", to: "chain", label: "simple FAQ", labelAt: 0.55, packet: true, step: 2 },
    { from: "chain", to: "reply", packet: true, step: 2 },
    { from: "router", to: "workflow", label: "known task", labelAt: 0.55, packet: true, step: 3 },
    { from: "workflow", to: "reply", packet: true, step: 3 },
    { from: "router", to: "agent", label: "open-ended", labelAt: 0.55, packet: true, step: 4 },
    { from: "agent", to: "reply", packet: true, step: 4, until: 4 },
    { from: "agent", to: "evaluator", label: "answer", packet: true, step: 5 },
    { from: "evaluator", to: "reply", label: "pass", packet: true, step: 5 },
    { from: "evaluator", to: "agent", label: "fail: retry", dashed: true, via: [[640, 405]], step: 5 },
  ],
};

export default spec;
