import type { SequenceSpec } from "@/components/diagrams/types";
import { BRIGHTPOST, SEQUENCE_TONE, TOOLS } from "@/components/diagrams/presets/agents";
import { MCP_VERSION } from "@/components/diagrams/presets/agents-mcp";

// One MCP exchange on model-context-protocol (Architecture; the worked example follows it): Brightpost's chat service
// (the host, with its orders client inside) reaches the orders server, and the model gets the first tool result. The
// spec id says "session" for continuity with the plan, but revision 2026-07-28 has no session and no initialize
// handshake: every request carries its protocol version and the client's capabilities in `_meta`, so there is nothing
// to set up first (spec changelog, SEP-2575; checked 2026-11-15).
//
// Five steps: 1 server/discover (optional for clients, mandatory for servers): versions, capabilities, identity · 2
// tools/list: the orders server's two tools, with a cache lifetime (ttlMs) · 3 the host sends the tools to the model,
// which returns a tool call for get_order · 4 tools/call over the orders client; the result is resultType "complete" ·
// 5 the host passes the result to the model as a tool_result; a note says the next request carries `_meta` again.
// Each step is followed on the page by its JSON-RPC message.
//
// Layout: three lanes, model | chat service | orders server, so every message joins neighbouring lanes (width 720).
// Model replies are dashed returns, as on function-calling.
//
// Colour (agents legend via SEQUENCE_TONE): model green, host neutral, MCP server teal.

const spec: SequenceSpec = {
  kind: "sequence",
  title: `One MCP exchange, revision ${MCP_VERSION}: discover, list, call`,
  width: 720,
  steps: [
    { title: "Discover the server (optional)" },
    { title: "List its tools" },
    { title: "The model picks a tool" },
    { title: "Call the tool" },
    { title: "Hand the result to the model" },
  ],
  lanes: [
    { id: "model", label: "Model", icon: "model", tone: SEQUENCE_TONE.model },
    { id: "host", label: "Chat service", icon: "server", tone: SEQUENCE_TONE.harness },
    { id: "server", label: "Orders server", icon: "tool", tone: SEQUENCE_TONE.tool },
  ],
  messages: [
    // Step 1: what does this server speak and offer? No handshake; the reply can be cached.
    { from: "host", to: "server", label: "server/discover", step: 1, at: 1 },
    { from: "server", to: "host", label: `${MCP_VERSION} · offers tools`, kind: "return", step: 1, at: 2 },

    // Step 2: the tool list, cacheable for ttlMs.
    { from: "host", to: "server", label: "tools/list", step: 2, at: 3 },
    {
      from: "server",
      to: "host",
      label: `${TOOLS.getOrder.name}, ${TOOLS.createRefund.name} · ttl 5 min`,
      kind: "return",
      step: 2,
      at: 4,
    },

    // Step 3: the host merges the tools with the other servers' and calls the model.
    { from: "host", to: "model", label: "message + 4 tool definitions", step: 3, at: 5 },
    { from: "model", to: "host", label: `tool_use: ${TOOLS.getOrder.call}`, kind: "return", step: 3, at: 6 },

    // Step 4: the orders client sends tools/call; version and capabilities ride in _meta.
    { from: "host", to: "server", label: `tools/call ${TOOLS.getOrder.name}`, step: 4, at: 7 },
    {
      from: "server",
      to: "host",
      label: `${BRIGHTPOST.item}, £${BRIGHTPOST.price}, ${BRIGHTPOST.delivered}`,
      kind: "return",
      step: 4,
      at: 8,
    },

    // Step 5: the result goes back to the model as an ordinary tool result.
    { from: "host", to: "model", label: "history + tool_result", step: 5, at: 9 },
  ],
  notes: [
    { lane: "host", text: "Host; its orders client speaks MCP", step: 1, at: 0 },
    { lane: "server", text: "Every request carries _meta: no session", step: 4, at: 6.5 },
  ],
};

export default spec;
