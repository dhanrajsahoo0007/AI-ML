import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// One timeline cut three ways: tumbling, sliding and session windows (stream-processing-and-windowing, Core concepts).
// Eight clicks from one shopper over 10 minutes of event time (illustrative times, in minutes):
//   0.4, 0.9, 1.5, 3.6, 4.4, 5.3, 8.0, 8.4.
// Working (computed below):
//   Tumbling, 5 min: [0, 5) holds 5 clicks, [5, 10) holds 3. Every click is in exactly one window.
//   Sliding, 5 min every 1 min: [0, 5) holds 5, [1, 6) holds 4, [2, 7) holds 3 (three of the windows drawn; each
//     click sits in up to 5 windows).
//   Session, 1.5 min gap (illustrative): 1.5 → 3.6 is a 2.1 min gap and 5.3 → 8.0 a 2.7 min gap, so three sessions:
//     [0.4, 3.0) with 3 clicks, [3.6, 6.8) with 3, [8.0, 9.9) with 2. A session ends one gap after its last click.
// Layout: label column 150 wide, then a 10-minute axis 600 wide (60 px per minute). Rows: ticks, clicks, tumbling,
// three sliding rows, session.
// Colours (PATTERN_TONE): clicks blue (data in motion), windows green (the pattern), labels neutral.

const PX = 60;
const X0 = 160;
const AXIS = 10;
const CLICKS = [0.4, 0.9, 1.5, 3.6, 4.4, 5.3, 8.0, 8.4];
const GAP = 1.5;
const tx = (m: number) => X0 + m * PX;
const count = (a: number, b: number) => CLICKS.filter((c) => c >= a && c < b).length;
const shapes: LayoutShape[] = [];

const rowLabel = (id: string, y: number, label: string, h = 34) =>
  shapes.push({ id, type: "text", x: 10, y, w: 140, h, label, tone: PATTERN_TONE.infra });

const windowBox = (id: string, a: number, b: number, y: number, h = 34) => {
  const c = count(a, b);
  shapes.push({
    id,
    type: "box",
    x: tx(a),
    y,
    w: (b - a) * PX,
    h,
    label: `${c} click${c === 1 ? "" : "s"}`,
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
  });
};

// Minute ticks and faint guide lines.
for (let m = 0; m <= AXIS; m++) {
  shapes.push({
    id: `tick-${m}`,
    type: "text",
    x: tx(m) - 20,
    y: 12,
    w: 40,
    h: 16,
    label: `${m}`,
    tone: PATTERN_TONE.infra,
  });
}
shapes.push({
  id: "unit",
  type: "text",
  x: 10,
  y: 12,
  w: 140,
  h: 16,
  label: "event time (min)",
  tone: PATTERN_TONE.infra,
});
shapes.push({
  id: "axis",
  type: "path",
  x: 0,
  y: 0,
  points: [
    [tx(0), 62],
    [tx(AXIS), 62],
  ],
  tone: PATTERN_TONE.infra,
});

rowLabel("l-clicks", 45, "One shopper’s clicks");
CLICKS.forEach((c, i) => {
  shapes.push({
    id: `click-${i}`,
    type: "circle",
    x: tx(c),
    y: 62,
    w: 14,
    tone: PATTERN_TONE.data,
    fill: "pastel",
  });
});

rowLabel("l-tumble", 92, "Tumbling, 5 min");
windowBox("t-0", 0, 5, 92);
windowBox("t-1", 5, 10, 92);

rowLabel("l-slide", 146, "Sliding, 5 min\nevery 1 min", 96);
[0, 1, 2].forEach((s, i) => windowBox(`s-${s}`, s, s + 5, 146 + i * 32, 28));
shapes.push({
  id: "s-note",
  type: "text",
  x: tx(7.2),
  y: 178,
  w: 170,
  h: 32,
  label: "… a new window\nevery minute",
  tone: PATTERN_TONE.infra,
});

// Sessions: a run of clicks with gaps under 1.5 min, closed one gap after the last click.
const sessions: [number, number][] = [];
let start = CLICKS[0];
for (let i = 1; i <= CLICKS.length; i++) {
  if (i === CLICKS.length || CLICKS[i] - CLICKS[i - 1] > GAP) {
    sessions.push([start, Math.round((CLICKS[i - 1] + GAP) * 10) / 10]);
    if (i < CLICKS.length) start = CLICKS[i];
  }
}
rowLabel("l-session", 262, `Session, ${GAP} min gap`);
sessions.forEach(([a, b], i) => windowBox(`ss-${i}`, a, b, 262));

const spec: LayoutSpec = {
  kind: "layout",
  title: "Tumbling, sliding and session windows over one timeline",
  width: X0 + AXIS * PX + 80, // room on the right for the play/pause button
  height: 312,
  shapes,
};

export default spec;
