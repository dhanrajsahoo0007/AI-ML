import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { CORPUS, RAG_TONE, VECTOR_INDEX, fmt } from "@/components/diagrams/presets/rag";

// IVF (inverted file index), as a 2-D sketch. Build: k-means groups Brightpost's 3,600 vectors into 60 cells
// (VECTOR_INDEX.ivfCells, about √3,600), each with a centroid; every vector is filed under its nearest centroid, so a
// cell holds about 3,600 / 60 = 60 vectors. Search: the question is compared with the 60 centroids, then with the
// vectors of the nearest 4 cells only (ivfProbe, called nprobe in FAISS): 60 + 4 × 60 = 300 comparisons instead of
// 3,600. The catch: a vector just over the border of a fifth cell can be nearer to the question than most vectors in
// the probed cells, and it is never looked at.
//
// The drawing has 16 cells (a sketch; the real index has 60). Cell borders are the Voronoi cells of the centroids,
// clipped to the plot (each cell is the plot clipped by the half-planes nearer its centroid than any other). Points
// sit around their centroid and are checked to belong to its cell. The missed point is placed on the line from the
// question to the fifth-nearest centroid, just inside that centroid's cell; the spec checks that it is one of the 5
// points nearest the question.
//
// Tones (four): vectors pink, centroids and the build box violet, the question and the probed cells orange, the miss
// red. Cell borders neutral.

type Pt = [number, number];

const PLOT = { x: 30, y: 54, w: 400, h: 340 } as const;
const COLS = 4;
const ROWS = 4;

/** Centroid jitter per cell (viewBox units), so the cells are not a regular grid. */
const JIT: Pt[] = [
  [-12, 8],
  [10, -14],
  [-6, 12],
  [14, 4],
  [8, -10],
  [-14, 6],
  [12, 14],
  [-8, -12],
  [-10, 10],
  [6, -6],
  [-12, -10],
  [10, 12],
  [12, -8],
  [-6, 14],
  [8, 6],
  [-12, -6],
];

const r1 = (v: number) => Math.round(v * 10) / 10;
const d2 = (a: Pt, b: Pt) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

const CENTROIDS: Pt[] = Array.from({ length: COLS * ROWS }, (_, k) => {
  const c = k % COLS;
  const r = Math.floor(k / COLS);
  return [PLOT.x + (c + 0.5) * (PLOT.w / COLS) + JIT[k][0], PLOT.y + (r + 0.5) * (PLOT.h / ROWS) + JIT[k][1]];
});

const nearestCentroid = (p: Pt) => CENTROIDS.reduce((best, c, k) => (d2(p, c) < d2(p, CENTROIDS[best]) ? k : best), 0);

