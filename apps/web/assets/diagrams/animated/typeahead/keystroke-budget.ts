import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";
import { type WaterfallSpan, waterfall, waterfallSize } from "@/components/diagrams/presets/production";

// Where one keystroke's 100 ms goes (typeahead, Deep dive 3), on one shared millisecond axis.
// Three steps, one waterfall each: 1 a cache miss that reaches the region · 2 a hit in the CDN's edge cache · 3 a hit
// in the browser's own cache (a backspace, or a prefix fetched ahead).
// Working (round numbers chosen to size the system):
// - Miss: debounce 30 + browser to edge 10 + edge lookup 1 + edge to region 15 + suggest service (index and trending
//   in parallel) 3 + merge and filter 1 + region to edge 15 + edge to browser 10 + draw 8 = 93 ms, inside 100.
// - Edge hit: 30 + 10 + 1 + 10 + 8 = 59 ms.
// - Browser hit: read the local cache 1 + draw 8 = 9 ms; no debounce, because no request is sent.
// The server's own work is 3 + 1 = 4 ms of 93 (4 %): the network and the debounce set the latency.
// Layout: three `waterfall`s (presets/production.ts) stacked from y 0 with the same scale (0.16 ms a pixel) and label
// column, each under a heading; the 100 ms budget is a dashed mark on every one.
// Colours (PATTERN_TONE): browser work orange (traffic), the network and the edge neutral (plumbing), the suggest
// service teal (compute), the merge and filter lime (a check), cache hits green (what the caching adds).

const MS_PER_PX = 0.16;
const LABEL_W = 150;
const BUDGET = { ms: 100, label: "budget 100 ms" };
const GAP = 22;
const HEAD_H = 22;

const miss: WaterfallSpan[] = [
  { id: "debounce", label: "wait for a pause", startMs: 0, durationMs: 30, tone: PATTERN_TONE.traffic },
  { id: "up1", label: "browser to edge", startMs: 30, durationMs: 10, tone: PATTERN_TONE.infra },
  { id: "edge", label: "edge cache: miss", startMs: 40, durationMs: 1, tone: PATTERN_TONE.infra },
  { id: "up2", label: "edge to region", startMs: 41, durationMs: 15, tone: PATTERN_TONE.infra },
  {
    id: "svc",
    label: "index + trending",
    startMs: 56,
    durationMs: 3,
    tone: PATTERN_TONE.compute,
    highlight: true,
  },
  { id: "filter", label: "merge, filter", startMs: 59, durationMs: 1, tone: PATTERN_TONE.check },
  { id: "down2", label: "region to edge", startMs: 60, durationMs: 15, tone: PATTERN_TONE.infra },
  { id: "down1", label: "edge to browser", startMs: 75, durationMs: 10, tone: PATTERN_TONE.infra },
  { id: "draw", label: "draw the list", startMs: 85, durationMs: 8, tone: PATTERN_TONE.traffic },
];

const edgeHit: WaterfallSpan[] = [
  { id: "debounce", label: "wait for a pause", startMs: 0, durationMs: 30, tone: PATTERN_TONE.traffic },
  { id: "up1", label: "browser to edge", startMs: 30, durationMs: 10, tone: PATTERN_TONE.infra },
  { id: "edge", label: "edge cache: hit", startMs: 40, durationMs: 1, tone: PATTERN_TONE.pattern },
  { id: "down1", label: "edge to browser", startMs: 41, durationMs: 10, tone: PATTERN_TONE.infra },
  { id: "draw", label: "draw the list", startMs: 51, durationMs: 8, tone: PATTERN_TONE.traffic },
];

const localHit: WaterfallSpan[] = [
  { id: "local", label: "browser cache: hit", startMs: 0, durationMs: 1, tone: PATTERN_TONE.pattern },
  { id: "draw", label: "draw the list", startMs: 1, durationMs: 8, tone: PATTERN_TONE.traffic },
];

const total = (spans: WaterfallSpan[]) => Math.max(...spans.map((s) => s.startMs + s.durationMs));

const parts = [
  { id: "miss", spans: miss, title: `A cache miss reaches the region: ${total(miss)} ms` },
  { id: "edgehit", spans: edgeHit, title: `A hit at the edge: ${total(edgeHit)} ms` },
  { id: "localhit", spans: localHit, title: `A hit in the browser: ${total(localHit)} ms` },
];

const shapes: LayoutShape[] = [];
let y = 0;
let width = 0;
parts.forEach((p, i) => {
  const step = i + 1;
  const opts = {
    msPerPx: MS_PER_PX,
    labelW: LABEL_W,
    rowH: 26,
    barH: 18,
    tickMs: 20,
    total: false as const,
    marks: [BUDGET],
    step,
  };
  shapes.push({
    id: `${p.id}-head`,
    type: "text",
    x: 10,
    y,
    w: Math.ceil(p.title.length * 6.6) + 8,
    h: HEAD_H,
    label: p.title,
    tone: PATTERN_TONE.infra,
    step,
  });
  y += HEAD_H;
  shapes.push(...waterfall(p.id, 10, y, p.spans, opts));
  const size = waterfallSize(p.spans, opts);
  width = Math.max(width, size.width + 20);
  y += size.height + GAP;
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Where one keystroke's 100 ms goes",
  width,
  height: y - GAP + 6,
  shapes,
  steps: [
    { title: `Cache miss: ${total(miss)} ms` },
    { title: `Edge hit: ${total(edgeHit)} ms` },
    { title: `Browser hit: ${total(localHit)} ms` },
  ],
};

export default spec;
