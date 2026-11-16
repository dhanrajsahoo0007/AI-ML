import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A quadtree over Brightpost's 200 pick-up points in a 40 km × 40 km square of London (geospatial-indexing, second
// figure). A cell splits into four when it holds more than 10 points, so cells stay large in the suburbs and get
// small in the dense centre.
// Three steps: 1 all 200 points in one 40 km cell · 2 the first split into four 20 km cells · 3 every cell with more
// than 10 points splits again, down to the leaves.
// Working (computed below): positions are illustrative, made by a fixed pseudo-random generator: 110 points around
// the centre and 90 spread evenly. The leaf count, the deepest level and the fixed-grid comparison are computed from
// those positions, so the notes always match the drawing.
// Layout (880 × 480): the square at x 40, y 50, 400 px for 40 km (10 px per km); notes at x 480.
// Colours (PATTERN_TONE): points blue (data), split lines green (the pattern), the outline and notes neutral.

const KM = 40;
const PX = 10;
const X0 = 40;
const Y0 = 50;
const CAPACITY = 10;
const MAX_DEPTH = 6;

// Fixed pseudo-random positions (a linear congruential generator), so the figure is the same on every build.
let seed = 20261116;
const rand = () => {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed / 4294967296;
};
const clamp = (v: number) => Math.min(KM - 0.2, Math.max(0.2, v));
const points: [number, number][] = [];
for (let i = 0; i < 110; i++) {
  // Sum of three uniforms: a bell shape around the centre, spread about ±6 km.
  const dx = (rand() + rand() + rand() - 1.5) * 8;
  const dy = (rand() + rand() + rand() - 1.5) * 8;
  points.push([clamp(KM / 2 + dx), clamp(KM / 2 + dy)]);
}
for (let i = 0; i < 90; i++) points.push([rand() * KM, rand() * KM]);

interface Leaf {
  x: number;
  y: number;
  size: number;
  depth: number;
  count: number;
}
const leaves: Leaf[] = [];
const shapes: LayoutShape[] = [];

function build(x: number, y: number, size: number, depth: number, pts: [number, number][]) {
  if (pts.length <= CAPACITY || depth === MAX_DEPTH) {
    leaves.push({ x, y, size, depth, count: pts.length });
    return;
  }
  const h = size / 2;
  const step = depth === 0 ? 2 : 3;
  const px = (v: number) => v * PX;
  shapes.push({
    id: `v-${depth}-${x}-${y}`,
    type: "path",
    x: 0,
    y: 0,
    points: [
      [X0 + px(x + h), Y0 + px(y)],
      [X0 + px(x + h), Y0 + px(y + size)],
    ],
    tone: PATTERN_TONE.pattern,
    step,
  });
  shapes.push({
    id: `h-${depth}-${x}-${y}`,
    type: "path",
    x: 0,
    y: 0,
    points: [
      [X0 + px(x), Y0 + px(y + h)],
      [X0 + px(x + size), Y0 + px(y + h)],
    ],
    tone: PATTERN_TONE.pattern,
    step,
  });
  for (const [qx, qy] of [
    [x, y],
    [x + h, y],
    [x, y + h],
    [x + h, y + h],
  ]) {
    build(
      qx,
      qy,
      h,
      depth + 1,
      pts.filter(([a, b]) => a >= qx && a < qx + h && b >= qy && b < qy + h)
    );
  }
}

shapes.push({
  id: "root",
  type: "path",
  x: 0,
  y: 0,
  points: [
    [X0, Y0],
    [X0 + KM * PX, Y0],
    [X0 + KM * PX, Y0 + KM * PX],
    [X0, Y0 + KM * PX],
    [X0, Y0],
  ],
  tone: PATTERN_TONE.infra,
});
build(0, 0, KM, 0, points);

points.forEach(([a, b], i) => {
  shapes.push({
    id: `p-${i}`,
    type: "circle",
    x: X0 + a * PX,
    y: Y0 + b * PX,
    w: 5,
    tone: PATTERN_TONE.data,
    fill: "pastel",
    quiet: i > 0,
  });
});

const deepest = Math.max(...leaves.map((l) => l.depth));
const smallest = KM / 2 ** deepest;
const biggest = Math.max(...leaves.map((l) => l.size));
const fixedCells = (KM / smallest) ** 2;
const half = KM / 2;
const fullQuadrants = [
  [0, 0],
  [half, 0],
  [0, half],
  [half, half],
].filter(
  ([qx, qy]) => points.filter(([a, b]) => a >= qx && a < qx + half && b >= qy && b < qy + half).length > CAPACITY
).length;

const NX = 480;
const NW = 380;
const note = (id: string, y: number, label: string, tone: string, step?: number) =>
  shapes.push({
    id,
    type: "text",
    x: NX,
    y,
    w: NW,
    h: 18,
    label,
    tone: tone as LayoutShape["tone"],
    step,
    quiet: !id.endsWith("a"), // one "new" ring per step, on its first note
  });

note("n1a", 70, `${points.length} pick-up points in one ${KM} km cell`, PATTERN_TONE.data);
note("n1b", 92, `Rule: split any cell holding more than ${CAPACITY}`, PATTERN_TONE.infra);

note(
  "n2a",
  144,
  `Four ${half} km cells; ${fullQuadrants === 4 ? "all four" : fullQuadrants} still hold over ${CAPACITY}`,
  PATTERN_TONE.pattern,
  2
);

note("n3a", 196, `${leaves.length} leaf cells, from ${biggest} km down to ${smallest} km`, PATTERN_TONE.pattern, 3);
note("n3b", 218, `Deepest split: level ${deepest}, in the dense centre`, PATTERN_TONE.pattern, 3);
note("n3c", 240, `No leaf holds more than ${CAPACITY} points`, PATTERN_TONE.pattern, 3);
note("n3d", 292, `A fixed grid of ${smallest} km cells needs ${fixedCells} cells`, PATTERN_TONE.infra, 3);
note("n3e", 314, `The quadtree needs ${leaves.length}, each sized to its points`, PATTERN_TONE.infra, 3);

const spec: LayoutSpec = {
  kind: "layout",
  title: "A quadtree splits only where pick-up points are dense",
  width: 880,
  height: Y0 + KM * PX + 30,
  shapes,
  steps: [{ title: "200 points in one cell" }, { title: "Split into four" }, { title: "Split again where it is busy" }],
};

export default spec;
