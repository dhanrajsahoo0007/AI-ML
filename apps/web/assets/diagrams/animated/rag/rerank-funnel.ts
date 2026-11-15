import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ADVANCED, CORPUS, LATENCY_MS, RAG_TONE, funnel, fmt } from "@/components/diagrams/presets/rag";

// Core concept 6, reranking: retrieve wide and cheap, then rerank a short list with an expensive model. Brightpost's
// 3,600 chunks → the 100 nearest by vector search → the 5 the cross-encoder scores highest.
// Latencies are LATENCY_MS (presets/rag.ts), illustrative, not measured. Working:
// - vector search over all 3,600 vectors ≈ 15 ms (one approximate nearest-neighbour lookup)
// - reranking 100 pairs ≈ 120 ms, so about 1.2 ms per pair; reranking all 3,600 chunks the same way would take
//   3,600 / 100 × 120 ms = 4,320 ms ≈ 4.3 s per question
// - the 5 kept chunks are 5 × 400 = 2,000 tokens of context
//
// Layout (860 wide): the funnel() builder on the left (stage width linear in the candidate count, so 100 and 5 are
// both near the minimum width: the drop from 3,600 is the point), one note per stage on the right, the cost line
// underneath. Steps reveal one stage each.
// Tones (three plus neutral): all chunks blue, vector search violet, the reranker lime.

const perPairMs = LATENCY_MS.rerank100 / ADVANCED.candidates;
const rerankAllMs = (CORPUS.chunks / ADVANCED.candidates) * LATENCY_MS.rerank100;
const contextTokens = ADVANCED.keep * CORPUS.chunkTokens;

const STAGE = { y: 40, h: 50, gap: 34 } as const;
const stageY = (i: number) => STAGE.y + i * (STAGE.h + STAGE.gap);

const note = (i: number, label: string): LayoutShape => ({
  id: `note-${i}`,
  type: "text",
  x: 570,
  y: stageY(i) + 5,
  w: 280,
  h: 40,
  label,
  tone: RAG_TONE.infra,
  step: i + 1,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Retrieve wide, rerank narrow",
  width: 860,
  height: 340,
  steps: [
    { title: `All ${fmt(CORPUS.chunks)} chunks are candidates` },
    { title: `Vector search keeps the nearest ${ADVANCED.candidates}` },
    { title: `The reranker reads ${ADVANCED.candidates} pairs and keeps ${ADVANCED.keep}` },
  ],
  shapes: [
    ...funnel(
      "f",
      290,
      STAGE.y,
      [
        {
          label: "All chunks in the index",
          count: CORPUS.chunks,
          sub: `${fmt(CORPUS.chunks)} chunks`,
          tone: RAG_TONE.text,
          step: 1,
        },
        {
          label: "Vector search",
          count: ADVANCED.candidates,
          sub: `top ${ADVANCED.candidates}`,
          tone: RAG_TONE.store,
          step: 2,
        },
        { label: "Reranker", count: ADVANCED.keep, sub: `top ${ADVANCED.keep}`, tone: RAG_TONE.rank, step: 3 },
      ],
      { maxW: 520, minW: 200, h: STAGE.h, gap: STAGE.gap }
    ),
    note(0, `Made offline: ${fmt(CORPUS.chunks)} vectors\nwait in the index`),
    note(1, `≈ ${LATENCY_MS.vectorSearch} ms: one index lookup\nfinds the nearest ${ADVANCED.candidates}`),
    note(2, `≈ ${LATENCY_MS.rerank100} ms: the cross-encoder reads\n${ADVANCED.candidates} question-chunk pairs`),
    {
      id: "cost",
      type: "text",
      x: 30,
      y: stageY(3) + 2,
      w: 820,
      h: 40,
      label: `Reranking all ${fmt(CORPUS.chunks)} chunks would take ≈ ${(rerankAllMs / 1000).toFixed(1)} s (${perPairMs} ms per pair).\nThe ${ADVANCED.keep} kept chunks are ${ADVANCED.keep} × ${CORPUS.chunkTokens} = ${fmt(contextTokens)} tokens of context. Timings illustrative.`,
      tone: RAG_TONE.infra,
      step: 3,
    },
  ],
};

export default spec;
