import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, TOOLS } from "@/components/diagrams/presets/agents";

// "Mental model" on agent-architectures: the same Brightpost task and the same tools, wired two ways.
// Left, the workflow (the recipe): code calls the tools in a fixed order, the same path for every message. Right, the
// agent (the chef): the model picks one tool per turn, the harness returns the result, and the model stops when it
// asks for no tool.
//
// Layout: two groups, 380 wide, side by side. Left column centred on x 210; right: the model at x 470–610, the four
// tools in a column at x 650–780 (rows 120, 186, 252, 318, the same rows as the workflow's steps so the two halves line
// up). The result arrow runs under the tools and up the left edge of the right group (x 440) into the model.
//
// Colour (agents legend): the message orange, tools teal, the model and the reply green, code neutral. Arrows neutral.

const ROWS = [120, 186, 252, 318] as const;
const H = 40;

const tool = (id: string, label: string, x: number, y: number, w: number): LayoutShape => ({
  id,
  type: "box",
  x,
  y,
  w,
  h: H,
  label,
  tone: AGENT_TONE.action,
  fill: "pastel",
});

const arrow = (id: string, from: string, to: string, extra: Partial<LayoutShape> = {}): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  ...extra,
});

const tools = [TOOLS.getOrder, TOOLS.searchHelp, TOOLS.createRefund, TOOLS.sendEmail];

const spec: LayoutSpec = {
  kind: "layout",
  title: "A workflow against an agent on the same task",
  width: 820,
  height: 470,
  groups: [
    { id: "wf", title: "Workflow: your code picks each step", tone: AGENT_TONE.infra, x: 20, y: 20, w: 380, h: 430 },
    { id: "ag", title: "Agent: the model picks each step", tone: AGENT_TONE.model, x: 420, y: 20, w: 380, h: 430 },
  ],
  shapes: [
    // Left: the recipe.
    {
      id: "wf-in",
      type: "box",
      x: 125,
      y: 56,
      w: 170,
      h: H,
      label: "Customer message",
      tone: AGENT_TONE.task,
      fill: "pastel",
    },
    ...tools.map((t, i) => tool(`wf-${i}`, t.name, 125, ROWS[i], 170)),
    { id: "wf-out", type: "box", x: 125, y: 384, w: 170, h: H, label: "Reply", tone: AGENT_TONE.model },
    arrow("wf-a0", "wf-in", "wf-0"),
    arrow("wf-a1", "wf-0", "wf-1"),
    arrow("wf-a2", "wf-1", "wf-2"),
    arrow("wf-a3", "wf-2", "wf-3"),
    arrow("wf-a4", "wf-3", "wf-out"),
    {
      id: "wf-note",
      type: "text",
      x: 300,
      y: 204,
      w: 92,
      h: 36,
      label: "same path,\nevery time",
      tone: AGENT_TONE.infra,
    },

    // Right: the chef.
    {
      id: "ag-in",
      type: "box",
      x: 525,
      y: 56,
      w: 170,
      h: H,
      label: "Customer message",
      tone: AGENT_TONE.task,
      fill: "pastel",
    },
    {
      id: "ag-model",
      type: "box",
      x: 470,
      y: 186,
      w: 140,
      h: 52,
      label: "Model",
      sub: "picks the next step",
      tone: AGENT_TONE.model,
      fill: "pastel",
    },
    ...tools.map((t, i) => tool(`ag-${i}`, t.name, 650, ROWS[i], 130)),
    { id: "ag-out", type: "box", x: 470, y: 300, w: 140, h: H, label: "Reply", tone: AGENT_TONE.model },
    arrow("ag-a0", "ag-in", "ag-model"),
    ...tools.map((_, i) => arrow(`ag-c${i}`, "ag-model", `ag-${i}`)),
    arrow("ag-back", "ag-3", "ag-model", {
      via: [
        [715, 384],
        [440, 384],
        [440, 212],
      ],
      dashed: true,
      label: "result",
    }),
    arrow("ag-exit", "ag-model", "ag-out", { label: "no tool call" }),
  ],
};

export default spec;
