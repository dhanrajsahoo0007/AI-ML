import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { contextBar, type ContextSegment } from "@/components/diagrams/presets/agents";
import { CONTEXT, COST, PRICES, TOOLS } from "@/components/diagrams/presets/gcase-enterprise";
import { fmt } from "@/components/diagrams/presets/rag";

// The enterprise assistant's context windows (design sheet §11), on one token scale. Blocks from CONTEXT and TOOLS in
// presets/gcase-enterprise.ts, in prompt order (stable first, so the provider caches them for every user):
//   Answer call: instructions 1,200 + tool-use system prompt 286 (added whenever tools are present) + core tools 2,000
//     = CONTEXT.stable 3,486 cached; turn state 870 (memory 200 + summary and last 2 turns 600 + question and router
//     notes 70) + 8 sources 3,520 (headers 8 × 40 + chunks 8 × 400) = 4,390 changing; CONTEXT.total = 7,876.
//     Cost COST.answer = 3,486 × 0.10 + 4,390 × 2.00 + 250 × 10.00 per million = 0.0116 USD; uncached
//     COST.uncachedAnswer = 0.0183, so the cache saves 36%.
//   Lookup or write call: the same 3,486 + one connector's tools (106 ÷ 9 × 600 = TOOLS.bundleTokens 7,067)
//     = TOOLS.bundlePrefix 10,553 cached, built per entitlement class (TOOLS.variants = 31 prefixes, never per user)
//     + turn state 870 = 11,423. All 106 tools would make the prefix TOOLS.allLoaded = 67,086.
// The sheet's eight answer blocks are drawn as five: memory, conversation and question are one "turn state" block
// (CONTEXT.turnState), headers and chunks one "8 sources" block (CONTEXT.evidence); a footer gives the parts.
// Steps: 1 the answer call's cached prefix · 2 its changing blocks and cost · 3 the lookup or write call.
// Layout (880 wide): two contextBar() rows from presets/agents.ts at x 30 on one scale, 820 px for 11,423 tokens
// (0.0718 px a token), brackets above each bar, the tool prompt's label below its sliver, footers under each bar.
// Colours (the agents context legend): instructions and tool prompt neutral, tool definitions teal, turn state orange
// (the user's words), sources blue (retrieved text).

const X = 30;
const BAR_H = 44;
const lookupTotal = TOOLS.bundlePrefix + CONTEXT.turnState; // 11,423
const PX_PER_TOKEN = 820 / lookupTotal;
const wOf = (tokens: number) => Math.round(tokens * PX_PER_TOKEN);
const block = (id: string) => CONTEXT.blocks.find((b) => b.id === id)?.tokens ?? 0;

const answer: ContextSegment[] = [
  { kind: "instructions", label: "Instructions", tokens: block("instructions"), step: 1 },
  { kind: "instructions", label: "Tool prompt", tokens: block("tool-prompt"), step: 1 },
  { kind: "tools", label: "Core tools", tokens: block("core-tools"), step: 1 },
  { kind: "history", label: "Turn state", tokens: CONTEXT.turnState, step: 2 },
  { kind: "files", label: "8 sources", tokens: CONTEXT.evidence, step: 2 },
];
const lookup: ContextSegment[] = [
  { kind: "instructions", label: "Instructions", tokens: block("instructions"), step: 3 },
  { kind: "instructions", label: "Tool prompt", tokens: block("tool-prompt"), step: 3 },
  { kind: "tools", label: "Core tools", tokens: block("core-tools"), step: 3 },
  { kind: "tools", label: "One connector's tools", tokens: TOOLS.bundleTokens, step: 3 },
  { kind: "history", label: "Turn", tokens: CONTEXT.turnState, step: 3 },
];

const Y1 = 74;
const bar1 = contextBar("a", X, Y1, answer, { total: CONTEXT.total, w: wOf(CONTEXT.total), h: BAR_H, free: false });
const F1 = Y1 + bar1.height + 14;
const H2 = F1 + 2 * 22 + 22;
const Y2 = H2 + 66;
const bar2 = contextBar("l", X, Y2, lookup, { total: lookupTotal, w: wOf(lookupTotal), h: BAR_H, free: false });
const F2 = Y2 + bar2.height + 14;

