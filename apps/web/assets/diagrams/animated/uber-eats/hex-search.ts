import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// "Nearby" means delivery time, not distance (uber-eats, Deep dive 1).
// Steps: 1 restaurant R in the middle of a hexagonal grid; each cell shows the minutes to deliver there from R by road,
// coloured by delivery-time bucket; a river whose bridge is a 12-minute detour makes the cells to the east slower although they are as
// close · 2 a customer in an east cell: the search service reads the lists for (their cell, bucket) for three buckets in
// parallel; R is in the 15 to 30 minute list, not the 0 to 15 · 3 a shard edge: cells west of the dashed line belong to
// shard B; R's reach crosses it, so R is indexed in shard A and shard B (a buffer zone at the edge).
// Working (illustrative): minutes = 5 + 5 × (hex steps from R) + 12 if the cell is across the river. Ring 0: 5; west
// ring 1, 2, 3: 10, 15, 20; east ring 1, 2, 3: 22, 27, 32. Buckets: 0 to 15 green, 16 to 30 blue, over 30 neutral (R is
// not indexed there). 37 cells within 3 steps: 13 green, 18 blue, 6 grey. List sizes in step 2 (40, R + 210, 600
// stores) are illustrative.
// Layout (880 × 500): pointy-top hexagons of radius 36 (width 36 × √3 = 62.4) centred at (250, 260), axial coordinates
// q, r within 3 steps; the river follows the cell borders between centre x ≤ 250 + 0.5 × 62.4 and the cells east of it;
// the right panel (x 540 to 860) holds the index lists and the shard note.
// Colours (PATTERN_TONE): 0 to 15 min green (the pattern), 15 to 30 min blue (data), over 30 neutral, restaurant teal
// (compute), customer orange (traffic); river and shard edge are neutral lines.

const R = 36;
const HW = R * Math.sqrt(3);
const CX = 250;
const CY = 260;
const RING = 3;

const centre = (q: number, r: number): [number, number] => [CX + HW * (q + r / 2), CY + 1.5 * R * r];
const steps = (q: number, r: number) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
const east = (q: number, r: number) => q + r / 2 > 0.5;
const minutes = (q: number, r: number) => 5 + 5 * steps(q, r) + (east(q, r) ? 12 : 0);
const bucketTone = (m: number) => (m <= 15 ? PATTERN_TONE.pattern : m <= 30 ? PATTERN_TONE.data : PATTERN_TONE.infra);
const round1 = (v: number) => Math.round(v * 10) / 10;

const hexPoints = ([x, y]: [number, number]): [number, number][] => {
  const pts: [number, number][] = [];
  for (let k = 0; k <= 6; k++) {
    const a = ((-90 + 60 * k) * Math.PI) / 180;
    pts.push([round1(x + R * Math.cos(a)), round1(y + R * Math.sin(a))]);
  }
  return pts;
};

const shapes: LayoutShape[] = [];
for (let r = -RING; r <= RING; r++) {
  for (let q = Math.max(-RING, -RING - r); q <= Math.min(RING, RING - r); q++) {
    const c = centre(q, r);
    const m = minutes(q, r);
    const tone = bucketTone(m);
    shapes.push({ id: `h${q}_${r}`, type: "path", x: 0, y: 0, points: hexPoints(c), tone, quiet: true });
    if (q === 0 && r === 0) continue;
    shapes.push({
      id: `m${q}_${r}`,
      type: "circle",
      x: round1(c[0]),
      y: round1(c[1]),
      w: 34,
      label: String(m),
      tone,
      quiet: true,
    });
  }
}
shapes.push({
  id: "rest",
  type: "circle",
  x: CX,
  y: CY,
  w: 40,
  label: "R",
  tone: PATTERN_TONE.compute,
  fill: "pastel",
});

// River along the cell borders: even rows at x = CX + 0.5 × HW, odd rows at CX + HW.
const river: [number, number][] = [];
for (let r = -RING; r <= RING; r++) {
  const xb = round1(CX + HW * (Math.abs(r) % 2 === 0 ? 0.5 : 1));
  const yc = CY + 1.5 * R * r;
  river.push([xb, yc - R / 2], [xb, yc + R / 2]);
}
river.unshift([river[0][0], river[0][1] - 26]);
river.push([river[river.length - 1][0], river[river.length - 1][1] + 26]);
shapes.push({ id: "river", type: "path", x: 0, y: 0, points: river, tone: PATTERN_TONE.infra, weight: 1 });
shapes.push({
  id: "river-t",
  type: "text",
  x: river[0][0] - 10,
  y: 12,
  w: 150,
  h: 18,
  label: "river: 12 min detour",
  quiet: true,
  tone: PATTERN_TONE.infra,
});

