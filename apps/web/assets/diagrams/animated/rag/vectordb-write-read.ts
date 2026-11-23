import type { DiagramSpec } from "@/components/diagrams/types";
import { CORPUS, RAG_TONE, TOP_K, fmt } from "@/components/diagrams/presets/rag";

// The two paths through a vector database, for Brightpost's help centre. Top lane, the write path: the 3,600 chunks
// are embedded, each vector is upserted with its metadata (article, URL, who may read it), the write log makes the
// write durable, and the ANN index makes it searchable. Bottom lane, the read path: the question is embedded by the
// same model; a metadata filter is built from who is asking; the ANN search walks the index with that filter applied
// and returns the top 5 chunk ids and scores to the RAG pipeline's prompt builder.
//
// Eight steps: 1 chunks are embedded · 2 each vector is upserted with its metadata · 3 the write log makes it durable
// · 4 the index makes it searchable · 5 a question is embedded by the same model · 6 the filter comes from who is
// asking · 7 the search walks the index with the filter applied · 8 the top 5 go back to the RAG pipeline. Nodes
// never move between steps.
//
// Layout (as the pilot's pipeline.ts): five columns at x 90 | 265 | 440 | 615 | 790, cards 150 wide. Rows: 95
// (write) | 290 (read) | 410 (the filter, under the search). The index-to-search edge runs in the corridor at y 192
// between the two zones; the user's groups reach the filter along y 410.
//
// Colour (RAG legend, four tones plus neutral): chunks blue, the embedding model pink, the write log, the index and
// the search violet, the metadata filter teal. The question and the prompt builder are neutral (the question stays
// the user's, as in the pilot). The index is the accent.

const X = [90, 265, 440, 615, 790] as const;
const ROW = { write: 95, read: 290, filter: 410 } as const;
const W = 150;

const spec: DiagramSpec = {
  title: "A vector database: the write path and the read path",
  width: 880,
  height: 470,
  steps: [
    { title: "Chunks are embedded" },
    { title: "Each vector is upserted with its metadata" },
    { title: "The write log makes it durable" },
    { title: "The index makes it searchable" },
    { title: "A question is embedded by the same model" },
    { title: "The filter comes from who is asking" },
    { title: "The search walks the index with the filter applied" },
    { title: `The top ${TOP_K} go back to the RAG pipeline` },
  ],
  zones: [
    { id: "write", title: "Write path: per chunk", tone: RAG_TONE.infra, x: 10, y: 40, w: 860, h: 115 },
    { id: "read", title: "Read path: per question", tone: RAG_TONE.infra, x: 10, y: 232, w: 860, h: 225 },
  ],
  nodes: [
    // Write path
    {
      id: "chunks",
      label: "Chunks",
      sub: `${fmt(CORPUS.chunks)} chunks`,
      icon: "chunk",
      tone: RAG_TONE.text,
      fill: "pastel",
      x: X[0],
      y: ROW.write,
      w: W,
    },
    {
      id: "embed",
      label: "Embed",
      sub: `${fmt(CORPUS.dims)} numbers`,
      icon: "embedder",
      tone: RAG_TONE.embedding,
      fill: "pastel",
      x: X[1],
      y: ROW.write,
      w: W,
    },
    {
      id: "upsert",
      label: "Upsert",
      sub: "with metadata",
      icon: "api",
      tone: RAG_TONE.infra,
      fill: "pastel",
      step: 2,
      x: X[2],
      y: ROW.write,
      w: W,
    },
    {
      id: "wal",
      label: "Write log",
      sub: "durable first",
      icon: "log",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 3,
      x: X[3],
      y: ROW.write,
      w: W,
    },
    {
      id: "index",
      label: "ANN index",
      sub: `${fmt(CORPUS.chunks)} vectors`,
      icon: "vector-index",
      tone: RAG_TONE.store,
      accent: true,
      step: 4,
      x: X[4],
      y: ROW.write,
      w: W,
    },

    // Read path
    {
      id: "question",
      label: "Question",
      sub: "lost my phone",
      icon: "users",
      tone: RAG_TONE.infra,
      step: 5,
      x: X[0],
      y: ROW.read,
      w: W,
    },
    {
      id: "qembed",
      label: "Embed",
      sub: "the same model",
      icon: "embedder",
      tone: RAG_TONE.embedding,
      fill: "pastel",
      step: 5,
      x: X[1],
      y: ROW.read,
      w: W,
    },
    {
      id: "filter",
      label: "Filter",
      sub: "user may read",
      icon: "shield",
      tone: RAG_TONE.keyword,
      fill: "pastel",
      step: 6,
      x: X[2],
      y: ROW.filter,
      w: W,
    },
    {
      id: "search",
      label: "ANN search",
      sub: "filter inside",
      icon: "search",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 7,
      x: X[2],
      y: ROW.read,
      w: W,
    },
    {
      id: "topk",
      label: `Top ${TOP_K} chunks`,
      sub: "ids + scores",
      icon: "chunk",
      tone: RAG_TONE.text,
      fill: "pastel",
      step: 8,
      x: X[3],
      y: ROW.read,
      w: W,
    },
    {
      id: "prompt",
      label: "Build prompt",
      sub: "RAG pipeline",
      icon: "prompt",
      tone: RAG_TONE.infra,
      step: 8,
      x: X[4],
      y: ROW.read,
      w: W,
    },
  ],
  edges: [
    // Write path: one packet runs the lane.
    { from: "chunks", to: "embed", packet: true },
    { from: "embed", to: "upsert", packet: true, delay: 0.6 },
    { from: "upsert", to: "wal", packet: true, delay: 1.2 },
    { from: "wal", to: "index", packet: true, delay: 1.8 },

    // Read path: the question vector and the filter meet in the search, which reads the index.
    { from: "question", to: "qembed", packet: true },
    { from: "qembed", to: "search", packet: true, delay: 0.6 },
    {
      from: "question",
      to: "filter",
      label: "user's groups",
      dashed: true,
      labelAt: 0.6,
      via: [[X[0], ROW.filter]],
    },
    { from: "filter", to: "search", packet: true, delay: 0.6 },
    {
      from: "index",
      to: "search",
      label: "graph walk",
      packet: true,
      delay: 1.2,
      step: 7,
      via: [
        [X[4], 192],
        [X[2], 192],
      ],
    },
    { from: "search", to: "topk", packet: true, delay: 1.8 },
    { from: "topk", to: "prompt", packet: true, delay: 2.4 },
  ],
};

export default spec;
