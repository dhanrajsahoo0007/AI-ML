import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The same two bursts through three algorithms (rate-limiting, the algorithms figure). Limit: 100 requests a minute
// per key. One key sends 100 requests in the second before 1:00 and 100 more in the second after it (illustrative).
// Three steps: 1 fixed window: the counter resets at 1:00, so all 200 pass in 2 s, twice the limit · 2 sliding window
// counter: at 1:01 the previous minute's 100 still count for 59/60, so 1 more fits and 99 are rejected · 3 token bucket
// (capacity 100, refill 100 per 60 s): the first burst empties the bucket, 1 token has refilled by 1:01.
// Working (computed below): sliding estimate = previous × (60 − elapsed) ÷ 60 + current = 100 × 59 ÷ 60 + 0 = 98.3;
// 98.3 + 1 ≤ 100 allows one, a second would make 100.3. Refill = 100 ÷ 60 = 1.67 tokens a second, so one token by
// 1:01 and then one every 0.6 s. State per key: fixed 1 counter; sliding 2 counters; bucket 2 numbers (tokens and the
// last refill time).
// Layout: a 4 s axis from 0:58 to 1:02, 140 px a second, starting at x 190; one row per algorithm, 110 apart.
// Colours (PATTERN_TONE): allowed requests blue (data), rejected requests lime (the limiter's decision), the
// boundary burst that breaks the limit red (fail), axis and labels neutral.
// Fact check (2026-11-16, Cloudflare "How we built rate limiting capable of scaling to millions of domains"): the
// sliding window counter weights the previous window by its remaining overlap and keeps two numbers per counter.

const LIMIT = 100;
const WINDOW_S = 60;
const T0 = 58;
const SECONDS = 4;
const PX = 140;
const X0 = 190;
const x = (t: number) => X0 + (t - T0) * PX;
const slidingEstimate = Math.round(((LIMIT * (WINDOW_S - 1)) / WINDOW_S) * 10) / 10; // 98.3
const slidingAllowed = Math.floor(LIMIT - slidingEstimate); // 1
const refill = Math.round((LIMIT / WINDOW_S) * 100) / 100; // 1.67 tokens a second
const tokensBy101 = Math.floor(LIMIT / WINDOW_S); // 1
const SPLIT = 45; // width of the "allowed" part of a split burst (not to scale: 1 of 100)

const shapes: LayoutShape[] = [];

for (let t = T0; t <= T0 + SECONDS; t++) {
  const label = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  shapes.push({ id: `tick-${t}`, type: "text", x: x(t) - 25, y: 12, w: 50, h: 16, label, tone: PATTERN_TONE.infra });
}
shapes.push({
  id: "axis",
  type: "path",
  x: 0,
  y: 0,
  points: [
    [x(T0), 36],
    [x(T0 + SECONDS), 36],
  ],
  tone: PATTERN_TONE.infra,
});

interface Row {
  key: string;
  step: number;
  title: string;
  allowedSecond: number;
  note: string;
}

const rows: Row[] = [
  {
    key: "fixed",
    step: 1,
    title: "Fixed window\n1 counter per key",
    allowedSecond: LIMIT,
    note: `The count resets at 1:00: ${LIMIT * 2} allowed in 2 s, twice the limit`,
  },
  {
    key: "sliding",
    step: 2,
    title: "Sliding window counter\n2 counters per key",
    allowedSecond: slidingAllowed,
    note: `At 1:01: ${LIMIT} × 59/60 + 0 = ${slidingEstimate} counted, so ${slidingAllowed} more fits`,
  },
  {
    key: "bucket",
    step: 3,
    title: "Token bucket\n2 numbers per key",
    allowedSecond: tokensBy101,
    note: `Bucket of ${LIMIT} refills ${refill} a second: ${tokensBy101} token by 1:01, then one every 0.6 s`,
  },
];

rows.forEach((row, i) => {
  const y = 56 + i * 110;
  const step = row.step;
  shapes.push({
    id: `${row.key}-title`,
    type: "text",
    x: 6,
    y: y + 2,
    w: 176,
    h: 36,
    label: row.title,
    tone: PATTERN_TONE.infra,
    step,
  });
  // The window boundary at 1:00, drawn only beside this row's bursts so it never crosses the note under them.
  shapes.push({
    id: `${row.key}-boundary`,
    type: "path",
    x: 0,
    y: 0,
    points: [
      [x(60), i === 0 ? 32 : y - 30],
      [x(60), y + 44],
    ],
    dashed: true,
    tone: PATTERN_TONE.infra,
    step,
  });
  shapes.push({
    id: `${row.key}-first`,
    type: "box",
    x: x(59),
    y,
    w: PX,
    h: 40,
    label: `${LIMIT} allowed`,
    tone: PATTERN_TONE.data,
    fill: "pastel",
    step,
  });
  if (row.allowedSecond === LIMIT) {
    shapes.push({
      id: `${row.key}-second`,
      type: "box",
      x: x(60),
      y,
      w: PX,
      h: 40,
      label: `${LIMIT} allowed`,
      tone: PATTERN_TONE.fail,
      fill: "pastel",
      step,
      highlight: true,
    });
  } else {
    shapes.push({
      id: `${row.key}-ok`,
      type: "box",
      x: x(60),
      y,
      w: SPLIT,
      h: 40,
      label: `${row.allowedSecond} ok`,
      tone: PATTERN_TONE.data,
      fill: "pastel",
      step,
    });
    shapes.push({
      id: `${row.key}-no`,
      type: "box",
      x: x(60) + SPLIT,
      y,
      w: PX - SPLIT,
      h: 40,
      label: `${LIMIT - row.allowedSecond} rejected`,
      tone: PATTERN_TONE.check,
      fill: "pastel",
      step,
      highlight: true,
    });
  }
  shapes.push({
    id: `${row.key}-note`,
    type: "text",
    x: X0,
    y: y + 48,
    w: SECONDS * PX,
    h: 18,
    label: row.note,
    tone: row.allowedSecond === LIMIT ? PATTERN_TONE.fail : PATTERN_TONE.infra,
    step,
  });
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Two bursts at a window boundary, three algorithms",
  width: X0 + SECONDS * PX + 30,
  height: 380,
  shapes,
  steps: [
    { title: "Fixed window: 200 pass" },
    { title: "Sliding window counter: 1 more" },
    { title: "Token bucket: 1 token refilled" },
  ],
};

export default spec;
