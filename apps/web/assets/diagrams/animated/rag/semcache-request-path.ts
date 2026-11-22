import type { DiagramSpec } from "@/components/diagrams/types";
import { CORPUS, LATENCY_MS, RAG_TONE, SEMCACHE, TOP_K, fmt } from "@/components/diagrams/presets/rag";

// The request path of a semantic cache in front of Brightpost's support assistant (semantic-caching). Top lane, every
// question: normalise the text and build the key (tenant, prompt version) → embed it → find the nearest cached
// question → on a hit, return the stored answer. Bottom lane, a miss: retrieve the top 5 chunks → the LLM answers →
// the answer goes to the user and is stored in the cache with a TTL, the tenant and the versions of the articles it
// was built from. Step 7 is the failure: "change my password" lands above the threshold next to a cached "reset my
// password" and gets the wrong steps.
//
// Illustrative numbers (no source; the page labels them), from SEMCACHE in presets/rag.ts:
// - THRESHOLD = 0.92 cosine similarity between the new question and the nearest cached question.
// - HIT_SIM = 0.97: "How do I reset my password?" against a cached "how can i reset my password".
// - FALSE_HIT_SIM = 0.94: "change my password" against the cached "reset my password".
// - LOOKUP_MS = 5: one nearest-neighbour search in a cache of a few hundred thousand entries.
// - Hit: embed 20 (LATENCY_MS.embedQuery) + lookup 5 = 25 ms.
// - Miss: 20 + 5 + vector search 15 + build prompt 2 + full answer 1,500 = 1,542 ms ≈ 1.5 s.
//
// Layout: columns x 85 | 255 | 425 | 605 | 790, cards 150 wide (the cache 170, for its name), 20 to 25 between
// cards. Rows 95 (lookup) | 215 (the false
// hit, between the lanes) | 335 (the miss path). The miss edge runs diagonally from the cache down to Retrieve; the
// store edge runs straight up x 615 from the LLM to the cache; their pills sit at different heights (labelAt).
// The false-hit edge leaves the cache bottom-right and passes under the cached-answer card.
//
// Colour (four tones plus neutral): the embedding model pink, the cache and retrieval violet (stores), the LLM and
// both answers green, the false hit red; the question and the key builder neutral. The cache is the accent.

const HIT_MS = LATENCY_MS.embedQuery + SEMCACHE.lookupMs;
const MISS_MS = HIT_MS + LATENCY_MS.vectorSearch + LATENCY_MS.buildPrompt + LATENCY_MS.fullAnswer;

const X = [85, 255, 425, 605, 790] as const;
const ROW = { lookup: 95, fail: 215, miss: 335 } as const;
const W = 150;

const spec: DiagramSpec = {
  title: "A semantic cache in front of a RAG assistant: look up first, answer and store on a miss",
  width: 880,
  height: 400,
  steps: [
    { title: "Normalise the question and build the cache key" },
    { title: "Embed the normalised question" },
    { title: "Find the nearest cached question" },
    { title: `Hit: ${SEMCACHE.hitSim} is above ${SEMCACHE.threshold}, return the stored answer` },
    { title: "Miss: retrieve chunks and let the LLM answer" },
    { title: "Store the answer with a TTL, the tenant and article versions" },
    { title: `False hit: a different question scores ${SEMCACHE.falseHitSim}` },
  ],
  zones: [
    { id: "lookup", title: "Every question: look up first", tone: RAG_TONE.infra, x: 10, y: 40, w: 860, h: 112 },
    { id: "miss", title: "On a miss: RAG and the LLM", tone: RAG_TONE.infra, x: 10, y: 278, w: 860, h: 112 },
  ],
  nodes: [
    {
      id: "question",
      label: "Question",
      sub: "reset password",
      icon: "users",
      tone: RAG_TONE.infra,
      x: X[0] + 5,
      y: ROW.lookup,
      w: 140,
    },
    {
      id: "normalise",
      label: "Normalise",
      sub: "+ tenant key",
      icon: "key",
      tone: RAG_TONE.infra,
      step: 1,
      x: X[1],
      y: ROW.lookup,
      w: W,
    },
    {
      id: "embed",
      label: "Embed",
      sub: `${fmt(CORPUS.dims)} dims`,
      icon: "embedder",
      tone: RAG_TONE.embedding,
      fill: "pastel",
      step: 2,
      x: X[2],
      y: ROW.lookup,
      w: W,
    },
    {
      id: "cache",
      label: "Semantic cache",
      sub: `nearest ${SEMCACHE.hitSim}`,
      icon: "vector-index",
      tone: RAG_TONE.store,
      accent: true,
      step: 3,
      x: X[3],
      y: ROW.lookup,
      w: 170,
    },
    {
      id: "hit",
      label: "Cache hit",
      sub: `answer, ≈ ${HIT_MS} ms`,
      icon: "cache",
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 4,
      x: X[4],
      y: ROW.lookup,
      w: W,
    },
    {
      id: "retrieve",
      label: "Retrieve",
      sub: `top ${TOP_K} chunks`,
      icon: "search",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 5,
      x: X[2],
      y: ROW.miss,
      w: W,
    },
    {
      id: "llm",
      label: "LLM",
      sub: `≈ ${(MISS_MS / 1000).toFixed(1)} s in all`,
      icon: "model",
      tone: RAG_TONE.answer,
      step: 5,
      x: X[3],
      y: ROW.miss,
      w: W,
    },
    {
      id: "answer",
      label: "Answer",
      sub: "cites articles",
      icon: "link",
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 5,
      x: X[4],
      y: ROW.miss,
      w: W,
    },
    {
      id: "wrong",
      label: "False hit",
      sub: "change ≠ reset",
      icon: "flag",
      tone: RAG_TONE.failure,
      fill: "pastel",
      step: 7,
      x: X[4],
      y: ROW.fail,
      w: W,
    },
  ],
  edges: [
    { from: "question", to: "normalise", packet: true },
    { from: "normalise", to: "embed", packet: true, delay: 0.4 },
    { from: "embed", to: "cache", packet: true, delay: 0.8 },
    { from: "cache", to: "hit", packet: true, delay: 1.2 },
    {
      from: "cache",
      to: "retrieve",
      label: `miss: < ${SEMCACHE.threshold}`,
      labelAt: 0.3,
      dashed: true,
      packet: true,
      step: 5,
    },
    { from: "retrieve", to: "llm", packet: true, delay: 0.6, step: 5 },
    { from: "llm", to: "answer", packet: true, delay: 1.2, step: 5 },
    {
      from: "llm",
      to: "cache",
      label: `store: TTL ${SEMCACHE.ttlHours} h, versions`,
      labelAt: 0.35,
      packet: true,
      delay: 1.6,
      step: 6,
    },
    {
      from: "cache",
      to: "wrong",
      label: `${SEMCACHE.falseHitSim} ≥ ${SEMCACHE.threshold}`,
      tone: RAG_TONE.failure,
      packet: true,
      step: 7,
    },
  ],
};

export default spec;