const bracket = (id: string, barY: number, from: number, to: number, label: string, step: number): LayoutShape[] => {
  const x1 = X + wOf(from) + 2;
  const x2 = X + wOf(to) - 2;
  const y = barY - 10;
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
const text = (id: string, y: number, label: string, step: number, w = 820): LayoutShape => ({
  id,
  type: "text",
  x: X,
  y,
  w,
  h: 20,
  label,
  tone: "neutral",
  step,
});

const usd = (v: number) => v.toFixed(4);
const saving = Math.round((1 - COST.answer / COST.uncachedAnswer) * 100); // 36%

const spec: LayoutSpec = {
  kind: "layout",
  title: `Context windows: an answer call of ${fmt(CONTEXT.total)} tokens, ${fmt(CONTEXT.stable)} cached; a lookup or write call with one connector's tools cached`,
  width: 880,
  height: F2 + 2 * 22 + 8,
  steps: [
    { title: `Answer call: the ${fmt(CONTEXT.stable)}-token prefix is shared and cached` },
    { title: `Answer call: ${fmt(CONTEXT.changing)} tokens change every turn` },
    { title: `Lookup or write call: one connector's tools, ${fmt(TOOLS.bundlePrefix)} tokens cached` },
  ],
  // Texts and the repeated stable cells of the second bar are quiet: the new cells carry the step's ring.
  shapes: [
    text("h1", 6, `Answer call (65% of turns): ${fmt(CONTEXT.total)} tokens in, ${CONTEXT.answerOut} out`, 1),
    ...bracket("a-stable", Y1, 0, CONTEXT.stable, `Cached, same for everyone: ${fmt(CONTEXT.stable)}`, 1),
    ...bracket("a-changing", Y1, CONTEXT.stable, CONTEXT.total, `Changing: ${fmt(CONTEXT.changing)}`, 2),
    ...bar1.shapes,
    text(
      "f1",
      F1,
      `Turn state ${fmt(CONTEXT.turnState)} = memory 200 + summary and last 2 turns 600 + question 70; sources = 8 headers 320 + 8 chunks 3,200.`,
      2
    ),
    text(
      "f2",
      F1 + 22,
      `${fmt(CONTEXT.stable)} × ${PRICES.mid.cached.toFixed(2)} + ${fmt(CONTEXT.changing)} × ${PRICES.mid.input.toFixed(2)} + ${CONTEXT.answerOut} × ${PRICES.mid.output.toFixed(2)} per million = ${usd(COST.answer)} USD; uncached ${usd(COST.uncachedAnswer)}: the cache saves ${saving}%.`,
      2
    ),
    text("h2", H2, `Lookup or write call (23% of turns): ${fmt(lookupTotal)} tokens in, same scale`, 3),
    ...bracket(
      "l-stable",
      Y2,
      0,
      TOOLS.bundlePrefix,
      `Cached per entitlement class: ${fmt(TOOLS.bundlePrefix)} (${TOOLS.variants} prefixes)`,
      3
    ),
    ...bracket("l-turn", Y2, TOOLS.bundlePrefix, lookupTotal, "New", 3),
    ...bar2.shapes,
    text(
      "f3",
      F2,
      `One connector's tools: ${TOOLS.count} ÷ ${TOOLS.connectors.length} × ${TOOLS.tokensPerTool} = ${fmt(TOOLS.bundleTokens)} tokens. All ${TOOLS.count} tools would make the prefix ${fmt(TOOLS.allLoaded)}.`,
      3
    ),
    text(
      "f4",
      F2 + 22,
      "Bundles are built per entitlement class, never per user, so prefixes stay shared; the gateway refuses the rest.",
      3
    ),
  ].map((sh): LayoutShape =>
    sh.type === "text" || ["l-0", "l-1", "l-2"].includes(sh.id) ? { ...sh, quiet: true } : sh
  ),
};

export default spec;
