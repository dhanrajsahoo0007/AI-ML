import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Capacity per 15-minute slot (parking-garage, Step 4 and Deep dive 1): a reservation takes one unit in every slot
// of its window, in one transaction, or none.
// Two steps: 1 driver A reserves a car space 09:00 to 11:00: the eight slot rows are all below 180, so one guarded
// UPDATE adds 1 to each and commits; 09:45 and 10:00 reach 180 · 2 driver B asks for 09:30 to 10:30 (four slots):
// 09:45 and 10:00 are full, so the guarded UPDATE changes 2 of the 4 rows; the row count is short, the transaction
// rolls back and B gets a 409 naming 09:45.
// Working: garage 17 has 400 car spaces; the operator sells up to 200 by reservation and holds back 20 (5% of 400) for
// drivers who overstay, so 200 − 20 = 180 per slot. A two-hour window is 120 ÷ 15 = 8 slot rows. Before A: 171, 175,
// 178, 179, 179, 176, 172, 168; after A each is one higher: 172, 176, 179, 180, 180, 177, 173, 169.
// Layout (880 × 300): a row label column x 10 to 110, then 8 cells 84 wide, 8 apart, from x 120 (last ends at 852).
// Times at y 40, the "before" row at y 60, A's bracket at y 132, the "after A" row at y 150, B's bracket at y 222.
// Colours (PATTERN_TONE): the starting counts grey (infra), the counts after A green (the change), B's failed
// bracket red (the refusal).

const X0 = 120;
const W = 84;
const GAP = 8;
const cx = (i: number) => X0 + i * (W + GAP);
const CAP = 180;
const times = ["09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45"];
const before = [171, 175, 178, 179, 179, 176, 172, 168];
const after = before.map((v) => v + 1);

const shapes: LayoutShape[] = [];
times.forEach((t, i) => {
  shapes.push({ id: `t${i}`, type: "text", x: cx(i), y: 36, w: W, h: 18, label: t, tone: PATTERN_TONE.infra });
  shapes.push({
    id: `b${i}`,
    type: "cell",
    x: cx(i),
    y: 60,
    w: W,
    h: 52,
    label: String(before[i]),
    sub: `of ${CAP}`,
    tone: PATTERN_TONE.infra,
    quiet: i > 0,
  });
  shapes.push({
    id: `a${i}`,
    type: "cell",
    x: cx(i),
    y: 150,
    w: W,
    h: 52,
    label: String(after[i]),
    sub: after[i] === CAP ? "full" : `of ${CAP}`,
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    quiet: i > 0,
  });
});

shapes.push(
  { id: "row-before", type: "text", x: 10, y: 60, w: 100, h: 52, label: "Before", tone: PATTERN_TONE.infra },
  { id: "row-after", type: "text", x: 10, y: 150, w: 100, h: 52, label: "After A", tone: PATTERN_TONE.pattern },
  {
    id: "req-a",
    type: "arrow",
    x: cx(0),
    y: 131,
    w: cx(7) + W - cx(0),
    h: 0,
    label: "A: 09:00 to 11:00, 8 rows below 180: +1 each, commit",
    tone: PATTERN_TONE.pattern,
  },
  {
    id: "req-b",
    type: "arrow",
    x: cx(2),
    y: 222,
    w: cx(5) + W - cx(2),
    h: 0,
    label: "B: 09:30 to 10:30: 2 of 4 rows change",
    tone: "red",
    step: 2,
  },
  {
    id: "b-result",
    type: "text",
    x: cx(0),
    y: 250,
    w: cx(7) + W - cx(0),
    h: 30,
    label: "Row count short: roll back, nothing kept, 409 “09:45 is full”",
    tone: "red",
    step: 2,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Capacity per 15-minute slot",
  width: 880,
  height: 300,
  steps: [{ title: "A fits: every slot +1" }, { title: "B hits a full slot: nothing kept" }],
  shapes,
};

export default spec;
