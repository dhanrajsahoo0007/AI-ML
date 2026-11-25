import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A backfill cursor racing live writes (online-migrations, Technical mechanics). Sixteen rows, ids 1 to 16, are copied
// in id order while dual writes keep updating rows on both sides of the cursor.
// Three steps: 1 the backfill has copied ids 1 to 8 (cursor at 9) · 2 live dual writes update id 4 (behind the
// cursor) and id 12 (ahead of it) in both stores, as version 7 · 3 the backfill reaches id 12 with the old store's
// version 6 snapshot it read earlier; the new store already has version 7, so the copy is skipped.
// Layout: two rows of 16 cells (old store above, new store below), 40 px each. Colours (PATTERN_TONE): rows copied by
// the backfill green (the pattern), rows written by dual writes blue (data in motion), the skipped copy lime (the version
// check), the rest neutral.

const N = 16;
const CELL = 40;
const X0 = 150;
const x = (id: number) => X0 + (id - 1) * CELL;
const shapes: LayoutShape[] = [];

shapes.push({ id: "t-old", type: "text", x: 10, y: 58, w: 130, h: 18, label: "Old store", tone: PATTERN_TONE.infra });
shapes.push({ id: "t-new", type: "text", x: 10, y: 158, w: 130, h: 18, label: "New store", tone: PATTERN_TONE.infra });
for (let id = 1; id <= N; id++) {
  shapes.push({
    id: `o${id}`,
    type: "cell",
    x: x(id),
    y: 50,
    w: CELL,
    h: 34,
    label: String(id),
    tone: PATTERN_TONE.infra,
    quiet: id > 1,
  });
  const copied = id <= 8;
  shapes.push({
    id: `n${id}`,
    type: "cell",
    x: x(id),
    y: 150,
    w: CELL,
    h: 34,
    label: copied ? String(id) : "",
    tone: copied ? PATTERN_TONE.pattern : PATTERN_TONE.infra,
    fill: copied ? "pastel" : "soft",
    quiet: id > 1,
  });
}
shapes.push({
  id: "cursor",
  type: "arrow",
  x: 0,
  y: 0,
  from: "o9",
  to: "n9",
  label: "cursor",
  tone: PATTERN_TONE.pattern,
  dashed: true,
});

shapes.push({
  id: "w4",
  type: "cell",
  x: x(4),
  y: 110,
  w: CELL,
  h: 30,
  label: "v7",
  tone: PATTERN_TONE.data,
  fill: "pastel",
  step: 2,
});
shapes.push({
  id: "w12",
  type: "cell",
  x: x(12),
  y: 110,
  w: CELL,
  h: 30,
  label: "v7",
  tone: PATTERN_TONE.data,
  fill: "pastel",
  step: 2,
});
shapes.push({
  id: "t-dw",
  type: "text",
  x: x(13) + 6,
  y: 116,
  w: 150,
  h: 18,
  label: "dual writes, both stores",
  tone: PATTERN_TONE.data,
  step: 2,
});

shapes.push({
  id: "skip",
  type: "box",
  x: x(9),
  y: 200,
  w: 5 * CELL,
  h: 40,
  label: "copy v6? new has v7: skip",
  tone: PATTERN_TONE.check,
  fill: "pastel",
  step: 3,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A backfill cursor racing live writes",
  width: x(N) + CELL + 30,
  height: 260,
  shapes,
  steps: [
    { title: "The backfill copies rows in id order" },
    { title: "Live writes land on both sides of the cursor" },
    { title: "An older copy is skipped by version" },
  ],
};

export default spec;
