import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";

// Anatomy of a few-shot prompt, with our own example: sorting support tickets into billing, bug or account. The left
// column is the prompt as the model reads it, top to bottom; the right column says what each part does.
//
// Facts checked:
// - Brown et al. (2020), GPT-3, arXiv 2005.14165 §2: zero-shot gives only a task description; one-shot adds one
//   demonstration; few-shot gives K demonstrations, "typically set K in the range of 10 to 100" to fit n_ctx = 2048,
//   with no gradient updates.
// - Min et al. (2022), arXiv 2202.12837, abstract: replacing gold labels with random labels "barely hurts
//   performance"; the drivers are examples of "(1) the label space, (2) the distribution of the input text, and
//   (3) the overall format of the sequence".
// - Zhao et al. (2021), arXiv 2102.09690 §4: GPT-3 shows majority label bias, recency bias (labels near the end of
//   the prompt) and common token bias; prompt format, example choice and order can move accuracy "from near chance
//   to near state-of-the-art".
// - Olsson et al. (2022), arXiv 2209.11895: induction heads complete [A][B] … [A] → [B]; here [A] is "Label:".
// The ticket texts are invented for this figure.

const COL_X = 40;
const COL_W = 430;
const BOX_H = 44;
const NOTE_X = 540;
const NOTE_W = 300;

const box = (id: string, y: number, label: string, tone: LayoutTone, w = COL_W): LayoutShape => ({
  id,
  type: "box",
  x: COL_X,
  y,
  w,
  h: BOX_H,
  label,
  tone,
  fill: "pastel",
});

const note = (id: string, y: number, label: string, tone: LayoutTone = "neutral", h = 52): LayoutShape => ({
  id,
  type: "text",
  x: NOTE_X,
  y,
  w: NOTE_W,
  h,
  label,
  tone,
});

const arrow = (id: string, from: string, to: string, label?: string): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  label,
  tone: "neutral",
});

const Y = { instr: 56, ex1: 156, ex2: 214, ex3: 272, query: 360, out: 450 };

const shapes: LayoutShape[] = [
  // The prompt, top to bottom.
  box("instr", Y.instr, "Instruction\nSort each support ticket into billing, bug or account.", "neutral"),
  box("ex1", Y.ex1, "Ticket: “I was charged twice this month.”\nLabel: billing", "violet"),
  box("ex2", Y.ex2, "Ticket: “The export button does nothing.”\nLabel: bug", "violet"),
  box("ex3", Y.ex3, "Ticket: “How do I change my sign-in email?”\nLabel: account", "violet"),
  box("query", Y.query, "Ticket: “My invoice shows the wrong VAT number.”\nLabel:", "orange"),
  { ...box("out", Y.out, "billing", "green", 150), x: COL_X + (COL_W - 150) / 2, h: 34 },
  arrow("query>out", "query", "out", "model writes next"),

  // What each part does.
  note(
    "n-instr",
    Y.instr - 4,
    "Zero-shot stops here: the instruction and the\nquery only. One-shot adds one example;\nfew-shot adds several."
  ),
  arrow("n-instr>instr", "n-instr", "instr"),
  note(
    "n-examples",
    Y.ex1 - 4,
    "The examples mostly teach the label set, what\ninputs look like and the format. Random labels\nhurt surprisingly little in classic studies.",
    "violet"
  ),
  arrow("n-examples>ex1", "n-examples", "ex1"),
  note(
    "n-order",
    Y.ex3 - 4,
    "Order and balance matter: the last examples and\nthe most common label pull the answer\n(recency and majority-label bias).",
    "violet"
  ),
  arrow("n-order>ex3", "n-order", "ex3"),
  note(
    "n-copy",
    Y.query - 4,
    "Same format, answer left blank. After “Label:”\nthe model looks back at what followed “Label:”\nbefore: the copying that induction heads do.",
    "orange"
  ),
  arrow("n-copy>query", "n-copy", "query"),
  note("n-out", Y.out - 6, "No weights change: delete the examples\nand the skill is gone.", "green", 40),
  arrow("n-out>out", "n-out", "out"),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Anatomy of a few-shot prompt",
  width: 860,
  height: Y.out + 64,
  groups: [
    {
      id: "g-shots",
      title: "Demonstrations: 3 shots",
      tone: "violet",
      x: COL_X - 14,
      y: Y.ex1 - 26,
      w: COL_W + 28,
      h: Y.ex3 + BOX_H + 16 - (Y.ex1 - 26),
    },
  ],
  shapes,
};

export default spec;
