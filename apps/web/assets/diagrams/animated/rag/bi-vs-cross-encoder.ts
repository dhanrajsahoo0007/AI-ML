import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ADVANCED, CORPUS, LATENCY_MS, RAG_TONE, RESULTS, fmt, vector } from "@/components/diagrams/presets/rag";

// Deep dive, "Bi-encoder vs cross-encoder", with Brightpost's question and the chunk "No backup codes: verify your ID"
// (vector rank 7 in RESULTS, cosine 0.69).
// Left, bi-encoder (retrieval): the question and the chunk go through the encoder separately; each becomes a vector;
// the chunk's vector was made once at ingestion and waits in the index; one cosine compares the two (0.69).
// Right, cross-encoder (reranking): the question and the chunk go in together, as one input; the model reads them
// side by side and outputs one relevance score. CROSS_SCORE below is illustrative.
// Cost (illustrative, from LATENCY_MS): a cross-encoder runs once per pair, 100 pairs ≈ 120 ms.
//
// Layout (860 wide): two groups side by side; step 1 the bi-encoder, step 2 the cross-encoder.
// Tones (four plus neutral): the question orange, the chunk blue, the encoder and vectors pink, the cross-encoder and
// both scores lime.

/** Illustrative cross-encoder relevance for "No backup codes: verify your ID" (0..1; it reads "lost my phone" and
 * "no backup codes" together and scores the chunk high). Not from a measured model. */
const CROSS_SCORE = 0.91;

const chunk = RESULTS.find((r) => r.title === "No backup codes: verify your ID")!;

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone: LayoutShape["tone"],
  opts: { sub?: string; step?: number; fill?: LayoutShape["fill"]; type?: "box" | "cell" } = {}
): LayoutShape => ({
  id,
  type: opts.type ?? "box",
  x,
  y,
  w,
  h,
  label,
  sub: opts.sub,
  tone,
  fill: opts.fill ?? "pastel",
  step: opts.step,
});
const arrow = (id: string, from: string, to: string, step?: number): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
});

const VEC = { x: 330, n: 6, cell: 14 } as const;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Bi-encoder and cross-encoder on the same question and chunk",
  width: 860,
  height: 350,
  steps: [
    { title: "Bi-encoder: encode each text alone, compare the vectors" },
    { title: "Cross-encoder: read the question and the chunk together" },
  ],
  groups: [
    { id: "g-bi", title: "Bi-encoder: retrieval", tone: RAG_TONE.infra, x: 10, y: 24, w: 520, h: 312 },
    { id: "g-cross", title: "Cross-encoder: reranking", tone: RAG_TONE.infra, x: 550, y: 24, w: 300, h: 312 },
  ],
  shapes: [
    // Bi-encoder
    box("q", 30, 70, 140, 48, "Question", RAG_TONE.query, { sub: "lost my phone" }),
    box("enc-q", 200, 70, 100, 48, "Encoder", RAG_TONE.embedding),
    ...vector("qv", VEC.x, 87, VEC.n, RAG_TONE.embedding, { cell: VEC.cell }),
    box("c", 30, 190, 140, 48, "Chunk", RAG_TONE.text, { sub: "No backup codes" }),
    box("enc-c", 200, 190, 100, 48, "Encoder", RAG_TONE.embedding, { sub: "once, offline" }),
    ...vector("cv", VEC.x, 207, VEC.n, RAG_TONE.embedding, { cell: VEC.cell }),
    {
      id: "cv-note",
      type: "text",
      x: 306,
      y: 226,
      w: 132,
      h: 18,
      label: "kept in the index",
      tone: RAG_TONE.infra,
    },
    box("cos", 436, 124, 80, 56, `cosine\n${chunk.score.toFixed(2)}`, RAG_TONE.rank, { type: "cell", fill: "soft" }),
    arrow("a-q", "q", "enc-q"),
    arrow("a-qv", "enc-q", "qv-0"),
    arrow("a-c", "c", "enc-c"),
    arrow("a-cv", "enc-c", "cv-0"),
    arrow("a-qcos", `qv-${VEC.n - 1}`, "cos"),
    arrow("a-ccos", `cv-${VEC.n - 1}`, "cos"),
    {
      id: "bi-note",
      type: "text",
      x: 30,
      y: 268,
      w: 480,
      h: 40,
      label: `${fmt(CORPUS.chunks)} chunk vectors are made once, at ingestion.\nA question costs one encoding and one index search.`,
      tone: RAG_TONE.infra,
    },

    // Cross-encoder
    box("x-q", 570, 80, 128, 44, "Question", RAG_TONE.query, { step: 2 }),
    box("x-c", 702, 80, 128, 44, "Chunk", RAG_TONE.text, { step: 2 }),
    {
      id: "x-note",
      type: "text",
      x: 570,
      y: 54,
      w: 260,
      h: 18,
      label: "one input: both texts side by side",
      tone: RAG_TONE.infra,
      step: 2,
    },
    box("x-enc", 590, 156, 220, 52, "Cross-encoder", RAG_TONE.rank, { sub: "reads both at once", step: 2 }),
    box("x-score", 650, 234, 100, 44, `score ${CROSS_SCORE}`, RAG_TONE.rank, { type: "cell", fill: "soft", step: 2 }),
    arrow("a-xq", "x-q", "x-enc", 2),
    arrow("a-xc", "x-c", "x-enc", 2),
    arrow("a-xs", "x-enc", "x-score", 2),
    {
      id: "cross-note",
      type: "text",
      x: 570,
      y: 288,
      w: 260,
      h: 40,
      label: `One model run per pair:\n${ADVANCED.candidates} pairs ≈ ${LATENCY_MS.rerank100} ms (illustrative)`,
      tone: RAG_TONE.infra,
      step: 2,
    },
  ],
};

export default spec;
