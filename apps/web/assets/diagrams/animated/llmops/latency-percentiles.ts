import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, curve, n } from "@/components/diagrams/presets/production";
import { DIST } from "@/components/diagrams/presets/production-observe";

// Why the mean hides the tail (latency-token-monitoring, Architecture). One computed distribution of Brightpost's
// end-to-end latency: log-normal, median 1,500 ms (the shared full-answer target) and spread sigma 0.5 (illustrative);
// presets/production-observe.ts DIST has the working:
//   p50 1,500 ms, mean 1,700 ms, p95 3,414 ms, p99 4,800 ms.
//   Of 200,000 requests a day, 5 % = 10,000 are slower than p95 and 1 % = 2,000 slower than p99.
// The curve is the density in percent of requests per 100 ms, from 100 to 6,000 ms (x 100 ms steps).
// Layout (880 x 372): the plot at (10, 6), 600 x 360; four boxes in a column at x 640 (w 230, h 58) from y 20, pitch 80.
// Colours (PROD_TONE): the curve blue (data); p50 and mean neutral; p95 and p99 red (the tail, where users give up).

const xs: number[] = [];
for (let x = 100; x <= 6_000; x += 100) xs.push(x);
const points: [number, number][] = xs.map((x) => [x, DIST.pdf(x) * 1e4]);
const at = (x: number) => DIST.pdf(x) * 1e4;

const box = (id: string, y: number, label: string, sub: string, tone: LayoutShape["tone"]): LayoutShape => ({
  id,
  type: "box",
  x: 640,
  y,
  w: 230,
  h: 58,
  label,
  sub,
  tone,
  fill: "pastel",
});

const shapes: LayoutShape[] = [
  ...curve("lp", 10, 6, {
    width: 610,
    height: 360,
    xDomain: [0, 6_000],
    yDomain: [0, 7],
    xTicks: [0, 1_000, 2_000, 3_000, 4_000, 5_000, 6_000],
    yTicks: [0, 2, 4, 6],
    formatY: (v) => `${v} %`,
    xLabel: "end-to-end latency (ms)",
    yLabel: "share of requests per 100 ms (computed, spread illustrative)",
    series: [{ points, tone: PROD_TONE.data, smooth: true }],
    marks: [
      { x: DIST.p50, y: at(DIST.p50), label: `p50 ${n(DIST.p50)} ms`, place: "right" },
      { x: DIST.mean, y: at(DIST.mean), label: `mean ${n(DIST.mean)} ms`, place: "right" },
      { x: DIST.p95, y: at(DIST.p95), label: `p95 ${n(DIST.p95)} ms`, tone: PROD_TONE.failure, place: "above-right" },
      { x: DIST.p99, y: at(DIST.p99), label: `p99 ${n(DIST.p99)} ms`, tone: PROD_TONE.failure, place: "above-right" },
    ],
  }),
  box("b-p50", 20, `Median: ${n(DIST.p50)} ms`, "half of requests are faster", PROD_TONE.infra),
  box("b-mean", 100, `Mean: ${n(DIST.mean)} ms`, "only 200 ms above the median", PROD_TONE.infra),
  box("b-p95", 180, `p95: ${n(DIST.p95)} ms`, `${n(DIST.slowerThanP95)} requests a day are slower`, PROD_TONE.failure),
  box("b-p99", 260, `p99: ${n(DIST.p99)} ms`, `${n(DIST.slowerThanP99)} requests a day are slower`, PROD_TONE.failure),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The mean is 1,700 ms and looks healthy; the p99 is 4,800 ms",
  width: 880,
  height: 378,
  shapes,
};

export default spec;
