import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { contextBar, type ContextKind, type ContextSegment } from "@/components/diagrams/presets/agents";
import { CONTEXT, COST, PRICES } from "@/components/diagrams/presets/gcase-support";
import { fmt } from "@/components/diagrams/presets/rag";

// The support agent's context window: the first call of turn 3 in the damaged-item case (design sheet §11). Eight
// blocks from CONTEXT in presets/gcase-support.ts, in prompt order (stable first, so the provider can cache them):
//   instructions 1,200 + tool definitions 1,000 + procedure damaged_item@v7 500           = 2,700 stable, cached
//   case state 400 + evidence 2,000 + recent turns 600 + tool results 250 + new message 50 = 3,300 changing
//   total 6,000 tokens on this call; evidence comes on half of calls, so 5,000 on average (CONTEXT.averageTotal).
// Caching: the stable 2,700 are read at 0.10 instead of 2.00 USD per million (PRICES.mid); on a no-tool message that
// is COST.noTool 0.00607 against COST.noCacheNoTool 0.0112 USD, 46% less (COST.cacheSaving).
// Two steps: 1 the stable prefix with its "cached" bracket; 2 the changing blocks with theirs.
// Layout (880 wide): contextBar() from presets/agents.ts at x 30, 800 wide (0.133 px a token), brackets above, the
// labels of narrow blocks below (the last two moved to a second row so they stay on the canvas), two footer lines.
// Colours (the agents context legend): instructions and procedure neutral, tool definitions teal, case state violet
// (state), evidence and tool results blue (retrieved text, results), recent turns and the new message orange (the
// customer's words).

const X = 30;
const W = 800;
const BAR_Y = 62;
const BAR_H = 50;

const KIND: Record<(typeof CONTEXT.blocks)[number]["id"], { kind: ContextKind; label?: string }> = {
  instructions: { kind: "instructions" },
  tools: { kind: "tools" },
  procedure: { kind: "instructions", label: "Procedure" },
  case: { kind: "memory", label: "Case state" },
  evidence: { kind: "files", label: "Evidence" },
  turns: { kind: "history", label: "Turns" },
  "tool-results": { kind: "results", label: "Tool results" },
  message: { kind: "task", label: "New message" },
};

const segments: ContextSegment[] = CONTEXT.blocks.map((b) => ({
  kind: KIND[b.id].kind,
  label: KIND[b.id].label,
  tokens: b.tokens,
  step: b.stable ? 1 : 2,
}));

const bar = contextBar("ctx", X, BAR_Y, segments, { total: CONTEXT.total, w: W, h: BAR_H });

// Labels under the bar: the builder packs them in one row; the last two would run past the canvas, so they move to a
// second row, both right-aligned 30 px past the bar's end, under their slivers.
const lastTwo = ["ctx-6-t", "ctx-7-t"];
const ROW2 = BAR_Y + BAR_H + 26;
const shapes = bar.shapes.map((s): LayoutShape => {
  const i = lastTwo.indexOf(s.id);
  if (i < 0) return s;
  const w = s.w ?? 0;
  // Both end 30 px past the bar (inside the 880 canvas): tool results in row 1, the new message in row 2.
  return { ...s, x: X + W + 30 - w, y: i === 0 ? s.y : ROW2 };
});

const xAt = (tokens: number) => X + Math.round((tokens / CONTEXT.total) * W);
const bracket = (id: string, from: number, to: number, label: string, step: number): LayoutShape[] => {
  const x1 = xAt(from) + 2;
  const x2 = xAt(to) - 2;
  const y = BAR_Y - 10;
  return [
    {
      id,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x1, y + 6],
        [x1, y],
        [x2, y],
        [x2, y + 6],
      ],
      step,
    },
    { id: `${id}-label`, type: "text", x: x1, y: y - 26, w: x2 - x1, h: 20, label, tone: "neutral", step },
  ];
};

const pct = (v: number) => `${Math.round(v * 100)}%`;
const FOOT_Y = ROW2 + 34;

const spec: LayoutSpec = {
  kind: "layout",
  title: "The support agent's context window: 6,000 tokens, the first 2,700 stable and cached",
  width: 880,
  height: FOOT_Y + 50,
  steps: [
    { title: `Stable prefix: ${fmt(CONTEXT.stable)} tokens, cached` },
    { title: `Changing blocks: ${fmt(CONTEXT.changing)} tokens, sent fresh` },
  ],
  shapes: [
    ...bracket("stable", 0, CONTEXT.stable, `Stable prefix, cached: ${fmt(CONTEXT.stable)}`, 1),
    ...bracket("changing", CONTEXT.stable, CONTEXT.total, `Changing every turn: ${fmt(CONTEXT.changing)}`, 2),
    ...shapes,
    {
      id: "foot-1",
      type: "text",
      x: X,
      y: FOOT_Y,
      w: W,
      h: 20,
      label: `${fmt(CONTEXT.total)} tokens on this call; ${fmt(CONTEXT.averageTotal)} on average, because evidence comes on half of calls`,
      tone: "neutral",
      step: 2,
    },
    {
      id: "foot-2",
      type: "text",
      x: X,
      y: FOOT_Y + 22,
      w: W,
      h: 20,
      label: `Cached tokens cost ${PRICES.mid.cached.toFixed(2)} instead of ${PRICES.mid.input.toFixed(2)} USD per million: ${pct(COST.cacheSaving)} off a message with no tool call`,
      tone: "neutral",
      step: 2,
    },
  ],
};

export default spec;
