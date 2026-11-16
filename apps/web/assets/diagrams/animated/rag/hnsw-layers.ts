import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { CORPUS, RAG_TONE, TOP_K, VECTOR_INDEX, fmt } from "@/components/diagrams/presets/rag";

// HNSW search, layer by layer (Malkov and Yashunin, 2016, arXiv 1603.09320). Facts used, checked against the paper:
// - Every element is in layer 0; its top layer is drawn at random from an exponentially decaying distribution,
//   l = floor(-ln(unif(0..1)) × mL) with mL = 1 / ln(M), so a share 1 / M^l of the elements reaches layer l.
// - Each element keeps up to M links per layer, and up to Mmax0 = 2 × M in layer 0 (the paper's recommendation).
// - K-NN-SEARCH (Algorithm 5) enters at the top layer's entry point, runs a greedy search (ef = 1) on every layer
//   above 0, and at layer 0 runs the search with a dynamic candidate list of size ef; it returns the K nearest found.
//   Libraries call this ef "efSearch"; efConstruction is the same list size used while building.
//
// Running example (illustrative defaults from presets/rag.ts): M = 16, efSearch = 64, Brightpost's 3,600 vectors.
// Expected layer sizes: layer 1 ≈ 3,600 / 16 = 225 points, layer 2 ≈ 3,600 / 256 ≈ 14 points, layer 3 ≈ 0.9, so
// three layers is what this index would really have. The drawing shows 21 points of the 3,600 (a 2-D sketch), 8 of
// them in layer 1 and 3 in layer 2, and a beam of 8 candidates for ef = 64.
//
// The route: layer 2 enters at e1 and hops to e8 (closer to the question); e8's other neighbour, e19, is farther, so
// the search drops to layer 1 at e8, hops e8 → e11 → e13, and drops to layer 0 at e13. There the beam explores e13's
// neighbourhood; the 5 nearest it found (TOP_K) are the answer, inside the dashed ring.
//
// Tones (three plus neutral): points pink, the question, its route and the top-k ring orange, the layer bands violet
// (the index). Links neutral.

/** Expected points per layer for M = 16 (layer l holds about 1 / M^l of the vectors). */
const LAYER_SIZE = [0, 1, 2].map((l) => Math.round(CORPUS.chunks / VECTOR_INDEX.hnswM ** l)); // 3,600 | 225 | 14

const X0 = 20;
const BAND_W = 840;
/** Band heights: layer 0 is taller so the top-k ring fits inside it. */
const BAND_H = { 2: 104, 1: 104, 0: 136 } as const;
/** Top of each band, layer 2 first. */
const BAND_Y = { 2: 34, 1: 172, 0: 310 } as const;
type Layer = keyof typeof BAND_Y;

/** The drawn elements: x, a relative y inside the band (0..1) and their top layer. */
const E: Record<string, [x: number, ry: number, top: Layer]> = {
  e0: [80, 0.3, 0],
  e1: [130, 0.75, 2],
  e2: [175, 0.35, 0],
  e3: [215, 0.85, 1],
  e4: [255, 0.2, 0],
  e5: [300, 0.6, 0],
  e6: [340, 0.15, 1],
  e7: [380, 0.85, 0],
  e8: [420, 0.45, 2],
  e9: [455, 0.1, 0],
  e10: [505, 0.9, 0],
  e11: [535, 0.3, 1],
  e12: [560, 0.95, 0],
  e13: [605, 0.2, 1],
  e14: [615, 0.8, 0],
  e15: [625, 0.5, 0],
  e16: [690, 0.1, 0],
  e17: [710, 0.9, 1],
  e18: [745, 0.45, 0],
  e19: [775, 0.15, 2],
  e20: [810, 0.7, 0],
};
const Q: [number, number] = [575, 0.5];

