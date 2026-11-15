import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { RAG_TONE } from "@/components/diagrams/presets/rag";

// Three similarity measures on the same small vectors, so the difference is visible. a = (3, 4) is the question;
// b = (4, 3) is a chunk pointing almost the same way; c = (6, 8) = 2a points exactly the same way but is twice as long.
// Working:
// - |a| = |b| = 5, |c| = 10. a·b = 3×4 + 4×3 = 24; a·c = 3×6 + 4×8 = 50.
// - Cosine: a·b / (|a||b|) = 24 / 25 = 0.96; a·c / (|a||c|) = 50 / 50 = 1.00.
// - Dot product: 24 and 50.
// - Euclidean distance: |a − b| = √((3−4)² + (4−3)²) = √2 = 1.41; |a − c| = √(3² + 4²) = 5.00.
// Cosine calls c identical to a; distance calls b much closer than c. For unit-length vectors all three give the
// same order, which is why most embedding APIs return normalised vectors.
//
// Tones (three): the question orange, chunks pink, the table neutral; the row where the measures disagree is lime.

const O: [number, number] = [50, 330];
const S = 30;
const pt = ([x, y]: [number, number]): [number, number] => [O[0] + x * S, O[1] - y * S];

const vec = (id: string, v: [number, number], tone: "orange" | "pink", dashed = false): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points: [O, pt(v)],
  head: true,
  tone,
  dashed: dashed || undefined,
});

const cell = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  tone: LayoutTone = RAG_TONE.infra
): LayoutShape => ({
  id,
  type: "cell",
  x,
  y,
  w,
  h: 40,
  label,
  tone,
});

const f2 = (v: number) => v.toFixed(2);
const a: [number, number] = [3, 4];
const b: [number, number] = [4, 3];
const c: [number, number] = [6, 8];
const dot = (p: [number, number], q: [number, number]) => p[0] * q[0] + p[1] * q[1];
const len = (p: [number, number]) => Math.hypot(p[0], p[1]);
const dist = (p: [number, number], q: [number, number]) => Math.hypot(p[0] - q[0], p[1] - q[1]);

const TX = 380;
const COL = [TX, TX + 210, TX + 340] as const;
const W = [206, 126, 126] as const;
const rows: [string, string, string][] = [
  ["Measure", "a vs b", "a vs c"],
  ["Cosine", f2(dot(a, b) / (len(a) * len(b))), f2(dot(a, c) / (len(a) * len(c)))],
  ["Dot product", String(dot(a, b)), String(dot(a, c))],
  ["Euclidean distance", f2(dist(a, b)), f2(dist(a, c))],
];

const table: LayoutShape[] = rows.flatMap((r, i) =>
  r.map((text, j) =>
    cell(
      `t${i}-${j}`,
      COL[j],
      60 + i * 44,
      W[j],
      text,
      i === 0 ? RAG_TONE.infra : j === 0 ? RAG_TONE.infra : RAG_TONE.rank
    )
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Cosine, dot product and distance on the same vectors",
  width: 860,
  height: 360,
  shapes: [
    {
      id: "axes",
      type: "path",
      x: 0,
      y: 0,
      points: [
        [O[0], 50],
        [O[0], O[1]],
        [330, O[1]],
      ],
    },
    vec("va", a, "orange"),
    vec("vb", b, "pink"),
    vec("vc", c, "pink", true),
    {
      id: "la",
      type: "text",
      x: pt(a)[0] - 64,
      y: pt(a)[1] - 10,
      w: 60,
      h: 20,
      label: "a (3, 4)",
      tone: RAG_TONE.query,
    },
    {
      id: "lb",
      type: "text",
      x: pt(b)[0] + 6,
      y: pt(b)[1] - 4,
      w: 64,
      h: 20,
      label: "b (4, 3)",
      tone: RAG_TONE.embedding,
    },
    {
      id: "lc",
      type: "text",
      x: pt(c)[0] + 6,
      y: pt(c)[1] - 10,
      w: 120,
      h: 20,
      label: "c (6, 8) = 2a",
      tone: RAG_TONE.embedding,
    },
    {
      id: "plot-note",
      type: "text",
      x: 60,
      y: 20,
      w: 270,
      h: 20,
      label: "a = question; b, c = chunks",
      tone: RAG_TONE.infra,
    },
    ...table,
    {
      id: "t-note1",
      type: "text",
      x: TX,
      y: 248,
      w: 466,
      h: 20,
      label: "Cosine ignores length: c counts as identical to a.",
      tone: RAG_TONE.infra,
    },
    {
      id: "t-note2",
      type: "text",
      x: TX,
      y: 270,
      w: 466,
      h: 20,
      label: "Distance and dot product care about length.",
      tone: RAG_TONE.infra,
    },
    {
      id: "t-note3",
      type: "text",
      x: TX,
      y: 300,
      w: 466,
      h: 20,
      label: "Normalise every vector to length 1 and all three agree.",
      tone: RAG_TONE.infra,
    },
  ],
};

export default spec;
