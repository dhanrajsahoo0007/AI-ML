import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// TrueTime's uncertainty interval and commit wait (distributed-time-and-clocks, Technical mechanics).
// With an uncertainty of ε = 4 ms (illustrative; the Spanner paper reports it "generally less than 10ms"), the clock
// can only say that true time lies in [t − 4, t + 4]. A transaction takes s = t + 4 (the latest possible now) as its
// commit timestamp and waits until the earliest possible now has passed s, about 2ε = 8 ms, before it releases locks.
// After the wait, any transaction that starts anywhere gets a larger timestamp.
// Three steps: 1 the interval · 2 the commit timestamp at its upper edge · 3 the commit wait.
// Layout: a 0–20 ms axis, 32 px per ms. Colours (PATTERN_TONE): timestamps pink (ids/clock values), the wait lime (a
// check), the axis neutral.

const PX = 32;
const X0 = 60;
const EPS = 4;
const T = 6; // the local clock reads t = 6 ms on the axis
const s = T + EPS; // commit timestamp
const releaseAt = T + 2 * EPS; // when earliest(now) = now − ε passes s
const xm = (ms: number) => X0 + ms * PX;

const shapes: LayoutShape[] = [];
for (let ms = 0; ms <= 20; ms += 2) {
  shapes.push({
    id: `t${ms}`,
    type: "text",
    x: xm(ms) - 20,
    y: 200,
    w: 40,
    h: 16,
    label: `${ms} ms`,
    tone: PATTERN_TONE.infra,
  });
}
shapes.push({
  id: "axis",
  type: "path",
  x: 0,
  y: 0,
  points: [
    [xm(0), 192],
    [xm(20), 192],
  ],
  tone: PATTERN_TONE.infra,
});
shapes.push({
  id: "interval",
  type: "box",
  x: xm(T - EPS),
  y: 40,
  w: 2 * EPS * PX,
  h: 44,
  label: `true time is in [t − ${EPS}, t + ${EPS}]`,
  tone: PATTERN_TONE.id,
  fill: "soft",
});
shapes.push({
  id: "now",
  type: "text",
  x: xm(T) - 40,
  y: 18,
  w: 80,
  h: 18,
  label: `clock says t`,
  tone: PATTERN_TONE.id,
});
shapes.push({
  id: "stamp",
  type: "box",
  x: xm(s) - 85,
  y: 100,
  w: 170,
  h: 36,
  label: `commit stamp s = t + ${EPS}`,
  tone: PATTERN_TONE.id,
  fill: "pastel",
  step: 2,
});
shapes.push({
  id: "wait",
  type: "box",
  x: xm(T),
  y: 146,
  w: (releaseAt - T) * PX,
  h: 36,
  label: `commit wait ${releaseAt - T} ms`,
  tone: PATTERN_TONE.check,
  fill: "pastel",
  step: 3,
});
shapes.push({
  id: "release",
  type: "text",
  x: xm(releaseAt) + 6,
  y: 155,
  w: 220,
  h: 18,
  label: "release locks: s is in the past",
  tone: PATTERN_TONE.check,
  step: 3,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "TrueTime uncertainty and commit wait",
  width: xm(20) + 40,
  height: 230,
  shapes,
  steps: [
    { title: "The clock is an interval, not a point" },
    { title: "Stamp the commit at the interval's upper edge" },
    { title: "Wait until that stamp is surely past" },
  ],
};

export default spec;
