import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";
import { waterfall, waterfallSize } from "@/components/diagrams/presets/production";
import type { WaterfallSpan } from "@/components/diagrams/presets/production";

// Where 250 ms goes when the feed service builds one page (tiktok, Deep dive 1 "Two-stage retrieval and ranking").
// A `waterfall` of nine spans on one millisecond axis, the server-side time of one GET /v1/feed:
//   gateway and auth 0–10 · viewer features and seen filter 10–25 · retrieval, five sources in parallel, 25–65 (the
//   slowest source sets it) · filter 65–75 · candidate features for 1,500 videos 75–105 · light ranker 105–125 ·
//   heavy ranker on 200, 125–205 · rerank 205–215 · hydrate and respond 215–230.
// Working: 10 + 15 + 40 + 10 + 30 + 20 + 80 + 10 + 15 = 230 ms; the p99 budget is 250 ms (N2), so 20 ms is slack. The
// page is fetched while 3 videos are still queued on the phone: 3 × 20 s average watch = 60 s of headroom, so 230 ms
// is never seen by the viewer. All times are a budget chosen for this design, not measurements.
// Steps: 1 finding candidates (gateway to filter: 75 ms) · 2 ranking them (features to respond: 155 ms more), with the
// total and the budget line.
// Grid: the waterfall from (10, 44) (room for the pause button above the budget label), fitted to 800 wide by waterfallSize; two notes under the tick labels.
// Colours (PATTERN_TONE): stores violet (feature reads), retrieval blue (data), rankers teal (compute), the filter and
// rerank green (the rules that shape the page), gateway and response neutral. Four tones plus neutral.

const X = 10;
/** Room above the chart so the budget label clears the figure's pause button. */
const Y = 44;
const WIDTH = 800;
const BUDGET_MS = 250;

const spans: WaterfallSpan[] = [
  { id: "gw", label: "Gateway, auth", startMs: 0, durationMs: 10, tone: PATTERN_TONE.infra, step: 1 },
  { id: "user", label: "Viewer features, seen filter", startMs: 10, durationMs: 15, tone: PATTERN_TONE.store, step: 1 },
  {
    id: "retrieve",
    label: "Retrieval: 5 sources",
    startMs: 25,
    durationMs: 40,
    tone: PATTERN_TONE.data,
    note: "slowest source",
    step: 1,
  },
  { id: "filter", label: "Filter seen, blocked", startMs: 65, durationMs: 10, tone: PATTERN_TONE.pattern, step: 1 },
  { id: "feats", label: "Features: 1,500 videos", startMs: 75, durationMs: 30, tone: PATTERN_TONE.store, step: 2 },
  { id: "light", label: "Light ranker: 1,500", startMs: 105, durationMs: 20, tone: PATTERN_TONE.compute, step: 2 },
  {
    id: "heavy",
    label: "Heavy ranker: 200",
    startMs: 125,
    durationMs: 80,
    tone: PATTERN_TONE.compute,
    highlight: true,
    step: 2,
  },
  { id: "rerank", label: "Rerank: diversity", startMs: 205, durationMs: 10, tone: PATTERN_TONE.pattern, step: 2 },
  { id: "hydrate", label: "Hydrate, respond", startMs: 215, durationMs: 15, tone: PATTERN_TONE.infra, step: 2 },
];

const opts = {
  width: WIDTH,
  tickMs: 50,
  total: { ms: BUDGET_MS, label: `p99 budget ${BUDGET_MS} ms` },
};
const size = waterfallSize(spans, opts);

// The budget line belongs to step 2 with the ranking rows. Only the bars announce themselves.
const BARS = new Set(spans.map((s) => `wf-${s.id}`));
const shapes = waterfall("wf", X, Y, spans, opts).map((s) => ({
  ...s,
  step: s.id.startsWith("wf-total") ? 2 : s.step,
  quiet: BARS.has(s.id) ? undefined : true,
}));

const note = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: X + size.axisX,
  y,
  w: Math.ceil(label.length * 6.5) + 6,
  h: 18,
  label,
  tone: PATTERN_TONE.infra,
  step,
});

const NOTE_Y = Y + size.height + 14;

const spec: LayoutSpec = {
  kind: "layout",
  title: "One feed page's latency budget",
  width: 820,
  height: NOTE_Y + 2 * 24 + 4,
  steps: [{ title: "Find candidates: 75 ms" }, { title: "Rank them: 155 ms more, 230 ms in all" }],
  shapes: [
    ...shapes,
    note("find-sum", NOTE_Y, "find = 10 + 15 + 40 + 10 = 75 ms", 1),
    note(
      "rank-sum",
      NOTE_Y + 24,
      "rank = 30 + 20 + 80 + 10 + 15 = 155 ms; 75 + 155 = 230 ms, 20 ms under the budget",
      2
    ),
  ],
};

export default spec;
