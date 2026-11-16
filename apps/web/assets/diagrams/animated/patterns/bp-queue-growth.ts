import type { LayoutSpec } from "@/components/diagrams/types";
import { curve } from "@/components/diagrams/presets/production";
import { PATTERN_TONE, SHOP, n } from "@/components/diagrams/presets/patterns";

// Arrivals above the service rate: the queue and the wait grow without end (back-pressure, first figure).
// Working (computed below): 300 orders/s arrive (sale-day peak, presets/patterns.ts), the order service finishes 250/s
// (illustrative). An unbounded queue grows by 50/s: 3,000 after 1 minute, 30,000 after 10 minutes. A new arrival
// waits queue ÷ 250: 12 s after 1 minute, 120 s after 10 minutes. Checkout gives up after 10 s (illustrative), which
// the queue reaches at 2,500 orders, 50 s in; from then on every order served is one its shopper has abandoned.
// A bounded queue capped at 2,500 (10 s of work) stays flat and rejects the 50/s surplus at once.
// Layout: one curve, queue length against minutes. Colours (PATTERN_TONE): the unbounded queue red (failure), the
// bounded queue green (the pattern).

const IN = SHOP.peakOrdersPerSecond; // 300
const OUT = 250;
const GROW = IN - OUT; // 50 per second
const CAP = 2_500; // 10 s × 250
const unbounded: [number, number][] = Array.from({ length: 11 }, (_, m) => [m, GROW * 60 * m]);
const capAt = CAP / GROW / 60; // 0.83 min
const bounded: [number, number][] = [
  [0, 0],
  [capAt, CAP],
  [10, CAP],
];
const wait = (q: number) => q / OUT;

const spec: LayoutSpec = {
  kind: "layout",
  title: "300 orders/s into a service that finishes 250/s",
  width: 720,
  height: 360,
  shapes: curve("q", 10, 10, {
    width: 700,
    height: 340,
    xDomain: [0, 10],
    yDomain: [0, 32_000],
    xTicks: [0, 2, 4, 6, 8, 10],
    yTicks: [0, 10_000, 20_000, 30_000],
    xLabel: "minutes after 12:00",
    yLabel: "orders waiting",
    series: [
      { points: unbounded, tone: PATTERN_TONE.fail, label: "unbounded queue: +50 a second" },
      { points: bounded, tone: PATTERN_TONE.pattern, label: "bounded at 2,500: the rest rejected" },
    ],
    marks: [
      {
        x: 1,
        y: GROW * 60,
        label: `${n(GROW * 60)} waiting: ${wait(GROW * 60)} s`,
        tone: PATTERN_TONE.fail,
        place: "above-left",
      },
      {
        x: 10,
        y: GROW * 600,
        label: `${n(GROW * 600)} waiting: ${wait(GROW * 600)} s`,
        tone: PATTERN_TONE.fail,
        place: "below-left",
      },
    ],
  }),
};

export default spec;
