import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Cells, boundary nodes and shortcuts (google-maps, Step 3 and Deep dive 1): the road layout is split once, and only
// the shortcut weights change with traffic.
// Three steps: 1 the layout: three cells of the road graph; the green nodes sit on roads that cross a cell border
// (boundary nodes); this split depends only on the road layout and changes when the map changes · 2 the weights: in
// cell 2 the customizer computes a shortcut for every pair of entry and exit boundary nodes, the best travel time
// across the cell at current speeds; new speeds recompute the shortcuts of the cells they touch, never the split ·
// 3 a query from S to T: a full search inside the source cell, shortcuts only across cell 2, a full search inside the
// target cell.
// Working (round numbers, the same as the page): a world graph of 500,000,000 nodes in cells of 10,000 nodes =
// 50,000 cells; ~100 boundary nodes per cell = 5,000,000 boundary nodes; shortcuts per cell 50 entries × 50 exits =
// 2,500. Customizing one cell ≈ 100 searches × 10,000 nodes = 1,000,000 node visits; all 50,000 cells = 5 × 10^10
// visits ≈ 500 core-seconds at 10^8 visits/s, so about 5 s on 100 cores; if 10% of cells changed, 0.5 s. A query
// settles ~10,000 (source cell) + ~10,000 (target cell) + ~50,000 (overlay) = ~70,000 nodes ≈ 7 ms at 100 ns each,
// against ~20,000,000 nodes ≈ 2 s for plain Dijkstra on a long route: about 300 × fewer.
// Layout: three dotted groups (cells) 260 × 240 side by side with a 10 px gap; boundary nodes on the gaps (x 295 and
// 565); interior junctions as small circles joined by road lines; captions under the cells, one per step.
// Colours (PATTERN_TONE): roads and junctions neutral (infra), boundary nodes and shortcuts green (the pattern's own
// part), the query orange (traffic); captions neutral.

const R = 14; // junction circle diameter
const B = 18; // boundary circle diameter

const junctions: [string, number, number][] = [
  ["a1", 150, 100],
  ["a2", 160, 240],
  ["a3", 230, 165],
  ["c1", 360, 95],
  ["c2", 430, 170],
  ["c3", 500, 110],
  ["c4", 380, 250],
  ["c5", 495, 240],
  ["d1", 640, 105],
  ["d2", 705, 200],
  ["d3", 630, 255],
];
const boundary: [string, number, number][] = [
  ["b1", 295, 110],
  ["b2", 295, 230],
  ["b3", 565, 110],
  ["b4", 565, 230],
];
const pos: Record<string, [number, number]> = { s: [75, 170], t: [785, 165] };
for (const [id, x, y] of [...junctions, ...boundary]) pos[id] = [x, y];

const roads: [string, string][] = [
  ["s", "a1"],
  ["s", "a2"],
  ["a1", "a3"],
  ["a2", "a3"],
  ["a1", "b1"],
  ["a3", "b2"],
  ["a2", "b2"],
  ["b1", "c1"],
  ["c1", "c2"],
  ["c2", "c3"],
  ["c3", "b3"],
  ["b2", "c4"],
  ["c4", "c2"],
  ["c4", "c5"],
  ["c5", "b4"],
  ["c2", "c5"],
  ["b3", "d1"],
  ["d1", "d2"],
  ["b4", "d3"],
  ["d3", "d2"],
  ["d2", "t"],
  ["d1", "t"],
];

const shapes: LayoutShape[] = [];
roads.forEach(([a, b], i) => {
  shapes.push({ id: `road-${i}`, type: "path", x: 0, y: 0, points: [pos[a], pos[b]], tone: PATTERN_TONE.infra });
});
for (const [id, x, y] of junctions) {
  shapes.push({ id, type: "circle", x, y, w: R, tone: PATTERN_TONE.infra });
}
for (const [id, x, y] of boundary) {
  shapes.push({ id, type: "circle", x, y, w: B, tone: PATTERN_TONE.pattern, fill: "pastel" });
}
shapes.push({
  id: "s",
  type: "circle",
  x: pos.s[0],
  y: pos.s[1],
  w: 28,
  label: "S",
  tone: PATTERN_TONE.traffic,
  fill: "pastel",
});
shapes.push({
  id: "t",
  type: "circle",
  x: pos.t[0],
  y: pos.t[1],
  w: 28,
  label: "T",
  tone: PATTERN_TONE.traffic,
  fill: "pastel",
});

