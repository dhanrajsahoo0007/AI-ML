import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// How much of the ring each of four nodes owns with 1 and with 100 virtual nodes (consistent-hashing, Core concepts).
// Shares are computed here, not typed: each virtual node "A#0", "A#1", ... is hashed with 32-bit FNV-1a plus a
// murmur-style finaliser onto a 2^32 ring, and a node owns the arcs that end at its points. With 1 point each the
// shares come out 25.1 / 15.2 / 54.6 / 5.1 %; with 100 each, 27.8 / 25.1 / 22.4 / 24.8 % (fair share: 25 %).
// Layout: two stacked bars of 640, segment widths proportional to the share, the percentages listed under each bar.
// Colours (PATTERN_TONE): segments neutral; a node above 1.5 times its fair share is red (it is the one that falls
// over first); the even bar is green (the pattern working).

const NODES = ["A", "B", "C", "D"];
const RING = 2 ** 32;

function hash(s: string) {
  let h = 0x811c9dc5;
  for (const c of s) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

function shares(vnodes: number): number[] {
  const points = NODES.flatMap((node) =>
    Array.from({ length: vnodes }, (_, i) => ({ at: hash(`${node}#${i}`), node }))
  );
  points.sort((a, b) => a.at - b.at);
  const own = new Map(NODES.map((x) => [x, 0]));
  points.forEach((p, i) => {
    const prev = i > 0 ? points[i - 1].at : points[points.length - 1].at - RING;
    own.set(p.node, own.get(p.node)! + (p.at - prev) / RING);
  });
  return NODES.map((x) => own.get(x)!);
}

const BAR_W = 640;
const X0 = 170;
const BARS = [
  { id: "v1", title: "1 virtual node each", vnodes: 1, y: 40 },
  { id: "v100", title: "100 virtual nodes each", vnodes: 100, y: 150 },
];

const shapes: LayoutShape[] = [];
BARS.forEach((bar) => {
  const s = shares(bar.vnodes);
  shapes.push({
    id: `${bar.id}-t`,
    type: "text",
    x: 10,
    y: bar.y + 11,
    w: X0 - 20,
    h: 18,
    label: bar.title,
    tone: PATTERN_TONE.infra,
  });
  let x = X0;
  s.forEach((share, i) => {
    const w = Math.round(share * BAR_W);
    const hot = share > 1.5 / NODES.length;
    const tone = hot ? PATTERN_TONE.fail : bar.vnodes > 1 ? PATTERN_TONE.pattern : PATTERN_TONE.infra;
    shapes.push({
      id: `${bar.id}-${NODES[i]}`,
      type: "box",
      x,
      y: bar.y,
      w,
      h: 40,
      label: NODES[i],
      tone,
      fill: "pastel",
    });
    x += w;
  });
  const list = s.map((share, i) => `${NODES[i]} ${(share * 100).toFixed(1)} %`).join("   ·   ");
  shapes.push({
    id: `${bar.id}-l`,
    type: "text",
    x: X0,
    y: bar.y + 48,
    w: BAR_W,
    h: 18,
    label: list,
    tone: PATTERN_TONE.infra,
  });
});
shapes.push({
  id: "fair",
  type: "text",
  x: X0,
  y: 250,
  w: BAR_W,
  h: 18,
  label: "Fair share: 25 % each",
  tone: PATTERN_TONE.infra,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Ring share per node with 1 and with 100 virtual nodes",
  width: X0 + BAR_W + 30,
  height: 280,
  shapes,
};

export default spec;
