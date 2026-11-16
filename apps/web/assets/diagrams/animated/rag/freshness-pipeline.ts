import type { DiagramSpec } from "@/components/diagrams/types";
import { ARTICLES, CORPUS, RAG_TONE, TOP_K } from "@/components/diagrams/presets/rag";

// Index freshness: one edit to "Reset a forgotten password" travels from the help centre to the vector index, and
// questions asked before it lands still get the old steps. Top lane, the update path: the CMS saves the edit → a
// change event goes onto a queue → a worker re-chunks the article (3 chunks) → the embedding model re-embeds those 3
// chunks → the new vectors are upserted by chunk id into the index (accent). Bottom lane, the read path: a customer
// question → retrieval from the index → during the window, an answer built from the old chunks (red, the failure).
//
// Each update-path card's sub line says when the edit reaches it (WINDOW_S, local to this figure, illustrative:
// no source, the page labels it so). Working: the change event is queued 1 s after the save; workers drain the
// queue in 30 s batches, so re-chunking ends by 1 + 30 + 1 = 32 s; embedding 3 chunks takes 2 s (34 s); the upsert
// and index refresh take 1 s, so the edit is searchable at 35 s. That 35 s is the staleness window.
//
// Six steps: 1 an editor saves a change · 2 the change becomes an event on a queue · 3 a worker re-chunks only that
// article · 4 only its chunks are re-embedded · 5 the new vectors are upserted by chunk id · 6 inside the window, a
// question still gets the old chunks. Grid as rag/pipeline: columns x 90 | 265 | 440 | 615 | 790, cards 150 wide;
// rows 95 (update) | 300 (read). The index-to-retrieve edge runs in the corridor at y 192.
//
// Colour (four tones plus neutral): the article and chunks blue, the embedding model pink, the index and retrieval
// violet, the stale answer red; the queue and the customer neutral.

/** Illustrative timings in seconds after the save (cumulative). */
const WINDOW_S = { queued: 1, chunked: 32, embedded: 34, live: 35 } as const;

const X = [90, 265, 440, 615, 790] as const;
const ROW = { update: 95, read: 300 } as const;
const W = 150;

const spec: DiagramSpec = {
  title: `Index freshness: one edit reaches the index ${WINDOW_S.live} s later (illustrative)`,
  width: 880,
  height: 370,
  steps: [
    { title: "An editor saves a change to one article" },
    { title: "The change becomes an event on a queue" },
    { title: "A worker re-chunks only that article" },
    { title: "Only its chunks are re-embedded" },
    { title: "The new vectors are upserted by chunk id" },
    { title: "Inside the window, a question still gets the old chunks" },
  ],
  zones: [
    {
      id: "update",
      title: `Update path: about ${WINDOW_S.live} s from save to searchable (illustrative)`,
      tone: RAG_TONE.infra,
      x: 10,
      y: 40,
      w: 860,
      h: 115,
    },
    { id: "read", title: "Read path: questions keep arriving", tone: RAG_TONE.infra, x: 10, y: 242, w: 860, h: 115 },
  ],
  nodes: [
    {
      id: "cms",
      label: "Help article",
      sub: "saved at 0 s",
      icon: "file",
      tone: RAG_TONE.text,
      x: X[0],
      y: ROW.update,
      w: W,
    },
    {
      id: "event",
      label: "Change event",
      sub: `queued at ${WINDOW_S.queued} s`,
      icon: "queue",
      tone: RAG_TONE.infra,
      fill: "pastel",
      step: 2,
      x: X[1],
      y: ROW.update,
      w: W,
    },
    {
      id: "rechunk",
      label: "Re-chunk",
      sub: `done at ${WINDOW_S.chunked} s`,
      icon: "chunk",
      tone: RAG_TONE.text,
      fill: "pastel",
      step: 3,
      x: X[2],
      y: ROW.update,
      w: W,
    },
    {
      id: "reembed",
      label: "Re-embed",
      sub: `done at ${WINDOW_S.embedded} s`,
      icon: "embedder",
      tone: RAG_TONE.embedding,
      fill: "pastel",
      step: 4,
      x: X[3],
      y: ROW.update,
      w: W,
    },
    {
      id: "index",
      label: "Vector index",
      sub: `live at ${WINDOW_S.live} s`,
      icon: "vector-index",
      tone: RAG_TONE.store,
      accent: true,
      step: 5,
      x: X[4],
      y: ROW.update,
      w: W,
    },
    {
      id: "question",
      label: "Question",
      sub: "reset steps?",
      icon: "users",
      tone: RAG_TONE.infra,
      step: 6,
      x: X[0],
      y: ROW.read,
      w: W,
    },
    {
      id: "retrieve",
      label: "Retrieve",
      sub: `top ${TOP_K}`,
      icon: "search",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 6,
      x: X[2],
      y: ROW.read,
      w: W,
    },
    {
      id: "stale",
      label: "Stale answer",
      sub: "old steps",
      icon: "alert-triangle",
      tone: RAG_TONE.failure,
      fill: "pastel",
      step: 6,
      x: X[4],
      y: ROW.read,
      w: W,
    },
  ],
  edges: [
    { from: "cms", to: "event", packet: true },
    { from: "event", to: "rechunk", packet: true, delay: 0.6 },
    { from: "rechunk", to: "reembed", packet: true, delay: 1.2 },
    { from: "reembed", to: "index", packet: true, delay: 1.8 },
    { from: "question", to: "retrieve", label: `before ${WINDOW_S.live} s`, packet: true },
    {
      from: "index",
      to: "retrieve",
      label: `still the old ${CORPUS.chunksPerArticle} chunks of "${ARTICLES.reset}"`,
      dashed: true,
      step: 6,
      via: [
        [X[4], 197],
        [X[2], 197],
      ],
    },
    { from: "retrieve", to: "stale", label: "inside the window", packet: true, delay: 0.6 },
  ],
};

export default spec;
