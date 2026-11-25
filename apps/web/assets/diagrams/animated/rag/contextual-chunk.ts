import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ARTICLES, RAG_TONE } from "@/components/diagrams/presets/rag";

// Contextual chunks: before embedding, an LLM writes a short context (usually 50–100 tokens) that places the chunk in
// its document, and that context is prepended to the chunk for both the embedding and the BM25 index.
//
// Measured results on the right are Anthropic's, from "Introducing Contextual Retrieval" (2024), re-read on
// 2026-11-15: top-20-chunk retrieval failure rate 5.7% baseline → 3.7% with contextual embeddings (35% fewer) →
// 2.9% adding contextual BM25 (49% fewer) → 1.9% adding reranking (67% fewer). Bars are drawn to scale: 180 units for
// 5.7%.
//
// Tones (three): the chunk blue, the LLM-written context green, failure rates red.

const BAR_X = 650;
const BAR_MAX = 180;
const BASE = 5.7;
const BARS = [
  { id: "b0", label: "Baseline", rate: 5.7 },
  { id: "b1", label: "+ contextual embeddings", rate: 3.7 },
  { id: "b2", label: "+ contextual BM25", rate: 2.9 },
  { id: "b3", label: "+ reranking", rate: 1.9 },
];

const bars: LayoutShape[] = BARS.flatMap((b, i): LayoutShape[] => {
  const y = 64 + i * 46;
  return [
    {
      id: `${b.id}-label`,
      type: "text",
      x: 466,
      y: y + 6,
      w: 176,
      h: 20,
      label: b.label,
      tone: RAG_TONE.infra,
      step: 3,
    },
    {
      id: b.id,
      type: "box",
      x: BAR_X,
      y,
      w: Math.round((b.rate / BASE) * BAR_MAX),
      h: 32,
      label: `${b.rate}%`,
      tone: RAG_TONE.failure,
      fill: "pastel",
      step: 3,
    },
  ];
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Contextual chunks: a line of document context before each chunk",
  width: 850,
  height: 300,
  steps: [
    { title: "A chunk on its own is ambiguous" },
    { title: "An LLM writes where the chunk comes from" },
    { title: "Fewer retrieval failures (Anthropic, 2024)" },
  ],
  shapes: [
    {
      id: "chunk",
      type: "box",
      x: 24,
      y: 30,
      w: 400,
      h: 54,
      label: '"If you lost your phone, use one of\nyour backup codes to sign in."',
      tone: RAG_TONE.text,
      fill: "pastel",
    },
    {
      id: "q",
      type: "text",
      x: 24,
      y: 92,
      w: 400,
      h: 20,
      label: "Alone: which account? which app? which product?",
      tone: RAG_TONE.infra,
    },
    {
      id: "ctx",
      type: "box",
      x: 24,
      y: 130,
      w: 400,
      h: 54,
      label: `Context (written by an LLM, 50–100 tokens):\nBrightpost help, '${ARTICLES.twoFactor}'`,
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 2,
    },
    {
      id: "joined-ctx",
      type: "box",
      x: 24,
      y: 214,
      w: 130,
      h: 44,
      label: "context",
      tone: RAG_TONE.answer,
      fill: "pastel",
      step: 2,
    },
    {
      id: "joined-chunk",
      type: "box",
      x: 154,
      y: 214,
      w: 270,
      h: 44,
      label: "chunk",
      tone: RAG_TONE.text,
      fill: "pastel",
      step: 2,
      highlight: true,
    },
    { id: "a1", type: "arrow", x: 0, y: 0, from: "ctx", to: "joined-ctx", via: [[89, 198]], step: 2 },
    {
      id: "joined-note",
      type: "text",
      x: 24,
      y: 266,
      w: 400,
      h: 20,
      label: "This joined text is embedded and BM25-indexed",
      tone: RAG_TONE.infra,
      step: 2,
    },
    {
      id: "bars-title",
      type: "text",
      x: 466,
      y: 26,
      w: 370,
      h: 20,
      label: "Top-20 retrieval failure rate (Anthropic, 2024)",
      tone: RAG_TONE.infra,
      step: 3,
    },
    ...bars,
  ],
};

export default spec;
