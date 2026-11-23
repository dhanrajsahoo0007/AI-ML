import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Arrivals against GPU capacity at the peak minute (chatgpt, Step 4, Step 5 and Deep dive 2).
// Three steps: 1 arrivals (paid and free) against what the fleet can start · 2 one first-come queue: the excess piles
// up and everyone, paid included, waits longer for the first token · 3 priority lanes: paid goes first, free fills
// the rest of the large fleet, and the excess goes to a smaller model instead of the queue.
// Working (round numbers chosen to size the system):
//   peak arrivals 35,000 prompts/s; paid 30 % = 10,500/s, free 70 % = 24,500/s
//   one answer = 500 tokens at 50 tokens/s = 10 s on a slot; a replica runs 64 streams at once
//   fleet: 5,000 replicas × 64 slots = 320,000 slots ÷ 10 s = 32,000 prompts/s can start
//   excess: 35,000 − 32,000 = 3,000/s; in a first-come queue, after 60 s: 3,000 × 60 = 180,000 waiting, and
//   180,000 ÷ 32,000/s ≈ 5.6 s more before every first token
//   priority: paid 10,500/s first; free on the large model 32,000 − 10,500 = 21,500/s; overflow 3,000/s to a small
//   model with 4 × the streams per replica (256): 3,000 × 10 s ÷ 256 ≈ 118 replicas
// Layout: bars drawn to one scale, 1,000 prompts/s = 20 px, from x 150; a dashed line at the capacity, x 150 + 640 =
// 790. Rows at y 70 (arrivals), 140 (fleet), 230 (first come, with its working under it), 330 (priority, with its
// working). Colours (PATTERN_TONE): paid blue (data), free orange (traffic), the fleet teal (compute), the overflow
// lane green (the design's own part), the queue's excess red.

const X0 = 150;
const S = 20 / 1000; // px per prompt/s
const w = (rate: number) => rate * S;
const PAID = 10_500;
const FREE = 24_500;
const CAP = 32_000;
const EXCESS = PAID + FREE - CAP; // 3,000
const H = 40;

const shapes: LayoutShape[] = [];
const rowLabel = (id: string, y: number, label: string, step: number) =>
  shapes.push({ id, type: "text", x: 10, y, w: 130, h: H, label, tone: PATTERN_TONE.infra, step });

rowLabel("l-arr", 70, "Arrivals", 1);
shapes.push({
  id: "paid",
  type: "box",
  x: X0,
  y: 70,
  w: w(PAID),
  h: H,
  label: "paid 10,500/s",
  tone: PATTERN_TONE.data,
  fill: "pastel",
});
shapes.push({
  id: "free",
  type: "box",
  x: X0 + w(PAID),
  y: 70,
  w: w(FREE),
  h: H,
  label: "free 24,500/s",
  tone: PATTERN_TONE.traffic,
  fill: "pastel",
});

rowLabel("l-fleet", 140, "Large fleet", 1);
shapes.push({
  id: "fleet",
  type: "box",
  x: X0,
  y: 140,
  w: w(CAP),
  h: H,
  label: "5,000 replicas × 64 slots ÷ 10 s = 32,000/s",
  tone: PATTERN_TONE.compute,
  fill: "pastel",
});
shapes.push({
  id: "cap-line",
  type: "path",
  x: 0,
  y: 0,
  points: [
    [X0 + w(CAP), 52],
    [X0 + w(CAP), 380],
  ],
  dashed: true,
  tone: PATTERN_TONE.infra,
});
shapes.push({
  id: "cap-text",
  type: "text",
  x: X0 + w(CAP) - 90,
  y: 28,
  w: 180,
  h: 20,
  label: "capacity 32,000/s",
  tone: PATTERN_TONE.infra,
});

rowLabel("l-fifo", 230, "First come", 2);
shapes.push({
  id: "fifo-served",
  type: "box",
  x: X0,
  y: 230,
  w: w(CAP),
  h: H,
  label: "served in arrival order: 32,000/s",
  tone: PATTERN_TONE.compute,
  fill: "pastel",
  step: 2,
});
shapes.push({
  id: "fifo-excess",
  type: "box",
  x: X0 + w(CAP),
  y: 230,
  w: w(EXCESS),
  h: H,
  label: "+3,000/s",
  tone: PATTERN_TONE.fail,
  fill: "pastel",
  step: 2,
  highlight: true,
});
shapes.push({
  id: "fifo-math",
  type: "text",
  x: X0,
  y: 274,
  w: w(CAP + EXCESS),
  h: 20,
  label: "after 60 s: 180,000 waiting = 5.6 s more before every first token, paid included",
  tone: PATTERN_TONE.fail,
  step: 2,
});

rowLabel("l-prio", 330, "Priority", 3);
shapes.push({
  id: "prio-paid",
  type: "box",
  x: X0,
  y: 330,
  w: w(PAID),
  h: H,
  label: "paid first",
  sub: "10,500/s, no wait",
  tone: PATTERN_TONE.data,
  fill: "pastel",
  step: 3,
});
shapes.push({
  id: "prio-free",
  type: "box",
  x: X0 + w(PAID),
  y: 330,
  w: w(CAP - PAID),
  h: H,
  label: "free on the large model",
  sub: "21,500/s",
  tone: PATTERN_TONE.traffic,
  fill: "pastel",
  step: 3,
});
shapes.push({
  id: "prio-small",
  type: "box",
  x: X0 + w(CAP),
  y: 330,
  w: w(EXCESS),
  h: H,
  label: "small",
  tone: PATTERN_TONE.pattern,
  fill: "pastel",
  step: 3,
  highlight: true,
});
shapes.push({
  id: "prio-math",
  type: "text",
  x: X0,
  y: 374,
  w: w(CAP + EXCESS),
  h: 20,
  label: "overflow 3,000/s on a small model: 3,000 × 10 s ÷ 256 streams per replica ≈ 118 replicas",
  tone: PATTERN_TONE.pattern,
  step: 3,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Arrivals against GPU capacity at the peak",
  width: X0 + w(CAP + EXCESS) + 30,
  height: 410,
  shapes,
  steps: [
    { title: "Arrivals against what the fleet can start" },
    { title: "One first-come queue: everyone waits" },
    { title: "Priority lanes and an overflow model" },
  ],
};

export default spec;
