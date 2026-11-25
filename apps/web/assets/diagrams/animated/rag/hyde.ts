import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import {
  CORPUS,
  QUESTIONS,
  RAG_TONE,
  fmt,
  scatter,
  vector,
  type ScatterPoint,
} from "@/components/diagrams/presets/rag";

// HyDE, hypothetical document embeddings (Gao, Ma, Lin and Callan, 2022, arXiv 2212.10496): an instruction-following
// LLM writes a hypothetical document that answers the question; an encoder embeds that document (not the question);
// the vector "identifies a neighborhood in the corpus embedding space", and the real documents near it are returned.
// The guess may contain false details; the paper relies on the encoder's dense bottleneck to filter them out.
//
// Brightpost's main question is short and chatty, so its vector lands among "change your password" and "phone"
// articles. A guessed answer reads like a help article, so its vector lands among the three chunks the answer needs.
// Positions are illustrative (a 2-D sketch of 1,536 dimensions).
//
// Layout (860 wide): left column, the flow top to bottom (question, the guessed answer, the embedder and its vector);
// right, the embedding space. Steps: 1 the question alone · 2 the LLM writes a guess · 3 the guess is embedded ·
// 4 the nearest real chunks are returned.
//
// Tones (two plus neutral): the question, the guess and the ring orange (the question and its rewrites); the embedder,
// the vectors and the chunk points pink. The guessed answer is a rewrite of the question, so it stays orange, not
// green: it is never shown to the customer.

const PLOT = { x: 410, y: 50, w: 430, h: 320 } as const;
const COL = { x: 20, w: 320 } as const;

/** Chunks near the question: they share its words but do not help someone who lost their phone. */
const nearQuestion: ScatterPoint[] = [
  { id: "change", x: 0.68, y: 0.38, kind: "chunk", label: "Change password" },
  { id: "phone", x: 0.44, y: 0.34, kind: "chunk", label: "Update phone" },
  { id: "setup", x: 0.8, y: 0.2, kind: "chunk" },
];
/** The three chunks the answer needs (RESULTS ranks 2, 4 and 7). */
const relevant: ScatterPoint[] = [
  { id: "reset", x: 0.433, y: 0.694, kind: "relevant", label: "Reset password" },
  { id: "backup", x: 0.451, y: 0.781, kind: "relevant", label: "Backup code" },
  { id: "verify", x: 0.428, y: 0.869, kind: "relevant", label: "ID check" },
];
/** Other topics (orders, returns), far from both. */
const far: ScatterPoint[] = [
  [0.82, 0.68],
  [0.9, 0.8],
  [0.82, 0.92],
  [0.93, 0.6],
  [0.07, 0.1],
  [0.16, 0.2],
  [0.06, 0.3],
].map(([x, y], i) => ({ id: `f${i}`, x, y, kind: "chunk" }));

const Q = { id: "q", x: 0.56, y: 0.3, kind: "query", label: "question", step: 1 } as const satisfies ScatterPoint;
const H = { id: "h", x: 0.349, y: 0.781, kind: "query", step: 3 } as const satisfies ScatterPoint;
const at = (p: { x: number; y: number }) => [PLOT.x + p.x * PLOT.w, PLOT.y + p.y * PLOT.h] as const;

const VEC = { x: 186, y: 296, n: 10, cell: 14 } as const;

