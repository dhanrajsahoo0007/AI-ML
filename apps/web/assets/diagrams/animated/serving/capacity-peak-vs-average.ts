import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, TRAFFIC } from "@/components/diagrams/presets/production";
import { MONTH, GPU, usd0 } from "@/components/diagrams/presets/production-capacity";

// Average against peak, and what each one sizes (capacity-planning-and-cost-estimation, "Peak load, headroom and
// queues"). Three steps:
//   1 two bars to scale: 2.3 requests/s on average (200,000 ÷ 86,400), 12 at the peak (about 5 ×); 40 px per request/s
//   2 what each sizes: the average sets a pay-per-token bill (200,000 × 30 × $0.0069 = $41,400 a month at the
//     illustrative mid-size price); the peak sets the fleet (3 replicas × 720 h × $3 = $6,480 a month, paid all month)
//   3 the cost of that shape: the fleet carries 2.3 ÷ 12 = 19 % of its peak rate on average, so 81 % is idle capacity
//     you still pay for (the same 19 % as on batch-vs-realtime-inference)
// Prices and the GPU-hour rate are illustrative. Constants from presets/production-capacity.ts.
//
// Grid (880 wide): bars from x 230, y 40 and 100, h 40; 40 px per request/s (2.3 → 92, 12 → 480); size boxes y 190.
// Colours (PROD_TONE): traffic orange, the API bill green, the fleet teal; one highlight (the peak).

const PX = 40;
const BAR_X = 230;
const wAvg = TRAFFIC.averagePerSecond * PX; // 92
const wPeak = TRAFFIC.peakPerSecond * PX; // 480
const idle = Math.round((1 - TRAFFIC.averagePerSecond / TRAFFIC.peakPerSecond) * 100); // 81

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutShape["tone"] = PROD_TONE.infra
): LayoutShape => ({ id, type: "text", x, y, w, h: 18 * label.split("\n").length, label, tone, step, quiet: true });

const shapes: LayoutShape[] = [
  text("name-avg", 20, 42, 112, `Average\n${TRAFFIC.averagePerSecond} requests/s`, 1),
  text("name-peak", 20, 110, 112, "Peak, busy hour", 1),
  { id: "bar-avg", type: "cell", x: BAR_X, y: 40, w: wAvg, h: 40, tone: PROD_TONE.traffic, fill: "pastel", step: 1 },
  {
    id: "bar-peak",
    type: "cell",
    x: BAR_X,
    y: 100,
    w: wPeak,
    h: 40,
    label: `${TRAFFIC.peakPerSecond} requests/s, about ${TRAFFIC.peakFactor} × the average`,
    tone: PROD_TONE.traffic,
    fill: "pastel",
    step: 1,
    highlight: true,
  },

  // Step 2: what each sizes.
  {
    id: "api",
    type: "box",
    x: 10,
    y: 190,
    w: 280,
    h: 56,
    label: "The average sets the API bill",
    sub: "you pay per token used, hour by hour",
    tone: PROD_TONE.model,
    fill: "pastel",
    step: 2,
  },
  {
    id: "fleet",
    type: "box",
    x: 460,
    y: 190,
    w: 380,
    h: 56,
    label: "The peak sets the fleet",
    sub: "replicas are paid for every hour of the month",
    tone: PROD_TONE.compute,
    fill: "pastel",
    step: 2,
  },
  { id: "a>api", type: "arrow", x: 0, y: 0, from: "bar-avg", to: "api", via: [[150, 60]], step: 2, quiet: true },
  { id: "p>fleet", type: "arrow", x: 0, y: 0, from: "bar-peak", to: "fleet", step: 2, quiet: true },
  text(
    "api-work",
    12,
    254,
    300,
    `${TRAFFIC.requestsPerDay.toLocaleString("en-GB")} × 30 × $0.0069 = ${usd0(MONTH.apiMid)} a month\n(mid-size model, illustrative price)`,
    2
  ),
  text(
    "fleet-work",
    462,
    254,
    380,
    `${MONTH.fleetReplicas} replicas × ${GPU.hoursPerMonth} h × $${GPU.perHour} = ${usd0(MONTH.fleet)} a month\n(illustrative GPU-hour rate)`,
    2
  ),

  // Step 3: the shape of the waste.
  {
    id: "headroom",
    type: "cell",
    x: BAR_X + wAvg,
    y: 40,
    w: wPeak - wAvg,
    h: 40,
    label: `fleet capacity unused on average: ${idle} %`,
    tone: PROD_TONE.compute,
    fill: "soft",
    step: 3,
    highlight: true,
  },
  text(
    "headroom-work",
    BAR_X,
    308,
    620,
    `On average the fleet carries ${TRAFFIC.averagePerSecond} ÷ ${TRAFFIC.peakPerSecond} = ${100 - idle} % of the rate it is built for.\nThe API bill falls with the traffic; the fleet's bill does not.`,
    3
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Average against peak: what each one sizes",
  width: 880,
  height: 356,
  steps: [
    { title: "The peak is five times the average" },
    { title: "The average sets one bill, the peak the other" },
    { title: "A fleet sized for the peak is idle most of the day" },
  ],
  shapes,
};

export default spec;
