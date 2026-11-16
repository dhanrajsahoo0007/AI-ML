import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The sliding window counter's estimate, computed (rate-limiter, Deep dive 1).
// Key k42 has a limit of 100 requests a minute. It sent 80 requests in the minute 10:00 to 10:01 and 30 so far in the
// minute 10:01 to 10:02; it is now 10:01:15.
// Three steps: 1 the two fixed windows the store keeps: two counters per key, 80 and 30 · 2 the last 60 s run from
// 10:00:15 to 10:01:15: 45 s of the previous minute overlap it, so the previous count is weighted by 45/60 and the
// first 15 s are dropped · 3 the estimate: 80 × 45/60 + 30 = 60 + 30 = 90 of 100, so 10 more requests fit and the
// 11th gets a 429.
// Working (computed below): elapsed = 15 s; weight = (60 − 15) ÷ 60 = 0.75; weighted = 80 × 0.75 = 60;
// estimate = 60 + 30 = 90; room = 100 − 90 = 10.
// Layout: a time axis at 6 px a second from x 60 (10:00) to 780 (10:02). Row 1 (y 70): the two fixed windows.
// Row 2 (y 170): the split of the last 60 s. Row 3 (y 270): the sum and the decision. A neutral dashed line marks "now".
// Colours (PATTERN_TONE): fixed windows neutral, the weighted overlap green (the pattern's part), the current count
// blue (data), the decision lime (a check).

const LIMIT = 100;
const WINDOW_S = 60;
const PREV = 80;
const CUR = 30;
const ELAPSED = 15;
const weight = (WINDOW_S - ELAPSED) / WINDOW_S; // 0.75
const weighted = PREV * weight; // 60
const estimate = weighted + CUR; // 90
const room = LIMIT - estimate; // 10

const PX = 6;
const X0 = 60;
const x = (s: number) => X0 + s * PX; // s = seconds after 10:00
const H = 52;
const R1 = 70;
const R2 = 170;
const R3 = 270;

const shapes: LayoutShape[] = [
  {
    id: "prev",
    type: "box",
    x: x(0),
    y: R1,
    w: WINDOW_S * PX,
    h: H,
    label: `10:00 to 10:01: ${PREV} requests`,
    sub: "previous window, counter 1",
    tone: PATTERN_TONE.infra,
    fill: "pastel",
  },
  {
    id: "cur",
    type: "box",
    x: x(WINDOW_S),
    y: R1,
    w: WINDOW_S * PX,
    h: H,
    label: `10:01 to 10:02: ${CUR} so far`,
    sub: "current window, counter 2",
    tone: PATTERN_TONE.infra,
    fill: "pastel",
  },
  {
    id: "now",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [x(WINDOW_S + ELAPSED), R1 - 22],
      [x(WINDOW_S + ELAPSED), R2 + H + 8],
    ],
    dashed: true,
    tone: PATTERN_TONE.infra,
    step: 2,
  },
  {
    id: "now-label",
    type: "text",
    x: x(WINDOW_S + ELAPSED) - 70,
    y: R1 - 46,
    w: 140,
    h: 20,
    label: "now: 10:01:15",
    tone: PATTERN_TONE.infra,
    step: 2,
  },
  {
    id: "dropped",
    type: "cell",
    x: x(0),
    y: R2,
    w: ELAPSED * PX,
    h: H,
    label: `${ELAPSED} s`,
    sub: "dropped",
    tone: PATTERN_TONE.infra,
    step: 2,
  },
  {
    id: "overlap",
    type: "cell",
    x: x(ELAPSED),
    y: R2,
    w: (WINDOW_S - ELAPSED) * PX,
    h: H,
    label: `${WINDOW_S - ELAPSED} s overlap: ${PREV} × ${WINDOW_S - ELAPSED}/${WINDOW_S} = ${weighted}`,
    sub: "previous count, weighted",
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    step: 2,
    highlight: true,
  },
  {
    id: "current",
    type: "cell",
    x: x(WINDOW_S),
    y: R2,
    w: ELAPSED * PX,
    h: H,
    label: `${CUR}`,
    sub: "current",
    tone: PATTERN_TONE.data,
    fill: "pastel",
    step: 2,
  },
  {
    id: "last60",
    type: "text",
    x: x(ELAPSED),
    y: R2 + H + 10,
    w: WINDOW_S * PX,
    h: 20,
    label: "the last 60 s: 10:00:15 to 10:01:15",
    tone: PATTERN_TONE.infra,
    step: 2,
  },
  {
    id: "sum",
    type: "box",
    x: x(ELAPSED),
    y: R3 + 20,
    w: 260,
    h: H,
    label: `${weighted} + ${CUR} = ${estimate}`,
    sub: `estimate of the last ${WINDOW_S} s`,
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    step: 3,
  },
  {
    id: "decide",
    type: "box",
    x: x(ELAPSED) + 360,
    y: R3 + 20,
    w: 300,
    h: H,
    label: `${estimate} of ${LIMIT}: ${room} more fit`,
    sub: `request ${room + 1} gets 429`,
    tone: PATTERN_TONE.check,
    fill: "pastel",
    step: 3,
  },
  { id: "a-sum", type: "arrow", x: 0, y: 0, from: "sum", to: "decide", step: 3 },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The sliding window counter's estimate",
  width: x(2 * WINDOW_S) + 60,
  height: R3 + 20 + H + 30,
  shapes,
  steps: [{ title: "Two counters per key" }, { title: "Weight the previous minute" }, { title: "Estimate and decide" }],
};

export default spec;
