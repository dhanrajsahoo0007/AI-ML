import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A three-night stay is three guarded rows in one transaction (hotel-booking, Step 4 and Deep dive 1).
// Two steps: 1 guest A books one double room for Fri 12, Sat 13 and Sun 14 June: each night's row passes the guard
// held + sold + 1 ≤ total + overbook, so 3 rows change for 3 nights and the transaction commits (A takes Saturday's
// last room) · 2 guest B asks for the same three nights a moment later: Friday and Sunday change, Saturday is full
// and changes 0 rows, so 2 rows changed ≠ 3 nights and the whole transaction rolls back.
// Working: a double-room type with total 10 and overbook 0. Taken (held + sold) before A: Fri 7, Sat 9, Sun 4.
// A: 7 + 1 = 8 ≤ 10, 9 + 1 = 10 ≤ 10, 4 + 1 = 5 ≤ 10: three rows. B after A: Fri 8 + 1 = 9 ≤ 10, Sat 10 + 1 = 11 > 10,
// Sun 5 + 1 = 6 ≤ 10: two rows, so Friday's 9 and Sunday's 6 are undone. Numbers are illustrative.
// Layout (840 × 400): the guard statement as a text line on top; two panels (x 40 and x 460, 340 wide), each a
// title, three night boxes (50 high, 65 apart) and a result box joined by an arrow. Colours (PATTERN_TONE): a row
// that passes the guard green (the pattern), the full night red (fail), changed-then-undone rows neutral (infra),
// the committed result green, the rolled-back result red.

const W = 340;
const H = 50;
const ROW_Y = [90, 155, 220];
const RESULT_Y = 315;
const PANEL_X = [40, 460];

const shapes: LayoutShape[] = [
  {
    id: "guard",
    type: "text",
    x: 40,
    y: 8,
    w: 760,
    h: 20,
    label:
      "UPDATE room_nights SET held = held + 1 WHERE night IN (Fri, Sat, Sun) AND held + sold + 1 <= total + overbook",
    tone: PATTERN_TONE.infra,
  },
];

const panels = [
  {
    key: "a",
    title: "Guest A: Fri to Mon, one double room",
    rows: [
      { night: "Fri 12 Jun: 7 → 8 of 10", sub: "7 + 1 ≤ 10: changed", tone: PATTERN_TONE.pattern },
      { night: "Sat 13 Jun: 9 → 10 of 10", sub: "9 + 1 ≤ 10: changed, the last room", tone: PATTERN_TONE.pattern },
      { night: "Sun 14 Jun: 4 → 5 of 10", sub: "4 + 1 ≤ 10: changed", tone: PATTERN_TONE.pattern },
    ],
    result: { label: "3 rows changed = 3 nights", sub: "commit: the stay is held", tone: PATTERN_TONE.pattern },
  },
  {
    key: "b",
    title: "Guest B: the same nights, a moment later",
    rows: [
      { night: "Fri 12 Jun: 8 → 9 of 10", sub: "changed, then undone", tone: PATTERN_TONE.infra },
      { night: "Sat 13 Jun: 10 of 10, full", sub: "10 + 1 > 10: 0 rows", tone: PATTERN_TONE.fail },
      { night: "Sun 14 Jun: 5 → 6 of 10", sub: "changed, then undone", tone: PATTERN_TONE.infra },
    ],
    result: { label: "2 rows changed ≠ 3 nights", sub: "roll back all three: sold out", tone: PATTERN_TONE.fail },
  },
];

panels.forEach((p, i) => {
  const x = PANEL_X[i];
  const step = i + 1;
  shapes.push({
    id: `${p.key}-title`,
    type: "text",
    x,
    y: 52,
    w: W,
    h: 20,
    label: p.title,
    tone: PATTERN_TONE.infra,
    step,
    quiet: true,
  });
  p.rows.forEach((r, j) => {
    shapes.push({
      id: `${p.key}-n${j}`,
      type: "box",
      x,
      y: ROW_Y[j],
      w: W,
      h: H,
      label: r.night,
      sub: r.sub,
      tone: r.tone,
      fill: "pastel",
      step,
      quiet: j !== 1,
    });
  });
  shapes.push({
    id: `${p.key}-result`,
    type: "box",
    x,
    y: RESULT_Y,
    w: W,
    h: H,
    label: p.result.label,
    sub: p.result.sub,
    tone: p.result.tone,
    fill: "pastel",
    step,
    quiet: true,
  });
  shapes.push({
    id: `${p.key}-arrow`,
    type: "arrow",
    x: 0,
    y: 0,
    from: `${p.key}-n2`,
    to: `${p.key}-result`,
    label: "count rows",
    step,
  });
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A three-night stay is three guarded rows",
  width: 840,
  height: RESULT_Y + H + 25,
  steps: [{ title: "All three nights open: commit" }, { title: "Saturday is full: roll back" }],
  shapes,
};

export default spec;
