import type { DiagramEdge, DiagramNode, DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { MCP_SERVERS } from "@/components/diagrams/presets/agents-tools";
import { COURIER } from "@/components/diagrams/presets/agents-a2a";

// A2A against MCP on agent-to-agent-protocols (Core concepts, "A2A versus MCP"): an agent reaching down to its tools
// (MCP) against two agents talking across to each other (A2A). The A2A project's own comparison (docs/topics/
// a2a-and-mcp.md, v1.0.1) and its August 2026 announcement call MCP the vertical layer (agent to tools and data) and
// A2A the horizontal one (agent to agent); A2A agents are "opaque": they share no internal state, memory or tools.
//
// Three steps: 1 MCP: Brightpost's support agent reaches down to its three MCP servers (the same servers as
// mcp-architecture) · 2 A2A: it hands the damage claim across to Swiftline's claims agent, a peer it does not control
// · 3 the courier's agent reaches down to its own tools over MCP, inside a boundary Brightpost never sees into.
//
// Layout: two zones side by side, Brightpost (x 20–470) and Swiftline (x 500–860). Agents on the top row (y 130),
// tools on the bottom row (y 330): Brightpost's three servers 150 apart (w 140), Swiftline's two 175 apart (w 160).
// Vertical edges are MCP; the one horizontal edge is A2A. Only one MCP edge per side carries a label.
//
// Colour (agents legend, two tones plus neutral): agents green (Brightpost's is the accent), tools and MCP servers
// teal, zones neutral. Arrows stay neutral.

const Y = { agent: 130, tool: 330 } as const;
const BP_X = [95, 245, 395] as const;
const SW_X = [595, 770] as const;

const bpServers: DiagramNode[] = MCP_SERVERS.map((s, i) => ({
  id: `bp-${s.id}`,
  label: s.label.replace(" server", ""),
  sub: "MCP server",
  icon: "tool",
  tone: AGENT_TONE.action,
  fill: "pastel",
  x: BP_X[i],
  y: Y.tool,
  w: 140,
}));

const swTools: DiagramNode[] = COURIER.tools.map((t, i) => ({
  id: `sw-${t.id}`,
  label: t.label,
  sub: t.sub,
  icon: "tool",
  tone: AGENT_TONE.action,
  fill: "pastel",
  step: 3,
  x: SW_X[i],
  y: Y.tool,
  w: 160,
}));

const spec: DiagramSpec = {
  title: "MCP reaches down to tools; A2A reaches across to agents",
  width: 880,
  height: 420,
  steps: [
    { title: "MCP: an agent reaches down to its tools" },
    { title: "A2A: one agent hands a task across to another" },
    { title: "Each agent's tools stay behind its own boundary" },
  ],
  zones: [
    { id: "brightpost", title: "Brightpost", tone: AGENT_TONE.infra, x: 20, y: 50, w: 450, h: 350 },
    {
      id: "swiftline",
      title: `${COURIER.short}: opaque to Brightpost`,
      tone: AGENT_TONE.infra,
      x: 500,
      y: 50,
      w: 360,
      h: 350,
    },
  ],
  nodes: [
    {
      id: "bp-agent",
      label: "Support agent",
      sub: "Brightpost",
      icon: "robot",
      tone: AGENT_TONE.model,
      accent: true,
      x: 245,
      y: Y.agent,
      w: 180,
    },
    ...bpServers,
    {
      id: "sw-agent",
      label: "Claims agent",
      sub: COURIER.company,
      icon: "robot",
      tone: AGENT_TONE.model,
      fill: "pastel",
      step: 2,
      x: 680,
      y: Y.agent,
      w: 190,
    },
    ...swTools,
  ],
  edges: [
    // Step 1: down, over MCP. One label is enough for three parallel edges.
    ...MCP_SERVERS.map((s): DiagramEdge => ({
      from: "bp-agent",
      to: `bp-${s.id}`,
      label: s.id === "help" ? "MCP: tools/call" : undefined,
      packet: s.id === "help",
    })),

    // Step 2: across, over A2A: a task with messages and artifacts, both ways.
    {
      from: "bp-agent",
      to: "sw-agent",
      label: "A2A: task, messages, artefacts",
      bidirectional: true,
      packet: true,
      step: 2,
    },

    // Step 3: the courier's agent uses its own tools; Brightpost sees only the task and its artifacts.
    ...COURIER.tools.map((t, i): DiagramEdge => ({
      from: "sw-agent",
      to: `sw-${t.id}`,
      label: i === 0 ? "MCP" : undefined,
      step: 3,
    })),
  ],
};

export default spec;
