import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Four layers between a request and the API services (rate-limiter, Step 8 and Deep dive 3).
// Top to bottom, cheapest and most specific first: 1 a rate limit per key (token bucket, 100/s with a burst of 200
// on the Pro plan) answers 429 · 2 a concurrency limit per key (20 requests in flight) answers 429 · 3 a fleet shedder
// that keeps 20 % of capacity for critical calls answers 503 · 4 a worker shedder that drops test traffic, then
// reads, then writes, answers 503. Layers 1 and 2 protect tenants from each other; layers 3 and 4 protect the fleet
// when every key is within its limit but the sum is not.
// Working: the numbers are this page's plan values (round numbers chosen to size the system): Pro 100/s, burst 200;
// 20 in flight; 20 % reserve, so non-critical traffic may use 80 % of capacity.
// Layout: one column of layer boxes (260 × 64, 96 apart) from y 100, with what each layer stops to the right and the
// answer it returns in a cell at x 660; the request above, the API services below.
// Colours (PATTERN_TONE): the request orange (traffic), per-key limits lime (a check), fleet and worker shedders green
// (the pattern's part), the API services teal (compute), the answers neutral.

const X = 40;
const W = 260;
const H = 64;
const Y0 = 100;
const GAP = 96;
const y = (i: number) => Y0 + i * GAP;

const layers = [
  {
    id: "rate",
    label: "1. Rate limit per key",
    sub: "token bucket: 100/s, burst 200",
    stops: "one key sending too many requests",
    answer: "429",
    tone: PATTERN_TONE.check,
  },
  {
    id: "conc",
    label: "2. Concurrency per key",
    sub: "at most 20 in flight",
    stops: "one key sending slow, heavy requests",
    answer: "429",
    tone: PATTERN_TONE.check,
  },
  {
    id: "fleet",
    label: "3. Fleet shedder",
    sub: "keeps 20% for critical calls",
    stops: "all keys together above capacity",
    answer: "503",
    tone: PATTERN_TONE.pattern,
  },
  {
    id: "worker",
    label: "4. Worker shedder",
    sub: "test, then reads, then writes",
    stops: "one worker pool saturated",
    answer: "503",
    tone: PATTERN_TONE.pattern,
  },
];

const shapes: LayoutShape[] = [
  {
    id: "req",
    type: "box",
    x: X,
    y: 20,
    w: W,
    h: 44,
    label: "Request, key k42",
    tone: PATTERN_TONE.traffic,
    fill: "pastel",
  },
];
layers.forEach((l, i) => {
  shapes.push({
    id: l.id,
    type: "box",
    x: X,
    y: y(i),
    w: W,
    h: H,
    label: l.label,
    sub: l.sub,
    tone: l.tone,
    fill: "pastel",
  });
  shapes.push({
    id: `${l.id}-stops`,
    type: "text",
    x: X + W + 30,
    y: y(i) + 10,
    w: 300,
    h: H - 20,
    label: `stops ${l.stops}`,
    tone: PATTERN_TONE.infra,
  });
  shapes.push({
    id: `${l.id}-ans`,
    type: "cell",
    x: 660,
    y: y(i),
    w: 110,
    h: H,
    label: l.answer,
    sub: l.answer === "429" ? "Retry-After" : "overloaded",
    tone: PATTERN_TONE.infra,
  });
});
shapes.push({
  id: "api",
  type: "box",
  x: X,
  y: y(layers.length),
  w: W,
  h: 52,
  label: "API services",
  tone: PATTERN_TONE.compute,
  fill: "pastel",
});
const chain = ["req", ...layers.map((l) => l.id), "api"];
for (let i = 0; i < chain.length - 1; i++) {
  shapes.push({ id: `a${i}`, type: "arrow", x: 0, y: 0, from: chain[i], to: chain[i + 1], packet: i === 0 });
}

const spec: LayoutSpec = {
  kind: "layout",
  title: "Four layers between a request and the API",
  width: 800,
  height: y(layers.length) + 52 + 24,
  shapes,
};

export default spec;
