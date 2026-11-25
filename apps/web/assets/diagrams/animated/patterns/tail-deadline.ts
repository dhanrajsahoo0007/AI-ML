import type { LayoutSpec } from "@/components/diagrams/types";
import { n, waterfall, waterfallSize } from "@/components/diagrams/presets/production";
import type { WaterfallSpan } from "@/components/diagrams/presets/production";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// An 800 ms deadline passed down the call chain of one product page (tail-latency-and-degradation, Core concepts
// "Deadline budgets"). Each row is one hop; its bar runs from the moment the call reaches that hop to the shared
// deadline at 800 ms, so the bar is the budget the hop receives.
// Two steps: 1 the budget shrinks hop by hop: gateway 800 ms, page service 780, recommendations 720, feature store 520
// · 2 a retry of the feature store at 690 ms would get 110 ms, less than its 150 ms p99, so recommendations skips it
// and the page renders without that panel.
// Working (illustrative per-hop costs): gateway auth and routing 20 ms (800 − 20 = 780); page service's own work 60 ms
// (780 − 60 = 720); recommendations' queue and model 200 ms (720 − 200 = 520); the first feature-store call fails at
// 690 ms (800 − 690 = 110 left), and 110 < 150, the feature store's p99.
// Layout: a `waterfall` (presets/production.ts) from (10, 0), fitted to 760 wide; the deadline is its dashed total line.
// Colours (PATTERN_TONE): gateway neutral (plumbing), page service and recommendations teal (compute), the feature
// store violet (store), the skipped retry red (it would miss the deadline). Three tones plus neutral.
// Fact check (2026-11-16, grpc.io "Deadlines" guide): gRPC sets no deadline by default; when it passes the client fails
// the call with DEADLINE_EXCEEDED; some implementations propagate an incoming deadline to outgoing calls, converted to a
// timeout (the time left) so the two servers' clocks need not agree.

const DEADLINE = 800;
const hop = (id: string, label: string, startMs: number, tone: WaterfallSpan["tone"], note: string, step = 1) => ({
  id,
  label,
  startMs,
  durationMs: DEADLINE - startMs,
  tone,
  note,
  step,
});

const spans: WaterfallSpan[] = [
  hop("gw", "Gateway", 0, PATTERN_TONE.infra, "spends 20 ms"),
  hop("page", "Page service", 20, PATTERN_TONE.compute, "spends 60 ms"),
  hop("recs", "Recommendations", 80, PATTERN_TONE.compute, "spends 200 ms"),
  hop("fs", "Feature store", 280, PATTERN_TONE.store, "p99 150 ms: fits"),
  { ...hop("retry", "Feature store retry", 690, PATTERN_TONE.fail, "110 < 150 ms: skip", 2), highlight: true },
];

const opts = {
  width: 760,
  tickMs: 200,
  total: { ms: DEADLINE, label: `deadline ${n(DEADLINE)} ms` },
};
const size = waterfallSize(spans, opts);

const BARS = new Set(spans.map((s) => `dl-${s.id}`));
const shapes = waterfall("dl", 10, 0, spans, opts).map((s) => ({ ...s, quiet: BARS.has(s.id) ? undefined : true }));

const spec: LayoutSpec = {
  kind: "layout",
  title: "An 800 ms deadline passed down the chain",
  width: 780,
  height: size.height + 10,
  steps: [{ title: "The budget shrinks hop by hop" }, { title: "Too little time left: skip the call" }],
  shapes,
};

export default spec;
