import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Why list-by-prefix wants key ranges, not hashes (s3, Step 5 and the Data model).
// Three steps: 1 hashed partitions: the 16 keys under logs/2026-11-17/ hash to all 8 partitions (2 each), so
// LIST logs/2026-11-17/ must ask all 8 and merge the answers in key order · 2 range partitions over the sorted keys:
// the same prefix sits inside one range (P3: logs/2026-11-15 … logs/2026-11-19), so LIST is one ordered scan of one
// partition · 3 the cost of ranges: a writer appending under one date prefix sends 12,000 PUTs/s to P3, over its
// 3,000/s limit; the range splits by key into 12,000 ÷ 3,000 = 4 ranges of about 3,000/s each.
// Working: 16 keys ÷ 8 partitions = 2 keys each under hashing. The 3,000 writes/s per partition is this page's
// sizing figure for one consensus group, not a real system's limit.
// Layout (930 × 330): a label box on the left of each row (x 20, w 150). Row 1: 8 boxes (w 80, gap 10) from x 190.
// Row 2: 4 range boxes (w 170, gap 10) from x 190. Row 3: the hot range (x 190, w 170) and its 4 children (w 120,
// gap 10) from x 400, joined by one arrow. Rows at y 50, 150, 250, boxes 56 high.
// Colours (PATTERN_TONE): label boxes neutral (plumbing), partitions violet (stores), the range that holds the prefix
// and the split children green (the pattern's own part), the overloaded range red.

const ROW = [50, 150, 250];
const H = 56;
const shapes: LayoutShape[] = [];

const labels = [
  { label: "Hash partitions", sub: "LIST asks all 8" },
  { label: "Range partitions", sub: "LIST reads 1" },
  { label: "Split a hot range", sub: "12,000 → 4 × 3,000" },
];
labels.forEach((l, i) => {
  shapes.push({
    id: `label-${i + 1}`,
    type: "box",
    x: 20,
    y: ROW[i],
    w: 150,
    h: H,
    label: l.label,
    sub: l.sub,
    tone: PATTERN_TONE.infra,
    fill: "pastel",
    step: i + 1,
  });
});

// Row 1: hashing scatters one prefix over every partition.
for (let i = 0; i < 8; i++) {
  shapes.push({
    id: `hash-${i + 1}`,
    type: "box",
    x: 190 + i * 90,
    y: ROW[0],
    w: 80,
    h: H,
    label: `P${i + 1}`,
    sub: "2 keys",
    tone: PATTERN_TONE.store,
    fill: "pastel",
    step: 1,
    quiet: i > 0,
  });
}

// Row 2: ranges over the sorted keys; the prefix sits in P3.
const ranges = [
  { label: "P1", sub: "a … images/" },
  { label: "P2", sub: "images/ … logs/…-14" },
  { label: "P3", sub: "logs/…-15 … -19" },
  { label: "P4", sub: "logs/…-20 … z" },
];
ranges.forEach((r, i) => {
  shapes.push({
    id: `range-${i + 1}`,
    type: "box",
    x: 190 + i * 180,
    y: ROW[1],
    w: 170,
    h: H,
    label: r.label,
    sub: r.sub,
    tone: i === 2 ? PATTERN_TONE.pattern : PATTERN_TONE.store,
    fill: "pastel",
    step: 2,
    highlight: i === 2,
    quiet: i !== 2,
  });
});

// Row 3: the hot range and its split.
shapes.push({
  id: "hot",
  type: "box",
  x: 190,
  y: ROW[2],
  w: 170,
  h: H,
  label: "P3: 12,000 PUT/s",
  sub: "limit 3,000/s",
  tone: PATTERN_TONE.fail,
  fill: "pastel",
  step: 3,
});
["P3a", "P3b", "P3c", "P3d"].forEach((name, i) => {
  shapes.push({
    id: `split-${i + 1}`,
    type: "box",
    x: 400 + i * 130,
    y: ROW[2],
    w: 120,
    h: H,
    label: name,
    sub: "≈ 3,000/s",
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    step: 3,
    quiet: i > 0,
  });
});
shapes.push({ id: "split-arrow", type: "arrow", x: 0, y: 0, from: "hot", to: "split-1", step: 3 });

const spec: LayoutSpec = {
  kind: "layout",
  title: "List by prefix wants key ranges, not hashes",
  width: 930,
  height: 330,
  shapes,
  steps: [
    { title: "Hashed: one prefix on every partition" },
    { title: "Ranges: one prefix, one partition" },
    { title: "A hot range splits by key" },
  ],
};

export default spec;
