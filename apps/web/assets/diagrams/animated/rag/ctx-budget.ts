import type { LayoutShape, LayoutSpec, LayoutTone, ShapeFill } from "@/components/diagrams/types";
import { PROMPT, RAG_TONE, fmt } from "@/components/diagrams/presets/rag";

// "Context as a budget" (context-engineering). Brightpost's support agent (the kettle conversation, order 4471) fills
// its context window turn by turn. One stacked bar per turn shows where the tokens go: the fixed parts stay the same
// size while the conversation history and the tool results grow, until the agent must compact.
//
// Local constants, all illustrative:
// - WINDOW = 32,000 tokens: the budget the agent runs under (a model's window may be larger; the page explains why a
//   team sets a lower ceiling).
// - INSTRUCTIONS = 1,200 tokens of system instructions (refund policy, tone, escalation rules).
// - TOOL_DEFS = 4 tools (get_order, search_help, create_refund, send_email) × 250 tokens = 1,000.
// - MEMORY = 600 tokens recalled about this customer ("prefers email", last refund).
// - CHUNKS = PROMPT.contextTokens = 5 × 400 = 2,000: the latest search's chunks (older searches count as tool results).
// - Each turn adds HISTORY_PER_TURN = 300 tokens (one customer message + one reply) and TOOL_PER_TURN = 1,200 tokens of
//   tool results on average (an order record, a search).
// - COMPACT_AT = 80 % of the window = 25,600 tokens.
//
// Working: fixed = 1,200 + 1,000 + 600 + 2,000 = 4,800; turn n = 4,800 + 1,500 n.
//   Turn 1 = 6,300 · turn 7 = 15,300 · turn 14 = 25,800 (80.6 %, past the line: compact) · turn 19 = 33,300 (over
//   32,000 by 1,300) · turn 14 compacted: history → a 400-token summary + the last 2 turns verbatim (600) = 1,000, tool
//   results → only the latest (1,200): 4,800 + 1,000 + 1,200 = 7,000.
//
// Scale: 560 units = 32,000 tokens (0.0175 per token). Bars start at x 130, so the window edge is at 690 and the 80 %
// line at 578. Rows 52 apart from y 92, one build step each.
// Tones (four plus neutral): instructions neutral; tool definitions and tool results teal (soft / pastel); memory and
// history orange (soft / pastel: the conversation); chunks blue; the overflow red.

const WINDOW = 32_000;
const INSTRUCTIONS = 1_200;
const TOOL_DEFS = 4 * 250;
const MEMORY = 600;
const CHUNKS = PROMPT.contextTokens;
const HISTORY_PER_TURN = 300;
const TOOL_PER_TURN = 1_200;
const COMPACT_AT = 0.8;
const SUMMARY = 400;
const KEEP_TURNS = 2;

const BAR_X = 130;
const BAR_W = 560;
const px = (tokens: number) => BAR_X + Math.round((tokens * BAR_W) / WINDOW);
const ROW_Y = (i: number) => 92 + i * 52;
const BAR_H = 30;

const TOOLS_TONE: LayoutTone = "teal";
const CONVO_TONE: LayoutTone = RAG_TONE.query;

interface Segment {
  key: string;
  tokens: number;
  tone: LayoutTone;
  fill: ShapeFill;
}

const fixed: Segment[] = [
  { key: "instr", tokens: INSTRUCTIONS, tone: RAG_TONE.infra, fill: "pastel" },
  { key: "tooldefs", tokens: TOOL_DEFS, tone: TOOLS_TONE, fill: "soft" },
  { key: "memory", tokens: MEMORY, tone: CONVO_TONE, fill: "soft" },
  { key: "chunks", tokens: CHUNKS, tone: RAG_TONE.text, fill: "pastel" },
];

const turn = (n: number, history = n * HISTORY_PER_TURN, tools = n * TOOL_PER_TURN): Segment[] => [
  ...fixed,
  { key: "history", tokens: history, tone: CONVO_TONE, fill: "pastel" },
  { key: "results", tokens: tools, tone: TOOLS_TONE, fill: "pastel" },
];

const total = (segs: Segment[]) => segs.reduce((s, x) => s + x.tokens, 0);

const ROWS: { label: string; segs: Segment[]; note: (t: number) => string; red?: boolean }[] = [
  { label: "Turn 1", segs: turn(1), note: (t) => fmt(t) },
  { label: "Turn 7", segs: turn(7), note: (t) => fmt(t) },
  { label: "Turn 14", segs: turn(14), note: (t) => `${fmt(t)}: compact` },
  { label: "Turn 19\nno compaction", segs: turn(19), note: (t) => `${fmt(t)}: overflow`, red: true },
  {
    label: "Turn 14\ncompacted",
    segs: turn(14, SUMMARY + KEEP_TURNS * HISTORY_PER_TURN, TOOL_PER_TURN),
    note: (t) => fmt(t),
  },
];

// A segment gets its token count written inside when the number fits with room to spare (about 7 units a character).
const fits = (w: number, label: string) => w >= label.length * 7 + 12;

