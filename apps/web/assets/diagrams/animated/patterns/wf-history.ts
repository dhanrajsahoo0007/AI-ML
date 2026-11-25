import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { FLASH_SALE, ORDER, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A durable workflow's event history, replayed after a crash (workflows-and-job-scheduling, Technical mechanics:
// durable workflows). The hold workflow for order 4471: reserve the kettle, start a 10-minute timer, wait for the
// shopper's payment, confirm the order.
// Four steps: 1 the service appends one event per decision and result (events 1 to 6) · 2 worker 1 dies after event 6
// · 3 worker 2 re-runs the workflow code from the top; each call is matched with its event in the history, so
// reserve() is not run again, and the workflow carries on with events 7 and 8 · 4 code that branches on the local
// clock emits a different command on replay, and the replay stops with a non-determinism error.
// Layout: eight event columns 96 wide, 10 apart (x 20 to 858); events on row 1 (y 40), the crash marker in the gap
// after event 6 with its label above events 7 and 8, the code calls on row 2 (y 150) under the events they produce,
// the error box on row 3.
// Colours (PATTERN_TONE): events blue (data), workflow code teal (compute), the events written after the replay green
// (the pattern), the crash and the non-determinism error red.
// Fact check (2026-11-16, Temporal docs): the event history is an append-only, durably persisted log; on replay the
// commands the code emits are compared with the existing history, and a mismatch returns a non-deterministic error;
// time and randomness must go through the SDK; side effects run in activities, outside the replay path.

const W = 96;
const GAP = 10;
const X0 = 20;
const x = (i: number) => X0 + i * (W + GAP);

const EVENTS = [
  { e: "1 Started", s: `order ${ORDER.orderId}` },
  { e: "2 Scheduled", s: "reserve()" },
  { e: "3 Completed", s: "reserved" },
  { e: "4 Timer", s: `${FLASH_SALE.holdMinutes} min` },
  { e: "5 Signal", s: `paid £${ORDER.price}` },
  { e: "6 Scheduled", s: "confirm()" },
  { e: "7 Completed", s: "confirmed" },
  { e: "8 Done", s: "workflow ends" },
];

const CODE = [
  { i: 1, label: "reserve()" },
  { i: 3, label: "timer(10m)" },
  { i: 4, label: "await paid" },
  { i: 5, label: "confirm()" },
];

const shapes: LayoutShape[] = [];

shapes.push({
  id: "t-history",
  type: "text",
  x: X0,
  y: 12,
  w: 6 * (W + GAP) - GAP,
  h: 18,
  label: `Event history of the hold workflow for order ${ORDER.orderId} (append only)`,
  tone: PATTERN_TONE.data,
});

EVENTS.forEach((ev, i) => {
  const late = i >= 6;
  shapes.push({
    id: `e${i}`,
    type: "box",
    x: x(i),
    y: 40,
    w: W,
    h: 46,
    label: ev.e,
    sub: ev.s,
    tone: late ? PATTERN_TONE.pattern : PATTERN_TONE.data,
    fill: "pastel",
    step: late ? 3 : 1,
    quiet: late && i > 6,
  });
});

// Step 2: worker 1 dies after event 6.
const crashX = x(6) - GAP / 2;
shapes.push({
  id: "crash-line",
  type: "path",
  x: 0,
  y: 0,
  points: [
    [crashX, 10],
    [crashX, 96],
  ],
  dashed: true,
  tone: PATTERN_TONE.fail,
  step: 2,
});
shapes.push({
  id: "crash",
  type: "text",
  x: crashX,
  y: 12,
  w: 2 * (W + GAP),
  h: 18,
  label: "Worker 1 dies here",
  tone: PATTERN_TONE.fail,
  step: 2,
});

// Step 3: worker 2 re-runs the code; each call meets its event.
CODE.forEach((c, k) => {
  shapes.push({
    id: `c${k}`,
    type: "box",
    x: x(c.i),
    y: 150,
    w: W,
    h: 38,
    label: c.label,
    tone: PATTERN_TONE.compute,
    fill: "pastel",
    step: 3,
    quiet: k > 0,
  });
  shapes.push({ id: `m${k}`, type: "arrow", x: 0, y: 0, from: `c${k}`, to: `e${c.i}`, step: 3 });
});
shapes.push({
  id: "t-code",
  type: "text",
  x: X0,
  y: 160,
  w: W,
  h: 18,
  label: "Worker 2",
  tone: PATTERN_TONE.compute,
  step: 3,
});
shapes.push({
  id: "t-replay",
  type: "text",
  x: X0,
  y: 196,
  w: 8 * (W + GAP) - GAP,
  h: 18,
  label: "Replay: each call is matched with its event, so reserve() is not run again; then events 7 and 8 are new",
  tone: PATTERN_TONE.pattern,
  step: 3,
});

// Step 4: non-deterministic code.
shapes.push({
  id: "nondet",
  type: "box",
  x: x(1),
  y: 232,
  w: 6 * (W + GAP) - GAP,
  h: 46,
  label: "Code that reads the local clock takes another branch on replay",
  sub: "the commands no longer match the history: non-determinism error",
  tone: PATTERN_TONE.fail,
  fill: "pastel",
  step: 4,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A workflow's event history, replayed after a crash",
  width: x(EVENTS.length - 1) + W + X0,
  height: 296,
  shapes,
  steps: [
    { title: "The history, one event per step" },
    { title: "The worker dies" },
    { title: "Replay: the history answers" },
    { title: "Non-deterministic code breaks replay" },
  ],
};

export default spec;
