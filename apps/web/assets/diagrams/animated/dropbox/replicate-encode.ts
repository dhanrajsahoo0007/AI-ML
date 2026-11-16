import type { LayoutGroup, LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Replicate first, erasure-code later (dropbox, Step 7 and Deep dive 3), for one 1 GB bucket of blocks.
// Three steps: 1 new blocks: three full copies, two in zone A and one in zone B; the write is acknowledged once both
// zones hold a copy · 2 a sealed bucket a week later: cut into 6 data fragments and 3 parity fragments, three per
// zone; any 6 of the 9 rebuild the bucket · 3 zone C goes down: d5, d6 and p3 are gone; reads decode d5 and d6 from
// the 6 fragments left in zones A and B, and storage jobs rebuild the lost three elsewhere.
// Working: replicas cost 3 × 1 GB = 3 GB raw. The code: 1 GB ÷ 6 = 167 MB per fragment; 9 × 167 MB = 1.5 GB raw, so
// 1.5 × instead of 3 ×. For 400 PB of unique data that is 600 PB raw instead of 1,200 PB. A zone loss removes 3
// fragments and leaves exactly 6: readable, with no margin left until the rebuild finishes.
// Layout (860 × 390): three zone groups 270 wide (x 20, 300, 580), y 40 to 260. Row 1 (y 80) replicas; row 2 (y 190)
// fragments, 70 wide; under the groups, the code's note (y 272) and row 3 (y 316), the zone-C loss.
// Colours (PATTERN_TONE): replicas and data fragments blue (data),
// parity fragments green (the pattern's own part), the lost zone red.

const ZW = 270;
const zx = (z: number) => 20 + z * (ZW + 10);
const groups: LayoutGroup[] = ["Zone A", "Zone B", "Zone C"].map((title, z) => ({
  id: `z${z}`,
  title,
  tone: PATTERN_TONE.infra,
  x: zx(z),
  y: 40,
  w: ZW,
  h: 220,
}));
const shapes: LayoutShape[] = [];

// Step 1: three replicas in two zones.
[
  { id: "r1", z: 0, i: 0, label: "copy 1" },
  { id: "r2", z: 0, i: 1, label: "copy 2" },
  { id: "r3", z: 1, i: 0, label: "copy 3" },
].forEach((r) => {
  shapes.push({
    id: r.id,
    type: "box",
    x: zx(r.z) + 15 + r.i * 125,
    y: 80,
    w: 115,
    h: 44,
    label: r.label,
    sub: "1 GB",
    tone: PATTERN_TONE.data,
    fill: "pastel",
  });
});
shapes.push({
  id: "r-note",
  type: "text",
  x: zx(2) + 10,
  y: 80,
  w: ZW - 20,
  h: 44,
  label: "new data: 3 copies,\n2 zones = 3 GB raw",
  tone: PATTERN_TONE.infra,
});

// Step 2: 6 data + 3 parity fragments, three per zone.
const frags = [
  ["d1", "d2", "p1"],
  ["d3", "d4", "p2"],
  ["d5", "d6", "p3"],
];
frags.forEach((zone, z) =>
  zone.forEach((f, i) =>
    shapes.push({
      id: f,
      type: "cell",
      x: zx(z) + 20 + i * 80,
      y: 190,
      w: 70,
      h: 44,
      label: f,
      sub: "167 MB",
      tone: f.startsWith("p") ? PATTERN_TONE.pattern : PATTERN_TONE.data,
      fill: "pastel",
      step: 2,
      quiet: f !== "d1",
    })
  )
);
shapes.push({
  id: "ec-note",
  type: "text",
  x: zx(0),
  y: 272,
  w: zx(2) + ZW - zx(0),
  h: 24,
  label: "sealed bucket: 6 data + 3 parity = 1.5 GB raw; any 6 of the 9 rebuild it",
  tone: PATTERN_TONE.infra,
  step: 2,
});

// Step 3: zone C is lost.
shapes.push({
  id: "lost",
  type: "box",
  x: zx(2) + 15,
  y: 316,
  w: ZW - 30,
  h: 56,
  label: "Zone C down",
  sub: "d5, d6, p3 unreachable",
  tone: PATTERN_TONE.fail,
  fill: "pastel",
  step: 3,
});
shapes.push({
  id: "decode",
  type: "box",
  x: zx(0) + 15,
  y: 316,
  w: zx(1) + ZW - zx(0) - 30,
  h: 56,
  label: "Read: decode d5, d6 from the 6 left",
  sub: "storage jobs rebuild 3 fragments in A and B",
  tone: PATTERN_TONE.pattern,
  fill: "pastel",
  step: 3,
});
shapes.push({ id: "a-lost", type: "arrow", x: 0, y: 0, from: "lost", to: "decode", label: "", step: 3 });

const spec: LayoutSpec = {
  kind: "layout",
  title: "Replicate first, erasure-code later",
  width: 860,
  height: 390,
  groups,
  shapes,
  steps: [
    { title: "New blocks: three copies, two zones" },
    { title: "Sealed: 6 data + 3 parity, three per zone" },
    { title: "A zone is lost: decode from the six left" },
  ],
};

export default spec;
