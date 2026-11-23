import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A log with offsets against a queue with visibility timeouts (distributed-message-queue, Deep dive 4: the queue
// model).
// Left: a log. Six messages m1 to m6 stay in place; group billing's next offset is m5, group analytics' is m2. Reading
// deletes nothing; retention deletes whole segments later. Right: a queue. m1 was acknowledged and deleted; worker A
// received m2 and worker B received m4, so both are hidden for a 30 s visibility timeout; m3, m5, m6 are visible.
// Two steps: 1 the two models side by side · 2 worker A is still busy at 30 s, so m2 becomes visible again and worker
// C receives it too: two workers hold m2, so the timeout is not a lock and the handler must be idempotent.
// Working: a log keeps 1 offset per group per partition; the queue keeps a state and a timer per message in flight,
// for example 120,000 in-flight messages = 120,000 timers.
// Layout (880 × 370): two dotted groups (x 20 and 450, each 410 wide); cells 56 wide on a 64 pitch at y 150; reader
// boxes above (y 56) and below (y 250) with arrows to their cell; a summary line under each panel.
// Colours (PATTERN_TONE): messages blue (data), hidden messages lime (a check: in flight), the deleted one neutral,
// readers teal (compute); the second receive of m2 is the red arrow.
// Fact check (2026-11-17, SQS developer guide): a received message "remains in the queue but becomes temporarily
// invisible"; the default visibility timeout is 30 s; an undeleted message becomes visible again when it expires.

const Y = 150;
const CW = 56;
const shapes: LayoutShape[] = [];
const cell = (p: string, x0: number, i: number, tone: LayoutTone) =>
  shapes.push({ id: `${p}${i + 1}`, type: "cell", x: x0 + i * 64, y: Y, w: CW, h: 48, label: `m${i + 1}`, tone });
const reader = (
  id: string,
  label: string,
  sub: string,
  centre: number,
  y: number,
  to: string,
  step = 1,
  tone: LayoutTone = PATTERN_TONE.compute
) => {
  shapes.push(
    { id, type: "box", x: centre - 60, y, w: 120, h: 44, label, sub, tone: PATTERN_TONE.compute, fill: "pastel", step },
    { id: `${id}-a`, type: "arrow", x: 0, y: 0, from: id, to, step, tone, packet: step > 1 }
  );
};

// Left: the log.
for (let i = 0; i < 6; i++) cell("l", 40, i, PATTERN_TONE.data);
reader("billing", "Group billing", "next: m5", 40 + 4 * 64 + CW / 2, 56, "l5");
reader("analytics", "Group analytics", "next: m2", 40 + 1 * 64 + CW / 2, 250, "l2");

// Right: the queue.
const qTone = [PATTERN_TONE.infra, PATTERN_TONE.check, PATTERN_TONE.data, PATTERN_TONE.check];
for (let i = 0; i < 6; i++) cell("q", 470, i, qTone[i] ?? PATTERN_TONE.data);
reader("wa", "Worker A", "m2, hidden 30 s", 470 + 1 * 64 + CW / 2, 56, "q2");
reader("wb", "Worker B", "m4, hidden 30 s", 470 + 3 * 64 + CW / 2, 56, "q4");
reader("wc", "Worker C", "gets m2 at 30 s", 470 + 1 * 64 + CW / 2, 250, "q2", 2, PATTERN_TONE.fail);

shapes.push(
  {
    id: "l-sum",
    type: "text",
    x: 20,
    y: 322,
    w: 410,
    h: 18,
    label: "Reading moves an offset; nothing is deleted",
    tone: PATTERN_TONE.infra,
  },
  {
    id: "q-sum",
    type: "text",
    x: 450,
    y: 322,
    w: 410,
    h: 18,
    label: "m1 acked and deleted; hidden is not locked",
    tone: PATTERN_TONE.infra,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "A log keeps messages and offsets; a queue hides and deletes",
  width: 880,
  height: 370,
  steps: [{ title: "Offsets against visibility" }, { title: "The timeout runs out: two workers" }],
  groups: [
    { id: "glog", title: "Log: groups read by offset", tone: PATTERN_TONE.store, x: 20, y: 20, w: 410, h: 292 },
    { id: "gq", title: "Queue: hide, then delete", tone: PATTERN_TONE.store, x: 450, y: 20, w: 410, h: 292 },
  ],
  shapes,
};

export default spec;
