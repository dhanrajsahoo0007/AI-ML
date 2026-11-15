import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { CORPUS, RAG_TONE, TOP_K, fmt } from "@/components/diagrams/presets/rag";

// Chunk size for the running example, three choices side by side. Working (1,200 articles of 1,100 tokens):
// - 100-token chunks, no overlap: ceil(1,100 / 100) = 11 per article → 13,200 chunks; top 5 = 500 tokens of context.
// - 400-token chunks, 50 overlap (the track's choice): 3 per article → 3,600 chunks; top 5 = 2,000 tokens.
// - Whole articles: 1 per article → 1,200 chunks; top 5 = 5 × 1,100 = 5,500 tokens.
// The key instruction is about 30 tokens (tokens 385–415), so in a whole-article chunk it is 30 of 1,100 tokens.
//
// Tones (two): chunk sizes blue, the problem with each extreme red; the middle column is highlighted.

const SIZES = [
  {
    id: "small",
    label: "100-token chunks",
    perArticle: Math.ceil(CORPUS.articleTokens / 100),
    tokens: 100,
    verdict: "Matches 'backup code' exactly,\nbut loses the steps around it",
    bad: true,
  },
  {
    id: "mid",
    label: `${CORPUS.chunkTokens}-token chunks`,
    perArticle: CORPUS.chunksPerArticle,
    tokens: CORPUS.chunkTokens,
    verdict: "Holds one instruction\nwith its context",
    bad: false,
  },
  {
    id: "large",
    label: "Whole articles",
    perArticle: 1,
    tokens: CORPUS.articleTokens,
    verdict: `The step is 30 of ${fmt(CORPUS.articleTokens)} tokens:\nthe vector means 'account help'`,
    bad: true,
  },
] as const;

const COL_W = 250;
const GAP = 25;
const X0 = 20;

const shapes: LayoutShape[] = SIZES.flatMap((s, i): LayoutShape[] => {
  const x = X0 + i * (COL_W + GAP);
  return [
    {
      id: `${s.id}-head`,
      type: "box",
      x,
      y: 24,
      w: COL_W,
      h: 44,
      label: s.label,
      tone: RAG_TONE.text,
      fill: "pastel",
      highlight: s.bad ? undefined : true,
    },
    {
      id: `${s.id}-count`,
      type: "box",
      x,
      y: 84,
      w: COL_W,
      h: 44,
      label: `${fmt(s.perArticle * CORPUS.articles)} chunks`,
      sub: `${s.perArticle} per article`,
    },
    {
      id: `${s.id}-prompt`,
      type: "box",
      x,
      y: 140,
      w: COL_W,
      h: 44,
      label: `Top ${TOP_K} = ${fmt(TOP_K * s.tokens)} tokens`,
      sub: "of context in the prompt",
    },
    {
      id: `${s.id}-verdict`,
      type: "text",
      x,
      y: 198,
      w: COL_W,
      h: 40,
      label: s.verdict,
      tone: s.bad ? RAG_TONE.failure : RAG_TONE.infra,
    },
  ];
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Chunk size: precision against context",
  width: 840,
  height: 250,
  shapes,
};

export default spec;
