import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, n } from "@/components/diagrams/presets/patterns";

// Windowed top-k from per-minute sketches (top-k-and-leaderboards, Technical mechanics).
// One Count-Min sketch per minute, kept in a ring of 61 slots. At 13:00 the window "last hour" is the 60 sketches of
// 12:01 to 13:00; the 12:00 sketch is dropped and its slot reused. The query sums the 60 sketches cell by cell (they
// share w, d and hash functions), estimates the candidates (the products in each minute's top 100) and keeps the top
// 10 in a min-heap.
// Working (computed below): one sketch = 5 rows × 2,000 columns × 4 bytes = 40,000 bytes = 40 kB; 60 sketches =
// 2,400,000 bytes = 2.4 MB. An exact per-minute map of all 1,000,000 products at 8 bytes of id + 4 bytes of count =
// 12,000,000 bytes = 12 MB before hash-table overhead; 60 of them = 720 MB. Top 100 per minute is illustrative.
// Layout (860 × 300): row labels at x 10; a 60-minute axis from x 150, 10 px per minute (slot 0 is 12:00); the query
// chain and the memory comparison under it.
// Colours (PATTERN_TONE): sketches and the query green (the pattern), the exact maps violet (a store), the dropped
// minute and labels neutral.

const MIN = 60;
const PX = 10;
const X0 = 150;
const D = 5;
const W = 2_000;
const COUNTER_BYTES = 4;
const sketchBytes = D * W * COUNTER_BYTES; // 40,000
const exactBytes = SHOP.catalogueProducts * (8 + COUNTER_BYTES); // 12,000,000
const kB = (b: number) => `${n(b / 1_000)} kB`;
const MB = (b: number) => `${n(b / 1_000_000)} MB`;
const shapes: LayoutShape[] = [];

const rowLabel = (id: string, y: number, label: string) =>
  shapes.push({ id, type: "text", x: 10, y, w: 130, h: 18, label, tone: PATTERN_TONE.infra });

for (const m of [0, 15, 30, 45, 60]) {
  shapes.push({
    id: `tick-${m}`,
    type: "text",
    x: X0 + m * PX - 20,
    y: 12,
    w: 50,
    h: 16,
    label: `${m === 60 ? 13 : 12}:${String(m % 60).padStart(2, "0")}`,
    tone: PATTERN_TONE.infra,
  });
}
rowLabel("l-min", 48, "one sketch a minute");
for (let m = 0; m <= MIN; m++) {
  shapes.push({
    id: `m-${m}`,
    type: "cell",
    x: X0 + m * PX,
    y: 36,
    w: PX,
    h: 40,
    tone: m === 0 ? PATTERN_TONE.infra : PATTERN_TONE.pattern,
    fill: m === MIN ? "pastel" : "soft",
    quiet: m !== MIN,
  });
}
shapes.push({
  id: "newest",
  type: "text",
  x: X0 + (MIN + 1) * PX + 6,
  y: 48,
  w: 80,
  h: 18,
  label: "newest",
  tone: PATTERN_TONE.pattern,
});
shapes.push({
  id: "dropped",
  type: "text",
  x: 10,
  y: 84,
  w: 150,
  h: 18,
  label: "12:00 drops out",
  tone: PATTERN_TONE.infra,
});
shapes.push({
  id: "bracket",
  type: "path",
  x: 0,
  y: 0,
  points: [
    [X0 + PX, 82],
    [X0 + PX, 90],
    [X0 + (MIN + 1) * PX, 90],
    [X0 + (MIN + 1) * PX, 82],
  ],
  tone: PATTERN_TONE.pattern,
});
shapes.push({
  id: "win",
  type: "text",
  x: 260,
  y: 96,
  w: 400,
  h: 18,
  label: `the last hour: ${MIN} sketches of ${D} × ${n(W)}`,
  tone: PATTERN_TONE.pattern,
});

rowLabel("l-q", 156, "query");
const CHAIN: [string, string, string][] = [
  ["sum", `Sum ${MIN} sketches`, "cell by cell, same w and d"],
  ["cand", "Estimate candidates", "each minute’s top 100"],
  ["top", "Top 10 of the hour", "min-heap, k = 10"],
];
CHAIN.forEach(([id, label, sub], i) => {
  shapes.push({
    id,
    type: "box",
    x: X0 + i * 240,
    y: 140,
    w: 200,
    h: 50,
    label,
    sub,
    tone: PATTERN_TONE.pattern,
    fill: i === 2 ? "pastel" : "paper",
  });
});
shapes.push({ id: "a-win", type: "arrow", x: 0, y: 0, from: "win", to: "sum" });
shapes.push({ id: "a-1", type: "arrow", x: 0, y: 0, from: "sum", to: "cand" });
shapes.push({ id: "a-2", type: "arrow", x: 0, y: 0, from: "cand", to: "top" });

rowLabel("l-mem", 238, "memory for the hour");
shapes.push({
  id: "mem-sk",
  type: "box",
  x: X0,
  y: 222,
  w: 320,
  h: 50,
  label: `${MIN} sketches × ${kB(sketchBytes)} = ${MB(MIN * sketchBytes)}`,
  sub: `${D} × ${n(W)} counters of ${COUNTER_BYTES} bytes each`,
  tone: PATTERN_TONE.pattern,
  fill: "pastel",
});
shapes.push({
  id: "mem-exact",
  type: "box",
  x: X0 + 340,
  y: 222,
  w: 320,
  h: 50,
  label: `${MIN} exact maps × ${MB(exactBytes)} = ${MB(MIN * exactBytes)}`,
  sub: `${n(SHOP.catalogueProducts)} products × 12 bytes, before overhead`,
  tone: PATTERN_TONE.store,
  fill: "soft",
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The last hour as the sum of 60 per-minute sketches",
  width: 860,
  height: 290,
  shapes,
};

export default spec;
