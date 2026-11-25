import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The 32 geohash cells of precision 5 inside the precision-4 cell gcpv (north-west London), the nine cells a nearby
// search reads, and the neighbour-cell edge case at the Greenwich meridian (geospatial-indexing, first figure).
// Three steps: 1 every child of gcpv shares the prefix gcpv; one more character = 5 more bits = 32 children ·
// 2 a shopper in gcpvm: search gcpvm and its 8 neighbours (9 cells, 9 key ranges) · 3 two pick-up points 140 m apart
// either side of the meridian are in gcpvp and u10j0: no shared prefix, so a prefix search on gcpv misses one.
// Working (computed below, real geohashes, not illustrative): gcpv spans lat 51.5039 to 51.6797 and lon -0.3516 to 0.
// Precision 4 = 20 bits (10 lon, 10 lat); precision 5 adds 3 lon bits and 2 lat bits, so 8 columns × 4 rows.
// Precision-5 cell: 360 ÷ 2^13 = 0.0439° of lon × 111.32 km × cos 51.5° = 3.0 km wide; 180 ÷ 2^12 = 0.0439° of lat
// × 110.57 km = 4.9 km tall. A 3 × 3 block finds every point within min(3.0, 4.9) = 3.0 km of the shopper.
// The meridian pair: lon -0.001 and +0.001 at lat 51.52: 0.002° × 111.32 × cos 51.52° = 0.139 km, about 140 m.
// Layout (880 × 500): grid at x 30 on a 60 × 92 pitch (about the 3.0 : 4.9 shape), cells inset 3 px so the step
// outlines run in the gaps; the first column of u10j east of a dashed meridian line; notes in a panel at x 600.
// Colours (PATTERN_TONE): cells pink (ids), the nine searched cells green (the pattern), the shopper orange (traffic),
// the missed cell red (fail), pick-up points and text neutral.
// Fact check (2026-11-16, Elasticsearch geohash grid docs): precision 5 is 4.9 km × 4.9 km at the equator, the worst
// case; cells shrink with latitude.

// The children of gcpv, top row first, as a geohash encoder produces them (Z-order inside the cell).
const ROWS = ["bcfguvyz", "89destwx", "2367kmqr", "0145hjnp"];
const EAST = ["b", "8", "2", "0"]; // first column of u10j, top row first
const PREFIX = "gcpv";

const X0 = 30;
const Y0 = 70;
const PW = 60; // column pitch
const PH = 92; // row pitch
const INSET = 3; // cells sit inside their pitch, leaving a 6 px gap for the outlines
const GAP = 16; // room for the meridian line
const EX = X0 + 8 * PW + GAP;

const cellKm = {
  w: (360 / 2 ** 13) * 111.32 * Math.cos((51.5 * Math.PI) / 180),
  h: (180 / 2 ** 12) * 110.57,
};
const parentKm = {
  w: (360 / 2 ** 10) * 111.32 * Math.cos((51.5 * Math.PI) / 180),
  h: (180 / 2 ** 10) * 110.57,
};
const coverKm = Math.min(cellKm.w, cellKm.h);
const pairM = Math.round((0.002 * 111.32 * Math.cos((51.52 * Math.PI) / 180) * 1000) / 10) * 10;

const SEARCH_ROW = 2; // gcpvm sits in row 2 (from the top), column 5
const SEARCH_COL = 5;

const shapes: LayoutShape[] = [];
const cell = (id: string, x: number, y: number, label: string, quiet: boolean): LayoutShape => ({
  id,
  type: "cell",
  x: x + INSET,
  y: y + INSET,
  w: PW - 2 * INSET,
  h: PH - 2 * INSET,
  label,
  tone: PATTERN_TONE.id,
  quiet,
});
const box = (x1: number, y1: number, x2: number, y2: number): [number, number][] => [
  [x1, y1],
  [x2, y1],
  [x2, y2],
  [x1, y2],
  [x1, y1],
];

shapes.push({
  id: "parent",
  type: "text",
  x: X0,
  y: 40,
  w: 8 * PW,
  h: 18,
  label: `${PREFIX}: one precision-4 cell, ${parentKm.w.toFixed(1)} km × ${parentKm.h.toFixed(1)} km`,
  tone: PATTERN_TONE.id,
});
shapes.push({ id: "east-t", type: "text", x: EX, y: 40, w: PW, h: 18, label: "u10j", tone: PATTERN_TONE.id });

