import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE } from "@/components/diagrams/presets/transformer";

// One attention head following a long-range dependency: our own counterpart of Figure 3 in "Attention Is All You
// Need" (Vaswani et al., 2017), which draws one head's attention from a single word to every other word as lines
// whose strength shows the weight. Our sentence: "The server dropped the request because it was overloaded". The
// query word is "it"; an orange arc runs from "it" to every other word, and the arc's thickness and opacity are the
// attention weight (the engine maps weight w to stroke width 1 + 3w and opacity 0.25 + 0.75w).
//
// Illustrative weights for the query "it" (made up for teaching, not measured from a trained model). They are one
// softmax row, so they sum to 1, and "it" keeps some weight on itself:
//   The 0.03, server 0.52, dropped 0.04, the 0.03, request 0.18, because 0.04, it 0.08, was 0.03, overloaded 0.05
//   0.03 + 0.52 + 0.04 + 0.03 + 0.18 + 0.04 + 0.08 + 0.03 + 0.05 = 1.00
// "server" is the referent, so it is clearly strongest; "request" is the other candidate noun, so it is second.
//
// Facts checked against arXiv 1706.03762 v7: §3.2.1, attention weights are softmax(QKᵀ / √d_k), one softmax per
// query, so each query's weights sum to 1; Figure 3 shows one head attending from a word to a distant word it
// depends on. The figure makes no claim about which layer or head this is.

const WORDS = ["The", "server", "dropped", "the", "request", "because", "it", "was", "overloaded"];
const WEIGHTS = [0.03, 0.52, 0.04, 0.03, 0.18, 0.04, 0.08, 0.03, 0.05];
const Q = 6; // "it"
const HL = ROLE_TONE.attention;

// Word row: 9 boxes on a 92 px grid, centred on the 880 px canvas.
const STEP = 92;
const BOX_W = 80;
const BOX_H = 40;
const cx = (i: number) => 440 - (STEP * (WORDS.length - 1)) / 2 + i * STEP;
const ARC_TOP = 74;
/** Arc height grows with distance; h / √span increases with distance, so arcs sharing the "it" end never cross. */
const arcHeight = (d: number) => 26 + 28 * d;
const ROW_Y = ARC_TOP + arcHeight(Q) + 4;
const CELL_W = 48;
const CELL_H = 24;
const CELL_Y = ROW_Y + BOX_H + 10;

const text = (id: string, x: number, y: number, w: number, label: string, tone: LayoutTone = "neutral", h = 20) =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;

/** A pill with no visible line: a 0.1 px arrow, so the label sits exactly on an arc's peak. */
const pill = (id: string, x: number, y: number, label: string): LayoutShape => ({
  id,
  type: "arrow",
  x,
  y,
  w: 0.1,
  h: 0,
  head: false,
  label,
  tone: HL,
});

/** A half-ellipse from x = a to x = b over the word row, sampled at 13 points and drawn smooth. */
function arcPoints(a: number, b: number, h: number): [number, number][] {
  return Array.from({ length: 13 }, (_, k) => {
    const t = (Math.PI * k) / 12;
    const x = (a + b) / 2 - ((b - a) / 2) * Math.cos(t);
    return [Math.round(x * 10) / 10, Math.round((ROW_Y - h * Math.sin(t)) * 10) / 10];
  });
}

const words: LayoutShape[] = WORDS.map((w, i) => ({
  id: `word-${i}`,
  type: "box",
  x: cx(i) - BOX_W / 2,
  y: ROW_Y,
  w: BOX_W,
  h: BOX_H,
  label: w,
  ...(i === Q ? { sub: "query" } : {}),
  tone: i === Q ? ROLE_TONE.query : "neutral",
  fill: "pastel",
}));

/**
 * Where an arc leaves "it": leftward arcs on the left half of its top edge, rightward ones on the right half, fanned
 * so that a longer arc leaves nearer the centre and the bundle stays nested instead of meeting in one point.
 */
const startX = (j: number) => {
  const d = Math.abs(Q - j);
  const maxD = j < Q ? Q : WORDS.length - 1 - Q;
  return cx(Q) + (j < Q ? -1 : 1) * (4 + 4 * (maxD - d));
};

const arcs: LayoutShape[] = WORDS.flatMap((_, j): LayoutShape[] => {
  if (j === Q) return [];
  const start = startX(j);
  const end = cx(j);
  return [
    {
      id: `arc-${j}`,
      type: "path",
      x: 0,
      y: 0,
      points: arcPoints(Math.min(start, end), Math.max(start, end), arcHeight(Math.abs(Q - j))),
      smooth: true,
      tone: HL,
      weight: WEIGHTS[j],
    },
  ];
});

const peak = (j: number) => ROW_Y - arcHeight(Math.abs(Q - j));
const midX = (j: number) => (startX(j) + cx(j)) / 2;
const labels: LayoutShape[] = [pill("w-server", midX(1), peak(1), "0.52"), pill("w-request", midX(4), peak(4), "0.18")];

const weightRow: LayoutShape[] = WEIGHTS.map((w, i) => ({
  id: `w-${i}`,
  type: "cell",
  x: cx(i) - CELL_W / 2,
  y: CELL_Y,
  w: CELL_W,
  h: CELL_H,
  tone: ROLE_TONE.weight,
  weight: w,
  label: w.toFixed(2),
  quiet: true,
}));

const notes: LayoutShape[] = [
  text(
    "note",
    120,
    CELL_Y + CELL_H + 12,
    640,
    "Weights of the query “it” over every word (illustrative weights; they sum to 1).\nThicker, stronger arcs carry more weight: “it” reads mostly from “server”.",
    "neutral",
    34
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "One attention head links “it” to “server”",
  width: 880,
  height: CELL_Y + CELL_H + 66,
  groups: [
    {
      id: "g-head",
      title: "One attention head, query “it”",
      tone: HL,
      x: 16,
      y: 40,
      w: 848,
      h: CELL_Y + CELL_H + 52 - 40,
    },
  ],
  shapes: [...arcs, ...labels, ...words, ...weightRow, ...notes],
};

export default spec;
