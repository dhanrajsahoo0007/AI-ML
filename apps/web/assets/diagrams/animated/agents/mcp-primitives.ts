import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { MCP_PRIMITIVES } from "@/components/diagrams/presets/agents-mcp";

// The three server primitives of MCP on model-context-protocol (Core concepts, "Primitives"): tools, resources and
// prompts, and who decides when each one is used. The spec (revision 2026-07-28, checked 2026-11-15) calls tools
// "model-controlled", resources "application-driven" and prompts "user-controlled". One column per primitive; rows:
// what it is, who decides, its methods, the Brightpost example, and what it can do. The model's cell is ringed: tools
// are the only primitive the model triggers by itself, which is why tool calls get the approval step.
//
// Static, no steps. Layout: a row-label column (x 20, w 120) and three columns 206 wide from x 156, 10 apart. Rows at
// y 40 (header, 48), 98 (who decides, 52), 160 (methods, 40), 210 (example, 52), 272 (effect, 40).
//
// Colour (agents legend, three tones plus neutral): the primitives teal (what an MCP server offers); the deciders in
// their roles: the model green, the application (the host) neutral, the user orange. Arrows: none.

const COL_X = [156, 372, 588] as const;
const COL_W = 206;

const ROWS = {
  header: { y: 40, h: 48 },
  decider: { y: 98, h: 52 },
  methods: { y: 160, h: 40 },
  example: { y: 210, h: 52 },
  effect: { y: 272, h: 40 },
} as const;

const DECIDER_TONE: Record<(typeof MCP_PRIMITIVES)[number]["key"], LayoutTone> = {
  tools: AGENT_TONE.model,
  resources: AGENT_TONE.infra,
  prompts: AGENT_TONE.task,
};

const rowLabel = (id: string, row: keyof typeof ROWS, text: string): LayoutShape => ({
  id,
  type: "text",
  x: 20,
  y: ROWS[row].y,
  w: 120,
  h: ROWS[row].h,
  label: text,
  tone: AGENT_TONE.infra,
});

const columns: LayoutShape[] = MCP_PRIMITIVES.flatMap((p, i): LayoutShape[] => {
  const x = COL_X[i];
  return [
    {
      id: `${p.key}-head`,
      type: "cell",
      x,
      y: ROWS.header.y,
      w: COL_W,
      h: ROWS.header.h,
      label: p.label,
      sub: p.what,
      tone: AGENT_TONE.action,
      fill: "pastel",
    },
    {
      id: `${p.key}-decider`,
      type: "box",
      x,
      y: ROWS.decider.y,
      w: COL_W,
      h: ROWS.decider.h,
      label: p.decider,
      sub: p.deciderSub,
      tone: DECIDER_TONE[p.key],
      fill: "pastel",
      highlight: p.key === "tools" ? true : undefined,
    },
    {
      id: `${p.key}-methods`,
      type: "cell",
      x,
      y: ROWS.methods.y,
      w: COL_W,
      h: ROWS.methods.h,
      label: p.methods,
      tone: AGENT_TONE.infra,
    },
    {
      id: `${p.key}-example`,
      type: "box",
      x,
      y: ROWS.example.y,
      w: COL_W,
      h: ROWS.example.h,
      label: p.example,
      tone: AGENT_TONE.action,
    },
    {
      id: `${p.key}-effect`,
      type: "text",
      x,
      y: ROWS.effect.y,
      w: COL_W,
      h: ROWS.effect.h,
      label: p.effect,
      tone: AGENT_TONE.infra,
    },
  ];
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "MCP's three primitives and who decides when each is used",
  width: 820,
  height: ROWS.effect.y + ROWS.effect.h + 20,
  shapes: [
    rowLabel("l-head", "header", "A server offers"),
    rowLabel("l-decider", "decider", "Who decides\nto use it"),
    rowLabel("l-methods", "methods", "Methods"),
    rowLabel("l-example", "example", "Brightpost"),
    rowLabel("l-effect", "effect", "What it does"),
    ...columns,
  ],
};

export default spec;
