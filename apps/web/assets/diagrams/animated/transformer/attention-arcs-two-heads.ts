import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// Two heads of the same layer learn different jobs: our own counterpart of Figures 4 and 5 in "Attention Is All You
// Need" (Vaswani et al., 2017), which show heads whose attention patterns follow different structure in the
// sentence. Our sentence, drawn once per head: "The server dropped the request because it was overloaded".
//
// Head A (orange, top) resolves the pronoun. Its arcs run from the query "it" to every other word; thickness and
// opacity are the weight (the engine maps weight w to stroke width 1 + 3w and opacity 0.25 + 0.75w). Its row for
// "it" is the same as in attention-arcs-long-range:
//   The 0.03, server 0.52, dropped 0.04, the 0.03, request 0.18, because 0.04, it 0.08, was 0.03, overloaded 0.05
//   0.03 + 0.52 + 0.04 + 0.03 + 0.18 + 0.04 + 0.08 + 0.03 + 0.05 = 1.00
//
// Head B (teal, bottom) is a previous-word head. Every word is a query here, and each one's strongest key is the
// word just before it, so we draw one short arc per word, pointing at its left neighbour. Each row is: p on the
// previous word, 0.10 on itself, and the rest, 0.90 − p, spread evenly over the other 7 words (not drawn), so every
// row sums to p + 0.10 + (0.90 − p) = 1:
//   server 0.81 (rest 0.09, 0.013 each)   dropped 0.74 (rest 0.16, 0.023 each)   the 0.86 (rest 0.04, 0.006 each)
//   request 0.77 (rest 0.13, 0.019 each)  because 0.72 (rest 0.18, 0.026 each)   it 0.79 (rest 0.11, 0.016 each)
//   was 0.83 (rest 0.07, 0.010 each)      overloaded 0.75 (rest 0.15, 0.021 each)
// "The" has no previous word; it keeps 0.90 on itself and 0.10 spread over the rest (not drawn).
// All weights are illustrative, made up for teaching, not measured from a trained model.
//
// Facts checked against arXiv 1706.03762 v7: §3.2.1, weights = softmax(QKᵀ / √d_k), one softmax per query, so each
// query's weights sum to 1; §3.2.2, multi-head attention lets the model "jointly attend to information from different
// representation subspaces at different positions"; Figures 4 and 5 show different heads learning different tasks.
// Previous-token heads are a well-known pattern in trained Transformers (the page's text mentions them).

const WORDS = ["The", "server", "dropped", "the", "request", "because", "it", "was", "overloaded"];
const A_WEIGHTS = [0.03, 0.52, 0.04, 0.03, 0.18, 0.04, 0.08, 0.03, 0.05];
const B_PREV = [0, 0.81, 0.74, 0.86, 0.77, 0.72, 0.79, 0.83, 0.75];
const Q = 6; // "it"
const A_TONE = ROLE_TONE.attention;
const B_TONE: LayoutTone = "teal";

// Word rows: 9 boxes on a 92 px grid, centred on the 880 px canvas.
const STEP = 92;
const BOX_W = 80;
const BOX_H = 40;
const cx = (i: number) => 440 - (STEP * (WORDS.length - 1)) / 2 + i * STEP;

// Panel A: arcs over the row, height growing with distance (h / √span increases, so the bundle stays nested).
const A_Y = 40;
const arcHeightA = (d: number) => 22 + 24 * d;
const ROW_A = A_Y + 32 + arcHeightA(Q) + 4;
const A_H = ROW_A + BOX_H + 52 - A_Y;

// Panel B: one short arc per word.
const B_Y = A_Y + A_H + 32;
const B_ARC_H = 34;
const B_INSET = 10;
const ROW_B = B_Y + 34 + B_ARC_H;
const B_H = ROW_B + BOX_H + 52 - B_Y;

const text = (id: string, x: number, y: number, w: number, label: string, tone: LayoutTone = "neutral", h = 20) =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;

/** A half-ellipse from x = a to x = b over a word row whose top is rowY, sampled at 13 points. */
function arcPoints(a: number, b: number, h: number, rowY: number): [number, number][] {
  return Array.from({ length: 13 }, (_, k) => {
    const t = (Math.PI * k) / 12;
    const x = (a + b) / 2 - ((b - a) / 2) * Math.cos(t);
    return [Math.round(x * 10) / 10, Math.round((rowY - h * Math.sin(t)) * 10) / 10];
  });
}