ROWS.forEach((row, r) => {
  [...row].forEach((ch, c) => {
    shapes.push(cell(`c-${r}-${c}`, X0 + c * PW, Y0 + r * PH, PREFIX + ch, !(r === 0 && c === 0)));
  });
});
EAST.forEach((ch, r) => shapes.push(cell(`e-${r}`, EX, Y0 + r * PH, `u10j${ch}`, true)));

// The meridian.
const MX = X0 + 8 * PW + GAP / 2;
shapes.push({
  id: "meridian",
  type: "path",
  x: 0,
  y: 0,
  points: [
    [MX, Y0 - 6],
    [MX, Y0 + 4 * PH + 6],
  ],
  dashed: true,
  tone: PATTERN_TONE.infra,
});
shapes.push({
  id: "meridian-t",
  type: "text",
  x: MX - 90,
  y: Y0 + 4 * PH + 10,
  w: 180,
  h: 18,
  label: "Greenwich meridian, 0°",
  tone: PATTERN_TONE.infra,
});
shapes.push({
  id: "size-t",
  type: "text",
  x: X0,
  y: Y0 + 4 * PH + 34,
  w: 8 * PW,
  h: 18,
  label: `Each cell ${cellKm.w.toFixed(1)} km × ${cellKm.h.toFixed(1)} km at 51.5° N`,
  tone: PATTERN_TONE.infra,
});

// Step 2: the shopper in gcpvm and the nine searched cells, outlined in green in the gaps.
shapes.push({
  id: "search",
  type: "path",
  x: 0,
  y: 0,
  points: box(
    X0 + (SEARCH_COL - 1) * PW,
    Y0 + (SEARCH_ROW - 1) * PH,
    X0 + (SEARCH_COL + 2) * PW,
    Y0 + (SEARCH_ROW + 2) * PH
  ),
  tone: PATTERN_TONE.pattern,
  weight: 1,
  step: 2,
});
shapes.push({
  id: "shopper",
  type: "circle",
  x: X0 + SEARCH_COL * PW + PW / 2,
  y: Y0 + SEARCH_ROW * PH + PH / 2 + 22,
  w: 12,
  tone: PATTERN_TONE.traffic,
  fill: "pastel",
  step: 2,
  quiet: true,
});

// Step 3: the meridian pair; the east cell is the one a prefix search on gcpv misses.
const pairY = Y0 + 3 * PH + PH / 2 + 22;
shapes.push({
  id: "miss",
  type: "path",
  x: 0,
  y: 0,
  points: box(EX, Y0 + 3 * PH, EX + PW, Y0 + 4 * PH),
  tone: PATTERN_TONE.fail,
  weight: 1,
  step: 3,
});
shapes.push({
  id: "pt-w",
  type: "circle",
  x: X0 + 8 * PW - INSET - 7,
  y: pairY,
  w: 8,
  tone: PATTERN_TONE.infra,
  fill: "pastel",
  step: 3,
  quiet: true,
});
shapes.push({
  id: "pt-e",
  type: "circle",
  x: EX + INSET + 7,
  y: pairY,
  w: 8,
  tone: PATTERN_TONE.infra,
  fill: "pastel",
  step: 3,
  quiet: true,
});

// Notes panel.
const NX = 600;
const NW = 270;
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

note("n1a", 90, "One more character = 5 more bits", PATTERN_TONE.id);
note("n1b", 112, `= 32 cells, all starting ${PREFIX}`, PATTERN_TONE.id);
note("n1c", 134, "Same prefix: inside the same parent", PATTERN_TONE.id);

note("n2a", 196, "Shopper in gcpvm: read 9 cells", PATTERN_TONE.pattern, 2);
note("n2b", 218, "gcpvm + 8 neighbours = 9 key ranges", PATTERN_TONE.pattern, 2);
note("n2c", 240, `Finds every point within ${coverKm.toFixed(1)} km`, PATTERN_TONE.pattern, 2);

note("n3a", 302, `Two pick-up points ${pairM} m apart`, PATTERN_TONE.fail, 3);
note("n3b", 324, "gcpvp and u10j0: no shared prefix", PATTERN_TONE.fail, 3);
note("n3c", 346, `A prefix search on ${PREFIX} misses one`, PATTERN_TONE.fail, 3);
note("n3d", 368, "Fix: compute the 8 neighbours", PATTERN_TONE.fail, 3);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Geohash cells, the nine-cell search and the meridian edge case",
  width: 880,
  height: 500,
  shapes,
  steps: [
    { title: "32 cells share one prefix" },
    { title: "Search the cell and 8 neighbours" },
    { title: "Close points, different prefixes" },
  ],
};

export default spec;
