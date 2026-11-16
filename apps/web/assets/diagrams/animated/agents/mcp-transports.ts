import type { DiagramSpec } from "@/components/diagrams/types";
import { AGENT_TONE, TOOLS } from "@/components/diagrams/presets/agents";
import { MCP_SERVERS } from "@/components/diagrams/presets/agents-tools";

// MCP's two standard transports on model-context-protocol (Core concepts, "Transports"), with two of the three
// Brightpost servers from mcp-architecture. Facts from the MCP specification revision 2026-07-28 (checked 2026-11-15):
// - stdio: the client launches the server as a subprocess; newline-delimited JSON-RPC on stdin and stdout, one
//   message per line; stderr only for logs.
// - Streamable HTTP: the server exposes one endpoint that accepts POST; every client message is its own POST; the
//   server answers each request with one JSON object or an SSE stream scoped to that request. No session header and
//   no GET stream in this revision.
//
// Three steps: 1 stdio: the host starts the orders server as a child process and talks over its standard streams · 2
// Streamable HTTP: the help centre client sends each message as an HTTPS POST to one URL · 3 the reply comes back on
// the same request, as JSON or as an SSE stream (progress first, then the result). Nodes never move.
//
// Layout: the machine zone (x 30–560, y 55–455) holds the host (290, 110) and both clients at y 245 (x 160 and 420);
// the orders server sits below its client at (160, 395). The help centre server is in a remote zone (x 610–870, y
// 330–450) at (760, 395). The POST bends down then right through (420, 395); the reply bends up then left through
// (760, 245), clear of the remote zone's title tab, so the two never share a segment.
//
// Colour (agents legend, one tone plus neutral): MCP servers teal; host and clients neutral. Arrows stay neutral.

const [orders, help] = MCP_SERVERS;

const spec: DiagramSpec = {
  title: "MCP transports: stdio for a local server, Streamable HTTP for a remote one",
  width: 880,
  height: 470,
  steps: [
    { title: "stdio: the host starts the server and talks over its streams" },
    { title: "Streamable HTTP: every message is a POST to one URL" },
    { title: "The reply: one JSON object, or a stream for that request" },
  ],
  zones: [
    { id: "machine", title: "One machine", tone: AGENT_TONE.infra, x: 30, y: 55, w: 530, h: 400 },
    { id: "remote", title: "Remote, HTTPS", tone: AGENT_TONE.action, x: 610, y: 330, w: 260, h: 120 },
  ],
  nodes: [
    {
      id: "host",
      label: "Host",
      sub: "Brightpost chat service",
      icon: "server",
      tone: AGENT_TONE.infra,
      x: 290,
      y: 110,
      w: 210,
    },
    {
      id: "client-orders",
      label: "MCP client",
      sub: "talks to Orders",
      icon: "link",
      tone: AGENT_TONE.infra,
      x: 160,
      y: 245,
      w: 160,
    },
    {
      id: "server-orders",
      label: orders.label,
      sub: "child process of the host",
      icon: "tool",
      tone: AGENT_TONE.action,
      fill: "pastel",
      x: 160,
      y: 395,
      w: 190,
    },
    {
      id: "client-help",
      label: "MCP client",
      sub: "talks to Help centre",
      icon: "link",
      tone: AGENT_TONE.infra,
      step: 2,
      x: 420,
      y: 245,
      w: 170,
    },
    {
      id: "server-help",
      label: help.label,
      sub: `${TOOLS.searchHelp.name} + articles`,
      icon: "tool",
      tone: AGENT_TONE.action,
      fill: "pastel",
      step: 2,
      x: 760,
      y: 395,
      w: 190,
    },
  ],
  edges: [
    // Step 1: stdio. The host launches the server; JSON-RPC goes one line at a time over stdin and stdout.
    { from: "host", to: "client-orders", step: 1 },
    {
      from: "client-orders",
      to: "server-orders",
      label: "stdin / stdout, a line each",
      packet: true,
      bidirectional: true,
      step: 1,
    },

    // Step 2: Streamable HTTP. Each message is its own POST to the server's single endpoint.
    { from: "host", to: "client-help", step: 2 },
    {
      from: "client-help",
      to: "server-help",
      label: "POST /mcp",
      packet: true,
      via: [[420, 395]],
      labelAt: 0.25,
      step: 2,
    },

    // Step 3: the reply comes back on the same request: one JSON object, or an SSE stream for this request only.
    {
      from: "server-help",
      to: "client-help",
      label: "JSON, or SSE stream",
      dashed: true,
      packet: true,
      via: [[760, 245]],
      labelAt: 0.6,
      step: 3,
    },
  ],
};

export default spec;