/** The cell of centroid i: the plot rectangle clipped by every half-plane nearer c_i than c_j (Sutherland-Hodgman). */
function cell(i: number): Pt[] {
  let poly: Pt[] = [
    [PLOT.x, PLOT.y],
    [PLOT.x + PLOT.w, PLOT.y],
    [PLOT.x + PLOT.w, PLOT.y + PLOT.h],
    [PLOT.x, PLOT.y + PLOT.h],
  ];
  const ci = CENTROIDS[i];
  CENTROIDS.forEach((cj, j) => {
    if (j === i) return;
    // Inside when (cj - ci) · p <= (|cj|² - |ci|²) / 2.
    const nx = cj[0] - ci[0];
    const ny = cj[1] - ci[1];
    const lim = (cj[0] ** 2 + cj[1] ** 2 - ci[0] ** 2 - ci[1] ** 2) / 2;
    const side = (p: Pt) => nx * p[0] + ny * p[1] - lim;
    const out: Pt[] = [];
    poly.forEach((p, k) => {
      const q = poly[(k + 1) % poly.length];
      const sp = side(p);
      const sq = side(q);
      if (sp <= 0) out.push(p);
      if ((sp < 0 && sq > 0) || (sp > 0 && sq < 0)) {
        const t = sp / (sp - sq);
        out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    });
    poly = out;
  });
  return poly.map(([x, y]) => [r1(x), r1(y)]);
}

/** The question, placed near the meeting point of several cells. */
const QUERY: Pt = [228, 186];
const byDistance = CENTROIDS.map((c, k) => ({ k, d: d2(QUERY, c) })).sort((a, b) => a.d - b.d);
const PROBED = byDistance.slice(0, VECTOR_INDEX.ivfProbe).map((e) => e.k);
const FIFTH = byDistance[VECTOR_INDEX.ivfProbe].k;

/** Points around each centroid (4 per cell, mirrored cell by cell), kept only if they fall inside their own cell. */
const OFFSETS: Pt[] = [
  [-24, -16],
  [20, -20],
  [-16, 22],
  [26, 14],
];
const POINTS: { p: Pt; k: number }[] = CENTROIDS.flatMap((c, k) =>
  OFFSETS.map(([ox, oy]): { p: Pt; k: number } => {
    const s = k % 2 ? -1 : 1;
    return { p: [r1(c[0] + s * ox), r1(c[1] + oy)], k };
  }).filter(({ p, k: own }) => nearestCentroid(p) === own)
);

/** The missed neighbour: on the line from the question to the fifth centroid, 8 units inside the fifth cell. */
const MISS: Pt = (() => {
  const c = CENTROIDS[FIFTH];
  const len = Math.sqrt(d2(QUERY, c));
  for (let t = 0; t <= len; t += 1) {
    const p: Pt = [QUERY[0] + ((c[0] - QUERY[0]) * t) / len, QUERY[1] + ((c[1] - QUERY[1]) * t) / len];
    if (nearestCentroid(p) === FIFTH) {
      const u = t + 8;
      return [r1(QUERY[0] + ((c[0] - QUERY[0]) * u) / len), r1(QUERY[1] + ((c[1] - QUERY[1]) * u) / len)];
    }
  }
  throw new Error("ivf-cells: no border toward the fifth cell");
})();
{
  const nearer = POINTS.filter(({ p }) => d2(p, QUERY) < d2(MISS, QUERY)).length;
  if (nearer >= 5) throw new Error(`ivf-cells: the missed point is not among the 5 nearest (${nearer} are nearer)`);
}

const closed = (poly: Pt[]): Pt[] => [...poly, poly[0]];

const cellsShapes: LayoutShape[] = [
  ...CENTROIDS.map((_, k): LayoutShape => ({
    id: `cell${k}`,
    type: "path",
    x: 0,
    y: 0,
    points: closed(cell(k)),
    weight: 0.3,
  })),
  ...PROBED.map((k): LayoutShape => ({
    id: `probe${k}`,
    type: "path",
    x: 0,
    y: 0,
    points: closed(cell(k)),
    tone: RAG_TONE.query,
    weight: 0.9,
    step: 3,
  })),
];

const pointShapes: LayoutShape[] = POINTS.map(({ p }, i) => ({
  id: `pt${i}`,
  type: "circle",
  x: p[0],
  y: p[1],
  w: 9,
  tone: RAG_TONE.embedding,
  fill: "soft",
}));

const centroidShapes: LayoutShape[] = CENTROIDS.map((c, k) => ({
  id: `c${k}`,
  type: "circle",
  x: r1(c[0]),
  y: r1(c[1]),
  w: 16,
  tone: RAG_TONE.store,
  fill: "pastel",
  symbol: "times",
  label: `centroid ${k + 1}`,
}));

const probeLines: LayoutShape[] = PROBED.map((k) => ({
  id: `ql${k}`,
  type: "path",
  x: 0,
  y: 0,
  points: [QUERY, [r1(CENTROIDS[k][0]), r1(CENTROIDS[k][1])]],
  dashed: true,
  tone: RAG_TONE.query,
  step: 3,
}));

const missRing: LayoutShape = {
  id: "miss-ring",
  type: "path",
  x: 0,
  y: 0,
  points: Array.from({ length: 25 }, (_, i): Pt => {
    const a = (2 * Math.PI * i) / 24;
    return [r1(MISS[0] + 10 * Math.cos(a)), r1(MISS[1] + 10 * Math.sin(a))];
  }),
  smooth: true,
  tone: RAG_TONE.failure,
  weight: 0.9,
  step: 4,
};

const PANEL_X = 466;
const PANEL_W = 380;
const panel = (id: string, y: number, label: string, step: number, tone: LayoutShape["tone"], h = 50): LayoutShape => ({
  id,
  type: "box",
  x: PANEL_X,
  y,
  w: PANEL_W,
  h,
  label,
  tone,
  fill: "pastel",
  step,
});

const perCell = CORPUS.chunks / VECTOR_INDEX.ivfCells; // 60
const total = VECTOR_INDEX.ivfCells + VECTOR_INDEX.ivfCompared; // 300
const share = Math.round((total / CORPUS.chunks) * 100); // 8

const spec: LayoutSpec = {
  kind: "layout",
  title: "IVF: file vectors into cells, search only the nearest few",
  width: 870,
  height: 424,
  steps: [
    { title: `k-means files the ${fmt(CORPUS.chunks)} vectors into ${VECTOR_INDEX.ivfCells} cells` },
    { title: `The question is compared with the ${VECTOR_INDEX.ivfCells} centroids` },
    { title: `Only the nearest ${VECTOR_INDEX.ivfProbe} cells are searched` },
    { title: "A near neighbour over a border is missed" },
  ],
  shapes: [
    {
      id: "plot-title",
      type: "text",
      x: PLOT.x,
      y: 24,
      w: PLOT.w,
      h: 20,
      label: `A 2-D sketch: 16 of the ${VECTOR_INDEX.ivfCells} cells drawn`,
      tone: RAG_TONE.infra,
    },
    ...cellsShapes,
    ...probeLines,
    missRing,
    ...pointShapes,
    ...centroidShapes,
    {
      id: "q",
      type: "circle",
      x: QUERY[0],
      y: QUERY[1],
      w: 16,
      tone: RAG_TONE.query,
      fill: "pastel",
      step: 2,
    },
    {
      id: "q-label",
      type: "text",
      x: PLOT.x,
      y: PLOT.y + PLOT.h + 4,
      w: PLOT.w,
      h: 18,
      label: "Orange dot: the question; × marks a centroid",
      tone: RAG_TONE.query,
      step: 2,
    },
    {
      id: "miss",
      type: "circle",
      x: MISS[0],
      y: MISS[1],
      w: 9,
      tone: RAG_TONE.embedding,
      fill: "soft",
    },
    panel(
      "build",
      54,
      `Build: k-means makes ${VECTOR_INDEX.ivfCells} cells\n${fmt(CORPUS.chunks)} / ${VECTOR_INDEX.ivfCells} = about ${perCell} vectors each`,
      1,
      RAG_TONE.store
    ),
    panel(
      "part1",
      124,
      `Search 1: score all ${VECTOR_INDEX.ivfCells} centroids\n${VECTOR_INDEX.ivfCells} comparisons`,
      2,
      RAG_TONE.query
    ),
    panel(
      "part2",
      194,
      `Search 2: open the nearest ${VECTOR_INDEX.ivfProbe} cells (nprobe)\n${VECTOR_INDEX.ivfProbe} × ${perCell} = ${VECTOR_INDEX.ivfCompared} comparisons`,
      3,
      RAG_TONE.query
    ),
    {
      id: "total",
      type: "text",
      x: PANEL_X,
      y: 254,
      w: PANEL_W,
      h: 20,
      label: `${total} of ${fmt(CORPUS.chunks)} vectors compared (${share}%)`,
      tone: RAG_TONE.infra,
      step: 3,
    },
    panel(
      "breaks",
      294,
      "Missed: a near vector over a cell border\nRaise nprobe: more recall, more work",
      4,
      RAG_TONE.failure
    ),
  ],
};

export default spec;
