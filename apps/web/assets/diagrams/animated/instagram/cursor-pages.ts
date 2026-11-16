import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Offset against cursor when a post arrives between two page loads (instagram, Deep dive 2).
// Steps: 1 page 1 of a feed, newest first, 4 posts a page: P10 to P7 · 2 P11 arrives at the top; page 2 by offset 4
// now returns P7, P6, P5, P4, so P7 is shown twice · 3 page 2 by cursor "after P7" returns P6 to P3: no repeat, and
// P11 waits for the next refresh · 4 P5 is deleted before page 2: the cursor still finds its place, the deleted post
// is skipped and the page is filled from the next id: P6, P4, P3, P2.
// Working: 4 posts a page; offset 4 counts positions, so one insert above the reader shifts every later position by
// one and the first post of page 2 is the last post of page 1. A cursor names a post (an id, or a position in a stored
// ranked list), so inserts above it change nothing below it.
// Layout: one row per step, 11 cells of 50 × 44 (6 apart) for P11 to P1, row labels on the left (x 20, w 150).
// Colours (PATTERN_TONE): posts on the page green (the pattern), the new post blue (data), the repeated post red
// (failure), other posts neutral.

const CELL = 50;
const GAP = 6;
const H = 44;
const LEFT = 186;
const ROW0 = 30;
const ROW_STEP = 82;
const POSTS = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const cx = (i: number) => LEFT + i * (CELL + GAP);

interface Row {
  step: number;
  label: string;
  note: string;
  /** Post number to tone and optional sub-label. */
  marks: Record<number, { tone: LayoutTone; sub?: string; pastel?: boolean }>;
  /** Posts not drawn in this row. */
  hide?: number[];
}

const page = (posts: number[]) =>
  Object.fromEntries(posts.map((p) => [p, { tone: PATTERN_TONE.pattern, pastel: true }])) as Row["marks"];

const rows: Row[] = [
  { step: 1, label: "Page 1", note: "offset 0, limit 4", marks: page([10, 9, 8, 7]), hide: [11] },
  {
    step: 2,
    label: "Page 2 by offset",
    note: "P11 arrived; offset 4",
    marks: {
      11: { tone: PATTERN_TONE.data, sub: "new" },
      ...page([6, 5, 4]),
      7: { tone: PATTERN_TONE.fail, sub: "again", pastel: true },
    },
  },
  {
    step: 3,
    label: "Page 2 by cursor",
    note: "after P7, limit 4",
    marks: {
      11: { tone: PATTERN_TONE.data, sub: "waits" },
      7: { tone: PATTERN_TONE.infra, sub: "cursor" },
      ...page([6, 5, 4, 3]),
    },
  },
  {
    step: 4,
    label: "P5 deleted",
    note: "skip it, fill from P2",
    marks: {
      11: { tone: PATTERN_TONE.data, sub: "waits" },
      7: { tone: PATTERN_TONE.infra, sub: "cursor" },
      5: { tone: PATTERN_TONE.infra, sub: "deleted" },
      ...page([6, 4, 3, 2]),
    },
  },
];

const shapes: LayoutShape[] = [];
rows.forEach((r, ri) => {
  const y = ROW0 + ri * ROW_STEP;
  shapes.push({
    id: `r${ri}-label`,
    type: "text",
    x: 16,
    y: y + 2,
    w: 160,
    h: 40,
    label: `${r.label}\n${r.note}`,
    tone: PATTERN_TONE.infra,
    step: r.step,
  });
  POSTS.forEach((p, i) => {
    if (r.hide?.includes(p)) return;
    const m = r.marks[p];
    shapes.push({
      id: `r${ri}-p${p}`,
      type: "cell",
      x: cx(i),
      y,
      w: CELL,
      h: H,
      label: `P${p}`,
      sub: m?.sub,
      tone: m?.tone ?? PATTERN_TONE.infra,
      fill: m?.pastel ? "pastel" : "soft",
      highlight: m?.tone === PATTERN_TONE.fail,
      quiet: !m,
      step: r.step,
    });
  });
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Offset against cursor when a post arrives between pages",
  width: cx(POSTS.length) + 14,
  height: ROW0 + rows.length * ROW_STEP,
  shapes,
  steps: [
    { title: "Page 1: P10 to P7" },
    { title: "Offset: P7 shown twice" },
    { title: "Cursor: no repeat" },
    { title: "A deleted post is skipped" },
  ],
};

export default spec;
