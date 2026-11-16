import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";

// Cells grouped into shards by load (tinder, Deep dive 1 "Geosharding").
// Three steps: 1 a region of 40 cells (8 × 5), each labelled with its active profiles in thousands; walking the
// cells in snake order (down column 0, up column 1, …) and cutting a shard each time the running total reaches the
// target puts 17 country cells in one shard and 2 downtown cells in another · 2 a 40 km search circle around a user
// near the edge of shard 3 covers 6 cells: 2 in shard 2 and 4 in shard 3, so the query goes to both and the results
// are merged; each covered cell is tagged "searched" · 3 the user moves one cell west into shard 2: the indexer deletes the profile from shard 3 and inserts
// it in shard 2.
// Working (computed below): total = 1,510 thousand profiles; 4 shards, target 1,510 ÷ 4 = 377.5 thousand; the cut
// gives 380, 420, 390 and 320 thousand (17, 2, 4 and 17 cells). Cells are about 53 km across (60 px), so the 40 km
// radius is 45 px; a cell counts as covered when the circle reaches inside it (closest point nearer than the radius).
// Layout: grid of 60 px cells from (30, 50); the shard legend and the notes in a column from x 550.
// Colours: one tone per shard (blue, teal, green, violet), cell strength by load; the user orange.

const COLS = 8;
const ROWS = 5;
const C = 60;
const GX = 30;
const GY = 50;
const LOAD = [
  [5, 5, 10, 20, 20, 10, 5, 5],
  [5, 10, 40, 120, 100, 30, 10, 5],
  [10, 20, 80, 300, 250, 60, 20, 10],
  [5, 10, 40, 100, 80, 30, 10, 5],
  [5, 5, 10, 20, 20, 10, 5, 5],
];
const SHARDS = 4;
const TONES: LayoutTone[] = ["blue", "teal", "green", "violet"];

// Snake order: down even columns, up odd ones, so consecutive cells always touch.
const order: [number, number][] = [];
for (let c = 0; c < COLS; c++) {
  for (let i = 0; i < ROWS; i++) order.push([c, c % 2 === 0 ? i : ROWS - 1 - i]);
}
const total = LOAD.flat().reduce((a, b) => a + b, 0); // 1,510
const target = total / SHARDS; // 377.5
const shardOf: number[][] = LOAD.map((row) => row.map(() => 0));
const sums = [0, 0, 0, 0];
const counts = [0, 0, 0, 0];
let s = 0;
for (const [c, r] of order) {
  shardOf[r][c] = s;
  sums[s] += LOAD[r][c];
  counts[s] += 1;
  if (sums[s] >= target && s < SHARDS - 1) s += 1;
}

// The search: centre in column 4, row 1 (shard 3), 40 km = 45 px.
const CX = GX + 4 * C + 15;
const CY = GY + 1.5 * C;
const R = 45;
const covered: [number, number][] = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const nx = Math.max(GX + c * C, Math.min(CX, GX + (c + 1) * C));
    const ny = Math.max(GY + r * C, Math.min(CY, GY + (r + 1) * C));
    if (Math.hypot(nx - CX, ny - CY) < R) covered.push([c, r]);
  }
}
const perShard = [0, 0, 0, 0];
for (const [c, r] of covered) perShard[shardOf[r][c]] += 1;
const hit = perShard.map((n, i) => ({ n, i })).filter((x) => x.n > 0);

const shapes: LayoutShape[] = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    shapes.push({
      id: `c${c}-${r}`,
      type: "cell",
      x: GX + c * C,
      y: GY + r * C,
      w: C,
      h: C,
      label: `${LOAD[r][c]}k`,
      tone: TONES[shardOf[r][c]],
      weight: 0.12 + (0.55 * LOAD[r][c]) / 300,
    });
  }
}
shapes.push({
  id: "grid-note",
  type: "text",
  x: GX,
  y: GY - 34,
  w: COLS * C,
  h: 18,
  label: "Active profiles per cell, in thousands; one colour per shard",
});

// Shard legend.
const LX = 550;
const LW = 230;
for (let i = 0; i < SHARDS; i++) {
  shapes.push({
    id: `s${i + 1}`,
    type: "box",
    x: LX,
    y: GY + i * 54,
    w: LW,
    h: 44,
    label: `Shard ${i + 1}`,
    sub: `${counts[i]} cells · ${sums[i]}k profiles`,
    tone: TONES[i],
    fill: "pastel",
  });
}

// Step 2: the search circle and what it covers.
// Lines draw under cells, so each covered cell gets an orange "searched" tag instead of a drawn circle.
covered.forEach(([c, r]) => {
  shapes.push({
    id: `hit${c}-${r}`,
    type: "text",
    x: GX + c * C + 2,
    y: GY + r * C + 42,
    w: C - 4,
    h: 14,
    label: "searched",
    tone: "orange",
    step: 2,
  });
});
shapes.push({ id: "you", type: "circle", x: CX, y: CY - 18, w: 12, tone: "orange", fill: "pastel", step: 2 });
shapes.push({
  id: "cover",
  type: "box",
  x: LX,
  y: GY + 4 * 54 + 8,
  w: LW,
  h: 64,
  label: `40 km circle: ${covered.length} cells\n${hit.map((h) => `${h.n} in shard ${h.i + 1}`).join(", ")}\nquery both, merge top 1,000`,
  step: 2,
});

// Step 3: the user moves one cell west, across the shard edge (lines draw under cells, so a second dot shows it).
const NX = GX + 3 * C + 30;
shapes.push({ id: "moved", type: "circle", x: NX, y: CY - 18, w: 12, tone: "orange", fill: "pastel", step: 3 });
shapes.push({
  id: "move-note",
  type: "box",
  x: LX,
  y: GY + 4 * 54 + 84,
  w: LW,
  h: 50,
  label: `Moved west: delete in shard ${shardOf[1][4] + 1}\ninsert in shard ${shardOf[1][3] + 1}`,
  step: 3,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Cells grouped into shards by load",
  width: LX + LW + 30,
  height: GY + 4 * 54 + 84 + 50 + 20,
  steps: [
    { title: "Cells grouped into shards by load" },
    { title: "A search near an edge reads two shards" },
    { title: "Moving across the edge" },
  ],
  shapes,
};

export default spec;