const wordRow = (prefix: string, rowY: number, query?: number): LayoutShape[] =>
  WORDS.map((w, i) => ({
    id: `${prefix}-word-${i}`,
    type: "box",
    x: cx(i) - BOX_W / 2,
    y: rowY,
    w: BOX_W,
    h: BOX_H,
    label: w,
    ...(i === query ? { sub: "query" } : {}),
    tone: i === query ? ROLE_TONE.query : "neutral",
    fill: "pastel",
  }));

// ── Head A: "it" → every word ────────────────────────────────────────────────────────────────────────────────

/** Leftward arcs leave the left half of "it", rightward ones the right half; longer arcs leave nearer the centre. */
const startX = (j: number) => {
  const d = Math.abs(Q - j);
  const maxD = j < Q ? Q : WORDS.length - 1 - Q;
  return cx(Q) + (j < Q ? -1 : 1) * (4 + 4 * (maxD - d));
};

const headA: LayoutShape[] = [
  ...WORDS.flatMap((_, j): LayoutShape[] => {
    if (j === Q) return [];
    const a = Math.min(startX(j), cx(j));
    const b = Math.max(startX(j), cx(j));
    return [
      {
        id: `a-arc-${j}`,
        type: "path",
        x: 0,
        y: 0,
        points: arcPoints(a, b, arcHeightA(Math.abs(Q - j)), ROW_A),
        smooth: true,
        tone: A_TONE,
        weight: A_WEIGHTS[j],
      },
    ];
  }),
  {
    id: "a-w-server",
    type: "arrow",
    x: (startX(1) + cx(1)) / 2,
    y: ROW_A - arcHeightA(Q - 1),
    w: 0.1,
    h: 0,
    head: false,
    label: "0.52",
    tone: A_TONE,
  },
  ...wordRow("a", ROW_A, Q),
  text(
    "a-note",
    100,
    ROW_A + BOX_H + 14,
    680,
    "Head A resolves the pronoun: “it” reads mostly from “server” (0.52), then “request” (0.18).",
    A_TONE
  ),
];

// ── Head B: every word → the word before it ──────────────────────────────────────────────────────────────────

// The weighted arc runs down to the query word's top edge but stops TIP px above its left neighbour, where a short
// arrow with a normal-sized head (a path's head would grow with its weighted stroke) points down into the left neighbour.
const TIP = 9;
const headB: LayoutShape[] = [
  ...WORDS.flatMap((_, i): LayoutShape[] => {
    if (i === 0) return [];
    const key = cx(i - 1) + B_INSET;
    const query = cx(i) - B_INSET;
    return [
      {
        id: `b-arc-${i}`,
        type: "path",
        x: 0,
        y: 0,
        points: [...arcPoints(key, query, B_ARC_H - TIP, ROW_B - TIP), [query, ROW_B]],
        smooth: true,
        tone: B_TONE,
        weight: B_PREV[i],
      },
      { id: `b-tip-${i}`, type: "arrow", x: key, y: ROW_B - TIP - 1, w: 0, h: TIP, tone: B_TONE },
    ];
  }),
  ...wordRow("b", ROW_B),
  text(
    "b-note",
    100,
    ROW_B + BOX_H + 14,
    680,
    "Head B reads the previous word: each word puts 0.72–0.86 of its weight on its left neighbour.",
    B_TONE
  ),
];

const HEIGHT = B_Y + B_H + 44;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Two attention heads learn different jobs",
  width: 880,
  height: HEIGHT,
  groups: [
    { id: "g-a", title: "Head A: resolves the pronoun", tone: A_TONE, x: 16, y: A_Y, w: 848, h: A_H },
    { id: "g-b", title: "Head B: reads the previous word", tone: B_TONE, x: 16, y: B_Y, w: 848, h: B_H },
  ],
  shapes: [
    ...headA,
    ...headB,
    text(
      "legend",
      100,
      B_Y + B_H + 12,
      680,
      "Same sentence, same layer, two heads. Illustrative weights; each word's weights sum to 1.",
      "neutral"
    ),
  ],
};

export default spec;
