import type { DiagramSpec } from "@/components/diagrams/types";
import { ADVANCED, RAG_TONE, TOP_K } from "@/components/diagrams/presets/rag";

// Advanced RAG, built one stage at a time on the answering lane of the hero (rag/pipeline). Brightpost's question
// "How do I reset my password if I lost my phone?" runs through every step.
//
// Seven steps; each later step adds one stage and its title names the gap it closes:
// 1 basic RAG: the question is embedded, the top 5 chunks by similarity go to the LLM · 2 rewrite the question
// (several queries and a HyDE answer) · 3 add BM25 keyword search beside vector search and fuse the two lists with
// reciprocal rank fusion (RRF, k = 60) · 4 a cross-encoder reranks the top 100 and keeps 5 · 5 a grader checks the 5;
// weak results loop back to the rewriter · 6 compress the chunks and order them · 7 check that the answer's claims are
// supported. Routing to graph summaries or SQL (the page's text) is left out to keep the figure to one path.
//
// Nodes never move. Edges that a later stage replaces end with `until`: question → vector search (step 1), vector
// search → LLM (2), fusion → LLM (3), reranker → LLM (4), grader → LLM (5), LLM → answer (6). They run through the
// empty slots of the stages that replace them, so the early steps read as a straight pipeline.
//
// Layout: five columns at x 85 | 258 | 431 | 604 | 777 (173 apart, cards 150 wide, 23 between cards: no labels on the
// short edges; counts live in sub lines and on the long vertical edges). Row 1 (y 110) runs left to right: question,
// rewrite, vector search, fusion, reranker. BM25 sits under vector search (y 225). Row 2 (y 345) runs right to left:
// grader, compress, LLM, faithfulness check, answer, and the answer returns to the user up column 1. The retry loop
// leaves the grader to the right (corridor x 866), runs along the top (y 40) and drops into the rewriter, so it crosses
// no other edge. The faithfulness check's retry runs straight up column 2.
//
// Colour (four tones plus neutral; the stages the figure is about are pastel): the question's rewrites orange, vector
// search violet, BM25 teal, fusion, reranker, grader and compression lime (ranking and scores). The user, the LLM, the
// check and the answer are neutral: generation does not change on this page, and green would be a fifth tone. The
// reranker is the accent, the upgrade the page calls the highest-value one.

const X = [85, 258, 431, 604, 777] as const;
const ROW = { top: 110, bm25: 225, bottom: 345 } as const;
const W = 150;
const TOP = 40;
const RIGHT = 866;

