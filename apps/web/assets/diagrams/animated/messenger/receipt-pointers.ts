import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Receipts as two pointers per member, not a row per message per member (facebook-messenger, Data model and
// Deep dive 1).
// One group conversation with messages m1 to m8. Each member row stores only last_delivered and last_read; a message
// is read by a member when its id is at or below last_read, delivered when at or below last_delivered.
// Members (illustrative): Ana read m8 · Ben delivered m8, read m5 · Cal delivered m6, read m3 (offline since m6).
// Working: per-row storage is 3 members × 8 messages = 24 receipt rows against 3 pointer rows here; for a 200-member
// group with 1,000 messages a day that is 200 × 1,000 = 200,000 rows a day against 200 rows overwritten in place.
// Layout: a header row of 8 message cells (56 wide, 8 apart) from x 170; one row per member at y 90, 150, 210; a member
// box on the left and the two pointer values on the right. Colours (PATTERN_TONE): read green (the pattern's own
// part), delivered blue (data in motion), not yet delivered neutral.

const X0 = 170;
const CW = 56;
const GAP = 8;
const cx = (i: number) => X0 + i * (CW + GAP);
const members = [
  { id: "ana", name: "Ana", delivered: 8, read: 8 },
  { id: "ben", name: "Ben", delivered: 8, read: 5 },
  { id: "cal", name: "Cal", delivered: 6, read: 3 },
];
const shapes: LayoutShape[] = [];
for (let i = 0; i < 8; i++) {
  shapes.push({
    id: `h${i}`,
    type: "text",
    x: cx(i),
    y: 40,
    w: CW,
    h: 22,
    label: `m${i + 1}`,
    tone: PATTERN_TONE.infra,
  });
}
members.forEach((m, r) => {
  const y = 90 + r * 60;
  shapes.push({
    id: m.id,
    type: "box",
    x: 40,
    y,
    w: 110,
    h: 44,
    label: m.name,
    tone: PATTERN_TONE.infra,
    fill: "pastel",
  });
  for (let i = 0; i < 8; i++) {
    const n = i + 1;
    const tone = n <= m.read ? PATTERN_TONE.pattern : n <= m.delivered ? PATTERN_TONE.data : PATTERN_TONE.infra;
    shapes.push({
      id: `${m.id}-${n}`,
      type: "cell",
      x: cx(i),
      y,
      w: CW,
      h: 44,
      label: n <= m.read ? "read" : n <= m.delivered ? "dlvd" : "",
      tone,
    });
  }
  shapes.push({
    id: `${m.id}-p`,
    type: "box",
    x: cx(8) + 16,
    y,
    w: 190,
    h: 44,
    label: `delivered m${m.delivered} · read m${m.read}`,
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
  });
});
shapes.push({
  id: "k",
  type: "text",
  x: cx(8) + 16,
  y: 40,
  w: 190,
  h: 22,
  label: "the only row stored",
  tone: PATTERN_TONE.pattern,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Receipts as two pointers per member",
  width: cx(8) + 16 + 190 + 40,
  height: 90 + 3 * 60 + 10,
  shapes,
};

export default spec;
