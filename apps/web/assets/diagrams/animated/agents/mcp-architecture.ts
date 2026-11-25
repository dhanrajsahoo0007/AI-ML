import type { DiagramEdge, DiagramNode, DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE, TOOLS } from "@/components/diagrams/presets/agents";
import { MCP_SERVERS } from "@/components/diagrams/presets/agents-tools";

// The Model Context Protocol's roles (tool-use-and-mcp, Architecture; reused by model-context-protocol): a host
// application runs one MCP client per server, and each server exposes tools, resources and prompts. Roles and
// methods follow the MCP specification revision 2026-07-28 (checked 2026-11-15): host, clients ("each client has a
// 1:1 relationship with a particular server"), servers; discovery with tools/list, calls with tools/call, data with
// resources/read. Servers never see the conversation or each other; only the host talks to the model.
//
// Five steps: 1 the host runs the conversation (customer → host → model) · 2 one client per server, each over its own
// transport (stdio for the local orders server, Streamable HTTP for the two remote ones) · 3 each client lists its
// server's tools; the host passes all four to the model · 4 the model asks for get_order; the host checks it and routes
// it through the orders client as tools/call · 5 the host reads a help article as a resource and adds it to the
// context. Nodes never move; the step-1 "messages" edge is replaced at step 3 (`until`), and the step-3 tools/list
// edges give way to the call and the resource read on the same bent routes.
//
// Layout: top row y 120: customer (glyph, x 65), host (x 420, the accent), model (x 795, w 150). Clients at y 270 and
// servers at y 445, both in columns x 220, 420, 620. Host zone x 115–710, y 70–315; servers zone x 30–725, y 395–495
// (starting at 30 keeps its title tab clear of the first client's edge). Each client → server pair has a straight
// edge (the transport, label at y ≈ 357, between the zones) and a second edge bent through (x + 80, 357) for the
// protocol call, so the two labels sit side by side.
//
// Colour (agents legend, three tones plus neutral): customer orange, model green, MCP servers teal, host and clients
// neutral. Arrows stay neutral.

const COLS = [220, 420, 620] as const;
const Y = { top: 120, client: 270, server: 445, label: 357 } as const;

const clients: DiagramNode[] = MCP_SERVERS.map((s, i) => ({
  id: `client-${s.id}`,
  label: "MCP client",
  sub: `talks to ${s.label.replace(" server", "")}`,
  icon: "link",
  tone: AGENT_TONE.infra,
  step: 2,
  x: COLS[i],
  y: Y.client,
  w: 160,
}));

const servers: DiagramNode[] = MCP_SERVERS.map((s, i) => ({
  id: `server-${s.id}`,
  label: s.label,
  sub: s.exposes,
  icon: "tool",
  tone: AGENT_TONE.action,
  fill: "pastel",
  step: 2,
  x: COLS[i],
  y: Y.server,
  w: 190,
}));

/** The bent second route between client i and server i, for the protocol call drawn in steps 3–5. */
const bent = (i: number): [number, number][] => [[COLS[i] + 80, Y.label]];

const spec: DiagramSpec = {
  title: "MCP: one host, one client per server",
  width: 880,
  height: 510,
  steps: [
    { title: "The host runs the conversation" },
    { title: "One client per server" },
    { title: "Each client lists its server's tools" },
    { title: "The model asks; the host routes the call" },
    { title: "The host reads a resource for context" },
  ],
  zones: [
    { id: "host-zone", title: "Host application", tone: AGENT_TONE.infra, x: 115, y: 70, w: 595, h: 245 },
    { id: "servers", title: "MCP servers", tone: AGENT_TONE.action, x: 30, y: 395, w: 695, h: 100 },
  ],
  nodes: [
    {
      id: "customer",
      label: "Customer",
      icon: "users",
      tone: AGENT_TONE.task,
      variant: "glyph",
      x: 65,
      y: Y.top,
    },
    {
      id: "host",
      label: "Host",
      sub: "Brightpost chat service",
      icon: "server",
      tone: AGENT_TONE.infra,
      accent: true,
      x: 420,
      y: Y.top,
      w: 210,
    },
    {
      id: "model",
      label: "Model",
      sub: "sees tools only",
      icon: "model",
      tone: AGENT_TONE.model,
      fill: "pastel",
      x: 795,
      y: Y.top,
      w: 150,
    },
    ...clients,
    ...servers,
  ],
  edges: [
    // Step 1: the conversation lives in the host; only the host calls the model.
    { from: "customer", to: "host", label: "message", packet: true },
    { from: "host", to: "model", label: "messages", packet: true, until: 2 },

    // Step 2: the host starts one client per server; each client reaches its server over one transport.
    ...MCP_SERVERS.flatMap((s): DiagramEdge[] => [
      { from: "host", to: `client-${s.id}`, step: 2 },
      { from: `client-${s.id}`, to: `server-${s.id}`, label: s.transport, step: 2 },
    ]),

    // Step 3: discovery. Each client asks its server for its tools; the host sends all of them with the messages.
    ...MCP_SERVERS.map((s, i): DiagramEdge => ({
      from: `client-${s.id}`,
      to: `server-${s.id}`,
      label: "tools/list",
      packet: true,
      bidirectional: true,
      via: bent(i),
      step: 3,
      until: 3,
    })),
    { from: "host", to: "model", label: "messages + 4 tools", packet: true, step: 3 },

    // Step 4: the model asks for get_order; the host checks it and sends tools/call through the orders client.
    { from: "model", to: "host", label: `tool call: ${TOOLS.getOrder.name}`, packet: true, via: [[620, 168]], step: 4 },
    {
      from: "client-orders",
      to: "server-orders",
      label: "tools/call",
      packet: true,
      bidirectional: true,
      via: bent(0),
      step: 4,
    },

    // Step 5: the host itself reads a resource (a help article) and adds it to the model's context.
    {
      from: "client-help",
      to: "server-help",
      label: "resources/read",
      packet: true,
      bidirectional: true,
      via: bent(1),
      step: 5,
    },
  ],
};

export default spec;
