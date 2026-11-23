import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { contextBar, type ContextKind, type ContextSegment } from "@/components/diagrams/presets/agents";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { BLOCKS, CAPACITY, TURN50 } from "@/components/diagrams/presets/gcase-chat";

// What the model reads on turn 50 of one long chat (chatgpt-style-chat-service, design sheet §11 and deep dive 1;
// preset TURN50, BLOCKS, CAPACITY in presets/gcase-chat.ts). Every block size is illustrative.
//   Step 1: TURN50.total = 14,150 tokens, in prompt order, most shared first: system prompt and tool definitions
//     2,500 (every user of this prompt version) · user header 700 (custom instructions 150 + 20 memories × 25 + profile
//     50: this user, fixed for the conversation) · summary of turns 1–40, 1,500 · turns 41–49 word for word 5,400 ·
//     search results from turn 47, 2,000 · file chunks from turn 44, 1,600 (this conversation) · recall 300 and the
//     message 150 (new). On a prefix hit TURN50.cachedIfHit = 13,700 are read from cache and 450 computed.
//   Step 2: the same chat kept whole is TURN50.naive = 60,050 (TURN50.ratio ≈ 4.2×). TURN50.causes splits the 45,900
//     removed: folding turns into the summary 22,500 (29,400 → 6,900), tool results living only until their turn folds
//     10,000 (12,000 → 2,000), the file as chunks 13,400 (15,000 → 1,600). Turn 100: CAPACITY.printed.turn100 = 16,006
//     against 96,550; kept whole, the chat passes a 200K window at turn 211.
//   Step 3: the fold after turn 56 (BLOCKS.rawLimit 16, foldSize 8). Assumes no search or file in turns 50–56, so the
//     arithmetic stays on this chat: turn 56 reads 2,500 + 700 + 1,500 + 15 × 600 + 2,000 + 1,600 + 300 + 150 = 17,750
//     (append-only since turn 50: it hits); after it a background job folds turns 41–48 into the summary (1,500 →
//     1,800; search 47 and file 44 fold with their turns) and pre-fills 1,800 + 8 × 600 = 6,600 tokens on the home
//     unit; turn 57 reads 2,500 + 700 + 1,800 + 4,800 + 300 + 150 = 10,250 and hits. Across all chats a fold computes
//     CAPACITY.cache.pCompaction ≈ 9,300 tokens in the background (× 18/17 for chats that never return).
// Layout (880 wide): contextBar() from presets/agents.ts. Step 1 bar 820 px for 14,150 tokens, cache-scope brackets on
// two tiers above it; step 2 one 820 px bar for 60,050 (the window and the three removed parts); step 3 two bars on one
// scale (820 px for turn 56's 17,750).
// Colours (the agents context legend): system prompt neutral, user header and recall violet (memory), summary,
// raw turns and the message orange (the user's conversation), search results and file chunks blue (retrieved text).
// Removed parts in step 2 are soft fills; the kept window is pastel.

const X = 30;
const W = 820;
const BAR_H = 46;

const KIND: Record<(typeof TURN50.blocks)[number]["id"], { kind: ContextKind; label: string }> = {
  system: { kind: "instructions", label: "System prompt" },
  header: { kind: "memory", label: "User header" },
  summary: { kind: "history", label: "Summary 1–40" },
  recent: { kind: "history", label: "Turns 41–49 word for word" },
  search: { kind: "results", label: "Search, turn 47" },
  file: { kind: "files", label: "File chunks" },
  recall: { kind: "memory", label: "Recall" },
  message: { kind: "task", label: "Message" },
};

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra,
  quiet = true
): LayoutShape => ({ id, type: "text", x, y, w, h: 18, label, tone, step, quiet });

/**
 * contextBar() packs the labels of narrow blocks left to right under the bar; the last ones can run off the right edge.
 * Move any that would onto a second row, right-aligned, and return the extra height.
 */
function keepInside(bar: { shapes: LayoutShape[]; height: number }, right = 872) {
  const over = bar.shapes.filter((sh) => sh.type === "text" && (sh.x ?? 0) + (sh.w ?? 0) > right);
  if (!over.length) return bar;
  // Laid out right to left on the second row, the last block's label at the right edge.
  const placed = new Map<string, LayoutShape>();
  let edge = right;
  for (const sh of [...over].reverse()) {
    placed.set(sh.id, { ...sh, x: edge - (sh.w ?? 0), y: sh.y + 18 });
    edge -= (sh.w ?? 0) + 10;
  }
  return { shapes: bar.shapes.map((sh) => placed.get(sh.id) ?? sh), height: bar.height + 18 };
}

/** Bars carry no NEW rings of their own: each step's heading announces it. */
const hush = (sh: LayoutShape): LayoutShape => ({ ...sh, quiet: true });

