import type { DiagramSpec } from "@/components/diagrams/types";
import { ADVANCED, CORPUS, RAG_TONE, TOP_K, fmt } from "@/components/diagrams/presets/rag";

// Hybrid retrieval as a system: one question runs a BM25 search (teal) and a vector search (violet) in parallel; each
// returns its top 100; reciprocal rank fusion (RRF, k = 60, Cormack et al. 2009) merges the two lists by rank; a
// cross-encoder reranker reads the fused top 100 and keeps 5 for the prompt. Both searches apply the same metadata
// filter (tenant, access), so the two lists are drawn from the same permitted chunks.
//
// Numbers: each search returns ADVANCED.candidates = 100 (the same depth the reranker reads); the fused list is cut
// to 100; the reranker keeps TOP_K = 5, 5 × 400 = 2,000 tokens of context. Timings stay in the page text
// (LATENCY_MS, illustrative).
//
// Steps: 1 two searches in parallel · 2 RRF fuses the lists · 3 the reranker keeps 5 · 4 both searches share one
// filter. Nodes never move.
// Layout: columns x 80 | 250 | 450 | 630 | 800 (cards 150 wide). BM25 sits above the middle row (y 50), vector search
// below it (y 230), the filter between them (y 140). The question reaches each search by an elbow up or down its
// own column; each search reaches fusion by an elbow along its row, so the "top 100" labels sit on long straight runs.
// Colour (four tones plus neutral): the question orange, BM25 and the filter teal (keyword index and metadata
// filters), vector search violet, fusion and the reranker lime; the top-5 card is neutral. The reranker is the accent.

const X = [80, 250, 450, 630, 800] as const;
const ROW = { bm25: 50, mid: 140, vector: 230 } as const;
const W = 150;
const N = ADVANCED.candidates;

const spec: DiagramSpec = {
  title: "Hybrid search: two searches, one fused list, one reranker",
  width: 880,
  height: 280,
  steps: [
    { title: "One question runs two searches in parallel" },
    { title: `Each returns its top ${N}; RRF fuses them by rank` },
    { title: `A cross-encoder reranks the fused ${N} and keeps ${TOP_K}` },
    { title: "Both searches apply the same filter" },
  ],
  zones: [],
  nodes: [
    {
      id: "question",
      label: "Question",
      sub: "one query",
      icon: "chat",
      tone: RAG_TONE.query,
      fill: "pastel",
      x: X[0],
      y: ROW.mid,
      w: W,
    },
    {
      id: "bm25",
      label: "BM25 search",
      sub: "inverted index",
      icon: "search",
      tone: RAG_TONE.keyword,
      fill: "pastel",
      x: X[1],
      y: ROW.bm25,
      w: W,
    },
    {
      id: "vector",
      label: "Vector search",
      sub: `${fmt(CORPUS.chunks)} vectors`,
      icon: "vector-index",
      tone: RAG_TONE.store,
      fill: "pastel",
      x: X[1],
      y: ROW.vector,
      w: W,
    },
    {
      id: "fusion",
      label: "RRF fusion",
      sub: `k = ${ADVANCED.rrfK}, by rank`,
      icon: "git-merge",
      tone: RAG_TONE.rank,
      fill: "pastel",
      step: 2,
      x: X[2],
      y: ROW.mid,
      w: W,
    },
    {
      id: "reranker",
      label: "Reranker",
      sub: `keeps ${TOP_K} of ${N}`,
      icon: "reranker",
      tone: RAG_TONE.rank,
      accent: true,
      step: 3,
      x: X[3],
      y: ROW.mid,
      w: W,
    },
    {
      id: "top",
      label: `Top ${TOP_K} chunks`,
      sub: `${fmt(TOP_K * CORPUS.chunkTokens)} tokens`,
      icon: "chunk",
      tone: RAG_TONE.infra,
      step: 3,
      x: X[4],
      y: ROW.mid,
      w: W,
    },
    {
      id: "filter",
      label: "Filter",
      sub: "tenant, access",
      icon: "shield",
      tone: RAG_TONE.keyword,
      fill: "soft",
      step: 4,
      x: X[1],
      y: ROW.mid,
      w: W,
    },
  ],
  edges: [
    { from: "question", to: "bm25", packet: true, via: [[X[0], ROW.bm25]] },
    { from: "question", to: "vector", packet: true, via: [[X[0], ROW.vector]] },
    { from: "bm25", to: "fusion", label: `top ${N}`, packet: true, delay: 0.8, labelAt: 0.35, via: [[X[2], ROW.bm25]] },
    {
      from: "vector",
      to: "fusion",
      label: `top ${N}`,
      packet: true,
      delay: 0.8,
      labelAt: 0.35,
      via: [[X[2], ROW.vector]],
    },
    { from: "fusion", to: "reranker", packet: true, delay: 1.6 },
    { from: "reranker", to: "top", packet: true, delay: 2.4 },
    { from: "question", to: "filter", dashed: true, step: 4 },
    { from: "filter", to: "bm25", dashed: true },
    { from: "filter", to: "vector", dashed: true },
  ],
};

export default spec;
