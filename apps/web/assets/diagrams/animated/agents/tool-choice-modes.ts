import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, TOOLS } from "@/components/diagrams/presets/agents";

// The four tool-choice modes (tool-use-and-mcp, Core concepts 5), as the Claude Messages API names them in
// `tool_choice`: auto (the default when tools are sent), any (must call at least one tool), tool (must call the named
// tool, here get_order) and none (no tool calls; the default when no tools are sent). Rows say what the model may
// return under each mode: words, tools it picks, or get_order. A footer gives each mode's default or its OpenAI name.
// Claude Opus 5.5 and Sonnet 5.5 reject any and tool with a 400 error; the page says so in the text.
//
// Layout: a matrix. Row labels in a text column (x 20, w 180); four mode columns 150 wide from x 212, 12 apart; header
// row y 14, three answer rows from y 76, footer text under them.
//
// Colour (agents legend, two tones plus neutral): "yes" cells green for words (the model's answer) and teal for tool
// calls; "no" cells on paper; headers neutral. The default mode, auto, is ringed.

const COL_X = [212, 374, 536, 698];
const COL_W = 150;
const ROW_Y = [76, 128, 180];
const ROW_H = 44;

type Answer = { label: string; yes: boolean };
const MODES: { mode: string; sub: string; cells: [Answer, Answer, Answer]; foot: string }[] = [
  {
    mode: "auto",
    sub: '{"type": "auto"}',
    cells: [
      { label: "yes", yes: true },
      { label: "0, 1 or more", yes: true },
      { label: "if it picks it", yes: true },
    ],
    foot: "Default when\ntools are sent",
  },
  {
    mode: "any",
    sub: '{"type": "any"}',
    cells: [
      { label: "no", yes: false },
      { label: "1 or more", yes: true },
      { label: "if it picks it", yes: true },
    ],
    foot: 'OpenAI calls it\n"required"',
  },
  {
    mode: "tool",
    sub: `name: "${TOOLS.getOrder.name}"`,
    cells: [
      { label: "no", yes: false },
      { label: "no", yes: false },
      { label: "always", yes: true },
    ],
    foot: "Forces one call,\nno words before it",
  },
  {
    mode: "none",
    sub: '{"type": "none"}',
    cells: [
      { label: "yes", yes: true },
      { label: "no", yes: false },
      { label: "no", yes: false },
    ],
    foot: "Default when no\ntools are sent",
  },
];

const ROWS = ["Answer in words", "Call tools it picks", `Call ${TOOLS.getOrder.name}`];

const rowLabels: LayoutShape[] = ROWS.map((label, r) => ({
  id: `row${r}`,
  type: "text",
  x: 20,
  y: ROW_Y[r],
  w: 180,
  h: ROW_H,
  label,
  tone: AGENT_TONE.infra,
}));

const columns: LayoutShape[] = MODES.flatMap((m, c) => [
  {
    id: `head${c}`,
    type: "cell" as const,
    x: COL_X[c],
    y: 14,
    w: COL_W,
    h: 52,
    label: m.mode,
    sub: m.sub,
    tone: AGENT_TONE.infra,
    fill: "pastel" as const,
    highlight: m.mode === "auto" ? true : undefined,
  },
  ...m.cells.map((cell, r) => ({
    id: `c${c}-${r}`,
    type: "cell" as const,
    x: COL_X[c],
    y: ROW_Y[r],
    w: COL_W,
    h: ROW_H,
    label: cell.label,
    tone: cell.yes ? (r === 0 ? AGENT_TONE.model : AGENT_TONE.action) : AGENT_TONE.infra,
    fill: cell.yes ? ("pastel" as const) : ("paper" as const),
  })),
  {
    id: `foot${c}`,
    type: "text" as const,
    x: COL_X[c],
    y: ROW_Y[2] + ROW_H + 10,
    w: COL_W,
    h: 36,
    label: m.foot,
    tone: AGENT_TONE.infra,
  },
]);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Tool choice: auto, any, one named tool, none",
  width: 870,
  height: ROW_Y[2] + ROW_H + 60,
  shapes: [...rowLabels, ...columns],
};

export default spec;
