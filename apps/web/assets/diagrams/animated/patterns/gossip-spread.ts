import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, n } from "@/components/diagrams/presets/patterns";

// A rumour spreading by gossip through 16 nodes (gossip-and-failure-detection, Core concepts, first figure).
// Five steps, one per round: 0 node 0 knows the update (1 informed) · 1 node 0 tells node 8 (2) · 2 nodes 0 and 8
// tell 4 and 12 (4) · 3 each tells a neighbour (8) · 4 each tells the other neighbour (16).
// Working (computed below): the best case, where every informed node reaches one uninformed node a round, doubles the
// informed count each round: 1, 2, 4, 8, 16, so 16 nodes need log2 16 = 4 rounds. 1,000 nodes need
// ceil(log2 1,000) = 10 rounds; at one round a second (illustrative) that is about 10 s. Random peer choice wastes
// some messages on nodes that already know, so real clusters take a few rounds more (SWIM §4.1: dissemination
// latency grows logarithmically with group size).
// Layout (880 × 440): 16 nodes on a ring, centre (215, 225), radius 170, diameter 34; who tells whom is chosen so each
// arrow is a long chord or a neighbour hop and no line cuts a node. The round counter sits on the right from x 450.
// Colours (PATTERN_TONE): nodes teal (compute), a node that knows the update green (the pattern); arrows and labels
// neutral.
// Fact check (2026-11-16, Das, Gupta and Motivala, SWIM, DSN 2002): infection-style dissemination piggybacks updates
// on pings and acks, and its latency grows logarithmically with the number of members.

const N = 16;
const CX = 215;
const CY = 225;
const R = 170;
const D = 34;
const pos = (i: number): [number, number] => {
  const a = -Math.PI / 2 + (2 * Math.PI * i) / N;
  return [Math.round(CX + R * Math.cos(a)), Math.round(CY + R * Math.sin(a))];
};

// Round r (1..4): [from, to] pairs. Every informed node tells exactly one new node.
const ROUNDS: [number, number][][] = [
  [[0, 8]],
  [
    [0, 4],
    [8, 12],
  ],
  [
    [0, 1],
    [4, 5],
    [8, 9],
    [12, 13],
  ],
  [
    [1, 2],
    [0, 15],
    [5, 6],
    [4, 3],
    [9, 10],
    [8, 7],
    [13, 14],
    [12, 11],
  ],
];
const informedAt = new Map<number, number>([[0, 0]]);
ROUNDS.forEach((pairs, r) => pairs.forEach(([, to]) => informedAt.set(to, r + 1)));
const counts = [0, 1, 2, 3, 4].map((r) => [...informedAt.values()].filter((v) => v <= r).length); // 1, 2, 4, 8, 16

const shapes: LayoutShape[] = [];

for (let i = 0; i < N; i++) {
  const [x, y] = pos(i);
  shapes.push({
    id: `node-${i}`,
    type: "circle",
    x,
    y,
    w: D,
    label: String(i),
    tone: PATTERN_TONE.compute,
    fill: "soft",
    quiet: i > 0,
  });
}

ROUNDS.forEach((pairs, r) => {
  pairs.forEach(([from, to], k) => {
    shapes.push({
      id: `arrow-${r + 1}-${k}`,
      type: "arrow",
      x: 0,
      y: 0,
      from: `node-${from}`,
      to: `node-${to}`,
      step: r + 2,
      quiet: true,
    });
  });
});

// Informed nodes: a green circle over the teal one, from the round it hears the update.
for (const [i, r] of informedAt) {
  const [x, y] = pos(i);
  shapes.push({
    id: `informed-${i}`,
    type: "circle",
    x,
    y,
    w: D,
    label: String(i),
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    step: r + 1,
    quiet: !(i === 0 || ROUNDS[r - 1]?.[0]?.[1] === i),
  });
}

// Round counter on the right.
const PX = 450;
const PY = 50;
shapes.push({
  id: "counter-title",
  type: "text",
  x: PX,
  y: PY,
  w: 400,
  h: 20,
  label: "Each informed node tells one more node a round",
  tone: PATTERN_TONE.infra,
});
counts.forEach((c, r) => {
  const y = PY + 40 + r * 48;
  shapes.push(
    {
      id: `round-${r}`,
      type: "text",
      x: PX,
      y,
      w: 90,
      h: 30,
      label: `Round ${r}`,
      tone: PATTERN_TONE.infra,
      step: r + 1,
      quiet: true,
    },
    {
      id: `bar-${r}`,
      type: "cell",
      x: PX + 100,
      y,
      w: Math.max(20, c * 18),
      h: 30,
      label: String(c),
      tone: PATTERN_TONE.pattern,
      fill: "pastel",
      step: r + 1,
      quiet: r > 0,
    }
  );
});
shapes.push(
  {
    id: "sum-16",
    type: "text",
    x: PX,
    y: PY + 290,
    w: 400,
    h: 20,
    label: `16 nodes: log2 16 = 4 rounds`,
    tone: PATTERN_TONE.pattern,
    step: 5,
  },
  {
    id: "sum-1000",
    type: "text",
    x: PX,
    y: PY + 316,
    w: 400,
    h: 20,
    label: `${n(1_000)} nodes: log2 ${n(1_000)} ≈ 10 rounds, about 10 s at 1 a second`,
    tone: PATTERN_TONE.infra,
    step: 5,
    quiet: true,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Gossip doubles the informed nodes every round",
  width: 880,
  height: 440,
  shapes,
  steps: [
    { title: "Round 0: one node knows" },
    { title: "Round 1: 2 know" },
    { title: "Round 2: 4 know" },
    { title: "Round 3: 8 know" },
    { title: "Round 4: all 16 know" },
  ],
};

export default spec;