/** Links per layer (a sketch of the graph: long hops above, short ones below). */
const LINKS: Record<Layer, [string, string][]> = {
  2: [
    ["e1", "e8"],
    ["e8", "e19"],
  ],
  1: [
    ["e1", "e3"],
    ["e1", "e6"],
    ["e3", "e6"],
    ["e6", "e8"],
    ["e8", "e11"],
    ["e11", "e13"],
    ["e13", "e17"],
    ["e13", "e19"],
    ["e17", "e19"],
  ],
  0: [
    ["e0", "e1"],
    ["e0", "e2"],
    ["e1", "e2"],
    ["e1", "e3"],
    ["e2", "e4"],
    ["e3", "e5"],
    ["e4", "e5"],
    ["e4", "e6"],
    ["e5", "e7"],
    ["e5", "e8"],
    ["e6", "e9"],
    ["e7", "e10"],
    ["e8", "e9"],
    ["e8", "e11"],
    ["e9", "e11"],
    ["e10", "e12"],
    ["e11", "e13"],
    ["e11", "e12"],
    ["e12", "e14"],
    ["e13", "e15"],
    ["e13", "e16"],
    ["e14", "e15"],
    ["e15", "e18"],
    ["e16", "e19"],
    ["e17", "e18"],
    ["e14", "e17"],
    ["e18", "e20"],
    ["e19", "e20"],
  ],
};

/** The greedy route on the upper layers, and where it drops a layer. */
const ROUTE: { layer: Layer; hops: string[]; step: number }[] = [
  { layer: 2, hops: ["e1", "e8"], step: 2 },
  { layer: 1, hops: ["e8", "e11", "e13"], step: 3 },
];
const DROPS: { from: Layer; at: string; step: number }[] = [
  { from: 2, at: "e8", step: 3 },
  { from: 1, at: "e13", step: 4 },
];
/** The beam at layer 0: the candidates the search looked at (8 drawn for ef = 64). */
const BEAM = ["e13", "e11", "e12", "e14", "e15", "e16", "e10", "e9"];

const DOT = 12;
const at = (layer: Layer, x: number, ry: number): [number, number] => [
  x,
  BAND_Y[layer] + 26 + ry * (BAND_H[layer] - 40),
];
const pos = (layer: Layer, id: string) => at(layer, E[id][0], E[id][1]);
const qPos = (layer: Layer) => at(layer, Q[0], Q[1]);
const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// The top k: the TOP_K beam points nearest the question at layer 0. The ring passes 10 units outside the k-th
// nearest; the next nearest (e10, 80 away) sits clearly outside it.
const ranked = BEAM.map((id) => ({ id, d: dist(pos(0, id), qPos(0)) })).sort((a, b) => a.d - b.d);
const RING_R = Math.round(ranked[TOP_K - 1].d + 10);
if (ranked[TOP_K].d - DOT / 2 < RING_R + 6)
  throw new Error("hnsw-layers: the 6th nearest point touches the top-k ring");

/** Shorten a segment by `pad` at both ends so arrows stop at the dots' edges. */
function trim(a: [number, number], b: [number, number], pad: number): [[number, number], [number, number]] {
  const d = dist(a, b);
  const ux = (b[0] - a[0]) / d;
  const uy = (b[1] - a[1]) / d;
  const r = (v: number) => Math.round(v * 10) / 10;
  return [
    [r(a[0] + ux * pad), r(a[1] + uy * pad)],
    [r(b[0] - ux * pad), r(b[1] - uy * pad)],
  ];
}

const layers = [2, 1, 0] as const;

const links: LayoutShape[] = layers.flatMap((l) =>
  LINKS[l].map(([a, b]) => ({
    id: `l${l}-${a}-${b}`,
    type: "path" as const,
    x: 0,
    y: 0,
    points: [pos(l, a), pos(l, b)],
    weight: l === 0 ? 0.35 : 0.5,
  }))
);

const points: LayoutShape[] = layers.flatMap((l) =>
  Object.entries(E)
    .filter(([, [, , top]]) => top >= l)
    .map(([id]) => {
      const [x, y] = pos(l, id);
      return {
        id: `p${l}-${id}`,
        type: "circle" as const,
        x,
        y,
        w: DOT,
        tone: RAG_TONE.embedding,
        fill: "soft" as const,
      };
    })
);

const question: LayoutShape[] = layers.map((l) => {
  const [x, y] = qPos(l);
  return {
    id: `q${l}`,
    type: "circle",
    x,
    y,
    w: DOT + 4,
    tone: RAG_TONE.query,
    fill: "pastel",
    step: 2,
  };
});

