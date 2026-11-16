import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { curve } from "@/components/diagrams/presets/production";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The chance that a page waits on at least one slow call, against how many calls it fans out to
// (tail-latency-and-degradation, Core concepts "Why the tail grows with fan-out").
// Working (computed below): if each call is slow with probability p, independently, a page that waits for all n calls
// is slow with probability 1 − (1 − p)^n. For p = 1 % (each service's p99): n = 1 → 1 %, n = 10 → 9.6 %,
// n = 50 → 39.5 %, n = 100 → 63.4 %. For p = 0.1 % (a tail ten times thinner): n = 50 → 4.9 %, n = 100 → 9.5 %.
// Layout: one curve, percentage of slow pages against fan-out 0 to 100. Colours (PATTERN_TONE): the 1 % line red (the
// slow pages are the failure), the 0.1 % line green (what hedging or a thinner tail buys). Two tones plus neutral.
// Fact check (2026-11-16, Dean and Barroso, "The Tail at Scale", CACM 56(2), 2013): servers that are slow one time in
// 100; "If a user request must collect responses from 100 such servers in parallel, then 63% of user requests will
// take more than one second."

const slowPage = (p: number, fanOut: number) => 100 * (1 - (1 - p) ** fanOut);
const points = (p: number): [number, number][] =>
  Array.from({ length: 101 }, (_, i) => i).map((i) => [i, slowPage(p, i)]);
const pct = (v: number) => `${v.toFixed(1).replace(/\.0$/, "")} %`;

const MARKS = [1, 10, 50, 100] as const;
const PLACE = { 1: undefined, 10: "below-right", 50: "above-left", 100: "above-left" } as const;

const plot = curve("fan", 10, 10, {
  width: 740,
  height: 360,
  xDomain: [0, 100],
  yDomain: [0, 80],
  xTicks: [0, 10, 25, 50, 75, 100],
  yTicks: [0, 20, 40, 60, 80],
  formatY: (v) => `${v} %`,
  xLabel: "calls the page waits for (fan-out)",
  yLabel: "pages with at least one slow call",
  series: [
    { points: points(0.01), tone: PATTERN_TONE.fail },
    { points: points(0.001), tone: PATTERN_TONE.pattern, label: "each call slow 0.1 %", dashed: true },
  ],
  marks: MARKS.map((m) => ({
    x: m,
    y: slowPage(0.01, m),
    // The 1-call point sits in the corner where the two lines meet: its label is drawn above, with an arrow.
    label: PLACE[m] ? `${m} calls: ${pct(slowPage(0.01, m))}` : undefined,
    tone: PATTERN_TONE.fail,
    place: PLACE[m],
  })),
});

// The 1-call label: in the empty space above the red line, joined to its point by a short arrow.
const one = plot.find((s) => s.id === "fan-m0");
if (!one) throw new Error("tail-fanout-math: the 1-call mark is missing");
const ONE_LABEL = `1 call: ${pct(slowPage(0.01, 1))}`;
const oneText: LayoutShape = {
  id: "one-label",
  type: "text",
  x: one.x - 6,
  y: one.y - 112,
  w: 84,
  h: 18,
  label: ONE_LABEL,
  tone: PATTERN_TONE.fail,
};
const oneArrow: LayoutShape = {
  id: "one-arrow",
  type: "arrow",
  x: one.x,
  y: one.y - 92,
  w: 0,
  h: 85,
  tone: PATTERN_TONE.fail,
};

// The red line's name sits under the line at 68 calls (where the line is at 49.5 %), clear of the 100-call label.
const toPx = (shape: LayoutShape | undefined) => {
  if (!shape) throw new Error("tail-fanout-math: a mark is missing");
  return shape;
};
const m50 = toPx(plot.find((s) => s.id === "fan-m2"));
const m100 = toPx(plot.find((s) => s.id === "fan-m3"));
const redName: LayoutShape = {
  id: "red-name",
  type: "text",
  x: m50.x + (m100.x - m50.x) * 0.36,
  y: m50.y + 6,
  w: 130,
  h: 18,
  label: "each call slow 1 %",
  tone: PATTERN_TONE.fail,
};

const spec: LayoutSpec = {
  kind: "layout",
  title: "One slow call in 100, many calls per page",
  width: 760,
  height: 380,
  shapes: [...plot, oneText, oneArrow, redName],
};

export default spec;
