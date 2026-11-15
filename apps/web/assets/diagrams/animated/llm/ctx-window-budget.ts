import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";

// What fills a context window: one request from a support assistant that uses retrieval, drawn to scale on a
// 128,000-token window. Every segment's width is proportional to its token count.
//
// Facts checked:
// - Anthropic, "Context windows" docs (platform.claude.com, read 2026-11-15): "Everything in the request counts toward
//   the context window: the system prompt, every message in `messages` (including tool results, images, and
//   documents), and your tool definitions. The output Claude generates for the turn, including its extended
//   thinking, counts too."
// - OpenAI API docs (developers.openai.com, read 2026-11-15): "the prompt and the generated output combined must be
//   no more than the model's maximum context length"; rule of thumb "1 token is approximately 4 characters or 0.75
//   words for English text."
//
// The request (our own example; token counts are made up but typical in size):
//   system prompt + tool definitions   3,000
//   conversation history (11 turns)   24,000
//   retrieved documents (12 chunks)   60,000
//   the user's new question            1,000
//   reserved for output (max_tokens)   8,000
//   ──────────────────────────────────────────
//   used or reserved                  96,000   → free headroom = 128,000 − 96,000 = 32,000
// Input = 3,000 + 24,000 + 60,000 + 1,000 = 88,000 tokens ≈ 88,000 × 0.75 = 66,000 English words.
// Scale: 760 px for 128,000 tokens → 760 / 128,000 = 0.0059375 px per token (5.94 px per 1,000).

const WINDOW = 128_000;
const BAR_X = 50;
const BAR_W = 760;
const BAR_Y = 150;
const BAR_H = 48;
const px = (tokens: number) => Math.round((BAR_X + (tokens * BAR_W) / WINDOW) * 10) / 10;

interface Segment {
  id: string;
  tokens: number;
  tone: LayoutTone;
  /** Label inside the bar, when the segment is wide enough; otherwise a callout above it. */
  inside?: string;
  fill?: "pastel" | "paper";
}

const SEGMENTS: Segment[] = [
  { id: "system", tokens: 3_000, tone: "neutral" },
  { id: "history", tokens: 24_000, tone: "teal", inside: "Conversation history\n24,000" },
  { id: "retrieved", tokens: 60_000, tone: "blue", inside: "Retrieved documents\n60,000" },
  { id: "question", tokens: 1_000, tone: "orange" },
  { id: "output", tokens: 8_000, tone: "green" },
  { id: "free", tokens: 32_000, tone: "neutral", inside: "Free headroom\n32,000", fill: "paper" },
];

const shapes: LayoutShape[] = [];
let start = 0;
const startOf: Record<string, number> = {};
for (const s of SEGMENTS) {
  startOf[s.id] = start;
  const x0 = px(start);
  const x1 = px(start + s.tokens);
  shapes.push({
    id: `seg-${s.id}`,
    type: "box",
    x: x0,
    y: BAR_Y,
    w: Math.round((x1 - x0) * 10) / 10,
    h: BAR_H,
    tone: s.tone,
    fill: s.fill ?? "pastel",
    label: s.inside,
  });
  start += s.tokens;
}
const total = start; // 128,000: the segments fill the window exactly.
if (total !== WINDOW) throw new Error(`segments sum to ${total}, not ${WINDOW}`);

const mid = (id: string) => {
  const s = SEGMENTS.find((g) => g.id === id)!;
  return Math.round(((px(startOf[id]) + px(startOf[id] + s.tokens)) / 2) * 10) / 10;
};

const text = (id: string, x: number, y: number, w: number, label: string, h = 20, tone: LayoutTone = "neutral") =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;

/** A thin leader line from a callout down to the top of a narrow segment. */
const leader = (id: string, x: number, fromY: number): LayoutShape => ({
  id,
  type: "arrow",
  x,
  y: fromY,
  w: 0,
  h: BAR_Y - 2 - fromY,
  tone: "neutral",
});

// Callouts for the three narrow segments, above the bar.
shapes.push(
  text("call-system", 14, 92, 170, "System prompt + tools\n3,000", 36),
  leader("lead-system", mid("system"), 130),
  // The question's callout sits to the left, with an elbow, so it clears the output callout.
  text("call-question", mid("question") - 130, 92, 120, "New question\n1,000", 36, "orange"),
  {
    id: "lead-question",
    type: "arrow",
    x: mid("question") - 26,
    y: 110,
    w: 26,
    h: BAR_Y - 2 - 110,
    via: [[mid("question"), 110]],
    tone: "neutral",
  },
  text("call-output", mid("output") - 50, 92, 170, "Reserved for output\n8,000 (max_tokens)", 36, "green"),
  leader("lead-output", mid("output"), 130)
);

// Title line above everything.
shapes.push(
  text(
    "title",
    50,
    24,
    760,
    "One request to a support assistant, drawn to scale on a 128,000-token context window",
    20
  ),
  text(
    "order",
    50,
    50,
    760,
    "Left to right is the order the model reads it: instructions first, the question last.",
    20
  )
);

// Token scale under the bar: ticks every 32,000 tokens.
const SCALE_Y = BAR_Y + BAR_H + 14;
shapes.push({
  id: "scale",
  type: "path",
  x: 0,
  y: 0,
  points: [
    [BAR_X, SCALE_Y],
    [BAR_X + BAR_W, SCALE_Y],
  ],
  tone: "neutral",
  weight: 0.3,
});
for (let k = 0; k <= 4; k++) {
  const t = k * 32_000;
  shapes.push(
    {
      id: `tick-${k}`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [px(t), SCALE_Y - 5],
        [px(t), SCALE_Y + 5],
      ],
      tone: "neutral",
      weight: 0.3,
    },
    text(`tick-label-${k}`, px(t) - 30, SCALE_Y + 8, 60, k === 0 ? "0" : `${k * 32}K`)
  );
}

// Brackets: input (everything the model reads) and the whole window.
const bracket = (id: string, x0: number, x1: number, y: number, tone: LayoutTone): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points: [
    [x0, y - 8],
    [x0, y],
    [x1, y],
    [x1, y - 8],
  ],
  tone,
  weight: 0.45,
});
const INPUT_END = px(startOf.question + 1_000); // 88,000 tokens
const IN_Y = SCALE_Y + 56;
shapes.push(
  bracket("brace-input", BAR_X, INPUT_END, IN_Y, "neutral"),
  text(
    "input-label",
    BAR_X,
    IN_Y + 6,
    INPUT_END - BAR_X,
    "Input the model reads: 88,000 tokens ≈ 66,000 English words",
    20
  ),
  bracket("brace-out", px(startOf.output), px(startOf.output + 8_000), IN_Y, "green"),
  text("out-label", px(startOf.output) - 30, IN_Y + 6, 110, "Output ≤ 8,000", 20, "green")
);
const WIN_Y = IN_Y + 52;
shapes.push(
  bracket("brace-window", BAR_X, BAR_X + BAR_W, WIN_Y, "neutral"),
  text(
    "window-label",
    BAR_X,
    WIN_Y + 6,
    BAR_W,
    "Context window: 128,000 tokens, one budget shared by everything the model reads and writes.",
    20
  )
);

// Note on what happens next turn.
const NOTE_Y = WIN_Y + 44;
shapes.push(
  text(
    "note",
    30,
    NOTE_Y,
    800,
    "Every call re-sends the whole input. Next turn, this question and its answer join the history,\n" +
      "so a long chat fills the window turn by turn unless old turns are trimmed or summarized.",
    36
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "What fills a context window",
  width: 860,
  height: NOTE_Y + 56,
  shapes,
};

export default spec;
