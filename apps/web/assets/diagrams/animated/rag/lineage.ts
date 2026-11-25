import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { CORPUS, RAG_TONE } from "@/components/diagrams/presets/rag";

// "Data versioning and lineage": one answer from Brightpost's help bot traced back, hop by hop, to the record in the
// source system. Each hop is an id written down when the data was produced, so the trace is a lookup, not a guess.
// Step 1 the answer (what the user saw: trace id, citation, prompt version) · step 2 the cited chunk (its token span,
// the embedding model that embedded it, the index snapshot that served it) · step 3 the document version (content
// hash, update date, the corpus version that holds it) · step 4 the source record (CMS article, revision, access).
//
// Values tie to the other RAG figures: the chunk is chunk 2 of "Reset a forgotten password", tokens 350 to 750
// (CORPUS.stride, CORPUS.chunkTokens); the hash 4b7e… is that article's new hash in incremental-reindex; snapshot 2,
// embed-v2 and corpus c42 are the live snapshot after the rollback in index-snapshots. Ids, dates and names are
// illustrative.
//
// Columns x 20 | 240 | 460 | 680, each 180 wide with 40 between; a question above each column, a pastel header box,
// three attribute cells below. Tones (four): the answer green, chunk and document blue, the embedding model pink,
// the index snapshot and the source system violet.

const COL_W = 180;
const colX = (i: number) => 20 + i * (COL_W + 40);
const HEAD = { y: 70, h: 54 } as const;
const ROW = { y: 140, h: 28, gap: 8 } as const;

const CHUNK_START = CORPUS.stride;
const CHUNK_END = CORPUS.stride + CORPUS.chunkTokens;

interface Attr {
  label: string;
  tone?: LayoutTone;
  fill?: LayoutShape["fill"];
  highlight?: boolean;
}

const column = (
  id: string,
  i: number,
  ask: string,
  head: { label: string; sub: string; tone: LayoutTone },
  attrs: Attr[],
  step: number
): LayoutShape[] => [
  {
    id: `${id}-ask`,
    type: "text",
    x: colX(i),
    y: 16,
    w: COL_W,
    h: 40,
    label: ask,
    tone: RAG_TONE.infra,
    step,
  },
  {
    id,
    type: "box",
    x: colX(i),
    y: HEAD.y,
    w: COL_W,
    h: HEAD.h,
    label: head.label,
    sub: head.sub,
    tone: head.tone,
    fill: "pastel",
    step,
  },
  ...attrs.map((a, r): LayoutShape => ({
    id: `${id}-${r}`,
    type: "cell",
    x: colX(i),
    y: ROW.y + r * (ROW.h + ROW.gap),
    w: COL_W,
    h: ROW.h,
    label: a.label,
    tone: a.tone ?? head.tone,
    fill: a.fill,
    highlight: a.highlight,
    step,
  })),
];

const hop = (id: string, from: string, to: string, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Lineage: one answer traced back to its chunk, document version and source record",
  width: 880,
  height: 290,
  steps: [
    { title: "The answer the user saw" },
    { title: "The chunk it cited" },
    { title: "The document version the chunk was cut from" },
    { title: "The source record that version came from" },
  ],
  shapes: [
    ...column(
      "answer",
      0,
      "What did the\nuser see?",
      { label: "Answer", sub: "asked 2026-11-14", tone: RAG_TONE.answer },
      [{ label: "trace t-8c1f" }, { label: "cites [2] = a-0412#2" }, { label: "prompt version 14" }],
      1
    ),
    ...column(
      "chunk",
      1,
      "Which text did\nthe model read?",
      { label: "Cited chunk", sub: "a-0412#2", tone: RAG_TONE.text },
      [
        { label: `tokens ${CHUNK_START}–${CHUNK_END}` },
        { label: "embedded by embed-v2", tone: RAG_TONE.embedding, fill: "pastel" },
        { label: "served by snapshot 2", tone: RAG_TONE.store },
      ],
      2
    ),
    hop("h1", "answer", "chunk", 2),
    ...column(
      "doc",
      2,
      "Which version of\nthe article?",
      { label: "Document version", sub: "a-0412 v7", tone: RAG_TONE.text },
      [{ label: "hash 4b7e…", highlight: true }, { label: "updated 2026-10-02" }, { label: "in corpus c42" }],
      3
    ),
    hop("h2", "chunk", "doc", 3),
    ...column(
      "source",
      3,
      "Where did it\ncome from?",
      { label: "Source record", sub: "help-centre CMS", tone: RAG_TONE.store },
      [{ label: "article 412, revision 7" }, { label: "edited by support team" }, { label: "access: public" }],
      4
    ),
    hop("h3", "doc", "source", 4),
    {
      id: "note",
      type: "text",
      x: 140,
      y: 254,
      w: 600,
      h: 20,
      label: "Every hop is an id stored when the data was written, so tracing is a lookup",
      tone: RAG_TONE.infra,
      step: 4,
    },
  ],
};

export default spec;
