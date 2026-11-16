import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// One map pan, from viewport to results (zillow, Step 7 and Deep dive 1).
// Three steps: 1 the viewport snaps to map tiles: 1,200 × 800 px at zoom 13 touches 6 × 5 = 30 tiles of 256 px
// (ceil(1,200 ÷ 256) + 1 = 6 columns, ceil(800 ÷ 256) + 1 = 5 rows) · 2 the buyer panned east, so the 20 tiles seen
// before come from the viewport cache in one multi-get (a dot marks each) · 3 the 10 new tiles become one bounding
// box, sent with the filters to the search index in one query; the results are split by tile and written back for
// 60 s.
// Working (round numbers chosen to size the system): the viewport covers about 15 km × 10 km = 150 km²; at 20 active
// listings a km² that is 3,000 listings, and the filters (for sale, under \$600k, 3+ beds) keep 15 %: 450. The 10 new
// tiles hold a third of the area: 450 × 10 ÷ 30 = 150 listings to fetch. Cache: 20 of 30 tiles hit = 67 %.
// Layout: the tile grid on the left (6 × 5 cells of 56 × 40 from x 40, y 70); the query chain on the right in one
// column at x 470 (query, search index, results). Colours (PATTERN_TONE): tiles neutral, cached dots violet (store),
// the query teal (compute), the filters blue (data), the index violet, the results green (what the figure adds).

const COLS = 6;
const ROWS = 5;
const CW = 56;
const CH = 40;
const GX = 40;
const GY = 70;
const MISS_FROM = 4; // columns 4 and 5 are new after the pan
const shapes: LayoutShape[] = [];

shapes.push({
  id: "title",
  type: "text",
  x: GX,
  y: 30,
  w: COLS * CW,
  h: 20,
  label: "Viewport, zoom 13: 30 tiles",
  tone: PATTERN_TONE.infra,
});

for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const first = r === 0 && c === 0;
    shapes.push({
      id: `t-${r}-${c}`,
      type: "cell",
      x: GX + c * CW,
      y: GY + r * CH,
      w: CW,
      h: CH,
      tone: PATTERN_TONE.infra,
      quiet: !first,
    });
    if (c < MISS_FROM) {
      shapes.push({
        id: `hit-${r}-${c}`,
        type: "circle",
        x: GX + c * CW + CW / 2,
        y: GY + r * CH + CH / 2,
        w: 14,
        tone: PATTERN_TONE.store,
        fill: "pastel",
        step: 2,
        quiet: !first,
      });
    }
  }
}

shapes.push({
  id: "hits-note",
  type: "text",
  x: GX,
  y: GY + ROWS * CH + 12,
  w: MISS_FROM * CW,
  h: 18,
  label: "20 from cache: one multi-get",
  tone: PATTERN_TONE.store,
  step: 2,
});

const MX = GX + MISS_FROM * CW;
shapes.push({
  id: "miss-box",
  type: "path",
  x: 0,
  y: 0,
  points: [
    [MX - 4, GY - 4],
    [GX + COLS * CW + 4, GY - 4],
    [GX + COLS * CW + 4, GY + ROWS * CH + 4],
    [MX - 4, GY + ROWS * CH + 4],
    [MX - 4, GY - 4],
  ],
  dashed: true,
  tone: PATTERN_TONE.compute,
  step: 3,
});
shapes.push({
  id: "miss-note",
  type: "text",
  x: MX - 10,
  y: GY + ROWS * CH + 12,
  w: 2 * CW + 20,
  h: 18,
  label: "10 new tiles",
  tone: PATTERN_TONE.compute,
  step: 3,
});

const QX = 470;
const QW = 250;
shapes.push({
  id: "query",
  type: "box",
  x: QX,
  y: 60,
  w: QW,
  h: 56,
  label: "One query: box of 10 tiles",
  sub: "for sale, under $600k, 3+ beds",
  tone: PATTERN_TONE.compute,
  fill: "pastel",
  step: 3,
  highlight: true,
});
shapes.push({
  id: "index",
  type: "box",
  x: QX,
  y: 160,
  w: QW,
  h: 56,
  label: "Search index",
  sub: "geo filter + attribute filters",
  tone: PATTERN_TONE.store,
  fill: "pastel",
  step: 3,
});
shapes.push({
  id: "results",
  type: "box",
  x: QX,
  y: 260,
  w: QW,
  h: 56,
  label: "150 listings, split by tile",
  sub: "written back for 60 s",
  tone: PATTERN_TONE.pattern,
  fill: "pastel",
  step: 3,
});
shapes.push({
  id: "a-miss",
  type: "arrow",
  x: GX + COLS * CW + 6,
  y: GY + 40,
  w: QX - (GX + COLS * CW + 6) - 4,
  h: 88 - (GY + 40),
  step: 3,
});
shapes.push({ id: "a-q", type: "arrow", x: 0, y: 0, from: "query", to: "index", step: 3 });
shapes.push({ id: "a-r", type: "arrow", x: 0, y: 0, from: "index", to: "results", step: 3 });

const spec: LayoutSpec = {
  kind: "layout",
  title: "One map pan: tiles from the cache, one query for the rest",
  width: QX + QW + 40,
  height: 340,
  shapes,
  steps: [
    { title: "The viewport snaps to 30 tiles" },
    { title: "Seen tiles come from the cache" },
    { title: "One query for the new tiles" },
  ],
};

export default spec;
