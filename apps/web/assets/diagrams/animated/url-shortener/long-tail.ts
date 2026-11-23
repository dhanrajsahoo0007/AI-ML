import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Where a redirect is answered, and what each tier costs (url-shortener, Deep dive 3: the long tail).
// Three tiers left to right, joined by "miss" arrows: each redirect server's memory (the hottest codes), the shared
// link cache (codes clicked recently), the link store (every link ever made). Under each, the computed size, the share
// of clicks it answers and its expiry rule.
// Working (round numbers chosen to size the system; the hit ratios are assumptions, measured in production):
//   Cache entry ≈ 250 bytes (7-byte code, a 100-byte URL, expiry, overhead); store row ≈ 500 bytes.
//   Server memory: 10,000 codes × 250 B = 2.5 MB per server; TTL 5 s.
//   Link cache: 50 M codes × 250 B = 12.5 GB; 50 M of 6 B links = 0.8 % of links; assumed to answer 95 % of clicks.
//   Link store: 100 M × 12 × 5 = 6 B links × 500 B = 3 TB (9 TB with three replicas); misses 3,900/s × 5 % ≈ 195/s.
// Layout: three boxes of 220 × 64 at x 20, 300, 580 (y 50), "miss" arrows between them, three text lines under each.
// Colours (PATTERN_TONE): server memory teal (compute), cache and store violet (stores); the link cache highlighted
// as the tier the deep dive sizes.

const W = 220;
const H = 64;
const Y = 50;
const xs = [20, 300, 580];
const tiers = [
  {
    id: "mem",
    label: "Server memory",
    sub: "hottest 10,000 codes",
    tone: PATTERN_TONE.compute,
    lines: ["10,000 × 250 B = 2.5 MB", "viral links, no network hop", "TTL 5 s"],
  },
  {
    id: "cache",
    label: "Link cache",
    sub: "clicked recently",
    tone: PATTERN_TONE.store,
    highlight: true,
    lines: ["50 M × 250 B = 12.5 GB", "0.8 % of links, ≈ 95 % of clicks", "TTL ≤ 1 h and ≤ expiry"],
  },
  {
    id: "store",
    label: "Link store",
    sub: "every link ever made",
    tone: PATTERN_TONE.store,
    lines: ["6 B × 500 B = 3 TB", "≈ 195 reads/s (5 % of 3,900)", "kept until its expiry"],
  },
];

const shapes: LayoutShape[] = [];
tiers.forEach((t, i) => {
  shapes.push({
    id: t.id,
    type: "box",
    x: xs[i],
    y: Y,
    w: W,
    h: H,
    label: t.label,
    sub: t.sub,
    tone: t.tone,
    fill: "pastel",
    highlight: t.highlight,
  });
  t.lines.forEach((line, j) => {
    shapes.push({
      id: `${t.id}-l${j}`,
      type: "text",
      x: xs[i],
      y: Y + H + 14 + j * 22,
      w: W,
      h: 18,
      label: line,
      tone: PATTERN_TONE.infra,
    });
  });
});
shapes.push({ id: "m1", type: "arrow", x: 0, y: 0, from: "mem", to: "cache", label: "miss" });
shapes.push({ id: "m2", type: "arrow", x: 0, y: 0, from: "cache", to: "store", label: "miss" });

const spec: LayoutSpec = {
  kind: "layout",
  title: "Where a redirect is answered",
  width: xs[2] + W + 20,
  height: Y + H + 14 + 3 * 22 + 10,
  shapes,
};

export default spec;