// Step 2: shortcuts across cell 2 (entry b1, b2; exit b3, b4), with travel times at current speeds.
const shortcut = (id: string, a: string, b: string, via: [number, number], label?: string): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points: [pos[a], via, pos[b]],
  smooth: true,
  dashed: true,
  tone: PATTERN_TONE.pattern,
  step: 2,
});
shapes.push(shortcut("sc-13", "b1", "b3", [430, 62]));
shapes.push(shortcut("sc-24", "b2", "b4", [430, 282]));
shapes.push(shortcut("sc-14", "b1", "b4", [430, 150]));
shapes.push(shortcut("sc-23", "b2", "b3", [430, 190]));
shapes.push({
  id: "sc-13-t",
  type: "text",
  x: 380,
  y: 70,
  w: 100,
  h: 16,
  label: "4.0 min",
  quiet: true,
  tone: PATTERN_TONE.pattern,
  step: 2,
});
shapes.push({
  id: "sc-24-t",
  type: "text",
  x: 380,
  y: 256,
  w: 100,
  h: 16,
  label: "6.5 min",
  quiet: true,
  tone: PATTERN_TONE.pattern,
  step: 2,
});

// Step 3: the query S → T: roads in cell 1, one shortcut across cell 2, roads in cell 3.
shapes.push({
  id: "q1",
  type: "path",
  x: 0,
  y: 0,
  points: [pos.s, pos.a1, pos.b1],
  tone: PATTERN_TONE.traffic,
  weight: 1,
  step: 3,
});
shapes.push({
  id: "q2",
  type: "path",
  x: 0,
  y: 0,
  points: [pos.b1, [430, 62], pos.b3],
  smooth: true,
  tone: PATTERN_TONE.traffic,
  weight: 1,
  step: 3,
});
shapes.push({
  id: "q3",
  type: "path",
  x: 0,
  y: 0,
  points: [pos.b3, pos.d1, pos.t],
  tone: PATTERN_TONE.traffic,
  weight: 1,
  step: 3,
});

// Captions under the cells, one per step.
const caption = (id: string, y: number, label: string, step: number, highlight = false): LayoutShape => ({
  id,
  type: "text",
  x: 30,
  y,
  w: 800,
  h: 18,
  label,
  tone: PATTERN_TONE.infra,
  step,
  highlight,
});
shapes.push(caption("cap-1", 318, "Layout: 500 M nodes in 50,000 cells; the split changes only when the map does", 1));
shapes.push(caption("cap-2", 350, "Weights: shortcuts per cell from live speeds; all cells ≈ 5 s on 100 cores", 2));
shapes.push(
  caption("cap-3", 382, "Query: cell 1 + shortcuts + cell 3 ≈ 70,000 nodes ≈ 7 ms (plain Dijkstra ≈ 2 s)", 3)
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Cells, boundary nodes and shortcuts",
  width: 860,
  height: 410,
  groups: [
    { id: "cell1", title: "Cell 1 (source)", tone: "neutral", x: 30, y: 40, w: 260, h: 260 },
    { id: "cell2", title: "Cell 2", tone: "neutral", x: 300, y: 40, w: 260, h: 260 },
    { id: "cell3", title: "Cell 3 (target)", tone: "neutral", x: 570, y: 40, w: 260, h: 260 },
  ],
  steps: [
    { title: "Split the road layout into cells" },
    { title: "Shortcuts carry the live weights" },
    { title: "A query: two cells and the overlay" },
  ],
  shapes,
};

export default spec;
