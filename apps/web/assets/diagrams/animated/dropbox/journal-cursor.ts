import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// One journal per namespace, one cursor per device (dropbox, Step 4 and Deep dive 2).
// Namespace 42 (one user's folder tree) has journal rows 9001 to 9008, appended in commit order. Each device keeps only
// a cursor: the last journal row it has applied.
// Three steps: 1 the journal and three cursors: the desktop is at 9008 (up to date), the laptop at 9005 (three rows
// behind), the phone at 8740 (offline for weeks) · 2 notify, then pull: the laptop's long poll answers "changed"; the
// laptop lists rows after 9005, gets 9006 to 9008, applies them and moves its cursor to 9008 · 3 a cursor that is too
// old: rows before 9001 were trimmed, so the phone's 8740 cannot be continued; the server answers "reset", the phone
// lists the namespace's current state and then follows the journal from 9008.
// Working: the laptop pulls 9008 − 9005 = 3 rows; the server keeps one journal per namespace, so 3 devices
// cost 3 integers, not 3 queues. Row ids are illustrative.
// Layout (920 × 470): a header row of 8 journal cells (60 wide, 6 apart) from x 170 at y 64; device rows at y 130,
// 190, 250 with a device box on the left and a cursor box on the right (x 712); step 2 adds the laptop's row after the
// pull at y 330; step 3 adds the phone's reset note at y 400.
// Colours (PATTERN_TONE): journal rows blue (data), rows a device has applied green (the pattern's own part), rows
// still to pull neutral, the reset note red (a cursor the journal can no longer serve).

const X0 = 170;
const CW = 60;
const GAP = 6;
const N = 8;
const FIRST = 9001;
const cx = (i: number) => X0 + i * (CW + GAP);
const PX = cx(N) + 14; // 712: cursor column
const shapes: LayoutShape[] = [];

shapes.push({
  id: "jlabel",
  type: "text",
  x: 10,
  y: 64,
  w: 150,
  h: 40,
  label: "Journal, ns 42\nappend only",
  tone: PATTERN_TONE.infra,
});
for (let i = 0; i < N; i++) {
  shapes.push({
    id: `j${i}`,
    type: "cell",
    x: cx(i),
    y: 64,
    w: CW,
    h: 40,
    label: String(FIRST + i),
    tone: PATTERN_TONE.data,
    fill: "pastel",
  });
}
shapes.push({
  id: "jnote",
  type: "text",
  x: PX,
  y: 64,
  w: 200,
  h: 40,
  label: "one row per commit,\nin commit order",
  tone: PATTERN_TONE.infra,
});

const row = (id: string, name: string, y: number, cursor: number, step: number, cursorLabel: string) => {
  shapes.push({
    id,
    type: "box",
    x: 40,
    y,
    w: 115,
    h: 44,
    label: name,
    tone: PATTERN_TONE.infra,
    fill: "pastel",
    step,
  });
  for (let i = 0; i < N; i++) {
    const done = FIRST + i <= cursor;
    shapes.push({
      id: `${id}-${i}`,
      type: "cell",
      x: cx(i),
      y,
      w: CW,
      h: 44,
      label: done ? "done" : "pull",
      tone: done ? PATTERN_TONE.pattern : PATTERN_TONE.infra,
      step,
      quiet: true,
    });
  }
  shapes.push({
    id: `${id}-c`,
    type: "box",
    x: PX,
    y,
    w: 200,
    h: 44,
    label: cursorLabel,
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    step,
  });
};

row("desk", "Desktop", 130, 9008, 1, "cursor 9008");
row("lap", "Laptop", 190, 9005, 1, "cursor 9005: 3 behind");
row("phone", "Phone", 250, 8740, 1, "cursor 8740: weeks old");

shapes.push({
  id: "pull",
  type: "text",
  x: X0,
  y: 296,
  w: cx(N) - X0,
  h: 26,
  label: "long poll says “changed” → list after 9005 → rows 9006 to 9008",
  tone: PATTERN_TONE.infra,
  step: 2,
});
row("lap2", "Laptop, after", 330, 9008, 2, "cursor 9008");

shapes.push({
  id: "reset",
  type: "box",
  x: X0,
  y: 400,
  w: PX + 200 - X0,
  h: 50,
  label: "Phone: 8740 is before the oldest kept row (9001): reset",
  sub: "list the namespace's current state, then follow the journal from 9008",
  tone: PATTERN_TONE.fail,
  fill: "pastel",
  step: 3,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "One journal per namespace, one cursor per device",
  width: PX + 200 + 20,
  height: 470,
  shapes,
  steps: [
    { title: "One journal, three cursors" },
    { title: "Notify, then pull after the cursor" },
    { title: "A cursor older than the journal: reset" },
  ],
};

export default spec;
