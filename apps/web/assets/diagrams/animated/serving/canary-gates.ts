import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { LATENCY, PROD_TONE, gate, gateSize, n } from "@/components/diagrams/presets/production";
import {
  CANARY,
  HOURLY_REQUESTS,
  QUALITY,
  halfWidth,
  pct,
  stageRequests,
} from "@/components/diagrams/presets/production-release";

// A canary release of Brightpost's candidate bundle 42 against the live bundle 41 (rollback-blue-green-deployment,
// Architecture figure). Traffic goes 1 % -> 10 % -> 50 % -> 100 %, one hour per stage. At each stage two checks run:
// a quality check (a judge grades a sample of the candidate's answers; pass rate must stay at or above the 85 % floor,
// which is the baseline 90 % minus 5 points) and a latency check (p95 time to first token under 400 ms).
// The candidate keeps the latency check green all the way and fails the quality check at 50 %.
//
// Working (all from presets/production-release.ts; sample sizes, passes and latencies are illustrative):
//   Requests an hour = 2.3 x 3,600 = 8,280. Stage requests: 1 % = 83, 10 % = 828, 50 % = 4,140.
//   Graded: 46 of 50 = 92 % (+-7.5 points), 178 of 200 = 89 % (+-4.3), 405 of 500 = 81 % (+-3.4).
//   Interval = 1.96 x sqrt(p (1 - p) / n). At 10 % the interval 84.7 to 93.3 still contains the 85 % floor; at 50 % the
//   top of the interval is 84.4 %, below the floor, so the check blocks with confidence.
//
// Steps: 1 the 1 % stage passes · 2 the 10 % stage passes · 3 the 50 % stage fails on quality · 4 roll back.
// Layout (880 x 520): three gates at x 30, y 56 / 190 / 324 (gate() lays out change, two checks, result; 100 tall,
// about 535 wide); a two-line note beside each at x 590; step 4 adds the rollback box and a "not reached" box at y 452.
// Colour: change neutral, checks lime (red where one fails), results green or red; notes neutral. Red only on the
// 50 % quality check and its block result.

const X = 30;
const NOTE_X = 585;
const GATE_Y = [56, 190, 324] as const;
const ms = LATENCY.firstTokenMs;

const text = (id: string, x: number, y: number, w: number, h: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: PROD_TONE.infra,
  step,
  quiet: true,
});

const nextShare = ["10 %", "50 %"];
const shares = CANARY.map((c) => `${Math.round(c.share * 100)} %`);
const shapes: LayoutShape[] = [
  text(
    "head",
    X,
    8,
    820,
    36,
    `One hour per stage at ${n(HOURLY_REQUESTS)} requests an hour; a judge grades a sample of the candidate's answers.\nFloor ${pct(QUALITY.floor)} = baseline ${pct(QUALITY.baseline)} minus 5 points. Sample sizes and results are illustrative.`,
    1
  ),
];

CANARY.forEach((c, i) => {
  const step = i + 1;
  const qualityOk = c.pass / c.graded >= QUALITY.floor;
  const hw = halfWidth(c.pass, c.graded);
  const rate = c.pass / c.graded;
  const lo = (rate - hw) * 100;
  const hi = (rate + hw) * 100;
  const fail = !qualityOk;
  const opts = {
    step,
    change: { label: `Candidate ${shares[i]}`, sub: `${n(stageRequests(c.share))} requests` },
    checks: [
      { label: `Quality ${pct(rate)}`, pass: qualityOk, sub: `${c.pass} of ${c.graded} · floor ${pct(QUALITY.floor)}` },
      { label: `p95 first token ${c.p95Ms} ms`, pass: c.p95Ms < ms, sub: `target ${ms} ms` },
    ],
    result: fail ? ("block" as const) : ("promote" as const),
    resultLabel: fail ? "Roll back" : `Go to ${nextShare[i]}`,
    resultSub: fail ? "to 0 %" : undefined,
  };
  const { height } = gateSize(opts);
  shapes.push(...gate(`s${step}`, X, GATE_Y[i], opts));
  const range = `${c.graded} graded: ±${(hw * 100).toFixed(1)} points, range ${lo.toFixed(1)}–${hi.toFixed(1)} %`;
  const note = fail
    ? `${range}\nall under the ${pct(QUALITY.floor)} floor: block`
    : `${range}\nincludes the floor: a drop is not ruled out`;
  shapes.push(text(`note-${step}`, NOTE_X, GATE_Y[i] + height / 2 - 20, 290, 40, note, step));
});

shapes.push(
  {
    id: "rollback",
    type: "box",
    x: 380,
    y: 452,
    w: 330,
    h: 50,
    label: "Weight 50 % back to 0 %",
    sub: "bundle 41 never stopped serving",
    tone: PROD_TONE.infra,
    fill: "pastel",
    step: 4,
  },
  {
    id: "unreached",
    type: "box",
    x: X,
    y: 452,
    w: 200,
    h: 50,
    label: "100 % stage",
    sub: "never reached",
    tone: PROD_TONE.infra,
    fill: "paper",
    step: 4,
  },
  { id: "a-rollback", type: "arrow", x: 0, y: 0, from: "s3-result", to: "rollback", step: 4 },
  text("note-4", 720, 452, 150, 50, "Latency stayed green\nthroughout", 4)
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "A canary with a quality check and a latency check at every stage",
  width: 880,
  height: 520,
  steps: [
    { title: "1 % of traffic: both checks pass" },
    { title: "10 %: pass, but the sample is still small" },
    { title: "50 %: latency is fine, quality is not" },
    { title: "Roll back to the baseline" },
  ],
  shapes,
};

export default spec;