const route: LayoutShape[] = [
  ...ROUTE.flatMap(({ layer, hops, step }) =>
    hops.slice(1).map((to, i): LayoutShape => {
      const [a, b] = trim(pos(layer, hops[i]), pos(layer, to), DOT / 2 + 3);
      return {
        id: `hop${layer}-${hops[i]}-${to}`,
        type: "path",
        x: 0,
        y: 0,
        points: [a, b],
        head: true,
        tone: RAG_TONE.query,
        step,
      };
    })
  ),
  ...DROPS.map(({ from, at: id, step }): LayoutShape => {
    const [a, b] = trim(pos(from, id), pos((from - 1) as Layer, id), DOT / 2 + 3);
    return {
      id: `drop${from}-${id}`,
      type: "path",
      x: 0,
      y: 0,
      points: [a, b],
      head: true,
      dashed: true,
      tone: RAG_TONE.query,
      step,
    };
  }),
];

/** A ring of radius r around (cx, cy), as a closed smooth path (paths draw under the dots, so the dot stays visible). */
const ringPath = (id: string, cx: number, cy: number, r: number, step: number, dashed = false): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points: Array.from({ length: dashed ? 49 : 25 }, (_, i): [number, number] => {
    const a = (2 * Math.PI * i) / (dashed ? 48 : 24);
    return [Math.round((cx + r * Math.cos(a)) * 10) / 10, Math.round((cy + r * Math.sin(a)) * 10) / 10];
  }),
  smooth: true,
  dashed,
  tone: RAG_TONE.query,
  weight: dashed ? undefined : 0.8,
  step,
});

const beam: LayoutShape[] = BEAM.map((id) => {
  const [x, y] = pos(0, id);
  return ringPath(`beam-${id}`, x, y, DOT / 2 + 5, 4);
});

const [qx, qy] = qPos(0);
const ring = ringPath("topk", qx, qy, RING_R, 5, true);

const note = (id: string, x: number, y: number, w: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 18,
  label,
  tone: RAG_TONE.query,
  step,
});

const [ex, ey] = pos(2, "e1");
const [q2x, q2y] = qPos(2);

const spec: LayoutSpec = {
  kind: "layout",
  title: "HNSW: greedy hops down the layers, then a beam at the bottom",
  width: 880,
  height: 500,
  steps: [
    { title: "One graph in three layers: every point in layer 0, a few above" },
    { title: "Search enters at the top and hops greedily toward the question" },
    { title: "It drops a layer where it can get no closer, and hops again" },
    { title: `At layer 0 a beam of ef candidates explores (ef = ${VECTOR_INDEX.hnswEfSearch})` },
    { title: `The ${TOP_K} nearest in the beam are the top k` },
  ],
  groups: [
    {
      id: "band2",
      title: `Layer 2: about ${LAYER_SIZE[2]} points, long hops`,
      tone: RAG_TONE.store,
      x: X0,
      y: BAND_Y[2],
      w: BAND_W,
      h: BAND_H[2],
    },
    {
      id: "band1",
      title: `Layer 1: about ${LAYER_SIZE[1]} points`,
      tone: RAG_TONE.store,
      x: X0,
      y: BAND_Y[1],
      w: BAND_W,
      h: BAND_H[1],
    },
    {
      id: "band0",
      title: `Layer 0: all ${fmt(LAYER_SIZE[0])} points, short links`,
      tone: RAG_TONE.store,
      x: X0,
      y: BAND_Y[0],
      w: BAND_W,
      h: BAND_H[0],
    },
  ],
  shapes: [
    ...links,
    ...points,
    ...question,
    ...route,
    ...beam,
    ring,
    note("entry", ex - 60, ey + 12, 120, "entry point", 2),
    note("q-label", q2x - 40, q2y + 12, 80, "question", 2),
    {
      id: "footer",
      type: "text",
      x: X0,
      y: 452,
      w: BAND_W,
      h: 20,
      label: `M = ${VECTOR_INDEX.hnswM} links per point (${2 * VECTOR_INDEX.hnswM} in layer 0); 21 of ${fmt(CORPUS.chunks)} points drawn`,
      tone: RAG_TONE.infra,
    },
    note("beam-label", X0, 474, BAND_W / 2, `Small rings: the beam (ef = ${VECTOR_INDEX.hnswEfSearch}; 8 drawn)`, 4),
    note("topk-label", X0 + BAND_W / 2, 474, BAND_W / 2, `Dashed ring: the top ${TOP_K}`, 5),
  ],
};

export default spec;
