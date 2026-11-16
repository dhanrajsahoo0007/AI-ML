import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A Count-Min sketch with a min-heap of the top k (top-k-and-leaderboards, Core concepts).
// Three steps: 1 a view of the kettle hashes to one column in each of d = 5 rows, and each of those 5 counters goes
// up by 1 · 2 the estimate is the smallest of the kettle's 5 counters: every counter also holds other products that
// collided with it, so each is at least the true count · 3 a min-heap keeps the k best estimates; the kettle's
// estimate beats the root, so it replaces it.
// Working (illustrative values, computed below): the kettle's counters read 412, 403, 431, 407, 418; the minimum is
// 403. Its true count is 400 (illustrative), so the estimate is 3 too high and never too low. The heap holds k = 3
// (illustrative; the worked example keeps 10): mug 380 at the root, lamp 466, toaster 512. 403 > 380, so the kettle
// replaces the mug and sifts down.
// Layout (860 × 460): row labels at x 20, the grid of 5 × 10 cells (40 × 34) from x 120; the kettle's read-out
// column at x 560; the estimate and the heap to the right; notes under the grid.
// Colours (PATTERN_TONE): the event blue (data in motion), the counter grid violet (a store), the kettle's counters,
// the estimate and the heap green (the pattern).

const D = 5;
const W = 10;
const CW = 40;
const CH = 34;
const GX = 120;
const GY = 92;
const KETTLE_COL = [2, 6, 0, 7, 4];
const KETTLE_VAL = [412, 403, 431, 407, 418];
const TRUE_COUNT = 400;
const estimate = Math.min(...KETTLE_VAL); // 403
const minRow = KETTLE_VAL.indexOf(estimate);
// Other products' counters (illustrative), one row per hash function.
const OTHER = [
  [37, 120, 0, 58, 9, 211, 74, 3, 66, 140],
  [15, 92, 230, 7, 61, 0, 0, 118, 44, 27],
  [0, 88, 19, 301, 52, 6, 77, 140, 9, 33],
  [64, 5, 170, 22, 0, 97, 12, 0, 250, 41],
  [8, 190, 45, 0, 0, 73, 128, 16, 5, 99],
];
const HEAP = { root: ["mug", 380], left: ["lamp", 466], right: ["toaster", 512] } as const;
const shapes: LayoutShape[] = [];

shapes.push({
  id: "event",
  type: "box",
  x: 20,
  y: 14,
  w: 150,
  h: 40,
  label: "view: kettle",
  tone: PATTERN_TONE.data,
  fill: "pastel",
});
shapes.push({ id: "a-event", type: "arrow", x: 0, y: 0, from: "event", to: "g-0-2", via: [[220, 34]] });
shapes.push({
  id: "event-n",
  type: "text",
  x: 180,
  y: 25,
  w: 360,
  h: 18,
  label: `one hash per row picks a column: ${KETTLE_COL.map((c) => c + 1).join(", ")}`,
  tone: PATTERN_TONE.data,
});
shapes.push({
  id: "w-n",
  type: "text",
  x: 250,
  y: 66,
  w: 290,
  h: 18,
  label: `w = ${W} columns (2,000 in the example)`,
  tone: PATTERN_TONE.infra,
  quiet: true,
});

for (let r = 0; r < D; r++) {
  const y = GY + r * CH;
  shapes.push({
    id: `row-${r}`,
    type: "text",
    x: 20,
    y: y + 8,
    w: 90,
    h: 18,
    label: `row ${r + 1}, h${"₁₂₃₄₅"[r]}`,
    tone: PATTERN_TONE.infra,
    quiet: true,
  });
  for (let c = 0; c < W; c++) {
    const kettle = KETTLE_COL[r] === c;
    shapes.push({
      id: `g-${r}-${c}`,
      type: "cell",
      x: GX + c * CW,
      y,
      w: CW,
      h: CH,
      label: String(kettle ? KETTLE_VAL[r] : OTHER[r][c]),
      tone: kettle ? PATTERN_TONE.pattern : PATTERN_TONE.store,
      fill: kettle ? "pastel" : "soft",
      quiet: !(kettle && r === 0),
    });
  }
}
shapes.push({
  id: "d-n",
  type: "text",
  x: GX,
  y: GY + D * CH + 8,
  w: W * CW,
  h: 18,
  label: `d = ${D} rows: each view adds 1 to ${D} counters`,
  tone: PATTERN_TONE.infra,
  quiet: true,
});

