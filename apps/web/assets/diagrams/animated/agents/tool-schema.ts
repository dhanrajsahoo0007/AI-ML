import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, BRIGHTPOST, TOOLS, contextBar } from "@/components/diagrams/presets/agents";
import { TOOL_DEF_TOKENS, TOOL_PROMPT_TOKENS, TOOL_TOKENS } from "@/components/diagrams/presets/agents-tools";

// A tool definition's three parts (tool-use-and-mcp, Core concepts 1), drawn with get_order, and what the definitions
// cost: every request that offers tools resends all of them. Rows: name, description (ringed: the part the model leans
// on most, per the Claude docs), input_schema. Under them, one stacked bar of the tool tokens in each request: the
// Claude API's tool-use system prompt (286 tokens for Claude Opus 5.5, sourced) and the four Brightpost definitions
// (illustrative counts, TOOL_DEF_TOKENS), 696 tokens in all.
//
// Layout: three columns per row, the part's field name (x 20, w 130), its value for get_order (x 162, w 330) and what
// the model uses it for (text, x 504, w 256). The bar runs x 20 to 760 under the rows; its caption sits below.
//
// Colour (agents legend, two tones): the definition teal (a tool), field names and the tool-use prompt neutral
// (instructions).

const ROWS = [
  { part: "name", value: TOOLS.getOrder.name, use: "How the model names\nthe call it writes", h: 44 },
  {
    part: "description",
    value: "Look up one of the signed-in\ncustomer's orders by its number.\nReturns item, price, date, status.",
    use: "When to pick this tool: the\npart the model reads most",
    h: 64,
    highlight: true,
  },
  {
    part: "input_schema",
    value: `order_id: string ("${BRIGHTPOST.orderId}")\nrequired: [order_id]`,
    use: "What to fill in, typed so\nthe app can check it",
    h: 52,
  },
] as const;

const GAP = 10;
const TOP = 40;

let y = TOP;
const rows: LayoutShape[] = ROWS.flatMap((r, i) => {
  const ry = y;
  y += r.h + GAP;
  return [
    { id: `p${i}`, type: "cell" as const, x: 20, y: ry, w: 130, h: r.h, label: r.part, tone: AGENT_TONE.infra },
    {
      id: `v${i}`,
      type: "box" as const,
      x: 162,
      y: ry,
      w: 330,
      h: r.h,
      label: r.value,
      tone: AGENT_TONE.action,
      fill: "pastel" as const,
      highlight: "highlight" in r ? r.highlight : undefined,
    },
    { id: `u${i}`, type: "text" as const, x: 504, y: ry, w: 256, h: r.h, label: r.use, tone: AGENT_TONE.infra },
  ];
});

const headings: LayoutShape[] = [
  { id: "h0", type: "text", x: 20, y: 12, w: 130, h: 20, label: "Field", tone: AGENT_TONE.infra },
  { id: "h1", type: "text", x: 162, y: 12, w: 330, h: 20, label: "get_order's value", tone: AGENT_TONE.infra },
  { id: "h2", type: "text", x: 504, y: 12, w: 256, h: 20, label: "What the model uses it for", tone: AGENT_TONE.infra },
];

const BAR_Y = y + 40;
const bar = contextBar(
  "bar",
  20,
  BAR_Y,
  [
    { kind: "instructions", tokens: TOOL_PROMPT_TOKENS, label: "Tool-use prompt" },
    ...TOOL_DEF_TOKENS.map((t) => ({ kind: "tools" as const, tokens: t.tokens, label: t.name })),
  ],
  { total: TOOL_TOKENS.perRequest, w: 740, free: false }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "A tool definition: name, description, input schema, and what they cost",
  width: 780,
  height: BAR_Y + bar.height + 70,
  shapes: [
    ...headings,
    ...rows,
    {
      id: "bar-title",
      type: "text",
      x: 20,
      y: BAR_Y - 28,
      w: 740,
      h: 20,
      label: `Sent with every request: ${TOOL_TOKENS.perRequest} tokens before the conversation`,
      tone: AGENT_TONE.infra,
    },
    ...bar.shapes,
    {
      id: "bar-note",
      type: "text",
      x: 20,
      y: BAR_Y + bar.height + 10,
      w: 740,
      h: 40,
      label: `Prompt: ${TOOL_PROMPT_TOKENS} tokens, Claude Opus 5.5 (Claude docs). Definitions: illustrative.\n5 model calls × ${TOOL_TOKENS.perRequest} = ${TOOL_TOKENS.happyPath.toLocaleString("en-GB")} input tokens for the tools alone`,
      tone: AGENT_TONE.infra,
    },
  ],
};

export default spec;
