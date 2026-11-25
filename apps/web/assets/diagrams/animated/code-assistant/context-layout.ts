import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { contextBar, type ContextKind, type ContextSegment } from "@/components/diagrams/presets/agents";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { AGENT, CHAT, COMPLETION_CONTEXT as CC } from "@/components/diagrams/presets/gcase-code";

// Three context layouts, one per path (code-assistant, design sheet §11; preset COMPLETION_CONTEXT, CHAT and AGENT in
// presets/gcase-code.ts). Stable blocks first in every path, so the cache keeps the longest prefix:
//   Completion, 2,000 tokens: path and language 50 + signatures from the language server 200 + snippets from open tabs
//     350 + recent edits 150 (frozen, refreshed every 30 s: 750) + code before the cursor 950 (cached up to the last
//     request; ≈ 10 new a request) + code after the cursor 300 (recomputed: PSM order). New tokens: 10 + 300 = 310
//     between refreshes, 1,750 on a refresh (1 in 8): 7/8 × 310 + 1/8 × 1,750 = CC.newAvg = 490; reused 1,510.
//   Chat turn 1, 12,000 tokens: instructions and tools 3,200 + repo rules 800 (prompt cache: CHAT.cached = 4,000; 30% of
//     turns miss after 5 minutes idle) + open file 2,000 + retrieved code 5,400 (35 reranked) + question 600 (not
//     cached: 8,000).
//   Agent step 1, 5,300 tokens: instructions with the root AGENTS.md 2,000 + tools 1,500 (hot prefix: 3,500) + task 300
//     + repo map 1,500; + 2,500 a step → 52,800 at step 20 (the median task: AGENT.main.avgContext = 29,050 on
//     average), compacted at 100,000 into a 3,000-token summary and a 2,000-token file-state list.
// Steps: 1 completion · 2 chat · 3 agent (its first step, then its growth on a 100,000-token scale).
// Layout (880 wide): contextBar() from presets/agents.ts at x 30, 820 wide, one bar per path, each on its own token
// scale (said in its heading); brackets above a bar mark what is cached; a line of working under it.
// Colours (the agents context legend): instructions neutral, tools teal, code the model reads (signatures, snippets,
// open file, retrieved code, repo map) blue, what the developer is doing (edits, prefix, suffix, question, task)
// orange; brackets: cached violet (a cache), recomputed or uncached neutral.

const X = 30;
const W = 820;
const BAR_H = 40;
/** A block: heading at its top, bracket labels 34 below, the bar 62 below. */
const BAR_OFF = 62;

type Block = { kind: ContextKind; label: string; tokens: number };
const seg = (b: Block, step: number, highlight = false): ContextSegment => ({ ...b, step, highlight });

const KIND_CC: Record<(typeof CC.blocks)[number]["id"], ContextKind> = {
  header: "instructions",
  lsp: "files",
  snippets: "files",
  edits: "history",
  prefix: "task",
  suffix: "task",
};
const SHORT_CC: Partial<Record<(typeof CC.blocks)[number]["id"], string>> = {
  header: "Path",
  lsp: "Signatures",
  snippets: "Snippets",
  edits: "Edits",
  prefix: "Code before the cursor",
  suffix: "After the cursor",
};
const KIND_CHAT: Record<(typeof CHAT.blocks)[number]["id"], ContextKind> = {
  instructions: "instructions",
  rules: "instructions",
  "open-file": "files",
  retrieved: "files",
  question: "task",
};
const SHORT_CHAT: Partial<Record<(typeof CHAT.blocks)[number]["id"], string>> = { question: "Question" };
const KIND_AGENT: Record<(typeof AGENT.step1)[number]["id"], ContextKind> = {
  instructions: "instructions",
  tools: "tools",
  task: "task",
  "repo-map": "files",
};

/** A line of text, left-aligned at x 30 (a text shape centres its label in its box, so the box hugs the label). */
const text = (id: string, y: number, label: string, step: number, quiet = true): LayoutShape => ({
  id,
  type: "text",
  x: X,
  y,
  w: Math.min(W, Math.ceil(label.length * 6.5) + 6),
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
  quiet,
});

/** A bracket over tokens [from, to) of a bar drawn at y, labelled above it. */
const bracket = (
  id: string,
  y: number,
  total: number,
  from: number,
  to: number,
  label: string,
  step: number,
  cached: boolean
): LayoutShape[] => {
  const xAt = (t: number) => X + Math.round((t / total) * W);
  const x1 = xAt(from) + 2;
  const x2 = xAt(to) - 2;
  const by = y - 8;
  const tone = cached ? GENAI_TONE.store : PROD_TONE.infra;
  return [
    {
      id,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x1, by + 6],
        [x1, by],
        [x2, by],
        [x2, by + 6],
      ],
      tone,
      step,
    },
    { id: `${id}-t`, type: "text", x: x1, y: by - 20, w: x2 - x1, h: 18, label, tone, step, quiet: true },
  ];
};

