import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { CORPUS, RAG_TONE, VECTOR_INDEX, docStrip, fmt } from "@/components/diagrams/presets/rag";

// Product quantisation (Jégou, Douze and Schmid, 2011): split each vector into m sub-vectors, quantise each one
// separately with its own small codebook learned by k-means, and store only the id of the nearest centroid. With 256
// centroids per codebook an id fits in one byte (the usual choice; the FAISS paper, Johnson et al. 2017, describes
// sub-quantisers with 256 values "to fit in one byte").
//
// Running example (VECTOR_INDEX in presets/rag.ts): 1,536 dimensions = 96 sub-vectors × 16 dimensions. A raw vector
// is 1,536 × 4 = 6,144 bytes; its code is 96 × 1 = 96 bytes, 64 times smaller. 3,600 codes = 345,600 bytes ≈ 0.35 MB
// instead of 22 MB. The code values drawn (37, 201, ...) are illustrative.
//
// Drawn: the whole vector as a strip of 96 cells; sub-vectors 1-4 and 94-96 (the rest elided); under each its
// one-byte code; and a zoom on sub-vector 1 and its codebook. Tones (two plus neutral): the vector pink, codes and
// codebooks violet (the index).

const X0 = 40;
const BAR_W = 776;
const BOX = { w: 92, h: 44, gap: 10 } as const;
const ROW = { bar: 40, subs: 108, codes: 196 } as const;

/** Drawn sub-vectors (1-based) and their illustrative codes. */
const SHOWN: { n: number; code: number }[] = [
  { n: 1, code: 37 },
  { n: 2, code: 201 },
  { n: 3, code: 5 },
  { n: 4, code: 142 },
  { n: 94, code: 88 },
  { n: 95, code: 19 },
  { n: 96, code: 230 },
];
/** x of each drawn column: four from the left, a gap for "…", three to the right. */
const colX = (i: number) =>
  i < 4 ? X0 + i * (BOX.w + BOX.gap) : X0 + BAR_W - (SHOWN.length - i) * (BOX.w + BOX.gap) + BOX.gap;

const dims = VECTOR_INDEX.pqSubDims;
const range = (n: number) => `${fmt((n - 1) * dims + 1)}–${fmt(n * dims)}`;

const text = (id: string, y: number, label: string, step: number, x = X0, w = BAR_W): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 20,
  label,
  tone: RAG_TONE.infra,
  step,
});

/** The whole vector as a strip of 96 cells, one per sub-vector (each 16 numbers). */
const bar = docStrip("bar", X0, ROW.bar, {
  tokens: CORPUS.dims,
  perCell: dims,
  width: BAR_W,
  h: 30,
  tone: RAG_TONE.embedding,
});

const columns: LayoutShape[] = SHOWN.flatMap(({ n, code }, i): LayoutShape[] => [
  {
    id: `sub${n}`,
    type: "box",
    x: colX(i),
    y: ROW.subs,
    w: BOX.w,
    h: BOX.h,
    label: `#${n}`,
    sub: range(n),
    tone: RAG_TONE.embedding,
    fill: "pastel",
    step: 2,
  },
  {
    id: `code${n}`,
    type: "cell",
    x: colX(i),
    y: ROW.codes,
    w: BOX.w,
    h: 30,
    label: String(code),
    tone: RAG_TONE.store,
    fill: "pastel",
    step: n === 1 ? 3 : 4,
  },
  {
    id: `a${n}`,
    type: "arrow",
    x: 0,
    y: 0,
    from: `sub${n}`,
    to: `code${n}`,
    step: n === 1 ? 3 : 4,
  },
]);

const ZOOM_Y = 312;
const BOOK = ["0", "1", "2", "…", "37", "…", "255"];
const BOOK_X = 230;
const book: LayoutShape[] = BOOK.map((label, i) => ({
  id: `book${i}`,
  type: "cell",
  x: BOOK_X + i * 44,
  y: ZOOM_Y,
  w: 40,
  h: 36,
  label,
  tone: RAG_TONE.store,
  fill: label === "37" ? "pastel" : "soft",
  highlight: label === "37" ? true : undefined,
  step: 3,
}));

