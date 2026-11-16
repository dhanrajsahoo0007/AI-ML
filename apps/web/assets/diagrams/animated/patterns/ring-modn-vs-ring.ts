import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Why `hash % N` breaks and a ring does not (consistent-hashing, first figure). Twenty keys with hash values 0 to 19
// (a toy hash space so every key fits on screen) are placed on four nodes, then a fifth node joins.
//
// Four steps: 1 hash % 4 · 2 hash % 5: every key whose remainder changed is red (16 of 20) · 3 a ring of four nodes
// at positions 4, 9, 14 and 19 (a key goes to the first node at or after its hash) · 4 node E joins at position 18
// and takes keys 15 to 18 from D: 4 of 20 move, in green.
// Working (computed below, not typed): a key stays under % 4 → % 5 only when k % 4 = k % 5, that is k % 20 < 4, so
// 4 of 20 stay and 16 move (80 %). On the ring only the new node's slice moves (here 4 of 20 = 20 %), all from D.
// Layout: label column 150, 20 cells of 30, a count column on the right. Colours (PATTERN_TONE): keys neutral, a
// key that moved under modulo red (a lost cache entry), a key that moved on the ring green (the pattern).
// Fact check: Karger et al. (1997) introduce the ring so that adding a node moves only the keys of its new range.

const KEYS = Array.from({ length: 20 }, (_, k) => k);
const LETTERS = "ABCDE";
const mod = (k: number, nodes: number) => LETTERS[k % nodes];
const RING4: [number, string][] = [
  [4, "A"],
  [9, "B"],
  [14, "C"],
  [19, "D"],
];
const RING5: [number, string][] = [...RING4.slice(0, 3), [18, "E"], [19, "D"]];
const ring = (k: number, points: [number, string][]) => (points.find(([p]) => p >= k) ?? points[0])[1];

const ROWS = [
  { id: "m4", title: "hash % 4", owner: (k: number) => mod(k, 4), base: null as null | ((k: number) => string) },
  { id: "m5", title: "hash % 5", owner: (k: number) => mod(k, 5), base: (k: number) => mod(k, 4) },
  { id: "r4", title: "Ring, 4 nodes", owner: (k: number) => ring(k, RING4), base: null },
  { id: "r5", title: "Ring, E joins", owner: (k: number) => ring(k, RING5), base: (k: number) => ring(k, RING4) },
];

const LABEL_W = 150;
const CELL = 30;
const X0 = 20 + LABEL_W;
const Y0 = 50;
const ROW_H = 60;

const shapes: LayoutShape[] = [];
KEYS.forEach((k) => {
  shapes.push({
    id: `h${k}`,
    type: "text",
    x: X0 + k * CELL,
    y: Y0 - 26,
    w: CELL,
    h: 18,
    label: String(k),
    tone: PATTERN_TONE.infra,
  });
});
shapes.push({
  id: "hcap",
  type: "text",
  x: 20,
  y: Y0 - 26,
  w: LABEL_W - 10,
  h: 18,
  label: "key hash",
  tone: PATTERN_TONE.infra,
});

ROWS.forEach((row, ri) => {
  const step = ri + 1;
  const y = Y0 + ri * ROW_H;
  let moved = 0;
  shapes.push({
    id: `${row.id}-t`,
    type: "text",
    x: 20,
    y: y + 6,
    w: LABEL_W - 10,
    h: 18,
    label: row.title,
    tone: PATTERN_TONE.infra,
    step,
  });
  KEYS.forEach((k) => {
    const owner = row.owner(k);
    const changed = row.base !== null && row.base(k) !== owner;
    if (changed) moved += 1;
    const tone = changed ? (row.id === "m5" ? PATTERN_TONE.fail : PATTERN_TONE.pattern) : PATTERN_TONE.infra;
    shapes.push({
      id: `${row.id}-${k}`,
      type: "cell",
      x: X0 + k * CELL,
      y,
      w: CELL,
      h: CELL,
      label: owner,
      tone,
      fill: changed ? "pastel" : "soft",
      step,
      quiet: true,
    });
  });
  const note = row.base === null ? "start" : `${moved} of ${KEYS.length} moved`;
  shapes.push({
    id: `${row.id}-n`,
    type: "text",
    x: X0 + KEYS.length * CELL + 10,
    y: y + 6,
    w: 110,
    h: 18,
    label: note,
    tone: row.base === null ? PATTERN_TONE.infra : row.id === "m5" ? PATTERN_TONE.fail : PATTERN_TONE.pattern,
    step,
  });
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "hash % N against a hash ring when a fifth node joins",
  width: X0 + KEYS.length * CELL + 130,
  height: Y0 + ROWS.length * ROW_H,
  shapes,
  steps: [
    { title: "Four nodes: hash % 4" },
    { title: "A fifth node: hash % 5 moves 16 of 20 keys" },
    { title: "A ring of four nodes" },
    { title: "E joins the ring: only its slice moves" },
  ],
};

export default spec;