// Step 2: read the kettle's five counters and take the minimum.
const RX = 560;
shapes.push({
  id: "read-t",
  type: "text",
  x: RX - 20,
  y: 66,
  w: 110,
  h: 18,
  label: "kettle reads",
  tone: PATTERN_TONE.pattern,
  step: 2,
});
KETTLE_VAL.forEach((v, r) => {
  shapes.push({
    id: `read-${r}`,
    type: "cell",
    x: RX,
    y: GY + r * CH,
    w: 70,
    h: CH,
    label: String(v),
    tone: r === minRow ? PATTERN_TONE.pattern : PATTERN_TONE.infra,
    fill: r === minRow ? "pastel" : "soft",
    quiet: r !== minRow,
    step: 2,
  });
});
shapes.push({
  id: "est",
  type: "box",
  x: 680,
  y: 118,
  w: 160,
  h: 60,
  label: `estimate = ${estimate}`,
  sub: `true ${TRUE_COUNT}: ${estimate - TRUE_COUNT} over, never under`,
  tone: PATTERN_TONE.pattern,
  fill: "pastel",
  step: 2,
});
shapes.push({ id: "a-est", type: "arrow", x: 0, y: 0, from: `read-${minRow}`, to: "est", step: 2 });

// Step 3: a min-heap of the k best estimates; the kettle beats the root.
const HX = 600;
const HY = 306;
shapes.push({
  id: "heap-t",
  type: "text",
  x: HX,
  y: HY + 120,
  w: 260,
  h: 18,
  label: "min-heap of the top k (k = 3 drawn)",
  tone: PATTERN_TONE.pattern,
  step: 3,
});
shapes.push({
  id: "h-root",
  type: "box",
  x: HX + 70,
  y: HY - 10,
  w: 130,
  h: 48,
  label: `${HEAP.root[0]} ${HEAP.root[1]}`,
  sub: "the root: smallest",
  tone: PATTERN_TONE.pattern,
  fill: "pastel",
  step: 3,
});
shapes.push({
  id: "h-left",
  type: "box",
  x: HX,
  y: HY + 66,
  w: 120,
  h: 40,
  label: `${HEAP.left[0]} ${HEAP.left[1]}`,
  tone: PATTERN_TONE.pattern,
  step: 3,
  quiet: true,
});
shapes.push({
  id: "h-right",
  type: "box",
  x: HX + 140,
  y: HY + 66,
  w: 120,
  h: 40,
  label: `${HEAP.right[0]} ${HEAP.right[1]}`,
  tone: PATTERN_TONE.pattern,
  step: 3,
  quiet: true,
});
shapes.push({ id: "e-left", type: "arrow", x: 0, y: 0, from: "h-root", to: "h-left", head: false, step: 3 });
shapes.push({ id: "e-right", type: "arrow", x: 0, y: 0, from: "h-root", to: "h-right", head: false, step: 3 });
shapes.push({
  id: "a-heap",
  type: "arrow",
  x: 0,
  y: 0,
  from: "est",
  to: "h-root",
  dashed: true,
  step: 3,
});
shapes.push({
  id: "heap-n",
  type: "text",
  x: 20,
  y: 300,
  w: 540,
  h: 54,
  label: `${estimate} > ${HEAP.root[1]}, the smallest in the heap:\nthe kettle replaces the ${HEAP.root[0]} at the root and sifts down.\nAn estimate below the root changes nothing.`,
  tone: PATTERN_TONE.pattern,
  step: 3,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A Count-Min sketch with a min-heap of the top k",
  width: 860,
  height: 460,
  shapes,
  steps: [
    { title: "Add a view: one counter per row" },
    { title: "Estimate: the smallest counter" },
    { title: "Keep the top k in a min-heap" },
  ],
};

export default spec;