const spec: DiagramSpec = {
  title: "Advanced RAG: one stage at a time on the answering path",
  width: 880,
  height: 400,
  steps: [
    { title: `Basic RAG: embed the question, send the top ${TOP_K} to the LLM` },
    { title: "Chat wording misses the articles: rewrite the question" },
    { title: "Vectors miss exact words: add BM25 and fuse the lists" },
    { title: `Near is not relevant: rerank ${ADVANCED.candidates}, keep ${ADVANCED.keep}` },
    { title: "Sometimes nothing fits: grade, then rewrite and retry" },
    { title: "Long, noisy prompts: compress and order the chunks" },
    { title: "Unsupported claims slip through: check the answer" },
  ],
  zones: [],
  nodes: [
    // Row 1, left to right
    {
      id: "question",
      label: "Question",
      sub: "lost my phone",
      icon: "users",
      tone: RAG_TONE.infra,
      x: X[0],
      y: ROW.top,
      w: W,
    },
    {
      id: "rewrite",
      label: "Rewrite",
      sub: "queries + HyDE",
      icon: "sparkles",
      tone: RAG_TONE.query,
      fill: "pastel",
      step: 2,
      x: X[1],
      y: ROW.top,
      w: W,
    },
    {
      id: "vector",
      label: "Vector search",
      sub: "by meaning",
      icon: "vector-index",
      tone: RAG_TONE.store,
      fill: "pastel",
      x: X[2],
      y: ROW.top,
      w: W,
    },
    {
      id: "fusion",
      label: "RRF fusion",
      sub: `k = ${ADVANCED.rrfK}`,
      icon: "git-merge",
      tone: RAG_TONE.rank,
      fill: "pastel",
      step: 3,
      x: X[3],
      y: ROW.top,
      w: W,
    },
    {
      id: "rerank",
      label: "Reranker",
      sub: `top ${ADVANCED.candidates} → ${ADVANCED.keep}`,
      icon: "reranker",
      tone: RAG_TONE.rank,
      accent: true,
      step: 4,
      x: X[4],
      y: ROW.top,
      w: W,
    },

    // Under vector search
    {
      id: "bm25",
      label: "BM25 search",
      sub: "exact words",
      icon: "search",
      tone: RAG_TONE.keyword,
      fill: "pastel",
      step: 3,
      x: X[2],
      y: ROW.bm25,
      w: W,
    },

    // Row 2, right to left
    {
      id: "grade",
      label: "Grade",
      sub: "relevant?",
      icon: "gauge",
      tone: RAG_TONE.rank,
      fill: "pastel",
      step: 5,
      x: X[4],
      y: ROW.bottom,
      w: W,
    },
    {
      id: "compress",
      label: "Compress",
      sub: "best first",
      icon: "minimize",
      tone: RAG_TONE.rank,
      fill: "pastel",
      step: 6,
      x: X[3],
      y: ROW.bottom,
      w: W,
    },
    {
      id: "llm",
      label: "LLM",
      sub: "writes, cites",
      icon: "model",
      tone: RAG_TONE.infra,
      x: X[2],
      y: ROW.bottom,
      w: W,
    },
    {
      id: "check",
      label: "Faithfulness",
      sub: "claims backed?",
      icon: "shield-check",
      tone: RAG_TONE.infra,
      fill: "pastel",
      step: 7,
      x: X[1],
      y: ROW.bottom,
      w: W,
    },
    {
      id: "answer",
      label: "Answer",
      sub: "with citations",
      icon: "link",
      tone: RAG_TONE.infra,
      x: X[0],
      y: ROW.bottom,
      w: W,
    },
  ],
  edges: [
    // Step 1: the basic pipeline. Each of these is replaced by a later stage.
    { from: "question", to: "vector", packet: true, until: 1 },
    { from: "vector", to: "llm", label: `top ${TOP_K}`, packet: true, delay: 0.6, until: 2 },
    { from: "llm", to: "answer", packet: true, delay: 1.2, until: 6 },
    {
      from: "answer",
      to: "question",
      label: "shown to the user",
      dashed: true,
    },

    // Step 2: the rewriter sits between the question and the search.
    { from: "question", to: "rewrite", packet: true, step: 2 },
    { from: "rewrite", to: "vector", packet: true, delay: 0.6, step: 2 },

    // Step 3: BM25 runs beside vector search; RRF merges the two lists.
    { from: "rewrite", to: "bm25", packet: true, delay: 0.6, step: 3 },
    { from: "vector", to: "fusion", packet: true, delay: 1.2, step: 3 },
    { from: "bm25", to: "fusion", packet: true, delay: 1.2, step: 3 },
    {
      from: "fusion",
      to: "llm",
      label: `top ${TOP_K}`,
      labelAt: 0.3,
      packet: true,
      delay: 1.8,
      step: 3,
      until: 3,
      via: [[X[3], ROW.bottom]],
    },

    // Step 4: the reranker reads the top 100 and keeps 5.
    { from: "fusion", to: "rerank", packet: true, delay: 1.8, step: 4 },
    {
      from: "rerank",
      to: "llm",
      label: `top ${ADVANCED.keep}`,
      labelAt: 0.22,
      packet: true,
      delay: 2.4,
      step: 4,
      until: 4,
      via: [[X[4], ROW.bottom]],
    },

    // Step 5: the grader passes good chunks on and sends weak ones back to the rewriter.
    { from: "rerank", to: "grade", label: `top ${ADVANCED.keep}`, packet: true, delay: 2.4, step: 5 },
    { from: "grade", to: "llm", packet: true, delay: 3, step: 5, until: 5 },
    {
      from: "grade",
      to: "rewrite",
      label: "weak: rewrite and retry",
      dashed: true,
      flow: true,
      labelAt: 0.64,
      step: 5,
      via: [
        [RIGHT, ROW.bottom],
        [RIGHT, TOP],
        [X[1], TOP],
      ],
    },

    // Step 6: compression and ordering before the prompt.
    { from: "grade", to: "compress", packet: true, delay: 3, step: 6 },
    { from: "compress", to: "llm", packet: true, delay: 3.6, step: 6 },

    // Step 7: the answer is checked against the chunks before it is shown.
    { from: "llm", to: "check", packet: true, delay: 4.2, step: 7 },
    { from: "check", to: "answer", packet: true, delay: 4.8, step: 7 },
    { from: "check", to: "rewrite", label: "unsupported", dashed: true, step: 7 },
  ],
};

export default spec;
