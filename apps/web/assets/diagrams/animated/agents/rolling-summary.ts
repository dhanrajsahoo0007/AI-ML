import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, contextBar, type ContextSegment } from "@/components/diagrams/presets/agents";
import { ROLLING, ROLLING_SAVING } from "@/components/diagrams/presets/agents-summary";

// The rolling summary on memory-summarization-compression (Core concepts, the hero): the history slot of a 40-turn
// Brightpost support thread, drawn to one scale (all 40 turns raw = 4,800 illustrative tokens = 700 units wide).
// Rule: when the raw turns reach 25, fold the oldest 15 into the running summary and keep the newest 10.
// - Step 1, turn 25: turns 1–15 (1,800) + 16–25 (1,200) = 3,000 tokens, the trigger (a tick above the bar).
// - Step 2, pass 1: turns 1–15 become S1, 300 tokens (ringed); turns 16–25 stay raw: 1,500.
// - Step 3, turn 40: S1 300 + turns 16–30 1,800 + 31–40 1,200 = 3,300, past the trigger again.
// - Step 4, pass 2: S1 and turns 16–30 become S2, 350 tokens (ringed); turns 31–40 stay raw: 1,550.
// - Step 5, without a summary: all 40 turns, 4,800 tokens. Turn 40 costs 68 % less with the summary.
//
// Layout: a label block on the left (x 16, 136 wide) and the bars from x 160, 700 wide; rows at y 40 + 104 × i. Bars
// are as long as their tokens (no free space drawn): the history slot, not the whole window.
//
// Colour (agents legend, two tones plus neutral): raw turns orange (history), summaries violet (memory), labels and
// the scale neutral.

const X = 160;
const W = 700;
const total = ROLLING.raw;
const fmt = (n: number) => n.toLocaleString("en-GB");
const rowY = (i: number) => 40 + 104 * i;

const turns = (range: string, n: number, step: number): ContextSegment => ({
  kind: "history",
  tokens: n,
  label: `Turns ${range}`,
  step,
});

const bar = (i: number, segments: ContextSegment[]) =>
  contextBar(`b${i + 1}`, X, rowY(i), segments, { total, w: W, free: false, step: i + 1 });

const bars = [
  bar(0, [turns(ROLLING.pass1.folds, ROLLING.block, 1), turns(ROLLING.pass1.kept, ROLLING.pass1.keptTokens, 1)]),
  bar(1, [
    { kind: "memory", tokens: ROLLING.s1, label: "S1", highlight: true, step: 2 },
    turns(ROLLING.pass1.kept, ROLLING.pass1.keptTokens, 2),
  ]),
  bar(2, [
    { kind: "memory", tokens: ROLLING.s1, label: "S1", step: 3 },
    turns(ROLLING.pass2.folds, ROLLING.block, 3),
    turns(ROLLING.pass2.kept, ROLLING.pass2.keptTokens, 3),
  ]),
  bar(3, [
    { kind: "memory", tokens: ROLLING.s2, label: "S2", highlight: true, step: 4 },
    turns(ROLLING.pass2.kept, ROLLING.pass2.keptTokens, 4),
  ]),
  bar(4, [turns(`1–${ROLLING.turns}`, ROLLING.raw, 5)]),
];

const label = (i: number, text: string): LayoutShape => ({
  id: `l${i + 1}`,
  type: "text",
  x: 16,
  y: rowY(i),
  w: 136,
  h: 44,
  label: text,
  tone: AGENT_TONE.infra,
  step: i + 1,
});

// Trigger ticks: above the turn-25 and turn-40 bars, at the end of the 25th raw turn (3,000 and 3,300 tokens).
const tickX = (tokensAt: number) => Math.round(X + (tokensAt / total) * W);
const tick = (i: number, tokensAt: number): LayoutShape[] => [
  {
    id: `trigger-${i}-t`,
    type: "text",
    x: tickX(tokensAt) + 6,
    y: rowY(i) - 30,
    w: 170,
    h: 18,
    label: `fold at ${ROLLING.triggerTurns} raw turns`,
    tone: AGENT_TONE.infra,
    step: i + 1,
  },
  {
    id: `trigger-${i}`,
    type: "arrow",
    x: tickX(tokensAt),
    y: rowY(i) - 32,
    w: 0,
    h: 28,
    dashed: true,
    step: i + 1,
  },
];

const scaleY = rowY(4) + 44 + 22;

const spec: LayoutSpec = {
  kind: "layout",
  title: "A rolling summary: old turns are folded into a running summary",
  width: 880,
  height: scaleY + 30,
  steps: [
    { title: `Turn ${ROLLING.pass1.at}: ${ROLLING.triggerTurns} raw turns, ${fmt(ROLLING.trigger)} tokens` },
    { title: `Pass 1: turns ${ROLLING.pass1.folds} become S1, ${ROLLING.s1} tokens` },
    { title: `Turn ${ROLLING.pass2.at}: ${ROLLING.triggerTurns} raw turns again` },
    { title: `Pass 2: S1 and turns ${ROLLING.pass2.folds} become S2, ${ROLLING.s2} tokens` },
    { title: `Without a summary: ${fmt(ROLLING.raw)} tokens; the summary saves ${ROLLING_SAVING.pct} %` },
  ],
  shapes: [
    label(0, `Turn ${ROLLING.pass1.at}\n${fmt(ROLLING.trigger)} tokens`),
    ...bars[0].shapes,
    ...tick(0, ROLLING.trigger),
    label(1, `After pass 1\n${fmt(ROLLING.afterPass1)} tokens`),
    ...bars[1].shapes,
    label(2, `Turn ${ROLLING.pass2.at}\n${fmt(ROLLING.beforePass2)} tokens`),
    ...bars[2].shapes,
    ...tick(2, ROLLING.beforePass2),
    label(3, `After pass 2\n${fmt(ROLLING.afterPass2)} tokens`),
    ...bars[3].shapes,
    label(4, `No summary\n${fmt(ROLLING.raw)} tokens`),
    ...bars[4].shapes,
    {
      id: "scale",
      type: "arrow",
      x: X,
      y: scaleY,
      w: W,
      h: 0,
      head: false,
      label: `${fmt(ROLLING.raw)} tokens = ${ROLLING.turns} turns × ${ROLLING.turnTokens} (illustrative)`,
    },
  ],
};

export default spec;
