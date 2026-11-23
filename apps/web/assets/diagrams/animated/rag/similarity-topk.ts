import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { RAG_TONE, RESULTS, TOP_K, rankList, scatter, type ScatterPoint } from "@/components/diagrams/presets/rag";

// Core concepts 4 to 6: embeddings, the vector index and retrieval, drawn as a 2-D picture of the embedding space
// (the real space has 1,536 dimensions; 2-D is a teaching sketch). Every chunk is a pink point; the question
// "How do I reset my password if I lost my phone?" is the orange point in the middle.
//
// The ten nearest chunks are RESULTS (presets/rag.ts), numbered by rank. Each sits at a distance from the question
// that grows as its cosine similarity falls: distance = (0.9 - score) × 600 viewBox units, so rank 1 (0.82) is 48
// away and rank 10 (0.61) is 174 away. The dashed ring has radius 105: it holds ranks 1 to 5 (≤ 96 away) and nothing
// else; rank 6 (114) and rank 7 (126) sit just outside. Rank 7, "No backup codes: verify your ID", is relevant, so
// top-5 retrieval misses it: the setup for "Where RAG fails" and for reranking.
//
// Tones (four): chunks pink, the question and the ring orange, result titles blue, the miss red. Scores stay neutral.

const PLOT = { x: 30, y: 50, w: 400, h: 340 } as const;
const CENTRE = { x: 0.5, y: 0.5 } as const;
/** Angle in degrees for each rank, chosen so the numbered points do not collide. */
const ANGLE = [200, 320, 95, 30, 250, 150, 5, 285, 120, 60];

const near: ScatterPoint[] = RESULTS.map((r, i) => {
  const d = (0.9 - r.score) * 600;
  const a = (ANGLE[i] * Math.PI) / 180;
  return {
    id: `r${i + 1}`,
    x: Math.round((CENTRE.x + (d * Math.cos(a)) / PLOT.w) * 1000) / 1000,
    y: Math.round((CENTRE.y + (d * Math.sin(a)) / PLOT.h) * 1000) / 1000,
    label: String(i + 1),
    kind: r.relevant ? "relevant" : "chunk",
  };
});

/** The rest of the 3,600 chunks: other topics, far from the question. */
const far: ScatterPoint[] = [
  [0.06, 0.08],
  [0.14, 0.05],
  [0.09, 0.17],
  [0.2, 0.12],
  [0.88, 0.9],
  [0.94, 0.82],
  [0.97, 0.7],
  [0.92, 0.95],
  [0.07, 0.9],
  [0.94, 0.08],
].map(([x, y], i) => ({ id: `f${i}`, x, y, kind: "chunk" }));

const list = rankList("list", 470, 50, RESULTS, {
  w: 220,
  rowH: 30,
  gap: 4,
  cut: TOP_K,
  cutLabel: `top ${TOP_K}`,
  scoreTone: RAG_TONE.infra,
  stepOf: (rank) => (rank <= TOP_K ? 2 : 3),
  step: 2,
});

const missed: LayoutShape[] = [
  {
    id: "miss",
    type: "text",
    x: 470,
    y: 400,
    w: 330,
    h: 20,
    label: "Rank 7 is relevant but outside the top 5",
    tone: RAG_TONE.failure,
    step: 3,
  },
  {
    id: "miss-plot",
    type: "text",
    x: 30,
    y: 400,
    w: 400,
    h: 20,
    label: "missed: just outside the ring",
    tone: RAG_TONE.failure,
    step: 3,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Similarity search: the question's nearest chunks become the top 5",
  width: 860,
  height: 430,
  steps: [
    { title: "Every chunk is a point; the question lands among them" },
    { title: `The ${TOP_K} nearest chunks go into the prompt` },
    { title: "A relevant chunk ranked 7th is left out" },
  ],
  shapes: [
    {
      id: "plot-title",
      type: "text",
      x: PLOT.x,
      y: 22,
      w: PLOT.w,
      h: 20,
      label: "Embedding space (a 2-D sketch of 1,536 dimensions)",
      tone: RAG_TONE.infra,
    },
    ...scatter(
      "sp",
      PLOT.x,
      PLOT.y,
      PLOT.w,
      PLOT.h,
      [{ id: "q", ...CENTRE, kind: "query", label: "question" }, ...near, ...far],
      {
        ring: { around: "q", r: 105, step: 2 },
        dot: 14,
        labelLeft: ["r4", "r6"],
      }
    ),
    {
      id: "list-title",
      type: "text",
      x: 470,
      y: 22,
      w: 324,
      h: 20,
      label: "Nearest chunks by cosine similarity",
      tone: RAG_TONE.infra,
      step: 2,
    },
    ...list,
    ...missed,
  ],
};

export default spec;
