import type { DiagramSpec } from "@/components/diagrams/types";
import { CORPUS, RAG_TONE, fmt } from "@/components/diagrams/presets/rag";

// The training-to-rollout loop for a fine-tuned embedding model (fine-tuning-embeddings-and-rerankers), on
// Brightpost's help centre. Top row, training: search logs give (question, chunk) pairs → hard negatives are mined
// with the current model → the model is fine-tuned → it is evaluated on a held-out set. Bottom row, inputs and
// rollout: synthetic questions written per chunk also feed the pairs; the current index (v1) supplies the mining
// candidates; a model that beats v1 re-embeds every chunk into index v2, which is shadow-tested and then takes over.
//
// Seven steps: 1 pairs from logs · 2 synthetic questions per chunk · 3 hard negatives mined with the current model ·
// 4 fine-tune · 5 evaluate on the held-out set · 6 re-embed all 3,600 chunks into index v2 · 7 shadow, then switch.
// Nodes never move.
//
// Numbers: re-embedding reads CORPUS.embedTokens = 3,600 × 400 = 1,440,000 tokens (presets/rag.ts). Everything else
// is in the page text and labelled illustrative there.
//
// Layout: the rag/pipeline grid, columns x 90 | 265 | 440 | 615 | 790, cards 150 wide; rows 95 (training) and 290
// (inputs and rollout). The two input edges run diagonally up-right from the bottom row (synthetic questions → pairs,
// index v1 → negatives) and do not cross. The evaluation gate runs straight down x 790 to the re-embed job; the
// rollout runs right to left along the bottom row back to index v1.
//
// Tones (four plus neutral): logs, pairs and synthetic questions blue (text), the model being trained and the
// re-embed job pink (embeddings), the indexes violet, evaluation lime (scores); the shadow test neutral. The model
// being trained is the accent.

const X = [90, 265, 440, 615, 790] as const;
const ROW = { train: 95, roll: 290 } as const;
const W = 150;

const spec: DiagramSpec = {
  title: "Fine-tuning an embedding model: from pairs to a new index in production",
  width: 880,
  height: 360,
  steps: [
    { title: "Pairs from search logs" },
    { title: "Synthetic questions for every chunk" },
    { title: "Mine hard negatives with the current model" },
    { title: "Fine-tune the embedding model" },
    { title: "Evaluate on a held-out set" },
    { title: `Re-embed all ${fmt(CORPUS.chunks)} chunks into a new index` },
    { title: "Shadow-test the new index, then switch" },
  ],
  zones: [
    { id: "training", title: "Training: offline", tone: RAG_TONE.infra, x: 10, y: 40, w: 860, h: 112 },
    { id: "rollout", title: "Rollout", tone: RAG_TONE.infra, x: 360, y: 232, w: 510, h: 112 },
  ],
  nodes: [
    {
      id: "logs",
      label: "Search logs",
      sub: "clicked, solved",
      icon: "log",
      tone: RAG_TONE.text,
      x: X[0],
      y: ROW.train,
      w: W,
    },
    {
      id: "pairs",
      label: "Pairs",
      sub: "question, chunk",
      icon: "file",
      tone: RAG_TONE.text,
      fill: "pastel",
      x: X[1],
      y: ROW.train,
      w: W,
    },
    {
      id: "synthetic",
      label: "Synthetic Qs",
      sub: "LLM, per chunk",
      icon: "model",
      tone: RAG_TONE.text,
      step: 2,
      x: X[0],
      y: ROW.roll,
      w: W,
    },
    {
      id: "v1",
      label: "Index v1",
      sub: "current model",
      icon: "vector-index",
      tone: RAG_TONE.store,
      step: 3,
      x: X[1],
      y: ROW.roll,
      w: W,
    },
    {
      id: "negatives",
      label: "Negatives",
      sub: "mined, denoised",
      icon: "search",
      tone: RAG_TONE.rank,
      step: 3,
      x: X[2],
      y: ROW.train,
      w: W,
    },
    {
      id: "train",
      label: "Fine-tune",
      sub: "contrastive loss",
      icon: "embedder",
      tone: RAG_TONE.embedding,
      accent: true,
      step: 4,
      x: X[3],
      y: ROW.train,
      w: W,
    },
    {
      id: "eval",
      label: "Evaluate",
      sub: "recall@5, nDCG",
      icon: "meter",
      tone: RAG_TONE.rank,
      fill: "pastel",
      step: 5,
      x: X[4],
      y: ROW.train,
      w: W,
    },
    {
      id: "reembed",
      label: "Re-embed",
      sub: `${(CORPUS.embedTokens / 1_000_000).toFixed(2)} M tokens`,
      icon: "embedder",
      tone: RAG_TONE.embedding,
      fill: "pastel",
      step: 6,
      x: X[4],
      y: ROW.roll,
      w: W,
    },
    {
      id: "v2",
      label: "Index v2",
      sub: `${fmt(CORPUS.chunks)} chunks`,
      icon: "vector-index",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 6,
      x: X[3],
      y: ROW.roll,
      w: W,
    },
    {
      id: "shadow",
      label: "Shadow test",
      sub: "then switch",
      icon: "chart",
      tone: RAG_TONE.infra,
      step: 7,
      x: X[2],
      y: ROW.roll,
      w: W,
    },
  ],
  edges: [
    { from: "logs", to: "pairs", packet: true },
    { from: "synthetic", to: "pairs", packet: true, step: 2 },
    { from: "pairs", to: "negatives", packet: true, step: 3 },
    { from: "v1", to: "negatives", label: "top 30 per question", labelAt: 0.55, dashed: true, step: 3 },
    { from: "negatives", to: "train", packet: true, step: 4 },
    { from: "train", to: "eval", packet: true, step: 5 },
    { from: "eval", to: "reembed", label: "beats v1", packet: true, step: 6 },
    { from: "reembed", to: "v2", packet: true, delay: 0.6, step: 6 },
    { from: "v2", to: "shadow", packet: true, step: 7 },
    { from: "shadow", to: "v1", dashed: true, packet: true, delay: 0.6, step: 7 },
  ],
};

export default spec;