const spec: LayoutSpec = {
  kind: "layout",
  title: "Product quantisation: 6,144 bytes become a 96-byte code",
  width: 860,
  height: 480,
  steps: [
    { title: `One vector: ${fmt(CORPUS.dims)} numbers, ${fmt(CORPUS.bytesPerVector)} bytes` },
    { title: `Cut it into ${VECTOR_INDEX.pqSubvectors} sub-vectors of ${dims} numbers` },
    { title: "Replace each sub-vector with the id of its nearest centroid" },
    { title: `Store ${VECTOR_INDEX.pqBytesPerVector} bytes per vector instead of ${fmt(CORPUS.bytesPerVector)}` },
  ],
  groups: [
    {
      id: "zoom",
      title: "How sub-vector #1 becomes one byte",
      tone: RAG_TONE.infra,
      x: X0 - 16,
      y: 262,
      w: BAR_W + 32,
      h: 120,
    },
  ],
  shapes: [
    text(
      "t-bar",
      14,
      `One chunk's vector: ${fmt(CORPUS.dims)} numbers × ${CORPUS.bytesPerFloat} bytes = ${fmt(CORPUS.bytesPerVector)} bytes`,
      1
    ),
    ...bar,
    text("t-subs", 82, `${VECTOR_INDEX.pqSubvectors} sub-vectors of ${dims} numbers (dims shown under each)`, 2),
    {
      id: "gap",
      type: "text",
      x: colX(3) + BOX.w + 4,
      y: ROW.subs + 12,
      w: colX(4) - colX(3) - BOX.w - 8,
      h: 20,
      label: "… 89 more …",
      tone: RAG_TONE.infra,
      step: 2,
    },
    ...columns,
    {
      id: "gap-codes",
      type: "text",
      x: colX(3) + BOX.w + 4,
      y: ROW.codes + 5,
      w: colX(4) - colX(3) - BOX.w - 8,
      h: 20,
      label: "…",
      tone: RAG_TONE.infra,
      step: 4,
    },
    {
      id: "zoom-sub",
      type: "box",
      x: X0 + 8,
      y: ZOOM_Y - 4,
      w: 130,
      h: 44,
      label: "#1",
      sub: `${dims} numbers`,
      tone: RAG_TONE.embedding,
      fill: "pastel",
      step: 3,
    },
    text("t-book", ZOOM_Y - 26, "Codebook #1: 256 centroids (k-means)", 3, BOOK_X, BOOK.length * 44 - 4),
    ...book,
    {
      id: "zoom-code",
      type: "box",
      x: 620,
      y: ZOOM_Y - 4,
      w: 180,
      h: 44,
      label: "store 37",
      sub: "one byte (0–255)",
      tone: RAG_TONE.store,
      fill: "pastel",
      step: 3,
    },
    {
      id: "z1",
      type: "arrow",
      x: 0,
      y: 0,
      from: "zoom-sub",
      to: "book0",
      step: 3,
    },
    { id: "z2", type: "arrow", x: 0, y: 0, from: "book6", to: "zoom-code", step: 3 },
    text("t-nearest", ZOOM_Y + 42, "The nearest of the 256 is centroid 37", 3, BOOK_X, BOOK.length * 44 - 4),
    {
      id: "sum-vector",
      type: "box",
      x: X0,
      y: 406,
      w: 380,
      h: 50,
      label: `Per vector: ${fmt(CORPUS.bytesPerVector)} B → ${VECTOR_INDEX.pqBytesPerVector} B\n${VECTOR_INDEX.pqRatio}× smaller`,
      tone: RAG_TONE.store,
      fill: "soft",
      step: 4,
    },
    {
      id: "sum-index",
      type: "box",
      x: X0 + BAR_W - 380,
      y: 406,
      w: 380,
      h: 50,
      label: `${fmt(CORPUS.chunks)} × ${VECTOR_INDEX.pqBytesPerVector} B = ${fmt(VECTOR_INDEX.pqIndexBytes)} B ≈ 0.35 MB\nraw vectors: ${CORPUS.indexMB} MB`,
      tone: RAG_TONE.store,
      fill: "soft",
      step: 4,
    },
  ],
};

export default spec;
