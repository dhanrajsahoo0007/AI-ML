import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, contextBar, type ContextSegment } from "@/components/diagrams/presets/agents";
import { OVERLOAD, OVERLOAD_TOTALS } from "@/components/diagrams/presets/agents-mcp";

// Tool overload on model-context-protocol (Deep dive, "Tool overload and context cost"): what tool definitions take
// out of the context window before the customer's message, as more MCP servers are connected. Three bars drawn to the
// same illustrative 200,000-token window (OVERLOAD):
// - Step 1, Brightpost alone: instructions 2,000 (illustrative) + its four tools 696 (286 sourced + 410 illustrative)
//   = 2,696 tokens, 1 %.
// - Step 2, plus five popular servers: + GitHub 26,000 + Slack 21,000 + Sentry, Grafana and Splunk 8,000 = 55,000
//   (58 tools; Anthropic, "Introducing advanced tool use", 24 Nov 2025) → 57,696 tokens, 29 %. GitHub, the largest
//   server, is ringed.
// - Step 3, the same tools behind a tool-search tool: Anthropic reports an 85 % cut; 55,000 × 0.15 = 8,250
//   (illustrative, applied to this setup) → 2,696 + 8,250 = 10,946 tokens, 5 %.
//
// Three build steps, one bar each. Layout: a label block on the left (x 20, 150 wide) and the bars from x 180, 620 wide
// (about 323 tokens per unit). A scale line under the third bar names the window; a source line under it.
//
// Colour (agents legend, one tone plus neutral): instructions neutral, tool definitions teal, free space on paper.

const X = 180;
const W = 620;
const total = OVERLOAD.window;
const fmt = (n: number) => n.toLocaleString("en-GB");
const pct = (n: number) => `${Math.round((n / total) * 100)} %`;

const [github, slack, ...rest] = OVERLOAD.servers;
const restTokens = rest.reduce((s, x) => s + x.tokens, 0);

const base = (step: number): ContextSegment[] => [
  { kind: "instructions", tokens: OVERLOAD.instructions, step },
  { kind: "tools", tokens: OVERLOAD.brightpostTools, label: "Brightpost tools", step },
];

const used1 = OVERLOAD.instructions + OVERLOAD.brightpostTools;
const used2 = used1 + OVERLOAD_TOTALS.tokens;
const used3 = used1 + OVERLOAD_TOTALS.withSearch;

const ROWS = [40, 150, 260] as const;

const bar1 = contextBar("b1", X, ROWS[0], base(1), { total, w: W, step: 1 });
const bar2 = contextBar(
  "b2",
  X,
  ROWS[1],
  [
    ...base(2),
    { kind: "tools", tokens: github.tokens, label: github.name, highlight: true, step: 2 },
    { kind: "tools", tokens: slack.tokens, label: slack.name, step: 2 },
    { kind: "tools", tokens: restTokens, label: `${rest[0].name} + ${rest.length - 1} more`, step: 2 },
  ],
  { total, w: W, step: 2 }
);
const bar3 = contextBar(
  "b3",
  X,
  ROWS[2],
  [...base(3), { kind: "tools", tokens: OVERLOAD_TOTALS.withSearch, label: "Search + found tools", step: 3 }],
  { total, w: W, step: 3 }
);

const label = (id: string, y: number, text: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: 20,
  y,
  w: 150,
  h: 44,
  label: text,
  tone: AGENT_TONE.infra,
  step,
});

const scaleY = ROWS[2] + bar3.height + 18;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Tool definitions from many MCP servers crowd the context window",
  width: 820,
  height: scaleY + 64,
  steps: [
    { title: `Brightpost alone: ${fmt(used1)} tokens, ${pct(used1)}` },
    { title: `Plus five popular servers: ${fmt(used2)} tokens, ${pct(used2)}` },
    { title: `The same tools behind a search tool: ${fmt(used3)} tokens, ${pct(used3)}` },
  ],
  shapes: [
    label("l1", ROWS[0], `Brightpost alone\n${fmt(used1)} · ${pct(used1)}`, 1),
    ...bar1.shapes,
    label("l2", ROWS[1], `+ 5 servers, ${OVERLOAD_TOTALS.tools} tools\n${fmt(used2)} · ${pct(used2)}`, 2),
    ...bar2.shapes,
    label("l3", ROWS[2], `Behind a search tool\n${fmt(used3)} · ${pct(used3)}`, 3),
    ...bar3.shapes,
    {
      id: "scale",
      type: "arrow",
      x: X,
      y: scaleY,
      w: W,
      h: 0,
      head: false,
      label: `context window: ${fmt(total)} tokens (illustrative)`,
    },
    {
      id: "source",
      type: "text",
      x: X,
      y: scaleY + 22,
      w: W,
      h: 36,
      label: `Server sizes: Anthropic, Nov 2025. Search: Anthropic's 85 % cut,\napplied here (illustrative). Brightpost definitions: illustrative.`,
      tone: AGENT_TONE.infra,
    },
  ],
};

export default spec;