// Legend.
const legend: [string, string, LayoutShape["tone"]][] = [
  ["k1", "0–15 min", PATTERN_TONE.pattern],
  ["k2", "15–30 min", PATTERN_TONE.data],
  ["k3", "over 30: not indexed", PATTERN_TONE.infra],
];
legend.forEach(([id, label, tone], i) => {
  shapes.push({ id, type: "cell", x: 560, y: 40 + i * 34, w: 170, h: 26, label, tone, quiet: true });
});
shapes.push({
  id: "k-t",
  type: "text",
  x: 540,
  y: 8,
  w: 230,
  h: 22,
  label: "minutes from R by road",
  quiet: true,
  tone: PATTERN_TONE.infra,
});

// Step 2: a customer in the east ring-1 cell (22 min) and the three bucket lists read in parallel.
const cust = centre(1, 0);
shapes.push({
  id: "cust",
  type: "circle",
  x: round1(cust[0]) + 20,
  y: round1(cust[1]) + 24,
  w: 22,
  label: "C",
  tone: PATTERN_TONE.traffic,
  fill: "pastel",
  step: 2,
});
const lists: [string, string, LayoutShape["tone"]][] = [
  ["l1", "cell c, 0–15 min: 40 stores", PATTERN_TONE.pattern],
  ["l2", "cell c, 15–30 min: R + 210", PATTERN_TONE.data],
  ["l3", "cell c, 30–45 min: 600 stores", PATTERN_TONE.infra],
];
lists.forEach(([id, label, tone], i) => {
  shapes.push({
    id,
    type: "box",
    x: 600,
    y: 180 + i * 62,
    w: 250,
    h: 46,
    label,
    tone,
    fill: "pastel",
    step: 2,
  });
});
shapes.push({
  id: "q",
  type: "text",
  x: 560,
  y: 150,
  w: 300,
  h: 20,
  label: "search reads 3 lists in parallel",
  quiet: true,
  tone: PATTERN_TONE.infra,
  step: 2,
});
shapes.push({ id: "qa", type: "arrow", x: 0, y: 0, from: "cust", to: "l2", dashed: true, packet: true, step: 2 });

// Step 3: a shard edge one cell west of R. Shard B is west of it; R's reach crosses it, so R is indexed in both.
const edge: [number, number][] = [];
for (let r = -RING; r <= RING; r++) {
  const xb = round1(CX + HW * (Math.abs(r) % 2 === 0 ? -0.5 : -1));
  const yc = CY + 1.5 * R * r;
  edge.push([xb, yc - R / 2], [xb, yc + R / 2]);
}
shapes.push({
  id: "edge",
  type: "path",
  x: 0,
  y: 0,
  points: edge,
  tone: PATTERN_TONE.infra,
  dashed: true,
  weight: 1,
  step: 3,
});
shapes.push({
  id: "sb",
  type: "text",
  x: 20,
  y: 462,
  w: 120,
  h: 20,
  label: "shard B",
  quiet: true,
  tone: PATTERN_TONE.infra,
  step: 3,
});
shapes.push({
  id: "sa",
  type: "text",
  x: 200,
  y: 462,
  w: 120,
  h: 20,
  label: "shard A",
  quiet: true,
  tone: PATTERN_TONE.infra,
  step: 3,
});
shapes.push({
  id: "dual",
  type: "box",
  x: 600,
  y: 380,
  w: 250,
  h: 56,
  label: "R indexed in A and B",
  sub: "buffer zone at the edge",
  tone: PATTERN_TONE.compute,
  fill: "pastel",
  step: 3,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Nearby by delivery time: hexagons, buckets and shard edges",
  width: 880,
  height: 500,
  shapes,
  steps: [
    { title: "Cells by minutes, not metres" },
    { title: "Search reads three buckets" },
    { title: "A store near a shard edge" },
  ],
};

export default spec;
