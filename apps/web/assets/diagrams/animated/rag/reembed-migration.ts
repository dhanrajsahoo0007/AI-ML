import type { DiagramSpec } from "@/components/diagrams/types";
import { CORPUS, RAG_TONE, fmt } from "@/components/diagrams/presets/rag";

// Changing the embedding model without downtime: two indexes side by side. Vectors from two models live in different
// spaces, so the new model needs a new index (v2) filled from scratch, while the old one (v1) keeps serving.
//
// Steps: 1 today: questions reach index v1 through an alias · 2 dual write: new and changed chunks are embedded by
// both models and written to both indexes · 3 backfill: a job re-embeds every chunk into v2 (CORPUS.chunks = 3,600
// chunks, CORPUS.embedTokens = 1,440,000 tokens) · 4 shadow reads: a copy of each question runs on v2 (embedded by the
// new model) and its top results are compared with v1's on a golden set · 5 switch the alias to v2; v1 stays as the
// rollback · 6 retire v1.
//
// The alias → v1 edge ends at step 4 and the writer → v1 edge at step 5, so the full view shows the end state.
// Grid: columns x 95 | 330 | 565 | 795; cards 170 wide, 150 for the indexes and the questions; rows 60 | 195 | 330.
// Colour (three tones plus neutral): chunks blue, both indexes violet (v2 the accent), the shadow comparison lime;
// the questions, the alias, the backfill job and the retirement neutral.

const X = [95, 330, 565, 795] as const;
const ROW = { top: 60, mid: 195, bottom: 330 } as const;
const W = 170;

const spec: DiagramSpec = {
  title: "Re-embedding migration: dual write, backfill, shadow reads, switch, retire",
  width: 880,
  height: 395,
  steps: [
    { title: "Today: questions reach index v1 through an alias" },
    { title: "Dual write: new and changed chunks go to both indexes" },
    { title: `Backfill: re-embed all ${fmt(CORPUS.chunks)} chunks into v2` },
    { title: "Shadow reads: the same questions run on v2 and are compared" },
    { title: "Switch the alias to v2; v1 stays as the rollback" },
    { title: "Retire v1" },
  ],
  zones: [],
  nodes: [
    {
      id: "writer",
      label: "Changed chunks",
      sub: "from ingestion",
      icon: "chunk",
      tone: RAG_TONE.text,
      fill: "pastel",
      x: X[0],
      y: ROW.top,
      w: W,
    },
    {
      id: "v1",
      label: "Index v1",
      sub: "old model",
      icon: "vector-index",
      tone: RAG_TONE.store,
      fill: "pastel",
      x: X[1],
      y: ROW.top,
      w: 150,
    },
    {
      id: "alias",
      label: "Alias",
      sub: "help-search",
      icon: "link",
      tone: RAG_TONE.infra,
      x: X[2],
      y: ROW.mid,
      w: W,
    },
    {
      id: "query",
      label: "Questions",
      sub: "live traffic",
      icon: "users",
      tone: RAG_TONE.infra,
      x: X[3],
      y: ROW.mid,
      w: 150,
    },
    {
      id: "v2",
      label: "Index v2",
      sub: "new model",
      icon: "vector-index",
      tone: RAG_TONE.store,
      accent: true,
      step: 2,
      x: X[1],
      y: ROW.bottom,
      w: 150,
    },
    {
      id: "backfill",
      label: "Backfill job",
      sub: `${CORPUS.embedTokens / 1_000_000} M tokens`,
      icon: "workers",
      tone: RAG_TONE.infra,
      fill: "soft",
      step: 3,
      x: X[0],
      y: ROW.bottom,
      w: W,
    },
    {
      id: "shadow",
      label: "Shadow compare",
      sub: "golden set",
      icon: "scale",
      tone: RAG_TONE.rank,
      fill: "pastel",
      step: 4,
      x: X[2],
      y: ROW.bottom,
      w: W,
    },
    {
      id: "retire",
      label: "Retire v1",
      sub: "after rollback",
      icon: "archive",
      tone: RAG_TONE.infra,
      fill: "soft",
      step: 6,
      x: X[2],
      y: ROW.top,
      w: W,
    },
  ],
  edges: [
    { from: "writer", to: "v1", packet: true, until: 5 },
    { from: "query", to: "alias", label: "search", packet: true },
    { from: "alias", to: "v1", label: "live", packet: true, delay: 0.6, until: 4 },
    { from: "writer", to: "v2", label: "dual write", packet: true, delay: 0.6 },
    { from: "backfill", to: "v2", packet: true },
    { from: "query", to: "shadow", label: "copy", dashed: true, step: 4 },
    { from: "shadow", to: "v2", label: "query", dashed: true, delay: 0.6 },
    { from: "alias", to: "v2", label: "live", packet: true, delay: 0.6, step: 5 },
    { from: "retire", to: "v1", label: "delete", dashed: true },
  ],
};

export default spec;
