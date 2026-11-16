import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Version vectors on three replicas (distributed-time-and-clocks, Core concepts): which writes are ordered and which are
// concurrent. Each vector is [London, Frankfurt, Dublin]; a write increments its own replica's entry after merging what
// it has seen.
// Writes: A at London sees nothing: [1,0,0]. B at Frankfurt after receiving A: [1,1,0]. C at Dublin after receiving A
// but not B: [1,0,1].
// Comparisons are computed below: X happened before Y when every entry of X ≤ Y's and one is smaller; otherwise, if
// neither dominates, they are concurrent.
// Layout: three boxes on a row, comparison arrows labelled with the computed verdict. Colours (PATTERN_TONE): vectors
// pink (ids and counters), the concurrent pair's link lime (a check that hands the conflict to a merge).

type V = [number, number, number];
const A: V = [1, 0, 0];
const B: V = [1, 1, 0];
const C: V = [1, 0, 1];
const leq = (x: V, y: V) => x.every((v, i) => v <= y[i]);
const before = (x: V, y: V) => leq(x, y) && !leq(y, x);
const verdict = (x: V, y: V, xn: string, yn: string) =>
  before(x, y) ? `${xn} before ${yn}` : before(y, x) ? `${yn} before ${xn}` : "concurrent: merge";
const fmt = (v: V) => `[${v.join(", ")}]`;

const W = 190;
const shapes: LayoutShape[] = [
  {
    id: "a",
    type: "box",
    x: 30,
    y: 60,
    w: W,
    h: 50,
    label: `A at London`,
    sub: fmt(A),
    tone: PATTERN_TONE.id,
    fill: "pastel",
  },
  {
    id: "b",
    type: "box",
    x: 340,
    y: 20,
    w: W,
    h: 50,
    label: `B at Frankfurt`,
    sub: fmt(B),
    tone: PATTERN_TONE.id,
    fill: "pastel",
  },
  {
    id: "c",
    type: "box",
    x: 340,
    y: 160,
    w: W,
    h: 50,
    label: `C at Dublin`,
    sub: fmt(C),
    tone: PATTERN_TONE.id,
    fill: "pastel",
  },
  { id: "ab", type: "arrow", x: 0, y: 0, from: "a", to: "b", label: verdict(A, B, "A", "B") },
  { id: "ac", type: "arrow", x: 0, y: 0, from: "a", to: "c", label: verdict(A, C, "A", "C") },
  {
    id: "bc",
    type: "arrow",
    x: 0,
    y: 0,
    from: "b",
    to: "c",
    label: verdict(B, C, "B", "C"),
    tone: PATTERN_TONE.check,
    dashed: true,
    head: false,
    via: [
      [640, 45],
      [640, 185],
    ],
  },
  {
    id: "key",
    type: "text",
    x: 30,
    y: 240,
    w: 640,
    h: 18,
    label: "Vector = [London, Frankfurt, Dublin] writes seen",
    tone: PATTERN_TONE.infra,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Version vectors: ordered or concurrent",
  width: 760,
  height: 270,
  shapes,
};

export default spec;
