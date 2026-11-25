import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";
import { scatter, type ScatterPoint } from "@/components/diagrams/presets/rag";
import {
  BASE_C,
  BASE_PTS,
  BASE_RADIUS,
  CENTROID_SHIFT,
  NOW_C,
  NOW_PTS,
  OUTSIDE,
  PLOT,
  SHIFT_IN_RADII,
} from "@/components/diagrams/presets/production-drift";

// Embedding drift as a picture (drift-detection, Deep dive). A 2-D sketch of question embeddings (the real space has
// 1,536 dimensions; points are illustrative, presets/production-drift.ts). Embeddings are pink.
// Steps: 1 the baseline: last quarter's 14 questions form one cluster (soft pink) with a dashed ring at the farthest
//   baseline point from the centroid · 2 this month's 14 questions (solid pink): 8 land in the old region, 6 form a
//   new cluster (gift cards) · 3 the two centroids and the distance between them, in baseline radii.
// Working (computed from the points): centroid of the baseline B, of this month N; shift = |B − N| in plot pixels;
//   radius R = farthest baseline point from B; shift ÷ R is how many radii the centre moved; points of this month
//   farther than R from B are counted as "outside".
// Layout (880 x 310): plot x 30, y 30, 520 x 260; right panel x 570 (w 250). Colours: embeddings pink, notes neutral.

const P = { x: 30, y: 30 } as const;
const norm = (pt: [number, number]) => ({ x: pt[0] / PLOT.w, y: pt[1] / PLOT.h });
const base: ScatterPoint[] = BASE_PTS.map((pt, i) => ({ id: `b${i}`, ...norm(pt), kind: "chunk", step: 1 }));
const now: ScatterPoint[] = NOW_PTS.map((pt, i) => ({ id: `n${i}`, ...norm(pt), kind: "relevant", step: 2 }));
const centres: ScatterPoint[] = [
  { id: "bc", ...norm(BASE_C), kind: "other", step: 3 },
  { id: "nc", ...norm(NOW_C), kind: "other", step: 3 },
];
const text = (id: string, x: number, y: number, w: number, h: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: PROD_TONE.infra,
  step,
  quiet: true,
});

const shapes: LayoutShape[] = [
  ...scatter("sc", P.x, P.y, PLOT.w, PLOT.h, [...base, ...now, ...centres], {
    dot: 12,
  }),
  {
    id: "ring",
    type: "path",
    x: 0,
    y: 0,
    points: Array.from({ length: 49 }, (_, i): [number, number] => {
      const a = (2 * Math.PI * i) / 48;
      return [
        Math.round((P.x + BASE_C[0] + BASE_RADIUS * Math.cos(a)) * 10) / 10,
        Math.round((P.y + BASE_C[1] + BASE_RADIUS * Math.sin(a)) * 10) / 10,
      ];
    }),
    smooth: true,
    dashed: true,
    tone: PROD_TONE.infra,
    step: 1,
  },
  text("base-t", P.x + 20, P.y + PLOT.h - 26, 240, 18, "baseline questions (last quarter)", 1),
  text("now-t", P.x + 300, P.y + 14, 200, 34, "this month: a new cluster\n(gift cards)", 2),
  {
    id: "shift",
    type: "arrow",
    x: 0,
    y: 0,
    from: "sc-bc",
    to: "sc-nc",
    dashed: true,
    step: 3,
  },
  text("p1", 570, 30, 290, 54, "14 baseline questions form one\ncluster; the ring reaches the\nfarthest of them", 1),
  text("p2", 570, 104, 290, 36, "This month: 8 of 14 land in the old\nregion, 6 form a new cluster.", 2),
  text("p2b", 570, 146, 290, 36, `${OUTSIDE} of 14 sit outside the ring\n(the new cluster and one stray).`, 2),
  text(
    "p3",
    570,
    204,
    290,
    36,
    `The centre moved ${Math.round(CENTROID_SHIFT)} px: ${SHIFT_IN_RADII.toFixed(1)} times\nthe ring's radius (${Math.round(BASE_RADIUS)} px).`,
    3
  ),
  text("p3b", 570, 250, 290, 36, "Points are illustrative; the real\nspace has 1,536 dimensions.", 3),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Embedding drift: this month's questions against the baseline",
  width: 880,
  height: 310,
  steps: [
    { title: "The baseline: one cluster of questions" },
    { title: "This month: some questions are somewhere new" },
    { title: "The centre of the cloud has moved" },
  ],
  shapes,
};

export default spec;