// Step 1: the window by block and cache scope.
const H1 = 4;
const BAR1_Y = 96;
const seg1: ContextSegment[] = TURN50.blocks.map((b) => ({
  kind: KIND[b.id].kind,
  label: KIND[b.id].label,
  tokens: b.tokens,
  step: 1,
}));
const bar1 = keepInside(
  contextBar("w50", X, BAR1_Y, seg1, { total: TURN50.total, w: W, h: BAR_H, free: false, step: 1 })
);
const at = (tokens: number, total: number) => X + Math.round((tokens / total) * W);
const sumTo = (ids: readonly string[]) =>
  TURN50.blocks.filter((b) => ids.includes(b.id)).reduce((s, b) => s + b.tokens, 0);
const scopeTokens = {
  global: sumTo(["system"]),
  user: sumTo(["header"]),
  conversation: sumTo(["summary", "recent", "search", "file"]),
  fresh: TURN50.newTokens,
};
/** A bracket over [from, to) tokens of the step-1 bar, its label `tier` rows above it. */
const bracket = (
  id: string,
  from: number,
  to: number,
  label: string,
  tier: 0 | 1,
  align: "centre" | "right" = "centre"
) => {
  const x1 = at(from, TURN50.total) + 2;
  const x2 = at(to, TURN50.total) - 2;
  const y = BAR1_Y - 8 - tier * 22;
  const tw = Math.ceil(label.length * 6.6) + 8;
  const tx = align === "right" ? x2 - tw : Math.round((x1 + x2) / 2 - tw / 2);
  return [
    {
      id,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x1, BAR1_Y - 2],
        [x1, y],
        [x2, y],
        [x2, BAR1_Y - 2],
      ],
      step: 1,
      quiet: true,
    },
    text(`${id}-label`, tx, y - 20, tw, label, 1, PROD_TONE.infra, true),
  ] as LayoutShape[];
};
const g = scopeTokens.global;
const u = g + scopeTokens.user;
const c = u + scopeTokens.conversation;
const step1: LayoutShape[] = [
  text(
    "h1",
    X - 18,
    H1,
    840,
    `Turn 50: ${n(TURN50.total)} tokens, most shared first, least changing first`,
    1,
    PROD_TONE.infra,
    false
  ),
  ...bracket("scope-all", 0, g, `All users: ${n(g)}`, 0),
  ...bracket("scope-user", g, u, `This user: ${n(scopeTokens.user)}`, 1),
  ...bracket("scope-conv", u, c, `This conversation: ${n(scopeTokens.conversation)}`, 0),
  ...bracket("scope-new", c, TURN50.total, `New: ${n(scopeTokens.fresh)}`, 1, "right"),
  ...bar1.shapes.map(hush),
  text(
    "f1",
    X,
    BAR1_Y + bar1.height + 8,
    W,
    `A prefix hit reads ${n(TURN50.cachedIfHit)} from cache and computes ${n(TURN50.newTokens)}; nothing that changes every turn sits above the history.`,
    1
  ),
];

// Step 2: the same chat kept whole, split by what removes each part.
const H2 = BAR1_Y + bar1.height + 44;
const BAR2_Y = H2 + 28;
const keptWhole: { label: string; tokens: number; tone: LayoutTone; fill: "pastel" | "soft"; sub: string }[] = [
  { label: "Turn-50 window", tokens: TURN50.total, tone: PROD_TONE.infra, fill: "pastel", sub: n(TURN50.total) },
  {
    label: "Folded into the summary",
    tokens: TURN50.causes.compaction,
    tone: "orange",
    fill: "soft",
    sub: `− ${n(TURN50.causes.compaction)}`,
  },
  {
    label: "Old search results",
    tokens: TURN50.causes.toolLifetime,
    tone: "blue",
    fill: "soft",
    sub: `− ${n(TURN50.causes.toolLifetime)}`,
  },
  {
    label: "Whole file, not chunks",
    tokens: TURN50.causes.fileChunks,
    tone: "blue",
    fill: "soft",
    sub: `− ${n(TURN50.causes.fileChunks)}`,
  },
];
let acc2 = 0;
const bar2: LayoutShape[] = keptWhole.map((k, i) => {
  const x1 = at(acc2, TURN50.naive);
  acc2 += k.tokens;
  const x2 = at(acc2, TURN50.naive);
  return {
    id: `kept-${i}`,
    type: "cell",
    x: x1,
    y: BAR2_Y,
    w: x2 - x1,
    h: BAR_H,
    label: k.label,
    sub: k.sub,
    tone: k.tone,
    fill: k.fill,
    step: 2,
    quiet: i > 0,
  };
});
const removed = TURN50.naive - TURN50.total;
const step2: LayoutShape[] = [
  text(
    "h2",
    X - 18,
    H2,
    840,
    `Kept whole, the same chat is ${n(TURN50.naive)} tokens (${TURN50.ratio.toFixed(1)}×): three mechanisms remove ${n(removed)}`,
    2,
    PROD_TONE.infra,
    false
  ),
  ...bar2,
  text(
    "f2",
    X,
    BAR2_Y + BAR_H + 8,
    W,
    `Turn 100: ${n(CAPACITY.printed.turn100)} against ${n(CAPACITY.printed.turn100KeepAll)}; kept whole, the chat passes a 200K window at turn ${CAPACITY.printed.keepAllCrosses200kAtTurn}.`,
    2
  ),
];

