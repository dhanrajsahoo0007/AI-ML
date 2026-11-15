import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { FINETUNE_TONE as T } from "@/components/diagrams/presets/production";
import { scatter, type ScatterPoint } from "@/components/diagrams/presets/rag";
import { lcg } from "@/components/diagrams/presets/production-synth";
import { note } from "@/components/diagrams/presets/production-finetune";

// Collapse against coverage (synthetic-data-and-dataset-curation, Core concepts). SHAPE ONLY: each dot is one generated
// ticket placed in a made-up 2-D "topic space" (a stand-in for an embedding plot); the positions come from a seeded
// generator, not from a real model. Left: one prompt repeated, so all 24 tickets land near one spot. Right: the
// prompt names a topic and a customer type each time, so the 24 tickets spread around the six seed tickets (solid).
// The space is cut into 4 × 4 cells; the figure counts how many cells hold at least one generated ticket (computed
// below from the points, so the label cannot drift from the dots).
// Layout (880 x 380): two frames 380 x 260 at x 40 and x 460, y 70; headings at y 28; the count under each frame.
// Colour: pink for points in the space (embeddings, legend), tinted pink for seeds, neutral text; no red.

const W = 380;
const H = 260;
const XS = [40, 460];
const Y = 70;
const SEEDS: [number, number][] = [
  [0.14, 0.2],
  [0.5, 0.14],
  [0.86, 0.26],
  [0.2, 0.72],
  [0.52, 0.6],
  [0.84, 0.82],
];

const clamp = (v: number) => Math.min(0.97, Math.max(0.03, v));
const gauss = (r: () => number) => (r() + r() + r() + r() - 2) / 0.58;

function make(kind: "collapsed" | "covered") {
  const r = lcg(kind === "collapsed" ? 7 : 11);
  const gen: [number, number][] = [];
  for (let i = 0; i < 24; i++) {
    if (kind === "collapsed") gen.push([clamp(0.3 + 0.045 * gauss(r)), clamp(0.36 + 0.045 * gauss(r))]);
    else {
      const [sx, sy] = SEEDS[i % 6];
      gen.push([clamp(sx + 0.07 * gauss(r)), clamp(sy + 0.07 * gauss(r))]);
    }
  }
  const cells = new Set(gen.map(([x, y]) => `${Math.floor(x * 4)}-${Math.floor(y * 4)}`)).size;
  return { gen, cells };
}

const shapes: LayoutShape[] = [];
(["collapsed", "covered"] as const).forEach((kind, p) => {
  const { gen, cells } = make(kind);
  const pts: ScatterPoint[] = [
    ...SEEDS.map(([x, y], i): ScatterPoint => ({ id: `s${i}`, x, y, kind: "relevant" })),
    ...gen.map(([x, y], i): ScatterPoint => ({ id: `g${i}`, x, y, kind: "chunk" })),
  ];
  shapes.push(...scatter(kind, XS[p], Y, W, H, pts, { dot: 11 }));
  // 4 × 4 cell grid inside the frame
  for (let k = 1; k < 4; k++) {
    shapes.push(
      {
        id: `${kind}-gv${k}`,
        type: "path",
        x: 0,
        y: 0,
        dashed: true,
        weight: 0.25,
        points: [
          [XS[p] + (k * W) / 4, Y],
          [XS[p] + (k * W) / 4, Y + H],
        ],
      },
      {
        id: `${kind}-gh${k}`,
        type: "path",
        x: 0,
        y: 0,
        dashed: true,
        weight: 0.25,
        points: [
          [XS[p], Y + (k * H) / 4],
          [XS[p] + W, Y + (k * H) / 4],
        ],
      }
    );
  }
  shapes.push(
    note(
      `${kind}-title`,
      XS[p],
      28,
      W,
      kind === "collapsed" ? "One prompt, repeated" : "Prompt names a topic and a customer type",
      { tone: T.data }
    ),
    note(`${kind}-count`, XS[p], Y + H + 14, W, `${cells} of 16 cells hold a generated ticket`, { tone: T.data })
  );
});
shapes.push(
  note(
    "legend",
    40,
    Y + H + 52,
    800,
    "tinted dot = real seed ticket   ·   open dot = generated ticket   ·   shape only: positions are illustrative"
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Synthetic tickets: collapsed against covering the topic space",
  width: 880,
  height: 410,
  shapes,
};

export default spec;
