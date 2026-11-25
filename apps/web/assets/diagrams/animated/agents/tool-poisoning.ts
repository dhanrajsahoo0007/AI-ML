import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, TOOLS } from "@/components/diagrams/presets/agents";
import { POISON } from "@/components/diagrams/presets/agents-mcp";

// Tool poisoning on model-context-protocol (Deep dive, "Security"): a third-party MCP server's tool description hides
// an instruction aimed at a different, trusted tool. This is the "shadowing" variant described by Invariant Labs
// ("MCP Security Notification: Tool Poisoning Attacks", 1 Apr 2025): the attacker's tool never has to be called; its
// description alone steers how the model uses Brightpost's own send_email. The MCP spec (revision 2026-07-28) says
// clients MUST treat tool annotations as untrusted unless they come from trusted servers, and descriptions reach the
// model like any other text.
//
// Three steps: 1 the definition: what the user sees and the hidden part only the model reads (red, ringed) · 2 the
// path to harm: tools/list → host → model → an extra send_email to the attacker's address (red) · 3 where it is caught
// (lime): check 1 when the server is installed or its definitions change (review, pin a hash, allow-list); check 2 on
// every call (the harness only lets send_email write to the signed-in customer's address on file).
//
// Layout: definition rows at y 40 (visible, 44) and y 94 (hidden, 56): a label column (x 20, w 160) and the text
// (x 192, w 608). The flow row at y 200: four boxes 52 high at x 20 (w 140), 215 (w 140), 410 (w 150) and 615
// (w 185); the arrows between them carry no labels, so the checks at y 310, each centred under the arrow it guards
// (x 188 and x 588), point at a clear line.
//
// Colour (agents legend, four tones plus neutral): MCP server and visible text teal, the host neutral, the model green,
// the poison and the harmful call red, the two checks lime. Arrows stay neutral.

const FLOW_Y = 200;
const CHECK_Y = 310;

const flowBox = (id: string, x: number, w: number, label: string, sub: string, tone: LayoutShape["tone"]) =>
  ({ id, type: "box", x, y: FLOW_Y, w, h: 52, label, sub, tone, fill: "pastel", step: 2 }) satisfies LayoutShape;

const check = (id: string, cx: number, w: number, label: string, sub: string): LayoutShape[] => [
  {
    id,
    type: "box",
    x: cx - w / 2,
    y: CHECK_Y,
    w,
    h: 52,
    label,
    sub,
    tone: AGENT_TONE.check,
    fill: "pastel",
    step: 3,
  },
  { id: `${id}-up`, type: "arrow", x: cx, y: CHECK_Y, w: 0, h: -(CHECK_Y - FLOW_Y - 30), step: 3 },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Tool poisoning: a hidden instruction in a tool description, and where it is caught",
  width: 820,
  height: CHECK_Y + 52 + 24,
  steps: [
    { title: "A description with a hidden instruction" },
    { title: "Without checks, it reaches the model and steers send_email" },
    { title: "Where it is caught: on install and on every call" },
  ],
  shapes: [
    {
      id: "heading",
      type: "text",
      x: 20,
      y: 10,
      w: 780,
      h: 20,
      label: `${POISON.tool}: a tool from a third-party "${POISON.server}" server`,
      tone: AGENT_TONE.infra,
    },
    { id: "l-shown", type: "text", x: 20, y: 40, w: 160, h: 44, label: "Shown to the user", tone: AGENT_TONE.infra },
    {
      id: "shown",
      type: "box",
      x: 192,
      y: 40,
      w: 608,
      h: 44,
      label: POISON.visible,
      tone: AGENT_TONE.action,
      fill: "pastel",
    },
    {
      id: "l-hidden",
      type: "text",
      x: 20,
      y: 94,
      w: 160,
      h: 56,
      label: "Also in the description,\nread only by the model",
      tone: AGENT_TONE.infra,
    },
    {
      id: "hidden",
      type: "box",
      x: 192,
      y: 94,
      w: 608,
      h: 56,
      label: POISON.hidden,
      tone: AGENT_TONE.failure,
      fill: "pastel",
      highlight: true,
    },

    // Step 2: the path to harm.
    flowBox("server", 20, 140, POISON.server, "answers tools/list", AGENT_TONE.action),
    flowBox("host", 215, 140, "Host", "merges tool lists", AGENT_TONE.infra),
    flowBox("model", 410, 150, "Model", "reads every description", AGENT_TONE.model),
    flowBox("harm", 615, 185, `Extra ${TOOLS.sendEmail.name}`, `to: ${POISON.attacker}`, AGENT_TONE.failure),
    { id: "a1", type: "arrow", from: "server", to: "host", x: 0, y: 0, step: 2 },
    { id: "a2", type: "arrow", from: "host", to: "model", x: 0, y: 0, step: 2 },
    { id: "a3", type: "arrow", from: "model", to: "harm", x: 0, y: 0, step: 2 },

    // Step 3: the two places it is caught.
    ...check("check-install", 188, 230, "1 · On install and on change", "review, pin a hash, allow-list"),
    ...check("check-call", 588, 270, "2 · On every call", `${TOOLS.sendEmail.name} only to the customer`),
  ],
};

export default spec;
