import type { LayoutShape, LayoutSpec, LayoutTone, ShapeFill } from "@/components/diagrams/types";
import { CORPUS, RAG_TONE, TOP_K, fmt } from "@/components/diagrams/presets/rag";

// "Selecting, ordering and compressing context" (context-engineering). One turn of Brightpost's support agent, built
// four ways. The conversation began with a password question ("Can't log in, phone was stolen"); twelve turns later
// the customer writes "My kettle arrived cracked. It's order 4471. Can I get my money back?". Each build step is a
// row: everything gathered, then select, then order, then compress.
//
// Token counts (illustrative unless imported; the fixed parts match ctx-budget):
// - Instructions 1,200 · 4 tool definitions × 250 = 1,000 · memory 600.
// - 5 chunks from the earlier password search: TOP_K × CORPUS.chunkTokens = 5 × 400 = 2,000 (old topic).
// - 5 chunks from search_help("damaged item refund") = 2,000; a reranker keeps the best 3 = 1,200.
// - History: 12 turns × 300 = 3,600; compressed to a 400-token summary + the last 2 turns (600) = 1,000.
// - get_order(4471) returns a 2,000-token order record; compressed to the 4 fields that matter (item, price, delivery
//   date, status) ≈ 120 tokens.
// - The new message ≈ 20 tokens.
//
// Totals: gather 1,200 + 2,000 + 3,600 + 600 + 1,000 + 2,000 + 2,000 + 20 = 12,420.
//         select drops the 5 password chunks and 2 weak refund chunks: 12,420 − 2,000 − 800 = 9,620.
//         order moves blocks only: 9,620.
//         compress: 9,620 − (3,600 − 1,000) − (2,000 − 120) = 9,620 − 2,600 − 1,880 = 5,140 (41 % of 12,420).
//
// Layout: row label column x 6..118; blocks from x 128, 88 wide with 4-unit gaps (8 × 88 + 7 × 4 = 732 → x 860).
// Rows 84 apart from y 22; each row's note sits under its blocks. Blocks are not to scale: the token count is the sub
// line and the row total is in the label.
// Tones (four plus neutral): instructions neutral; tools and tool results teal; chunks blue; memory, history and the
// message orange (the conversation). Blocks that the step changes are pastel; the rest soft.

const KEPT_CHUNKS = 3;
const HISTORY_TURNS = 12;
const PER_TURN = 300;
const SUMMARY = 400;
const KEEP_TURNS = 2;
const ORDER_RECORD = 2_000;
const ORDER_FIELDS = 120;
const MESSAGE = 20;
const SEARCH = TOP_K * CORPUS.chunkTokens;

interface Block {
  key: string;
  label: string;
  tokens: number;
  tone: LayoutTone;
  sub?: string;
}

const B = {
  instr: { key: "instr", label: "Instructions", tokens: 1_200, tone: RAG_TONE.infra },
  tools: { key: "tools", label: "4 tools", tokens: 1_000, tone: "teal" },
  memory: { key: "memory", label: "Memory", tokens: 600, tone: RAG_TONE.query },
  oldChunks: { key: "old", label: "Old chunks", sub: `${TOP_K}`, tokens: SEARCH, tone: RAG_TONE.text },
  newChunks: { key: "new", label: "New chunks", sub: `${TOP_K}`, tokens: SEARCH, tone: RAG_TONE.text },
  kept: {
    key: "new",
    label: "New chunks",
    sub: `${KEPT_CHUNKS}`,
    tokens: KEPT_CHUNKS * CORPUS.chunkTokens,
    tone: RAG_TONE.text,
  },
  history: {
    key: "history",
    label: "History",
    tokens: HISTORY_TURNS * PER_TURN,
    tone: RAG_TONE.query,
  },
  summary: {
    key: "history",
    label: "Summary",
    tokens: SUMMARY + KEEP_TURNS * PER_TURN,
    tone: RAG_TONE.query,
  },
  order: { key: "order", label: "Order 4471", sub: "record", tokens: ORDER_RECORD, tone: "teal" },
  fields: { key: "order", label: "Order 4471", sub: "4 fields", tokens: ORDER_FIELDS, tone: "teal" },
  message: { key: "msg", label: "Message", sub: "kettle", tokens: MESSAGE, tone: RAG_TONE.query },
} satisfies Record<string, Block>;

const ROWS: { label: string; blocks: Block[]; changed: string[]; note: string }[] = [
  {
    label: "1 Gather",
    blocks: [B.instr, B.oldChunks, B.history, B.memory, B.tools, B.newChunks, B.order, B.message],
    changed: [],
    note: "Everything the builder could fetch, in the order it arrived",
  },
  {
    label: "2 Select",
    blocks: [B.instr, B.history, B.memory, B.tools, B.kept, B.order, B.message],
    changed: ["new"],
    note: `Dropped: ${TOP_K} password chunks and the 2 weakest refund chunks`,
  },
  {
    label: "3 Order",
    blocks: [B.instr, B.tools, B.memory, B.history, B.order, B.kept, B.message],
    changed: ["order", "new"],
    note: "Stable parts first, so they can be cached; evidence next to the message",
  },
  {
    label: "4 Compress",
    blocks: [B.instr, B.tools, B.memory, B.summary, B.fields, B.kept, B.message],
    changed: ["history", "order"],
    note: `${HISTORY_TURNS} turns become a summary + the last ${KEEP_TURNS}; the order record keeps 4 fields`,
  },
];

const X0 = 128;
const W = 88;
const GAP = 4;
const ROW_Y = (i: number) => 22 + i * 84;
const H = 44;

const total = (blocks: Block[]) => blocks.reduce((s, b) => s + b.tokens, 0);

const shapes: LayoutShape[] = ROWS.flatMap((r, i): LayoutShape[] => {
  const step = i + 1;
  return [
    {
      id: `r${i}-label`,
      type: "text",
      x: 6,
      y: ROW_Y(i) + 2,
      w: 112,
      h: 40,
      label: `${r.label}\n${fmt(total(r.blocks))} tokens`,
      step,
    },
    ...r.blocks.map((b, j): LayoutShape => ({
      id: `r${i}-${b.key}`,
      type: "box",
      x: X0 + j * (W + GAP),
      y: ROW_Y(i),
      w: W,
      h: H,
      label: b.label,
      sub: b.sub ? `${b.sub} · ${fmt(b.tokens)}` : fmt(b.tokens),
      tone: b.tone,
      fill: (r.changed.includes(b.key) ? "pastel" : "soft") satisfies ShapeFill,
      quiet: true,
      step,
    })),
    {
      id: `r${i}-note`,
      type: "text",
      x: X0,
      y: ROW_Y(i) + H + 6,
      w: 8 * W + 7 * GAP,
      h: 20,
      label: r.note,
      tone: RAG_TONE.infra,
      step,
    },
  ];
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "One turn's context gathered, then selected, ordered and compressed",
  width: 880,
  height: 364,
  steps: ROWS.map((r) => ({ title: `${r.label.slice(2)}: ${fmt(total(r.blocks))} tokens` })),
  shapes,
};

export default spec;