const flow: LayoutShape[] = [
  {
    id: "question",
    type: "box",
    x: COL.x,
    y: 40,
    w: COL.w,
    h: 52,
    label: QUESTIONS.main.replace(" if ", "\nif "),
    tone: RAG_TONE.query,
    fill: "pastel",
  },
  {
    id: "guess",
    type: "box",
    x: COL.x,
    y: 150,
    w: COL.w,
    h: 86,
    label: "Sign in with a backup code, then\nreset your password. No codes?\nVerify your ID with support.",
    sub: "hypothetical answer, may be wrong",
    tone: RAG_TONE.query,
    fill: "pastel",
    step: 2,
  },
  {
    id: "to-guess",
    type: "arrow",
    x: 0,
    y: 0,
    from: "question",
    to: "guess",
    label: "an LLM writes a guess",
    step: 2,
  },
  {
    id: "embed",
    type: "box",
    x: COL.x,
    y: 284,
    w: 140,
    h: 38,
    label: "Embed the guess",
    tone: RAG_TONE.embedding,
    fill: "pastel",
    step: 3,
  },
  { id: "to-embed", type: "arrow", x: 0, y: 0, from: "guess", to: "embed", step: 3 },
  ...vector("hv", VEC.x, VEC.y, VEC.n, RAG_TONE.embedding, { cell: VEC.cell, step: 3 }),
  { id: "to-vec", type: "arrow", x: 0, y: 0, from: "embed", to: "hv-0", step: 3 },
  {
    id: "vec-label",
    type: "text",
    x: VEC.x - 10,
    y: VEC.y + 20,
    w: VEC.n * VEC.cell + 20,
    h: 18,
    label: `${fmt(CORPUS.dims)} numbers`,
    tone: RAG_TONE.infra,
    step: 3,
  },
];

const [qx, qy] = at(Q);
const [hx, hy] = at(H);
const links: LayoutShape[] = [
  {
    id: "q-search",
    type: "arrow",
    x: 0,
    y: 0,
    from: "question",
    to: "sp-q",
    via: [[qx, 66]],
    label: "embed and search",
  },
  { id: "h-search", type: "arrow", x: 0, y: 0, from: `hv-${VEC.n - 1}`, to: "sp-h", step: 3 },
];

/**
 * The nearest neighbours of the guess: a dashed ellipse (not the builder's circle) so it can hold the three chunks
 * with their labels and nothing else. Centre (600, 302), radii 135 × 60.
 */
const RING = { cx: 600, cy: 302, rx: 135, ry: 60 } as const;
const ring: LayoutShape = {
  id: "ring",
  type: "path",
  x: 0,
  y: 0,
  points: Array.from({ length: 49 }, (_, i): [number, number] => {
    const a = (2 * Math.PI * i) / 48;
    return [Math.round(RING.cx + RING.rx * Math.cos(a)), Math.round(RING.cy + RING.ry * Math.sin(a))];
  }),
  smooth: true,
  dashed: true,
  tone: RAG_TONE.query,
  step: 4,
};

const notes: LayoutShape[] = [
  { id: "h-label", type: "text", x: hx - 30, y: hy - 38, w: 60, h: 18, label: "guess", tone: RAG_TONE.query, step: 3 },
  {
    id: "plot-title",
    type: "text",
    x: PLOT.x,
    y: PLOT.y + PLOT.h + 8,
    w: PLOT.w,
    h: 20,
    label: "Embedding space (a 2-D sketch, illustrative positions)",
    tone: RAG_TONE.infra,
  },
  {
    id: "q-note",
    type: "text",
    x: qx + 20,
    y: qy + 48,
    w: PLOT.x + PLOT.w - (qx + 20) - 4,
    h: 38,
    label: 'near words like\n"change" and "phone"',
    tone: RAG_TONE.infra,
  },
  {
    id: "result",
    type: "text",
    x: COL.x,
    y: 350,
    w: COL.w + 40,
    h: 40,
    label: `All 3 chunks the answer needs sit near the guess;\nsearch returns them, never the guess itself`,
    tone: RAG_TONE.infra,
    step: 4,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "HyDE: search with a guessed answer instead of the question",
  width: 860,
  height: 410,
  steps: [
    { title: "Searched as typed, the question lands near the wrong articles" },
    { title: "An LLM writes a hypothetical answer" },
    { title: "The answer is embedded, not the question" },
    { title: "Search returns the real chunks nearest the answer" },
  ],
  shapes: [
    ...flow,
    ...scatter("sp", PLOT.x, PLOT.y, PLOT.w, PLOT.h, [Q, H, ...nearQuestion, ...relevant, ...far], {
      labelLeft: ["phone"],
    }),
    ring,
    ...links,
    ...notes,
  ],
};

export default spec;
