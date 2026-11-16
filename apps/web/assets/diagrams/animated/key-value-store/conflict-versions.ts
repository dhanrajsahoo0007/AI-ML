import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Two concurrent writes to one key, and three ways to resolve them (key-value-store, Step 5 and Deep dive 2).
// Four steps: 1 a cart holds [book] at version A:1; write X adds pen through node A (version A:2) while write Y adds
// lamp through node B (version A:1, B:1); neither version saw the other, so they are concurrent · 2 last write wins:
// the later timestamp, Y, is kept and the pen is lost without an error (red) · 3 version vectors: the store keeps
// both as siblings and the application merges them into [book, pen, lamp], written back as A:2, B:1 · 4 one leader
// per key range: the leader orders the writes; Y is a conditional put on A:1, which fails because X already made A:2, so
// the client re-reads and retries with [book, pen, lamp].
// Working: X's vector (A:2, B:0) is not ≥ Y's (A:1, B:1) in B, and Y's is not ≥ X's in A, so they are concurrent;
// the merge's vector is the element-wise maximum (A:2, B:1), which descends from both.
// Layout (880 × 400): the starting value centred at y 20; the two writes at y 130 (x 120 and 540, 220 wide); the
// three resolutions at y 270 (x 15, 310, 605, 260 wide) inside a group; one cost line under each.
// Colours (PATTERN_TONE): values blue (data), the lost write red, the merge green (the pattern's own part), the
// leader's check lime; text neutral.

const W = 260;
const RES_X = [15, 310, 605];
const RES_Y = 270;

const shapes: LayoutShape[] = [
  {
    id: "start",
    type: "box",
    x: 330,
    y: 20,
    w: 220,
    h: 56,
    label: "Cart: [book]",
    sub: "version A:1",
    tone: PATTERN_TONE.data,
    fill: "pastel",
  },
  {
    id: "x",
    type: "box",
    x: 100,
    y: 130,
    w: 240,
    h: 56,
    label: "X: add pen, via node A",
    sub: "[book, pen] · A:2",
    tone: PATTERN_TONE.data,
    fill: "pastel",
  },
  {
    id: "y",
    type: "box",
    x: 540,
    y: 130,
    w: 240,
    h: 56,
    label: "Y: add lamp, via node B",
    sub: "[book, lamp] · A:1, B:1",
    tone: PATTERN_TONE.data,
    fill: "pastel",
  },
  { id: "sx", type: "arrow", x: 0, y: 0, from: "start", to: "x" },
  { id: "sy", type: "arrow", x: 0, y: 0, from: "start", to: "y" },
  {
    id: "conc",
    type: "text",
    x: 345,
    y: 138,
    w: 190,
    h: 40,
    label: "concurrent:\nneither saw the other",
    tone: PATTERN_TONE.infra,
  },
];

const res = [
  {
    id: "lww",
    label: "Last write wins",
    sub: "keeps [book, lamp]; pen is lost",
    tone: PATTERN_TONE.fail,
    cost: "Costs: a silent lost write; clock skew",
  },
  {
    id: "vv",
    label: "Version vectors",
    sub: "app merges: [book, pen, lamp]",
    tone: PATTERN_TONE.pattern,
    cost: "Costs: merge code in every client",
  },
  {
    id: "leader",
    label: "One leader per range",
    sub: "Y's check on A:1 fails; retry",
    tone: PATTERN_TONE.check,
    cost: "Costs: a failover pause per range",
  },
];
res.forEach((r, i) => {
  shapes.push({
    id: r.id,
    type: "box",
    x: RES_X[i],
    y: RES_Y,
    w: W,
    h: 60,
    label: r.label,
    sub: r.sub,
    tone: r.tone,
    fill: "pastel",
    step: i + 2,
  });
  shapes.push({
    id: `${r.id}-cost`,
    type: "text",
    x: RES_X[i],
    y: RES_Y + 74,
    w: W,
    h: 18,
    label: r.cost,
    tone: PATTERN_TONE.infra,
    step: i + 2,
  });
});
shapes.push({ id: "xd", type: "arrow", x: 300, y: 188, w: 0, h: 50 });
shapes.push({ id: "yd", type: "arrow", x: 580, y: 188, w: 0, h: 50 });

const spec: LayoutSpec = {
  kind: "layout",
  title: "Two concurrent writes, three resolutions",
  width: 880,
  height: 380,
  groups: [{ id: "resolve", title: "Three ways to resolve", tone: "neutral", x: 5, y: 244, w: 870, h: 128 }],
  steps: [
    { title: "Two writes, neither saw the other" },
    { title: "Last write wins: one is lost" },
    { title: "Version vectors: the app merges" },
    { title: "One leader: the second write is checked" },
  ],
  shapes,
};

export default spec;
