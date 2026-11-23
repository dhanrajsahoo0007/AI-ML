import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { meter, meterSize } from "@/components/diagrams/presets/production";
import { PATTERN_TONE, SHOP, n } from "@/components/diagrams/presets/patterns";

// One noisy caller drains a shared thread pool, then a bulkhead per caller caps it (bulkheads-and-cell-architecture,
// first figure).
// Two steps: 1 one pool of 200 threads serves checkout, product pages and a partner price feed; the feed bursts and
// alone needs the whole pool, so checkout has no thread to run on · 2 the same 200 threads split into three bulkheads
// (checkout 100, product pages 80, partner feed 20): the feed overflows its own 20 and is rejected fast; the other
// two keep spare threads.
// Working (Little's law: threads busy = arrivals per second × seconds each request holds a thread):
//   checkout   300 orders/s (SHOP.peakOrdersPerSecond) × 0.2 s = 60 threads (0.2 s illustrative)
//   pages      2,300 reads/s (SHOP.peakReadsPerSecond) × 0.02 s = 46 threads (0.02 s illustrative)
//   feed       400 updates/s × 0.5 s = 200 threads (the burst and 0.5 s are illustrative)
//   demand 60 + 46 + 200 = 306 threads against a pool of 200 (illustrative): 106 threads short.
//   Bulkheads: the feed's 20 threads serve 20 ÷ 0.5 s = 40 updates/s; the other 360/s get an immediate 429.
// Layout: four meters (presets/production.ts `meter`), each scaled to its own pool (or demand, when larger).
// Colours (PATTERN_TONE): the partner feed orange (the noisy traffic), other callers neutral, bulkhead pools green
// (the pattern), anything past a limit red (drawn by the meter).

const POOL = 200;
const checkout = SHOP.peakOrdersPerSecond * 0.2; // 60
const pages = Math.round(SHOP.peakReadsPerSecond * 0.02); // 46
const FEED_RATE = 400;
const FEED_HOLD = 0.5;
const feed = FEED_RATE * FEED_HOLD; // 200
const demand = checkout + pages + feed; // 306
const bulk = { checkout: 100, pages: 80, feed: 20 };
const feedServed = bulk.feed / FEED_HOLD; // 40 per second
const feedRejected = FEED_RATE - feedServed; // 360 per second

const X = 50;
const W = 620;
const size = meterSize({ width: W });
const ROW = size.height + 12;

const shapes: LayoutShape[] = [
  ...meter("shared", X, 20, {
    label: `One shared pool: ${POOL} threads`,
    used: demand,
    limit: POOL,
    unit: "threads",
    width: W,
    segments: [
      { value: feed, tone: PATTERN_TONE.traffic, label: `partner feed ${feed}` },
      { value: checkout, tone: PATTERN_TONE.infra, label: `checkout ${checkout}` },
      { value: pages, tone: PATTERN_TONE.infra, label: `pages ${pages}` },
    ],
    limitLabel: `pool (${POOL})`,
  }),
  {
    id: "shared-note",
    type: "text",
    x: X,
    y: 20 + size.height + 4,
    w: W,
    h: 18,
    label: `The feed alone fills the pool: checkout’s ${checkout} and pages’ ${pages} threads have nowhere to run`,
    tone: PATTERN_TONE.fail,
  },
  {
    id: "bulk-title",
    type: "text",
    x: X,
    y: 150,
    w: W,
    h: 18,
    label: `The same ${POOL} threads as three bulkheads`,
    tone: PATTERN_TONE.pattern,
    step: 2,
  },
  ...meter("b-checkout", X, 176, {
    label: `Checkout pool: ${bulk.checkout} threads`,
    used: checkout,
    limit: bulk.checkout,
    unit: "threads",
    width: W,
    tone: PATTERN_TONE.pattern,
    limitLabel: `${bulk.checkout}`,
    step: 2,
  }),
  ...meter("b-pages", X, 176 + ROW, {
    label: `Product pages pool: ${bulk.pages} threads`,
    used: pages,
    limit: bulk.pages,
    unit: "threads",
    width: W,
    tone: PATTERN_TONE.pattern,
    limitLabel: `${bulk.pages}`,
    step: 2,
  }),
  ...meter("b-feed", X, 176 + 2 * ROW, {
    label: `Partner feed pool: ${bulk.feed} threads`,
    used: feed,
    limit: bulk.feed,
    unit: "threads",
    width: W,
    segments: [{ value: feed, tone: PATTERN_TONE.traffic }],
    limitLabel: `${bulk.feed}`,
    step: 2,
  }),
  {
    id: "bulk-note",
    type: "text",
    x: X,
    y: 176 + 3 * ROW,
    w: W,
    h: 18,
    label: `Feed: ${feedServed} updates/s served, ${n(feedRejected)}/s rejected at once with 429; checkout untouched`,
    tone: PATTERN_TONE.infra,
    step: 2,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "One noisy caller drains a shared pool; bulkheads cap it",
  width: X * 2 + W,
  height: 176 + 3 * ROW + 34,
  shapes,
  steps: [{ title: "One shared pool" }, { title: "A bulkhead per caller" }],
};

export default spec;
