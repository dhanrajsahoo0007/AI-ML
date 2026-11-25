import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ARTICLES, CORPUS, RAG_TONE, docStrip, fmt, stripX } from "@/components/diagrams/presets/rag";

// Core concept 3, chunking. One help article ("Recover two-factor access", 1,100 tokens) drawn as a strip of token
// cells, 50 tokens per cell. Its key sentence, "If you lost your phone, use a backup code", runs from token 385 to
// token 415 (illustrative position).
//
// Step 2, no overlap: 400-token chunks cut at 400 and 800, so the sentence is split between chunk 1 and chunk 2 and
// neither chunk holds the whole instruction.
// Step 3, 50-token overlap: a new 400-token chunk starts every 350 tokens (CORPUS.stride), at 0, 350 and 700. Chunk 2
// (350 to 750) holds the whole sentence. ceil((1,100 - 50) / 350) = 3 chunks; 1,200 articles × 3 = 3,600 chunks.
//
// Tones: chunks blue, the split sentence red, the kept sentence blue (highlighted chunk). Overlapping chunks cannot
// share a row (boxes may not overlap), so chunk 2 sits on its own row under chunks 1 and 3.

const X0 = 110;
const WIDTH = 690;
const TOK = CORPUS.articleTokens;
const x = (t: number) => stripX(t, X0, { tokens: TOK, width: WIDTH });
const SENT = [385, 415] as const;

const chunk = (
  id: string,
  from: number,
  to: number,
  y: number,
  n: number,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({
  id,
  type: "box",
  x: x(from),
  y,
  w: Math.round((x(to) - x(from)) * 10) / 10,
  h: 40,
  label: `Chunk ${n}`,
  sub: `tokens ${fmt(from)}–${fmt(to)}`,
  tone: RAG_TONE.text,
  fill: "pastel",
  step,
  ...extra,
});

/** A bracket under the sentence's tokens at height y, and a note beside it. */
const sentence = (id: string, y: number, tone: "red" | "blue", note: string, step: number): LayoutShape[] => [
  {
    id: `${id}-mark`,
    type: "path",
    x: 0,
    y: 0,
    points: [
      [x(SENT[0]), y - 6],
      [x(SENT[0]), y],
      [x(SENT[1]), y],
      [x(SENT[1]), y - 6],
    ],
    tone,
    step,
  },
  {
    id: `${id}-note`,
    type: "text",
    x: x(SENT[1]) + 8,
    y: y - 9,
    w: note.length * 6.8,
    h: 18,
    label: note,
    tone,
    step,
  },
];

const rowLabel = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: 4,
  y,
  w: 100,
  h: 40,
  label,
  tone: RAG_TONE.infra,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Chunking with overlap keeps a sentence that crosses a cut in one chunk",
  width: 820,
  height: 380,
  steps: [
    { title: `One article: ${fmt(TOK)} tokens` },
    { title: "Cut every 400 tokens: the key sentence is split" },
    { title: "Start a 400-token chunk every 350 tokens: the sentence survives" },
  ],
  shapes: [
    // Step 1: the article
    rowLabel("l-doc", 34, "Article", 1),
    ...docStrip("doc", X0, 44, { tokens: TOK, width: WIDTH, h: 20, step: 1 }),
    {
      id: "doc-title",
      type: "text",
      x: X0,
      y: 12,
      w: WIDTH,
      h: 20,
      label: `"${ARTICLES.twoFactor}", ${fmt(TOK)} tokens (one cell = 50 tokens)`,
      tone: RAG_TONE.infra,
    },
    ...sentence("s0", 72, "blue", '"If you lost your phone, use a backup code"', 1),

    // Step 2: no overlap
    rowLabel("l-none", 110, "No overlap", 2),
    chunk("n1", 0, 400, 110, 1, 2),
    chunk("n2", 400, 800, 110, 2, 2),
    chunk("n3", 800, TOK, 110, 3, 2),
    ...sentence("s1", 160, "red", "split: half in chunk 1, half in chunk 2", 2),

    // Step 3: 50-token overlap
    rowLabel("l-over", 210, "50-token\noverlap", 3),
    chunk("o1", 0, 400, 210, 1, 3),
    chunk("o3", 700, TOK, 210, 3, 3),
    chunk("o2", 350, 750, 262, 2, 3, { highlight: true }),
    ...sentence("s2", 316, "blue", "whole in chunk 2", 3),
    {
      id: "ov-note",
      type: "text",
      x: X0,
      y: 340,
      w: WIDTH,
      h: 20,
      label: `Overlap: chunk 2 repeats tokens 350–400 and 700–750 · ${fmt(CORPUS.articles)} articles × ${CORPUS.chunksPerArticle} chunks = ${fmt(CORPUS.chunks)} chunks`,
      tone: RAG_TONE.infra,
      step: 3,
    },
  ],
};

export default spec;
