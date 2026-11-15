import type { DiagramSpec } from "@/components/diagrams/types";
import { CORPUS, FRESHNESS, RAG_TONE, fmt } from "@/components/diagrams/presets/rag";

// The embedding batch pipeline, built in six steps. Top row: changed chunks → a durable queue → a batcher → a cache
// keyed by content hash → the vector index (accent). Bottom row: cache misses go to the embedding model; a rate-limit
// or timeout error (red) puts the batch back on the queue after a wait (backoff); the model's vectors are upserted by
// chunk id, so a retried batch overwrites instead of duplicating.
//
// Numbers (CORPUS, FRESHNESS; BATCH_CHUNKS is local and illustrative):
// - Weekly run: FRESHNESS.reembedChunks = 36 chunks → 1 request of 36 × 400 = 14,400 tokens.
// - Full run: CORPUS.chunks = 3,600 chunks → 3,600 / 100 = 36 requests, CORPUS.embedTokens = 1,440,000 tokens.
// - Re-running the full job with the same model: every hash is in the cache, so 0 tokens reach the model.
//
// Steps: 1 changed chunks go onto a queue · 2 a batcher groups them · 3 the cache skips text already embedded ·
// 4 misses go to the embedding model · 5 rate limits and timeouts: wait, then re-queue · 6 vectors are upserted by
// chunk id. Grid: columns x 95 | 315 | 535 | 775, cards 170 wide; rows 60 | 195 | 330. The top row is the intake
// (chunks → queue → batcher); the batcher drops into the cache; hits go right to the index, misses down to the model;
// a failed call goes left to the error card and back up to the queue.
//
// Colour (four tones plus neutral): chunks blue, the model pink, the cache and the index violet, the error red; the
// queue and the batcher neutral.

/** Chunks per embedding request (illustrative; providers cap inputs per request and tokens per minute). */
const BATCH_CHUNKS = 100;
const FULL_REQUESTS = Math.ceil(CORPUS.chunks / BATCH_CHUNKS);

const X = [95, 315, 535, 775] as const;
const ROW = { top: 60, mid: 195, bottom: 330 } as const;
const W = 170;

const spec: DiagramSpec = {
  title: "Embedding batch pipeline: queue, batch, skip what is cached, retry, upsert",
  width: 880,
  height: 395,
  steps: [
    { title: "Changed chunks go onto a queue" },
    { title: `A batcher groups them: ${FULL_REQUESTS} calls for a full run` },
    { title: "A cache keyed by content hash skips text already embedded" },
    { title: "Misses go to the embedding model" },
    { title: "Rate limits and timeouts: wait, then re-queue" },
    { title: "Vectors are upserted by chunk id" },
  ],
  zones: [],
  nodes: [
    {
      id: "chunks",
      label: "Changed chunks",
      sub: `${FRESHNESS.reembedChunks} this week`,
      icon: "chunk",
      tone: RAG_TONE.text,
      fill: "pastel",
      x: X[0],
      y: ROW.top,
      w: W,
    },
    {
      id: "queue",
      label: "Queue",
      sub: "durable",
      icon: "queue",
      tone: RAG_TONE.infra,
      x: X[1],
      y: ROW.top,
      w: W,
    },
    {
      id: "batcher",
      label: "Batcher",
      sub: `${BATCH_CHUNKS} per call`,
      icon: "pipeline",
      tone: RAG_TONE.infra,
      fill: "soft",
      step: 2,
      x: X[2],
      y: ROW.top,
      w: W,
    },
    {
      id: "cache",
      label: "Hash cache",
      sub: "text + model",
      icon: "hash",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 3,
      x: X[2],
      y: ROW.mid,
      w: W,
    },
    {
      id: "model",
      label: "Embedding model",
      sub: `${fmt(CORPUS.dims)} dims`,
      icon: "embedder",
      tone: RAG_TONE.embedding,
      fill: "pastel",
      step: 4,
      x: X[2],
      y: ROW.bottom,
      w: W,
    },
    {
      id: "error",
      label: "429 or timeout",
      sub: "wait and retry",
      icon: "alert-triangle",
      tone: RAG_TONE.failure,
      fill: "pastel",
      step: 5,
      x: X[1],
      y: ROW.bottom,
      w: W,
    },
    {
      id: "index",
      label: "Vector index",
      sub: "upsert by id",
      icon: "vector-index",
      tone: RAG_TONE.store,
      accent: true,
      step: 6,
      x: X[3],
      y: ROW.mid,
      w: W,
    },
  ],
  edges: [
    { from: "chunks", to: "queue", packet: true },
    { from: "queue", to: "batcher", packet: true, delay: 0.6 },
    { from: "batcher", to: "cache", label: "hash each chunk", packet: true, delay: 1.2 },
    { from: "cache", to: "index", label: "hits", packet: true, delay: 1.8 },
    { from: "cache", to: "model", label: "misses only", packet: true, delay: 1.8 },
    { from: "model", to: "error", label: "fails", tone: RAG_TONE.failure, dashed: true },
    { from: "error", to: "queue", label: "re-queue", dashed: true },
    {
      from: "model",
      to: "index",
      label: "new vectors",
      packet: true,
      delay: 2.4,
      via: [[X[3], ROW.bottom]],
    },
  ],
};

export default spec;
