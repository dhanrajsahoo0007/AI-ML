import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ORDER, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Event sourcing for order 4471 (cqrs-event-sourcing, Technical mechanics): six events, the state each one folds to,
// and a snapshot after event 4 so a reload replays only events 5 and 6.
// Three steps: 1 the event stream, append only · 2 the state after folding each event in order · 3 a snapshot at
// version 4: load it, then replay 2 events instead of 6.
// Layout: six columns of 120 (14 apart): events on the top row, state on the second, the snapshot marker under
// event 4. Colours (PATTERN_TONE): events blue (data in motion), state violet (store), snapshot green (the pattern).
// Fact check (2026-11-16): Azure Architecture Center, Event Sourcing pattern: events are immutable and append-only; an
// entity is rebuilt ("rehydrated") by replaying its stream; snapshots every N events limit the replay.

const price = `£${ORDER.price}`;
const EVENTS = [
  { e: "OrderPlaced", s: "placed, " + price },
  { e: "PaymentTaken", s: "paid " + price },
  { e: "StockReserved", s: "paid, reserved" },
  { e: "CourierBooked", s: "shipping" },
  { e: "DamageReported", s: "damage claim" },
  { e: "RefundIssued", s: "refunded " + price },
];
const W = 120;
const GAP = 14;
const X0 = 20;
const x = (i: number) => X0 + i * (W + GAP);

const shapes: LayoutShape[] = [];
EVENTS.forEach((ev, i) => {
  shapes.push({
    id: `e${i}`,
    type: "box",
    x: x(i),
    y: 40,
    w: W,
    h: 44,
    label: ev.e,
    sub: `v${i + 1}`,
    tone: PATTERN_TONE.data,
    fill: "pastel",
  });
  shapes.push({
    id: `s${i}`,
    type: "box",
    x: x(i),
    y: 130,
    w: W,
    h: 40,
    label: ev.s,
    tone: PATTERN_TONE.store,
    fill: "soft",
    step: 2,
  });
  shapes.push({ id: `f${i}`, type: "arrow", x: 0, y: 0, from: `e${i}`, to: `s${i}`, step: 2 });
  if (i > 0) shapes.push({ id: `n${i}`, type: "arrow", x: 0, y: 0, from: `s${i - 1}`, to: `s${i}`, step: 2 });
});
shapes.push({
  id: "t-events",
  type: "text",
  x: X0,
  y: 14,
  w: 300,
  h: 18,
  label: `Order ${ORDER.orderId}: event stream (append only)`,
  tone: PATTERN_TONE.data,
});
shapes.push({
  id: "t-state",
  type: "text",
  x: X0,
  y: 178,
  w: 300,
  h: 18,
  label: "State after each event",
  tone: PATTERN_TONE.store,
  step: 2,
});
shapes.push({
  id: "snap",
  type: "box",
  x: x(3),
  y: 210,
  w: W,
  h: 44,
  label: "Snapshot",
  sub: "state at v4",
  tone: PATTERN_TONE.pattern,
  fill: "pastel",
  highlight: true,
  step: 3,
});
shapes.push({ id: "snap-a", type: "arrow", x: 0, y: 0, from: "s3", to: "snap", dashed: true, step: 3 });
shapes.push({
  id: "t-snap",
  type: "text",
  x: x(4),
  y: 222,
  w: 2 * W + GAP,
  h: 18,
  label: "Reload: snapshot + replay v5, v6",
  tone: PATTERN_TONE.pattern,
  step: 3,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Folding events into state, with a snapshot",
  width: x(EVENTS.length - 1) + W + 20,
  height: 270,
  shapes,
  steps: [
    { title: "The event stream, append only" },
    { title: "Fold each event into the state" },
    { title: "Snapshot at v4: replay only two events" },
  ],
};

export default spec;
