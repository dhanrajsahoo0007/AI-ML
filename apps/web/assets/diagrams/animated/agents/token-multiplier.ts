import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE } from "@/components/diagrams/presets/agents";
import { TOKEN_MULTIPLIER } from "@/components/diagrams/presets/agents-multi";

// The token bill of a team (multi-agent-systems, Deep dive). Measured multipliers only, from Anthropic's "How we built
// our multi-agent research system" (13 June 2025): agents use about 4 times the tokens of a chat, and multi-agent
// systems about 15 times. The bars share one scale (40 units per chat's worth of tokens), so the team's bar is 15 / 4
// ≈ 3.75 times the single agent's. A line under the bars gives what the extra tokens bought in that post: the team
// beat a single Claude Opus 4 agent by 90.2 % on Anthropic's internal research eval.
//
// Layout: three rows from y 50, 64 apart: the name at x 20 (w 170, text), the bar from x 200. A caption line at the
// top names the source; the result line sits under the bars.
//
// Colour (agents legend): chat neutral; the single agent soft green; the team pastel green and ringed (the figure's
// one highlight). One tone plus neutral.

const UNIT = 40;
const BAR_X = 200;
const ROW_Y = (i: number) => 50 + i * 64;
const H = 44;

const rows = [
  { id: "chat", name: "Chat", times: TOKEN_MULTIPLIER.chat, tone: AGENT_TONE.infra, fill: "soft" as const },
  { id: "agent", name: "One agent", times: TOKEN_MULTIPLIER.agent, tone: AGENT_TONE.model, fill: "soft" as const },
  {
    id: "team",
    name: "Multi-agent system",
    times: TOKEN_MULTIPLIER.multiAgent,
    tone: AGENT_TONE.model,
    fill: "pastel" as const,
    highlight: true,
  },
];

const bars: LayoutShape[] = rows.flatMap((r, i) => [
  {
    id: `${r.id}-name`,
    type: "text" as const,
    x: 20,
    y: ROW_Y(i),
    w: 170,
    h: H,
    label: r.name,
    tone: AGENT_TONE.infra,
  },
  {
    id: r.id,
    type: "cell" as const,
    x: BAR_X,
    y: ROW_Y(i),
    w: r.times * UNIT,
    h: H,
    label: r.times === 1 ? "1×" : `≈ ${r.times}×`,
    tone: r.tone,
    fill: r.fill,
    highlight: r.highlight,
  },
]);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Tokens per task: a chat, one agent and a multi-agent system",
  width: BAR_X + TOKEN_MULTIPLIER.multiAgent * UNIT + 40,
  height: ROW_Y(3) + 56,
  shapes: [
    {
      id: "head",
      type: "text",
      x: BAR_X,
      y: 14,
      w: 600,
      h: 22,
      label: `Tokens used, as multiples of a chat (measured: ${TOKEN_MULTIPLIER.source})`,
      tone: AGENT_TONE.infra,
    },
    ...bars,
    {
      id: "gain",
      type: "text",
      x: BAR_X,
      y: ROW_Y(3) + 4,
      w: 600,
      h: 22,
      label: `What it bought there: ${TOKEN_MULTIPLIER.gainPct} % better than one agent on a research eval`,
      tone: AGENT_TONE.infra,
    },
  ],
};

export default spec;
