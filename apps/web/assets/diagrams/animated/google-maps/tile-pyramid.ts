import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The tile pyramid (google-maps, Step 1 and Deep dive 2): every zoom level splits each tile into four.
// Three steps: 1 zoom 0, 1 and 2 hold 1, 4 and 16 tiles (4^z) · 2 the arithmetic at the deepest zoom the service
// cuts · 3 one road edit at one point lands in exactly one tile per zoom, so it re-cuts 17 tiles (zoom 0 to 16) under
// a new version; the version is in the URL, so old tiles stay cacheable and new ones are new keys.
// Working (round numbers, the same as the page): tiles at zoom z = 4^z; zoom 16 = 4^16 = 4,294,967,296 ≈ 4.3 B; zoom
// 0 to 16 = (4^17 − 1) ÷ 3 = 5,726,623,061 ≈ 5.7 B; assume ~30% hold any data (the rest is ocean or empty land and
// shares one empty tile) ≈ 1.7 B tiles × 20 KB per vector tile ≈ 34 TB per version. The edited point sits at
// (0.6, 0.3) of the world square: zoom 1 tile x = floor(0.6 × 2) = 1, y = floor(0.3 × 2) = 0; zoom 2 tile
// x = floor(0.6 × 4) = 2, y = floor(0.3 × 4) = 1.
// Layout: three square grids of side 150 at x 30, 210, 390 (y 50), captions under them; the arithmetic as four boxes
// in a column at x 580 (56 apart); the edit as a dot at the point and a green "re-cut" line under each grid naming its tile.
// Colours (PATTERN_TONE): tiles blue (data), the edit and new version green (the pattern's own part), the edited
// point orange (traffic), the arithmetic violet boxes (store).

const SIDE = 150;
const TOP = 50;
const grids = [
  { z: 0, x: 30 },
  { z: 1, x: 210 },
  { z: 2, x: 390 },
];
const POINT: [number, number] = [0.6, 0.3];

const shapes: LayoutShape[] = [];
for (const g of grids) {
  const n = 2 ** g.z;
  const cell = SIDE / n;
  for (let ty = 0; ty < n; ty++) {
    for (let tx = 0; tx < n; tx++) {
      shapes.push({
        id: `z${g.z}-${tx}-${ty}`,
        type: "cell",
        x: g.x + tx * cell,
        y: TOP + ty * cell,
        w: cell,
        h: cell,
        label: g.z < 2 ? `${g.z}/${tx}/${ty}` : undefined,
        tone: PATTERN_TONE.data,
        quiet: !(tx === 0 && ty === 0),
      });
    }
  }
  shapes.push({
    id: `z${g.z}-cap`,
    type: "text",
    x: g.x - 10,
    y: TOP + SIDE + 12,
    w: SIDE + 20,
    h: 18,
    label: `zoom ${g.z}: ${4 ** g.z} tile${g.z ? "s" : ""}`,
    tone: PATTERN_TONE.infra,
  });
  // Step 3: the tile holding the edited point at this zoom, and the point itself.
  const tx = Math.floor(POINT[0] * n);
  const ty = Math.floor(POINT[1] * n);
  shapes.push({
    id: `edit-z${g.z}`,
    type: "text",
    x: g.x - 10,
    y: TOP + SIDE + 36,
    w: SIDE + 20,
    h: 18,
    label: `re-cut: ${g.z}/${tx}/${ty}`,
    tone: PATTERN_TONE.pattern,
    step: 3,
    quiet: true,
  });
  shapes.push({
    id: `pt-z${g.z}`,
    type: "circle",
    x: g.x + POINT[0] * SIDE,
    y: TOP + POINT[1] * SIDE,
    w: 10,
    tone: PATTERN_TONE.traffic,
    fill: "pastel",
    step: 3,
    quiet: true,
  });
}

// Step 2: the arithmetic at zoom 16.
const sums = [
  { id: "m1", label: "Zoom z holds 4^z tiles", sub: "each tile splits into four" },
  { id: "m2", label: "Zoom 16: 4^16 ≈ 4.3 B tiles", sub: "zoom 0 to 16: (4^17 − 1) ÷ 3 ≈ 5.7 B" },
  { id: "m3", label: "~30% hold data ≈ 1.7 B tiles", sub: "× 20 KB ≈ 34 TB per version" },
];
sums.forEach((m, i) => {
  shapes.push({
    id: m.id,
    type: "box",
    x: 580,
    y: TOP + i * 56,
    w: 260,
    h: 48,
    label: m.label,
    sub: m.sub,
    tone: PATTERN_TONE.store,
    fill: "pastel",
    step: 2,
    quiet: i > 0,
  });
});

// Step 3: what one edit costs, and the versioned key.
shapes.push({
  id: "edit-box",
  type: "box",
  x: 580,
  y: TOP + 3 * 56,
  w: 260,
  h: 48,
  label: "One edit: 1 tile per zoom = 17",
  sub: "re-cut under version v43",
  tone: PATTERN_TONE.pattern,
  fill: "pastel",
  step: 3,
});
shapes.push({
  id: "key",
  type: "text",
  x: 30,
  y: TOP + SIDE + 82,
  w: 810,
  h: 18,
  label: "Key: tiles/v43/{z}/{x}/{y}: a new version is a new URL, so every cached tile can live for a year",
  tone: PATTERN_TONE.infra,
  step: 3,
  quiet: true,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The tile pyramid",
  width: 870,
  height: TOP + SIDE + 112,
  steps: [
    { title: "Each zoom splits every tile into four" },
    { title: "The arithmetic at zoom 16" },
    { title: "One edit, one tile per zoom, a new version" },
  ],
  shapes,
};

export default spec;
