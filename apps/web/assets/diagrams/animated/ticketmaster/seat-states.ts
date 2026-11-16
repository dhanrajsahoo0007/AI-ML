import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The life of one seat (ticketmaster, Data model): available, held, sold, with the expiry path back.
// Layout: three state boxes in a row (150 × 56, 120 apart) joined by labelled arrows; a dashed arrow back from held
// to available above them for an expired or cancelled hold; under each box, the one statement that moves a seat into
// that state. Colours (PATTERN_TONE): available neutral, held lime (a check that blocks other fans), sold green.

const Y = 90;
const W = 150;
const H = 56;
const GAP = 120;
const x = (i: number) => 60 + i * (W + GAP);
const states = [
  {
    id: "available",
    label: "Available",
    sub: "on the seat map",
    tone: PATTERN_TONE.infra,
    how: "created with the event",
  },
  { id: "held", label: "Held", sub: "one fan, 10 minutes", tone: PATTERN_TONE.check, how: "UPDATE … WHERE available" },
  { id: "sold", label: "Sold", sub: "order written", tone: PATTERN_TONE.pattern, how: "claim + order, one tx" },
];
const shapes: LayoutShape[] = [];
states.forEach((s, i) => {
  shapes.push({
    id: s.id,
    type: "box",
    x: x(i),
    y: Y,
    w: W,
    h: H,
    label: s.label,
    sub: s.sub,
    tone: s.tone,
    fill: "pastel",
  });
  shapes.push({
    id: `${s.id}-how`,
    type: "text",
    x: x(i) - 30,
    y: Y + H + 14,
    w: W + 60,
    h: 18,
    label: s.how,
    tone: PATTERN_TONE.infra,
  });
});
shapes.push({ id: "a1", type: "arrow", x: 0, y: 0, from: "available", to: "held", label: "hold" });
shapes.push({ id: "a2", type: "arrow", x: 0, y: 0, from: "held", to: "sold", label: "pay" });
shapes.push({
  id: "back",
  type: "arrow",
  x: 0,
  y: 0,
  from: "held",
  to: "available",
  via: [
    [x(1) + W / 2, Y - 36],
    [x(0) + W / 2, Y - 36],
  ],
  label: "expired or cancelled: release",
  dashed: true,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The life of one seat",
  width: x(2) + W + 60,
  height: Y + H + 52,
  shapes,
};

export default spec;
