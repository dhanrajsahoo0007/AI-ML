import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { contextBar, type ContextKind, type ContextSegment } from "@/components/diagrams/presets/agents";
import { CONTEXT, COST, TURNS } from "@/components/diagrams/presets/gcase-voice";
import { fmt } from "@/components/diagrams/presets/rag";

// The voice agent's context window: one model call in node damaged_item, turn 9 of the kettle call (design sheet
// §11). Eight blocks from CONTEXT in presets/gcase-voice.ts, in prompt order (stable first, so the provider caches
// them):
//   instructions and voice style 1,000 + node prompt damaged_item@v7 400 + node tools 600 = 2,000 stable, cached
//   case state 300 + recent turns, truncated to what was heard, 800 + tool results 300 + evidence 170 (help questions
//   only, averaged) + the caller's turn 30 = 1,600 changing
//   total 3,600 tokens; the reply is TURNS.replyTokens (25) tokens.
// Cost of one mid-size call with the cache (COST.mid): 2,000 × 0.10 + 1,600 × 2.00 + 25 × 10.00 per million =
// 0.00365 USD.
// Two steps: 1 the stable prefix with its "cached" bracket; 2 the changing blocks with theirs.
// Layout (880 wide): contextBar() from presets/agents.ts at x 30, 800 wide (0.222 px a token), brackets above, the
// labels of narrow blocks below (the builder packs them; the last ones move to a second row so they stay on the
// canvas), two footer lines.
// Colours (the agents context legend): instructions and the node prompt neutral, node tools teal, case state violet
// (state), recent turns and the caller's turn orange (the caller's words), tool results and evidence blue.

const X = 30;
const W = 800;
const BAR_Y = 62;
const BAR_H = 50;

const KIND: Record<(typeof CONTEXT.blocks)[number]["id"], { kind: ContextKind; label?: string }> = {
  instructions: { kind: "instructions", label: "Instructions, voice" },
  node: { kind: "instructions", label: "Node prompt" },
  tools: { kind: "tools", label: "Node tools" },
  case: { kind: "memory", label: "Case state" },
  turns: { kind: "history", label: "Turns, as heard" },
  "tool-results": { kind: "results", label: "Tool results" },
  evidence: { kind: "files", label: "Evidence" },
  caller: { kind: "task", label: "Caller's turn" },
};

const segments: ContextSegment[] = CONTEXT.blocks.map((b) => ({
  kind: KIND[b.id].kind,
  label: KIND[b.id].label,
  tokens: b.tokens,
  step: b.stable ? 1 : 2,
  highlight: b.id === "turns" || undefined,
}));

const bar = contextBar("ctx", X, BAR_Y, segments, { total: CONTEXT.total, w: W, h: BAR_H });

// Labels under the bar: the builder packs narrow blocks' labels in one row from left to right; any that would run past
// the canvas move to a second row, right-aligned 30 px past the bar's end.
const ROW2 = BAR_Y + BAR_H + 26;
let moved = 0;
const shapes = bar.shapes.map((s): LayoutShape => {
  if (s.type !== "text") return s;
  const w = s.w ?? 0;
  if (s.x + w <= X + W + 40) return s;
  const row = moved++;
  return { ...s, x: X + W + 30 - w, y: ROW2 + row * 20 };
});
/** One NEW ring per step (the bracket labels); the blocks and their labels are quiet. */
const quietShapes = shapes.map((s) => ({ ...s, quiet: true }));

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

const FOOT_Y = ROW2 + Math.max(1, moved) * 20 + 14;

const spec: LayoutSpec = {
  kind: "layout",
  title: "The voice agent's context window: 3,600 tokens, the first 2,000 stable and cached",
  width: 880,
  height: FOOT_Y + 50,
  steps: [
    { title: `Stable prefix: ${fmt(CONTEXT.stable)} tokens, cached` },
    { title: `Changing blocks: ${fmt(CONTEXT.changing)} tokens, sent fresh` },
  ],
  shapes: [
    ...bracket("stable", 0, CONTEXT.stable, `Stable per node, cached: ${fmt(CONTEXT.stable)}`, 1),
    ...bracket("changing", CONTEXT.stable, CONTEXT.total, `Changing every turn: ${fmt(CONTEXT.changing)}`, 2),
    ...quietShapes,
    {
      id: "foot-1",
      type: "text",
      x: X,
      y: FOOT_Y,
      w: W,
      h: 20,
      label: `${fmt(CONTEXT.total)} tokens in, ${TURNS.replyTokens} out; recent turns hold only the words the caller heard`,
      tone: "neutral",
      step: 2,
      quiet: true,
    },
    {
      id: "foot-2",
      type: "text",
      x: X,
      y: FOOT_Y + 22,
      w: W,
      h: 20,
      label: `One mid-size call with the cache: ${COST.mid.toFixed(5)} USD; evidence comes only on help questions (${fmt(CONTEXT.blocks.find((b) => b.id === "evidence")?.tokens ?? 0)} on average)`,
      tone: "neutral",
      step: 2,
      quiet: true,
    },
  ],
};

export default spec;
