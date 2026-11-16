import type { DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { MCP_SERVERS } from "@/components/diagrams/presets/agents-tools";
import { POISON } from "@/components/diagrams/presets/agents-mcp";
import { ENTRY_POINTS } from "@/components/diagrams/presets/agents-security";

// The threat model for the Brightpost support agent (agent-security-and-sandboxing, Core concepts "The threat model
// for an agent"). The parts: the customer, the chat service (the host and harness), the model, the three MCP servers
// from model-context-protocol (orders, help centre, email) plus the third-party parcel tracker from the tool-poisoning
// figure, and the secrets the chat service holds. Each step adds one place an outsider can reach the agent, in red:
// the customer's message (a pasted note), retrieved text (a planted review), a tool result (free text inside an order
// record), a tool description (the parcel tracker's hidden text) and a credential (an API key copied from a log). The
// last step shows why they matter together: every piece of text ends up in the same context window.
//
// Seven steps: 1 the agent as built · 2 entry 1, the message · 3 entry 2, retrieved text · 4 entry 3, tool results ·
// 5 entry 4, tool descriptions · 6 entry 5, credentials · 7 all text meets in one window (the plain messages edge is
// replaced, `until` 6, by a red one). Nodes never move.
//
// Layout: top row y 60: the pasted note (x 100) and the secrets (x 400) with the leaked key (x 765) to their right.
// Middle row y 165: customer (x 100), chat service (x 400, the accent), model (x 765). Tools zone x 30–850, y 255–375,
// four servers at y 315 in columns x 140, 340, 540, 740. Bottom row y 470: the three entries that arrive through tools,
// each under its server (orders, help centre, parcel tracker). Red edges are short and vertical or horizontal, so none
// crosses a tool edge.
//
// Colour (agents legend, four tones plus neutral): customer orange, model green, tool servers teal, entry points and
// their edges red; chat service, secrets and zone frame neutral. Arrows neutral except the attack edges.

const ROW = { top: 60, mid: 165, tool: 315, entry: 470 } as const;
const COL = { left: 100, host: 400, right: 765 } as const;
const TOOL_X = [140, 340, 540, 740] as const;

const serverNodes = [
  ...MCP_SERVERS.map((s) => ({ id: s.id, label: s.label, sub: s.exposes })),
  { id: "tracker", label: POISON.server, sub: "third-party server" },
];

const spec: DiagramSpec = {
  title: "The threat model: five ways in to one support agent",
  width: 880,
  height: 520,
  steps: [
    { title: "The agent as built" },
    { title: "Way in 1: the customer's message" },
    { title: "Way in 2: text the agent retrieves" },
    { title: "Way in 3: text inside tool results" },
    { title: "Way in 4: tool descriptions" },
    { title: "Way in 5: credentials" },
    { title: "All of it meets in one context window" },
  ],
  zones: [{ id: "tools", title: "MCP servers", tone: AGENT_TONE.action, x: 30, y: 255, w: 820, h: 120 }],
  nodes: [
    {
      id: "customer",
      label: "Customer",
      sub: "signed in",
      icon: "users",
      tone: AGENT_TONE.task,
      fill: "pastel",
      x: COL.left,
      y: ROW.mid,
      w: 150,
    },
    {
      id: "host",
      label: "Chat service",
      sub: "host and harness",
      icon: "server",
      tone: AGENT_TONE.infra,
      accent: true,
      x: COL.host,
      y: ROW.mid,
      w: 190,
    },
    {
      id: "model",
      label: "Model",
      sub: "reads every word",
      icon: "model",
      tone: AGENT_TONE.model,
      fill: "pastel",
      x: COL.right,
      y: ROW.mid,
      w: 170,
    },
    {
      id: "secrets",
      label: "Secrets",
      sub: "API keys, tokens",
      icon: "vault",
      tone: AGENT_TONE.infra,
      fill: "soft",
      x: COL.host,
      y: ROW.top,
      w: 170,
    },
    ...serverNodes.map((s, i) => ({
      id: s.id,
      label: s.label,
      sub: s.sub,
      icon: "tool",
      tone: AGENT_TONE.action,
      fill: "pastel" as const,
      x: TOOL_X[i],
      y: ROW.tool,
      w: 190,
    })),

    // The five ways in, one per step.
    {
      id: "e-message",
      label: ENTRY_POINTS.message.label,
      sub: ENTRY_POINTS.message.sub,
      icon: "chat",
      tone: AGENT_TONE.failure,
      fill: "pastel",
      step: 2,
      x: COL.left,
      y: ROW.top,
      w: 180,
    },
    {
      id: "e-retrieved",
      label: ENTRY_POINTS.retrieved.label,
      sub: ENTRY_POINTS.retrieved.sub,
      icon: "feed",
      tone: AGENT_TONE.failure,
      fill: "pastel",
      step: 3,
      x: TOOL_X[1],
      y: ROW.entry,
      w: 180,
    },
    {
      id: "e-result",
      label: ENTRY_POINTS.toolResult.label,
      sub: ENTRY_POINTS.toolResult.sub,
      icon: "file",
      tone: AGENT_TONE.failure,
      fill: "pastel",
      step: 4,
      x: TOOL_X[0],
      y: ROW.entry,
      w: 180,
    },
    {
      id: "e-description",
      label: ENTRY_POINTS.description.label,
      sub: ENTRY_POINTS.description.sub,
      icon: "file",
      tone: AGENT_TONE.failure,
      fill: "pastel",
      step: 5,
      x: TOOL_X[3],
      y: ROW.entry,
      w: 180,
    },
    {
      id: "e-credential",
      label: ENTRY_POINTS.credential.label,
      sub: ENTRY_POINTS.credential.sub,
      icon: "key",
      tone: AGENT_TONE.failure,
      fill: "pastel",
      step: 6,
      x: COL.right,
      y: ROW.top,
      w: 180,
    },
  ],
  edges: [
    // Step 1: the agent as built. The chat service holds the conversation, the keys and every tool call.
    { from: "customer", to: "host", label: "message", packet: true },
    { from: "host", to: "model", label: "messages + tools", bidirectional: true, until: 6 },
    { from: "secrets", to: "host", label: "keys" },
    ...serverNodes.map((s) => ({ from: "host", to: s.id })),

    // Steps 2–6: each way in, drawn from the attacker's text to the part that carries it.
    { from: "e-message", to: "customer", label: "pasted in", tone: AGENT_TONE.failure, dashed: true, step: 2 },
    { from: "e-retrieved", to: "help", label: "indexed", tone: AGENT_TONE.failure, dashed: true, step: 3 },
    { from: "e-result", to: "orders", label: "stored", tone: AGENT_TONE.failure, dashed: true, step: 4 },
    { from: "e-description", to: "tracker", label: "tools/list", tone: AGENT_TONE.failure, dashed: true, step: 5 },
    { from: "secrets", to: "e-credential", label: "copied out", tone: AGENT_TONE.failure, dashed: true, step: 6 },

    // Step 7: every source above reaches the model as text in the same window.
    {
      from: "host",
      to: "model",
      label: "all text, one window",
      tone: AGENT_TONE.failure,
      packet: true,
      bidirectional: true,
      step: 7,
    },
  ],
};

export default spec;