const bar = (row: number, segs: Segment[]): LayoutShape[] => {
  const shapes: LayoutShape[] = [];
  let at = 0;
  for (const s of segs) {
    const start = at;
    const end = Math.min(at + s.tokens, WINDOW);
    at += s.tokens;
    if (end > start) {
      const x = px(start);
      const w = px(end) - x;
      const label = fmt(s.tokens);
      shapes.push({
        id: `r${row}-${s.key}`,
        type: "cell",
        x,
        y: ROW_Y(row),
        w,
        h: BAR_H,
        label: fits(w, label) ? label : undefined,
        tone: s.tone,
        fill: s.fill,
        quiet: true,
        step: row + 1,
      });
    }
  }
  if (at > WINDOW) {
    shapes.push({
      id: `r${row}-over`,
      type: "cell",
      x: px(WINDOW),
      y: ROW_Y(row),
      w: px(at) - px(WINDOW),
      h: BAR_H,
      tone: RAG_TONE.failure,
      fill: "pastel",
      quiet: true,
      step: row + 1,
    });
  }
  return shapes;
};

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  opts: { tone?: LayoutTone; step?: number; h?: number } = {}
): LayoutShape => ({ id, type: "text", x, y, w, h: opts.h ?? 20, label, tone: opts.tone, step: opts.step });

const LEGEND: { key: string; label: string; tone: LayoutTone; fill: ShapeFill }[] = [
  { key: "instr", label: `Instructions ${fmt(INSTRUCTIONS)}`, tone: RAG_TONE.infra, fill: "pastel" },
  { key: "tooldefs", label: `Tool definitions ${fmt(TOOL_DEFS)}`, tone: TOOLS_TONE, fill: "soft" },
  { key: "memory", label: `Memory ${fmt(MEMORY)}`, tone: CONVO_TONE, fill: "soft" },
  { key: "chunks", label: `Latest chunks ${fmt(CHUNKS)}`, tone: RAG_TONE.text, fill: "pastel" },
  { key: "history", label: `History +${HISTORY_PER_TURN} a turn`, tone: CONVO_TONE, fill: "pastel" },
  { key: "results", label: `Tool results +${fmt(TOOL_PER_TURN)} a turn`, tone: TOOLS_TONE, fill: "pastel" },
];
const LEGEND_COL = [130, 380, 630] as const;
const legend: LayoutShape[] = LEGEND.flatMap((l, i): LayoutShape[] => {
  const x = LEGEND_COL[i % 3];
  const y = 16 + Math.floor(i / 3) * 26;
  return [
    { id: `lg-${l.key}`, type: "cell", x, y: y + 3, w: 14, h: 14, tone: l.tone, fill: l.fill },
    {
      id: `lg-${l.key}-t`,
      type: "text",
      x: x + 24,
      y,
      w: Math.round(l.label.length * 6.6) + 4,
      h: 20,
      label: l.label,
      tone: RAG_TONE.infra,
    },
  ];
});

const LINE_TOP = ROW_Y(0) - 10;
const LINE_BOTTOM = ROW_Y(ROWS.length - 1) + BAR_H + 10;
const vline = (id: string, x: number, dashed: boolean): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points: [
    [x, LINE_TOP],
    [x, LINE_BOTTOM],
  ],
  dashed,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A support agent's context window filling turn by turn until it must be compacted",
  width: 880,
  height: 372,
  steps: [
    { title: `Turn 1: ${fmt(total(ROWS[0].segs))} tokens, mostly fixed parts` },
    { title: `Turn 7: history and tool results grow to ${fmt(total(ROWS[1].segs))}` },
    { title: `Turn 14: ${fmt(total(ROWS[2].segs))} tokens, past the 80 % line` },
    { title: `Turn 19 without compaction: ${fmt(total(ROWS[3].segs))}, over the window` },
    { title: `Turn 14 after compaction: ${fmt(total(ROWS[4].segs))} tokens` },
  ],
  shapes: [
    ...legend,
    vline("window-edge", px(WINDOW), false),
    vline("compact-line", px(WINDOW * COMPACT_AT), true),
    text("window-label", px(WINDOW) - 80, LINE_BOTTOM + 4, 160, `${fmt(WINDOW)} window`),
    text("compact-label", px(WINDOW * COMPACT_AT) - 90, LINE_BOTTOM + 4, 150, "80 %: compact"),
    ...ROWS.flatMap((r, i): LayoutShape[] => {
      const t = total(r.segs);
      const twoLines = r.label.includes("\n");
      return [
        text(`r${i}-label`, 4, ROW_Y(i) + (twoLines ? -3 : 5), 116, r.label, { step: i + 1, h: twoLines ? 36 : 20 }),
        ...bar(i, r.segs),
        text(`r${i}-total`, 718, ROW_Y(i) + 5, 156, r.note(t), {
          tone: r.red ? RAG_TONE.failure : undefined,
          step: i + 1,
        }),
      ];
    }),
  ],
};

export default spec;
