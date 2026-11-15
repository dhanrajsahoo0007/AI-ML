import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ARTICLES, QUESTIONS, RAG_TONE, scatter, type ScatterPoint } from "@/components/diagrams/presets/rag";

// Embedding space as a 2-D sketch (the real space has 1,536 dimensions). Brightpost's help articles fall into topic
// clusters: account and sign-in, orders and delivery, returns and refunds. Step 2: the main question lands inside the
// sign-in cluster, next to the two articles that answer it. Step 3: a paraphrase that shares almost no words with
// the question ("Can't log in, phone was stolen") lands in the same place, because the embedding encodes meaning, not
// spelling. Positions are illustrative.
//
// Tones (two): chunks pink, questions orange; cluster names neutral.

const PLOT = { x: 30, y: 40, w: 560, h: 330 } as const;

const pts = (cluster: string, centre: [number, number], offsets: [number, number][]): ScatterPoint[] =>
  offsets.map(([dx, dy], i) => ({ id: `${cluster}${i}`, x: centre[0] + dx, y: centre[1] + dy, kind: "chunk" }));

const account = pts(
  "acc",
  [0.3, 0.32],
  [
    [-0.14, -0.1],
    [0.02, -0.16],
    [-0.18, 0.04],
    [-0.06, 0.16],
    [0.12, -0.16],
  ]
);
const answers: ScatterPoint[] = [
  { id: "reset", x: 0.34, y: 0.28, kind: "relevant", label: ARTICLES.reset, step: 1 },
  { id: "tfa", x: 0.25, y: 0.42, kind: "relevant", label: ARTICLES.twoFactor, step: 1 },
];
const orders = pts(
  "ord",
  [0.84, 0.22],
  [
    [-0.08, -0.06],
    [0.05, -0.1],
    [0.1, 0.05],
    [-0.04, 0.09],
    [0.12, -0.02],
    [-0.12, 0.03],
  ]
);
const returns = pts(
  "ret",
  [0.66, 0.78],
  [
    [-0.1, -0.05],
    [0.03, -0.1],
    [0.12, 0.02],
    [-0.03, 0.08],
    [0.09, 0.12],
  ]
);
const questions: ScatterPoint[] = [
  { id: "q", x: 0.3, y: 0.35, kind: "query", step: 2 },
  { id: "q2", x: 0.33, y: 0.38, kind: "query", step: 3 },
];

const label = (
  id: string,
  x: number,
  y: number,
  w: number,
  text: string,
  step = 1,
  tone: LayoutTone = RAG_TONE.infra
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 20,
  label: text,
  tone,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Embedding space: similar meanings land close together",
  width: 860,
  height: 390,
  steps: [
    { title: "Articles cluster by topic" },
    { title: "The question lands next to its answers" },
    { title: "A paraphrase with other words lands in the same place" },
  ],
  shapes: [
    ...scatter("sp", PLOT.x, PLOT.y, PLOT.w, PLOT.h, [...account, ...answers, ...orders, ...returns, ...questions], {
      dot: 14,
      labelLeft: [],
    }),
    label("c-acc", 40, 48, 200, "Account and sign-in"),
    label("c-ord", 400, 48, 200, "Orders and delivery"),
    label("c-ret", 250, 344, 200, "Returns and refunds"),
    // The two questions, written beside the plot.
    {
      id: "q-text",
      type: "box",
      x: 610,
      y: 110,
      w: 230,
      h: 54,
      label: QUESTIONS.main.replace(" if ", "\nif "),
      tone: RAG_TONE.query,
      fill: "pastel",
      step: 2,
    },
    {
      id: "q2-text",
      type: "box",
      x: 610,
      y: 200,
      w: 230,
      h: 54,
      label: '"Can\'t log in,\nphone was stolen"',
      tone: RAG_TONE.query,
      fill: "pastel",
      step: 3,
    },
    label("q2-note", 610, 262, 230, "almost no shared words,", 3),
    label("q2-note2", 610, 280, 230, "same neighbourhood", 3),
    label("q-head", 610, 80, 230, "Questions (orange dots)", 2, RAG_TONE.query),
  ],
};

export default spec;