// Step 3: the fold after turn 56 and its pre-fill (this chat, no search or file in turns 50–56).
const B = BLOCKS;
const turn56 = [
  { kind: "instructions", label: "System", tokens: B.systemPrompt },
  { kind: "memory", label: "Header", tokens: B.userHeader },
  { kind: "history", label: "Summary 1–40", tokens: B.summaryPerFold * 5 },
  { kind: "history", label: "Turns 41–55 word for word", tokens: 15 * B.turn },
  { kind: "results", label: "Search 47", tokens: B.searchResult },
  { kind: "files", label: "File", tokens: B.fileChunks },
  { kind: "memory", label: "Recall", tokens: B.recallSnippets },
  { kind: "task", label: "Message", tokens: B.userMessage },
] as const;
const turn57 = [
  { kind: "instructions", label: "System", tokens: B.systemPrompt },
  { kind: "memory", label: "Header", tokens: B.userHeader },
  { kind: "history", label: "Summary 1–48", tokens: B.summaryPerFold * 6 },
  { kind: "history", label: "Turns 49–56", tokens: B.foldSize * B.turn },
  { kind: "memory", label: "Recall", tokens: B.recallSnippets },
  { kind: "task", label: "Message", tokens: B.userMessage },
] as const;
const total56 = turn56.reduce((s, b) => s + b.tokens, 0);
const total57 = turn57.reduce((s, b) => s + b.tokens, 0);
const prefilled = B.summaryPerFold * 6 + B.foldSize * B.turn;
const H3 = BAR2_Y + BAR_H + 44;
const ROW56 = H3 + 30;
const bar56 = keepInside(
  contextBar(
    "t56",
    X + 70,
    ROW56,
    turn56.map((b) => ({ kind: b.kind, label: b.label, tokens: b.tokens, step: 3 })),
    { total: total56, w: W - 70, h: 40, free: false, step: 3 }
  )
);
const ROW57 = ROW56 + bar56.height + 52;
const w57 = Math.round(((W - 70) * total57) / total56);
const bar57 = contextBar(
  "t57",
  X + 70,
  ROW57,
  turn57.map((b) => ({ kind: b.kind, label: b.label, tokens: b.tokens, step: 3 })),
  { total: total57, w: w57, h: 40, free: false, step: 3 }
);
const fixed57 = B.systemPrompt + B.userHeader;
const preX1 = X + 70 + Math.round((w57 * fixed57) / total57) + 2;
const preX2 = X + 70 + Math.round((w57 * (fixed57 + prefilled)) / total57) - 2;
const step3: LayoutShape[] = [
  text(
    "h3",
    X - 18,
    H3,
    840,
    "The fold after turn 56: one miss in 8 turns, paid in the background",
    3,
    PROD_TONE.infra,
    false
  ),
  text("l56", X - 18, ROW56 + 11, 80, `Turn 56`, 3),
  text("n56", X - 18, ROW56 + 27, 80, n(total56), 3),
  ...bar56.shapes.map(hush),
  text(
    "fold",
    X + 70,
    ROW57 - 36,
    W - 70,
    `Background job: fold turns 41–48 (search 47 and the file go with them), pre-fill ${n(prefilled)} tokens on the home unit`,
    3,
    "orange"
  ),
  {
    id: "prefilled",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [preX1, ROW57 - 2],
      [preX1, ROW57 - 10],
      [preX2, ROW57 - 10],
      [preX2, ROW57 - 2],
    ],
    tone: "orange",
    step: 3,
    quiet: true,
  },
  text("l57", X - 18, ROW57 + 11, 80, `Turn 57`, 3),
  text("n57", X - 18, ROW57 + 27, 80, `${n(total57)}, hits`, 3),
  ...bar57.shapes.map(hush),
  text(
    "f3",
    X,
    ROW57 + bar57.height + 10,
    W,
    `Across all chats a fold computes ≈ ${n(Math.round(CAPACITY.cache.pCompaction / 100) * 100)} tokens, off the critical path. Block sizes are illustrative.`,
    3
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: `The window on turn 50: ${n(TURN50.total)} tokens, not ${n(TURN50.naive)}, and the fold that keeps it cached`,
  width: 880,
  height: ROW57 + bar57.height + 40,
  steps: [
    { title: `Turn 50: ${n(TURN50.total)} tokens by block and cache scope` },
    { title: `Kept whole: ${n(TURN50.naive)}; three mechanisms remove ${n(removed)}` },
    { title: "The fold after turn 56, pre-filled so turn 57 hits" },
  ],
  shapes: [...step1, ...step2, ...step3],
};

export default spec;
