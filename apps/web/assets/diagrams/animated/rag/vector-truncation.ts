import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { CORPUS, RAG_TONE, fmt, vector } from "@/components/diagrams/presets/rag";

// Shortening an embedding: Matryoshka-trained models (Kusupati et al., 2022) put the most useful information in the
// first dimensions, so a prefix of the vector is itself a usable embedding. Cutting Brightpost's 1,536-dimension
// vectors to 256 and re-normalising them. Working:
// - 256 × 4 bytes = 1,024 bytes per vector instead of 6,144 (6 times smaller).
// - 3,600 × 1,024 = 3,686,400 bytes ≈ 3.7 MB instead of 22,118,400 ≈ 22 MB.
// Each drawn cell stands for 32 dimensions: 48 cells for 1,536, 8 for 256. Shading is illustrative and falls off
// along the vector to show where the information sits.
//
// Tones (two): vectors pink, the warning red.

const DIMS = 256;
const PER_CELL = 32;
const CELL = 15;
const FULL_N = CORPUS.dims / PER_CELL;
const CUT_N = DIMS / PER_CELL;
const X = 40;
const shade = (i: number) => Math.round(Math.max(0.12, 0.95 - i * 0.018) * 100) / 100;

const bytes = DIMS * CORPUS.bytesPerFloat;
const indexBytes = CORPUS.chunks * bytes;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step = 1,
  tone: LayoutTone = RAG_TONE.infra
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 20,
  label,
  tone,
  step,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Shortening an embedding from 1,536 to 256 dimensions",
  width: 800,
  height: 250,
  steps: [{ title: "The full vector: 1,536 numbers" }, { title: "Keep the first 256 and re-normalise" }],
  shapes: [
    text(
      "full-title",
      X,
      20,
      720,
      `Full vector: ${fmt(CORPUS.dims)} dimensions × 4 bytes = ${fmt(CORPUS.bytesPerVector)} bytes`
    ),
    ...vector("full", X, 48, FULL_N, RAG_TONE.embedding, {
      cell: CELL,
      values: Array.from({ length: FULL_N }, (_, i) => shade(i)),
    }),
    {
      id: "cut",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [X + CUT_N * CELL, 40],
        [X + CUT_N * CELL, 72],
      ],
      dashed: true,
      tone: RAG_TONE.embedding,
      step: 2,
    },
    text("cut-label", X + CUT_N * CELL - 50, 76, 100, "cut after 256", 2, RAG_TONE.embedding),
    text(
      "short-title",
      X,
      110,
      720,
      `Short vector: ${DIMS} dimensions × 4 bytes = ${fmt(bytes)} bytes, 6 times smaller`,
      2
    ),
    ...vector("short", X, 138, CUT_N, RAG_TONE.embedding, {
      cell: CELL,
      values: Array.from({ length: CUT_N }, (_, i) => shade(i)),
      step: 2,
    }),
    text("short-note", X + CUT_N * CELL + 12, 138, 220, "then re-normalise to length 1", 2),
    text(
      "index",
      X,
      176,
      720,
      `Index for ${fmt(CORPUS.chunks)} chunks: ${fmt(CORPUS.indexBytes)} B ≈ 22 MB → ${fmt(indexBytes)} B ≈ 3.7 MB`,
      2
    ),
    text(
      "warn",
      X,
      206,
      720,
      "Only for models trained to be cut (Matryoshka); other models lose meaning",
      2,
      RAG_TONE.failure
    ),
  ],
};

export default spec;
