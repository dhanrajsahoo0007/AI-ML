import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { contextBar, type ContextKind, type ContextSegment } from "@/components/diagrams/presets/agents";
import { REQUEST_LAYOUT as RL } from "@/components/diagrams/presets/gcase-gateway";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { fmt } from "@/components/diagrams/presets/rag";

// What the gateway may touch in the support agent's first call (llm-platform-gateway, design sheet §11; preset
// REQUEST_LAYOUT in presets/gcase-gateway.ts, blocks from gcase-support CONTEXT), in the order the Anthropic API caches
// them (tools → system → messages):
//   tool definitions 1,000 + instructions 1,200 + procedure 500 = 2,700 stable, ending at the cache breakpoint (above
//   the 512-token minimum): passed through or untouched;
//   case state 400 + evidence 1,000 (2,000 on half of calls) + recent turns 600 + tool results 250 + new message 50 =
//   2,300 changing: regex + the conversation dictionary; the name scanner reads only the new message (50 tokens ≈ 200
//   characters of ≈ 20,000), pre-scanned during support's case load.
// Two steps: 1 the stable prefix, untouched · 2 the changing blocks and what the gateway does to each.
// Layout (880 wide): contextBar() from presets/agents.ts at x 30, 820 wide; brackets above; under the bar, one row a
// block (label, tokens, the gateway's action), the stable rows in step 1 and the changing rows in step 2; a footer.
// Colours (the agents context legend): instructions and procedure neutral, tools teal, case state violet, evidence and
// tool results blue, turns and the new message orange; the breakpoint mark violet (a cache); action text neutral.

const X = 30;
const W = 820;
const BAR_Y = 64;
const BAR_H = 46;

const KIND: Record<(typeof RL.blocks)[number]["id"], ContextKind> = {
  tools: "tools",
  instructions: "instructions",
  procedure: "instructions",
  case: "memory",
  evidence: "files",
  turns: "history",
  "tool-results": "results",
  message: "task",
};

const segments: ContextSegment[] = RL.blocks.map((b) => ({
  kind: KIND[b.id],
  label: b.label,
  tokens: b.tokens,
  step: b.stable ? 1 : 2,
  highlight: b.id === "message",
}));

const bar = contextBar("ctx", X, BAR_Y, segments, { total: RL.total, w: W, h: BAR_H });
const xAt = (tokens: number) => X + Math.round((tokens / RL.total) * W);

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

// The cache breakpoint: a violet tick through the bar at 2,700 tokens.
const BP_X = xAt(RL.stable);
const breakpoint: LayoutShape[] = [
  {
    id: "bp",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [BP_X, BAR_Y - 4],
      [BP_X, BAR_Y + BAR_H + 4],
    ],
    tone: GENAI_TONE.store,
    step: 1,
  },
];

// One row a block under the bar, as a two-column table: a chip in the block's tone (label and tokens) and the
// gateway's action in a neutral cell beside it.
const LIST_Y = BAR_Y + bar.height + 24;
const ROW_H = 26;
const CHIP_W = 190;
const ACT_X = X + CHIP_W + 10;
const ACT_W = W - CHIP_W - 10;
const TONE_OF: Record<ContextKind, LayoutTone> = {
  tools: "teal",
  instructions: "neutral",
  memory: "violet",
  files: "blue",
  history: "orange",
  results: "blue",
  task: "orange",
  free: "neutral",
};
const rows: LayoutShape[] = RL.blocks.flatMap((b, i): LayoutShape[] => {
  const y = LIST_Y + i * ROW_H;
  const step = b.stable ? 1 : 2;
  const ner = b.id === "message";
  return [
    {
      id: `chip-${b.id}`,
      type: "cell",
      x: X,
      y,
      w: CHIP_W,
      h: 22,
      label: `${b.label} · ${fmt(b.tokens)}`,
      tone: TONE_OF[KIND[b.id]],
      fill: "pastel",
      step,
      quiet: true,
    },
    {
      id: `row-${b.id}`,
      type: "cell",
      x: ACT_X,
      y,
      w: ACT_W,
      h: 22,
      label: b.action,
      tone: ner ? GENAI_TONE.check : "neutral",
      fill: ner ? "pastel" : "soft",
      step,
      quiet: !ner,
    },
  ];
});

const FOOT_Y = LIST_Y + RL.blocks.length * ROW_H + 20;

const spec: LayoutSpec = {
  kind: "layout",
  title: `The support call as the gateway sees it: ${fmt(RL.stable)} cached tokens untouched, ${fmt(RL.changing)} redacted`,
  width: 880,
  height: FOOT_Y + 46,
  steps: [
    { title: `The stable prefix: ${fmt(RL.stable)} tokens, untouched, ending at the cache breakpoint` },
    { title: `The changing blocks: ${fmt(RL.changing)} tokens through regex and the dictionary` },
  ],
  shapes: [
    ...bracket("stable", 0, RL.stable, `Cached prefix, never touched: ${fmt(RL.stable)}`, 1),
    ...bracket("changing", RL.stable, RL.total, `Redacted every call: ${fmt(RL.changing)}`, 2),
    // The new message's 50-token sliver is too narrow for a label and the packed label would run off the canvas: its
    // row below names it.
    ...bar.shapes.filter((sh) => sh.id !== `ctx-${RL.blocks.length - 1}-t`).map((sh) => ({ ...sh, quiet: true })),
    ...breakpoint,
    ...rows,
    {
      id: "foot-1",
      type: "text",
      x: X,
      y: FOOT_Y,
      w: W,
      h: 20,
      label: `The name scanner reads ${fmt(RL.nerTokens)} tokens (≈ ${fmt(RL.nerChars)} characters) of ${fmt(RL.total)} (≈ ${fmt(RL.bytes)}); the rest is exact-match work, ≈ 0.1 ms`,
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
      label: `The gateway adds nothing to the prompt: the same text gives the same bytes on every replica`,
      tone: "neutral",
      step: 2,
      quiet: true,
    },
  ],
};

export default spec;
