import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, TOOLS } from "@/components/diagrams/presets/agents";

// The augmented LLM, the building block of every pattern on agent-architectures: one model with three attachments,
// each drawn with what Brightpost's support model uses it for. Retrieval (search_help, blue: what comes back), tools
// (get_order and create_refund, teal) and memory (a saved preference, violet). Lines without heads: each attachment
// is both read and written in a single turn.
//
// Layout: the three attachments in a row (x 20, 255, 490; 210 wide), the model centred under them; the lines run from
// the model's top edge to each attachment's bottom edge.
//
// Colour (agents legend): four tones, the model green, retrieval blue, tools teal, memory violet.

const line = (id: string, to: string, label: string): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from: "model",
  to,
  label,
  head: false,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The augmented LLM: one model with retrieval, tools and memory",
  width: 720,
  height: 270,
  shapes: [
    {
      id: "retrieval",
      type: "box",
      x: 20,
      y: 30,
      w: 210,
      h: 52,
      label: "Retrieval",
      sub: TOOLS.searchHelp.name,
      tone: AGENT_TONE.result,
      fill: "pastel",
    },
    {
      id: "tools",
      type: "box",
      x: 255,
      y: 30,
      w: 210,
      h: 52,
      label: "Tools",
      sub: `${TOOLS.getOrder.name}, ${TOOLS.createRefund.name}`,
      tone: AGENT_TONE.action,
      fill: "pastel",
    },
    {
      id: "memory",
      type: "box",
      x: 490,
      y: 30,
      w: 210,
      h: 52,
      label: "Memory",
      sub: '"prefers email"',
      tone: AGENT_TONE.memory,
      fill: "pastel",
    },
    {
      id: "model",
      type: "box",
      x: 270,
      y: 180,
      w: 180,
      h: 56,
      label: "Model",
      sub: "one call, one turn",
      tone: AGENT_TONE.model,
      fill: "pastel",
      highlight: true,
    },
    line("l-retrieval", "retrieval", "search"),
    line("l-tools", "tools", "call"),
    line("l-memory", "memory", "read / write"),
  ],
};

export default spec;