// ── Step 1: completion ───────────────────────────────────────────────────────────────────────────────────────────
const frozen = CC.total - 950 - 300; // 750
const Y1 = 4;
const bar1 = contextBar(
  "cc",
  X,
  Y1 + BAR_OFF,
  CC.blocks.map((b) => seg({ kind: KIND_CC[b.id], label: SHORT_CC[b.id] ?? b.label, tokens: b.tokens }, 1)),
  { total: CC.total, w: W, h: BAR_H, step: 1 }
);
const step1: LayoutShape[] = [
  text("h1", Y1, `Completion: ${n(CC.total)} tokens (bar = ${n(CC.total)}), stable blocks first`, 1, false),
  ...bracket("cc-frozen", Y1 + BAR_OFF, CC.total, 0, frozen, `Frozen 30 s: ${n(frozen)}`, 1, true),
  ...bracket("cc-prefix", Y1 + BAR_OFF, CC.total, frozen, frozen + 950, "Cached to the last request", 1, true),
  ...bracket("cc-suffix", Y1 + BAR_OFF, CC.total, frozen + 950, CC.total, "Recomputed", 1, false),
  ...bar1.shapes.map((sh) => ({ ...sh, quiet: true })),
  text(
    "cc-new",
    Y1 + BAR_OFF + bar1.height + 8,
    `New a request: ${n(CC.newSteady)} between refreshes, ${n(CC.newOnRefresh)} on a refresh (1 in 8) → ${n(CC.newAvg)} on average; ${n(CC.reusedAvg)} reused from the KV prefix`,
    1
  ),
];
const END1 = Y1 + BAR_OFF + bar1.height + 30;

// ── Step 2: chat ─────────────────────────────────────────────────────────────────────────────────────────────────
const Y2 = END1 + 22;
const bar2 = contextBar(
  "ch",
  X,
  Y2 + BAR_OFF,
  CHAT.blocks.map((b) => seg({ kind: KIND_CHAT[b.id], label: SHORT_CHAT[b.id] ?? b.label, tokens: b.tokens }, 2)),
  { total: CHAT.total, w: W, h: BAR_H, step: 2 }
);
const step2: LayoutShape[] = [
  text("h2", Y2, `Chat, turn 1: ${n(CHAT.total)} tokens (bar = ${n(CHAT.total)})`, 2, false),
  ...bracket(
    "ch-cached",
    Y2 + BAR_OFF,
    CHAT.total,
    0,
    CHAT.cached,
    `Prompt cache: ${n(CHAT.cached)} (${Math.round(CHAT.missShare * 100)}% of turns miss)`,
    2,
    true
  ),
  ...bracket("ch-new", Y2 + BAR_OFF, CHAT.total, CHAT.cached, CHAT.total, `Not cached: ${n(CHAT.uncached)}`, 2, false),
  ...bar2.shapes.map((sh) => ({ ...sh, quiet: true })),
  text(
    "ch-note",
    Y2 + BAR_OFF + bar2.height + 8,
    `Retrieved code: local grep and symbols (vectors only in the arm), fused, 35 reranked; repo rules only from trusted repositories`,
    2
  ),
];
const END2 = Y2 + BAR_OFF + bar2.height + 30;

// ── Step 3: agent ────────────────────────────────────────────────────────────────────────────────────────────────
const Y3 = END2 + 22;
const bar3 = contextBar(
  "ag",
  X,
  Y3 + BAR_OFF,
  AGENT.step1.map((b) => seg({ kind: KIND_AGENT[b.id], label: b.label, tokens: b.tokens }, 3)),
  { total: AGENT.start, w: W, h: BAR_H, step: 3 }
);
const GROW_Y = Y3 + BAR_OFF + bar3.height + 52;
const at20 = AGENT.start + 19 * AGENT.growth; // 52,800
const bar4 = contextBar(
  "gr",
  X,
  GROW_Y,
  [
    { kind: "instructions", label: "Step 1", tokens: AGENT.start, step: 3 },
    {
      kind: "results",
      label: `+${n(AGENT.growth)} a step: ${n(at20)} at step 20`,
      tokens: at20 - AGENT.start,
      step: 3,
    },
  ],
  { total: AGENT.compactAt, w: W, h: 30, step: 3 }
);
const step3: LayoutShape[] = [
  text("h3", Y3, `Agent, step 1: ${n(AGENT.start)} tokens (bar = ${n(AGENT.start)})`, 3, false),
  ...bracket("ag-hot", Y3 + BAR_OFF, AGENT.start, 0, AGENT.startCached, `Hot prefix: ${n(AGENT.startCached)}`, 3, true),
  ...bracket(
    "ag-later",
    Y3 + BAR_OFF,
    AGENT.start,
    AGENT.startCached,
    AGENT.start,
    `Cached from step 2: ${n(AGENT.start - AGENT.startCached)}`,
    3,
    true
  ),
  ...bar3.shapes.map((sh) => ({ ...sh, quiet: true })),
  text(
    "gr-h",
    GROW_Y - 24,
    `The same task over 20 steps, on a ${n(AGENT.compactAt)}-token scale (the compaction point)`,
    3
  ),
  ...bar4.shapes.map((sh) => ({ ...sh, quiet: true })),
  text(
    "gr-note",
    GROW_Y + bar4.height + 8,
    `Average ${n(AGENT.main.avgContext)} over the median task; at ${n(AGENT.compactAt)} it compacts to a 3,000-token summary + a 2,000-token file list`,
    3
  ),
];
const END3 = GROW_Y + bar4.height + 30;

const spec: LayoutSpec = {
  kind: "layout",
  title: `Three context layouts: ${n(CC.total)} tokens a completion, ${n(CHAT.total)} a chat turn, ${n(AGENT.start)} at an agent's first step`,
  width: 880,
  height: END3 + 8,
  steps: [
    { title: `Completion: ${n(CC.total)} tokens, ${n(CC.newAvg)} new a request on average` },
    { title: `Chat: ${n(CHAT.total)} tokens, ${n(CHAT.cached)} from the prompt cache` },
    { title: `Agent: ${n(AGENT.start)} at step 1, + ${n(AGENT.growth)} a step, compacted at ${n(AGENT.compactAt)}` },
  ],
  shapes: [...step1, ...step2, ...step3],
};

export default spec;
