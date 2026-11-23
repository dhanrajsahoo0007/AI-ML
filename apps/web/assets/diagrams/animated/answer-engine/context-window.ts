import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { contextBar, type ContextKind, type ContextSegment } from "@/components/diagrams/presets/agents";
import { CONTEXT, PRICES, QUICK_COST } from "@/components/diagrams/presets/gcase-answer";
import { fmt } from "@/components/diagrams/presets/rag";

// The answer engine's context window: one quick-answer call (design sheet §11). Six blocks from CONTEXT in
// presets/gcase-answer.ts, in prompt order (stable first, so the provider can cache them):
//   instructions 800 + output format and examples 400                                     = 1,200 stable (≥ 512, cached)
//   thread summary 105 (300 on follow-ups × 0.349 of answered questions) + question and planner notes 100
//   + 12 span headers × 25 = 300 + 12 spans × 200 = 2,400                                 = 2,905 changing
//   total CONTEXT.total = 4,105 tokens; output 300 (12 sentences of 25).
// The whole prompt is written to the 5-minute cache on the first call so a restart reads it back (sheet §5):
//   mid-size 1,200 × 0.10 + 2,905 × 2.50 + 300 × 10.00 per million = QUICK_COST.mid ≈ 0.0104 USD;
//   a restart reads 4,105 cached + 150 shown tokens fresh = QUICK_COST.restartMid ≈ 0.0007 USD.
// Spans, not pages: CONTEXT.spansWithHeaders 2,700 against 8 pages × 2,000 = 16,000 (CONTEXT.wholePagesTokens).
// Two steps: 1 the stable prefix with its "cached" bracket · 2 the changing blocks with theirs and the cost lines.
// Layout (880 wide): contextBar() from presets/agents.ts at x 30, 800 wide (0.195 px a token), brackets above, labels
// of narrow blocks below, three footer lines.
// Colours (the agents context legend): instructions and format neutral, thread summary and question orange (the
// user's words), span headers and spans blue (retrieved text).

const X = 30;
const W = 800;
const BAR_Y = 62;
const BAR_H = 50;

const KIND: Record<(typeof CONTEXT.blocks)[number]["id"], { kind: ContextKind; label: string }> = {
  instructions: { kind: "instructions", label: "Instructions and rules" },
  format: { kind: "instructions", label: "Format" },
  thread: { kind: "history", label: "Thread" },
  question: { kind: "task", label: "Question" },
  headers: { kind: "files", label: "Headers" },
  spans: { kind: "files", label: "12 spans, ranked" },
};

const segments: ContextSegment[] = CONTEXT.blocks.map((b) => ({
  kind: KIND[b.id].kind,
  label: KIND[b.id].label,
  tokens: b.tokens,
  step: b.stable ? 1 : 2,
}));

const bar = contextBar("ctx", X, BAR_Y, segments, { total: CONTEXT.total, w: W, h: BAR_H, free: false });

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

const usd = (v: number, d = 4) => v.toFixed(d);
const FOOT_Y = BAR_Y + bar.height + 22;
const foot = (id: string, y: number, label: string): LayoutShape => ({
  id,
  type: "text",
  x: X,
  y,
  w: W,
  h: 20,
  label,
  tone: "neutral",
  step: 2,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "One quick answer's context: 4,105 tokens, the first 1,200 stable and cached, 12 ranked spans",
  width: 880,
  height: FOOT_Y + 74,
  steps: [
    { title: `Stable prefix: ${fmt(CONTEXT.stable)} tokens, cached` },
    { title: `Changing blocks: ${fmt(CONTEXT.changing)} tokens, written to the cache for restarts` },
  ],
  shapes: [
    ...bracket("stable", 0, CONTEXT.stable, `Stable, cached: ${fmt(CONTEXT.stable)}`, 1),
    ...bracket("changing", CONTEXT.stable, CONTEXT.total, `Changing every question: ${fmt(CONTEXT.changing)}`, 2),
    ...bar.shapes,
    foot(
      "foot-1",
      FOOT_Y,
      `${fmt(CONTEXT.total)} tokens in, ${CONTEXT.outputTokens} out (${CONTEXT.sentences} sentences of ${CONTEXT.sentenceTokens}). Spans: 12 × 25 + 12 × 200 = ${fmt(CONTEXT.spansWithHeaders)}, not 8 pages = ${fmt(CONTEXT.wholePagesTokens)}.`
    ),
    foot(
      "foot-2",
      FOOT_Y + 22,
      `Mid-size: ${fmt(CONTEXT.stable)} × ${PRICES.mid.cached.toFixed(2)} + ${fmt(CONTEXT.changing)} × ${PRICES.mid.cacheWrite.toFixed(2)} + ${CONTEXT.outputTokens} × ${PRICES.mid.output.toFixed(2)} per million = ${usd(QUICK_COST.mid)} USD; a restart ≈ ${usd(QUICK_COST.restartMid)} USD.`
    ),
    foot("foot-3", FOOT_Y + 44, "Spans are ordered strongest first and last, where the model attends best."),
  ],
};

export default spec;
