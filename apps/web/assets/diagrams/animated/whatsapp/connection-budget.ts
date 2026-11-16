import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Millions of connections per host: the memory budget and what density buys (whatsapp, Deep dive 3).
// Two steps: 1 one chat server with 128 GB holds 1M connections at a budget of 48 KB each: 32 KB of socket buffers,
// 8 KB for the connection's lightweight process, 8 KB of session state; 16 GB for the OS and runtime, 64 GB of
// headroom for bursts and reconnect storms · 2 the fleet for 500M peak connections with 2 × headroom: 1,000 hosts at
// 1M connections each against 10,000 hosts at 100K each.
// Working: 1,000,000 × 32 KB = 32 GB; × 8 KB = 8 GB twice; 32 + 8 + 8 = 48 GB; 48 + 16 + 64 = 128 GB. Fleet:
// 500M ÷ 1M = 500 hosts, × 2 = 1,000; 500M ÷ 100K = 5,000, × 2 = 10,000. All are this page's design budgets, not
// measured figures.
// Layout: the host bar at y 70 from x 40, 760 px = 128 GB (5.9375 px per GB); the fleet bars at y 230 and 290,
// 760 px = 10,000 hosts. Colours (PATTERN_TONE): socket buffers blue (data), processes teal (compute), session state
// pink (keys), OS neutral, headroom and the dense fleet green (the pattern's own part), the sparse fleet neutral.

const X0 = 40;
const GB = 760 / 128;
const parts = [
  { id: "buf", gb: 32, label: "Socket buffers", sub: "32 KB × 1M", tone: PATTERN_TONE.data },
  { id: "proc", gb: 8, label: "8 GB", sub: "", tone: PATTERN_TONE.compute },
  { id: "state", gb: 8, label: "8 GB", sub: "", tone: PATTERN_TONE.id },
  { id: "os", gb: 16, label: "OS", sub: "16 GB", tone: PATTERN_TONE.infra },
  { id: "head", gb: 64, label: "Headroom", sub: "64 GB: bursts, reconnects", tone: PATTERN_TONE.pattern },
];
const shapes: LayoutShape[] = [
  {
    id: "host-title",
    type: "text",
    x: X0,
    y: 36,
    w: 760,
    h: 22,
    label: "One chat server, 128 GB: 1M connections × 48 KB = 48 GB",
    tone: PATTERN_TONE.infra,
  },
];
let x = X0;
parts.forEach((p) => {
  const w = p.gb * GB;
  shapes.push({
    id: p.id,
    type: "cell",
    x,
    y: 70,
    w,
    h: 48,
    label: p.label,
    sub: p.sub || undefined,
    tone: p.tone,
    fill: "pastel",
  });
  x += w;
});
shapes.push({
  id: "small-key",
  type: "text",
  x: X0,
  y: 128,
  w: 760,
  h: 20,
  label: "teal: a lightweight process per connection (8 KB) · pink: session state and pending frames (8 KB)",
  tone: PATTERN_TONE.infra,
});

const HOST = 760 / 10000;
shapes.push(
  {
    id: "fleet-title",
    type: "text",
    x: X0,
    y: 196,
    w: 760,
    h: 22,
    label: "The fleet for 500M connections at peak, with 2 × headroom",
    tone: PATTERN_TONE.infra,
    step: 2,
  },
  {
    id: "dense",
    type: "cell",
    x: X0,
    y: 230,
    w: 1000 * HOST,
    h: 40,
    label: "1,000",
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    step: 2,
    highlight: true,
  },
  {
    id: "dense-note",
    type: "text",
    x: X0 + 1000 * HOST + 12,
    y: 240,
    w: 290,
    h: 20,
    label: "hosts at 1M connections each (this design)",
    tone: PATTERN_TONE.pattern,
    step: 2,
  },
  {
    id: "sparse",
    type: "cell",
    x: X0,
    y: 290,
    w: 10000 * HOST,
    h: 40,
    label: "10,000 hosts at 100K connections each",
    tone: PATTERN_TONE.infra,
    fill: "pastel",
    step: 2,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Memory per connection and the size of the fleet",
  width: 840,
  height: 350,
  shapes,
  steps: [{ title: "One host: 48 KB per connection" }, { title: "The fleet: density sets the host count" }],
};

export default spec;
