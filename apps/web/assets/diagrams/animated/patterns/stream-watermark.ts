import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Out-of-order views, a watermark and two late events for one 5-minute window, 12:00 to 12:05
// (stream-processing-and-windowing, Core concepts). All times illustrative.
// The watermark follows the bounded out-of-orderness rule: largest event time seen so far minus 10 s. The window
// fires once the watermark reaches its end; allowed lateness is 2 min, so its state is kept until the watermark
// passes 12:07:00.
// Arrivals in order (event time → watermark after it):
//   1 12:04:51 → 12:04:41 · 2 12:04:48 → 12:04:41 (out of order) · 3 12:04:58 → 12:04:48 · 4 12:04:55 → 12:04:48
//   5 12:05:12 → 12:05:02: passes 12:05:00, the window fires with the 4 views it holds (1 to 4)
//   6 12:04:40 → 12:05:02: late but within 2 min of lateness, the window fires again with 5
//   7 12:07:20 → 12:07:10: passes 12:07:00, the window's state is deleted
//   8 12:04:30 → 12:07:10: too late, sent to a side output, not counted.
// Five steps: 1 arrivals · 2 the watermark row · 3 the first firing · 4 the late firing · 5 state deleted and the
// side output.
// Layout: label column 140 wide, eight columns of 84 with a gap of 6 from x 150.
// Colours (PATTERN_TONE): event times blue (data), watermark pink (a clock counter), firings green (the pattern),
// the dropped event red.

const LAG_S = 10;
const X0 = 150;
const COL = 84;
const GAP = 6;
const cx = (i: number) => X0 + i * (COL + GAP);

const toS = (t: string) => {
  const [h, m, s] = t.split(":").map(Number);
  return h * 3600 + m * 60 + s;
};
const fmt = (s: number) =>
  [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((v) => String(v).padStart(2, "0")).join(":");

const EVENTS = ["12:04:51", "12:04:48", "12:04:58", "12:04:55", "12:05:12", "12:04:40", "12:07:20", "12:04:30"];
let maxSeen = 0;
const marks = EVENTS.map((e) => {
  maxSeen = Math.max(maxSeen, toS(e));
  return fmt(maxSeen - LAG_S);
});

const shapes: LayoutShape[] = [];
const label = (id: string, y: number, text: string, step?: number, h = 40) =>
  shapes.push({ id, type: "text", x: 6, y, w: 136, h, label: text, tone: PATTERN_TONE.infra, step });

shapes.push({
  id: "l-order",
  type: "text",
  x: 6,
  y: 10,
  w: 136,
  h: 20,
  label: "Arrival order",
  tone: PATTERN_TONE.infra,
});
EVENTS.forEach((e, i) => {
  shapes.push({
    id: `n-${i}`,
    type: "text",
    x: cx(i),
    y: 10,
    w: COL,
    h: 20,
    label: `#${i + 1}`,
    tone: PATTERN_TONE.infra,
  });
  shapes.push({
    id: `e-${i}`,
    type: "cell",
    x: cx(i),
    y: 40,
    w: COL,
    h: 40,
    label: e,
    tone: PATTERN_TONE.data,
    fill: "pastel",
    quiet: i > 0,
  });
  shapes.push({
    id: `w-${i}`,
    type: "cell",
    x: cx(i),
    y: 104,
    w: COL,
    h: 40,
    label: marks[i],
    tone: PATTERN_TONE.id,
    fill: "pastel",
    step: 2,
    quiet: i > 0,
  });
});
label("l-event", 40, "Event time");
label("l-mark", 104, `Watermark after\n(max seen − ${LAG_S} s)`, 2);

const result = (
  id: string,
  i: number,
  text: string,
  sub: string,
  tone: (typeof PATTERN_TONE)[keyof typeof PATTERN_TONE],
  step: number,
  highlight = false
) =>
  shapes.push({
    id,
    type: "box",
    x: cx(i),
    y: 170,
    w: COL,
    h: 64,
    label: text,
    sub,
    tone,
    fill: tone === PATTERN_TONE.fail ? "soft" : "pastel",
    step,
    highlight,
  });
label("l-result", 170, "Window\n12:00–12:05", 3, 64);
result("fire", 4, "window\nfires", "count 4", PATTERN_TONE.pattern, 3, true);
result("late", 5, "late:\nre-fires", "count 5", PATTERN_TONE.pattern, 4);
result("gone", 6, "state\ndeleted", "past 12:07", PATTERN_TONE.infra, 5);
result("side", 7, "side\noutput", "not counted", PATTERN_TONE.fail, 5);

shapes.push({
  id: "rule",
  type: "text",
  x: X0,
  y: 252,
  w: 8 * COL + 7 * GAP,
  h: 20,
  label: "Fires when the watermark reaches 12:05:00 · allowed lateness 2 min: kept until 12:07:00",
  tone: PATTERN_TONE.infra,
  step: 3,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "A watermark closing one 5-minute window",
  width: cx(7) + COL + 16,
  height: 284,
  shapes,
  steps: [
    { title: "Events arrive out of order" },
    { title: "The watermark trails by 10 s" },
    { title: "The watermark passes 12:05: fire" },
    { title: "A late event fires it again" },
    { title: "Too late: to the side output" },
  ],
};

export default spec;
