import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, contextBar } from "@/components/diagrams/presets/agents";
import { ISOLATION, ISOLATION_TOTAL, LEAD_TOKENS } from "@/components/diagrams/presets/agents-multi";

// Context isolation (multi-agent-systems; kept general so context-engineering can reuse it): three sub-agents each
// fill their own context window with instructions, the task, history and tool results, then hand the lead a short
// summary. The lead's window holds only its instructions, the task and the three summaries. Illustrative counts from
// ISOLATION: windows of 200,000 tokens; the sub-agents use 75,000, 63,000 and 85,000 (223,000 together, more than
// one window); each summary is 1,500 tokens; the lead reads 3,000 + 500 + 4,500 = 8,000.
//
// Three steps: 1 each sub-agent fills its own window · 2 each returns a summary · 3 the lead reads only the summaries.
//
// Layout: one row per agent, 96 apart from y 40 (the lead's row 20 lower). The agent's name at x 20 (w 130), its
// context bar (contextBar, 520 wide, one shared scale) at x 166, and for each sub-agent a summary chip at x 702. The
// three summary arrows run down a bus at x 866 into the lead's box, which sits at the end of the lead's row, under the
// chips. Narrow slices get their labels under the bar.
//
// Colour (agents legend): agents green (the lead pastel and ringed, the figure's one highlight; sub-agents soft);
// instructions neutral; task and history orange; tool results and summaries blue (what comes back). Three tones plus
// neutral.

const BAR_X = 166;
const BAR_W = 520;
const CHIP_X = 702;
const CHIP_W = 140;
const H = 44;
const BUS_X = 866;
const rowY = (i: number) => 40 + i * 96;
const LEAD_Y = rowY(3) + 20;
const fmt = (n: number) => n.toLocaleString("en-GB");

const subRows: LayoutShape[] = ISOLATION.results.flatMap((results, i) => {
  const y = rowY(i);
  const bar = contextBar(
    `bar${i}`,
    BAR_X,
    y,
    [
      { kind: "instructions", tokens: ISOLATION.sub.instructions },
      { kind: "task", tokens: ISOLATION.sub.task },
      { kind: "history", tokens: ISOLATION.sub.history },
      { kind: "results", tokens: results },
    ],
    { total: ISOLATION.window, w: BAR_W, h: H }
  );
  return [
    {
      id: `agent${i}`,
      type: "box" as const,
      x: 20,
      y,
      w: 130,
      h: H,
      label: `Sub-agent ${i + 1}`,
      sub: "its own window",
      tone: AGENT_TONE.model,
      fill: "soft" as const,
    },
    ...bar.shapes,
    {
      id: `sum${i}`,
      type: "box" as const,
      x: CHIP_X,
      y,
      w: CHIP_W,
      h: H,
      label: "Summary",
      sub: `${fmt(ISOLATION.summary)} tokens`,
      tone: AGENT_TONE.result,
      fill: "pastel" as const,
      step: 2,
    },
    {
      id: `out${i}`,
      type: "arrow" as const,
      x: BAR_X + BAR_W + 4,
      y: y + H / 2,
      w: CHIP_X - BAR_X - BAR_W - 8,
      h: 0,
      step: 2,
    },
    {
      id: `up${i}`,
      type: "arrow" as const,
      x: 0,
      y: 0,
      from: `sum${i}`,
      to: "lead",
      via: [
        [BUS_X, y + H / 2],
        [BUS_X, LEAD_Y + 12 + i * 14],
      ],
      dashed: true,
      step: 3,
    },
  ];
});

const leadBar = contextBar(
  "lbar",
  BAR_X,
  LEAD_Y,
  [
    { kind: "instructions", tokens: ISOLATION.lead.instructions },
    { kind: "task", tokens: ISOLATION.lead.task },
    {
      kind: "results",
      tokens: ISOLATION.results.length * ISOLATION.summary,
      label: "3 summaries",
    },
  ],
  { total: ISOLATION.window, w: BAR_W, h: H, step: 3 }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Context isolation: each sub-agent fills its own window; the lead reads only the summaries",
  width: 880,
  height: LEAD_Y + H + 70,
  steps: [
    { title: "Each sub-agent fills its own window" },
    { title: "Each one returns a short summary" },
    { title: "The lead reads only the summaries" },
  ],
  shapes: [
    {
      id: "scale",
      type: "text",
      x: BAR_X,
      y: 8,
      w: BAR_W,
      h: 20,
      label: `Each bar is one ${fmt(ISOLATION.window)}-token window (illustrative counts)`,
      tone: AGENT_TONE.infra,
    },
    ...subRows,
    {
      id: "leadName",
      type: "text",
      x: 20,
      y: LEAD_Y,
      w: 130,
      h: H,
      label: "Lead's\nwindow",
      tone: AGENT_TONE.infra,
      step: 3,
    },
    ...leadBar.shapes,
    {
      id: "lead",
      type: "box",
      x: CHIP_X,
      y: LEAD_Y,
      w: CHIP_W,
      h: 52,
      label: "Lead agent",
      sub: `reads ${fmt(LEAD_TOKENS)} tokens`,
      tone: AGENT_TONE.model,
      fill: "pastel",
      highlight: true,
      step: 3,
    },
    {
      id: "sumline",
      type: "text",
      x: BAR_X,
      y: LEAD_Y + H + 30,
      w: BAR_W,
      h: 20,
      label: `Together the three windows hold ${fmt(ISOLATION_TOTAL)} tokens; the lead reads ${fmt(LEAD_TOKENS)}`,
      tone: AGENT_TONE.infra,
      step: 3,
    },
  ],
};

export default spec;
