import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { LATENCY as L, TARGETS, WALK } from "@/components/diagrams/presets/gcase-kghealth";
import { PROD_TONE, n, waterfall, waterfallSize, type WaterfallSpan } from "@/components/diagrams/presets/production";

// Latency budget per request type, p50, ms (kg-healthcare-case-study, design sheet §12). Every stage is WALK in
// presets/gcase-kghealth.ts (the same stages LATENCY uses); all stage numbers are ESTIMATES (no production source
// publishes them):
//   Order hook card (prefetch required): TLS and JWT 15 + entitlements of context.userId 5 + prefetch parse and UCUM 5 +
//   seven expansions ‖ label-filtered note facts ≈ 30 (slowest of 7 at 12 / 35 each ≈ 30) + join 2 and phase 2 1 + delta
//   cards 5 = WALK.orderMs ≈ 64 ms (N5 ≤ 200; p95 ≈ 87 ≤ 500). Without prefetch ≈ 437 / 677 ms: prefetch is required.
//   Safety question, encoder route: edge 40 + classifier ‖ six FHIR reads (slowest of 6, 5 × 150 / 400 and the lab
//   250 / 600, ≈ 374) + resolve 50 + expansions, join, phase 2 ≈ 33 + alerts event 10 → WALK.alertsMs ≈ 507 + passages,
//   rerank and context 150 + first token 500 + first sentence 312.5 (25 tokens at 80 a second) + checks 60 →
//   WALK.safetyFirstMs ≈ 1,530 (mixed over both routes with drops ≈ 1,562; N5 ≤ 2,000; p95 ≈ 2,247 ≤ 3,000).
//   Record question: edge 40 + head ≈ 374 + embed 10 and exact chunk search ‖ fact query ≈ 30 + rerank and context 90 +
//   first token 500 + sentence 312.5 + checks 60 → WALK.recordFirstMs ≈ 1,407 (mixed ≈ 1,439).
//   Breakpoints: the first-sentence p95 target holds while the vendor's first-token p95 stays under
//   L.firstTokenP95Breakpoint ≈ 1,735 ms (budgeted 900); the complete answer's p50 (≈ 4,536, target 5,000) holds while
//   decode stays above L.decodeP50Breakpoint ≈ 70 tokens a second.
// Steps: 1 order hook card (its own scale) · 2 safety question (alerts and first sentence marked, max-of-n stages noted)
// · 3 record question · 4 the breakpoints.
// Layout (880 wide): waterfall() from presets/production.ts; steps 2–3 share one msPerPx fitted to the 2,000 ms target;
// the order card has its own scale, said in its heading. Label column 200 px, rows 24 px.
// Colours (GENAI_TONE): edge, prefetch and events neutral; FHIR reads teal (a tool); resolve and passages lime
// (ranking); rules and checks lime (checks); the model green.

const X = 12;
const LABEL_W = 200;
type Row = (typeof WALK.safety)[number];
const TONE: Record<string, LayoutTone> = {
  edge: PROD_TONE.infra,
  entitle: PROD_TONE.infra,
  prefetch: PROD_TONE.infra,
  rules: GENAI_TONE.check,
  join: GENAI_TONE.check,
  card: PROD_TONE.infra,
  head: GENAI_TONE.tool,
  link: GENAI_TONE.rank,
  expand: GENAI_TONE.check,
  alerts: PROD_TONE.infra,
  passages: GENAI_TONE.rank,
  facts: GENAI_TONE.store,
  rerank: GENAI_TONE.rank,
  firstToken: GENAI_TONE.model,
  sentence: GENAI_TONE.model,
  checks: GENAI_TONE.check,
};
// Max-of-n stages say so in their label (a note after the bar would sit under the alerts and total markers).
const LABEL: Record<string, string> = {
  head: "Classifier ‖ slowest of 6 reads",
  expand: "Drug; slowest of 7 expansions",
  rules: "Slowest of 7 ‖ note facts",
};

function chain(prefix: string, rows: readonly Row[], step: number): WaterfallSpan[] {
  let t = 0;
  return rows.map((r) => {
    const s: WaterfallSpan = {
      id: `${prefix}-${r.id}`,
      label: LABEL[r.id] ?? r.label,
      startMs: Math.round(t),
      durationMs: Math.round(r.ms),
      tone: TONE[r.id] ?? PROD_TONE.infra,
      step,
    };
    t += r.ms;
    return s;
  });
}

const order = chain("o", WALK.order, 1);
// Resolve 50 + expansions 33 + the alerts event 10 are one row ending exactly at the alerts marker, so no duration
// text sits under it.
const ms = (id: string) => WALK.safety.find((r) => r.id === id)!.ms;
const safetyRows: Row[] = [
  ...WALK.safety.slice(0, 2),
  { id: "expand", label: "Drug; slowest of 7 expansions", ms: ms("link") + ms("expand") + ms("alerts") },
  ...WALK.safety.slice(5),
];
const safety = chain("s", safetyRows, 2);
const record = chain("r", WALK.record, 3);
const target = (id: string) => TARGETS.find((t) => t.id === id)!;

const scale = waterfallSize([...safety, ...record], { width: 856, labelW: LABEL_W, total: { ms: 2_000 } });
const common = { msPerPx: scale.msPerPx, labelW: LABEL_W, tickMs: 250, rowH: 24, barH: 16 };
const orderOpts = { width: 856, labelW: LABEL_W, rowH: 24, barH: 16, tickMs: 10 };

const text = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: X,
  y,
  w: 856,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
});

const r0 = (v: number) => n(Math.round(v));
const H1 = 4;
const W1 = H1 + 24;
const s1 = waterfallSize(order, { ...orderOpts, total: { ms: WALK.orderMs } });
const H2 = W1 + s1.height + 12;
const W2 = H2 + 24;
const s2 = waterfallSize(safety, { ...common, total: { ms: WALK.safetyFirstMs } });
const H3 = W2 + s2.height + 12;
const W3 = H3 + 24;
const s3 = waterfallSize(record, { ...common, total: { ms: WALK.recordFirstMs } });
const FOOT = W3 + s3.height + 10;

const shapes: LayoutShape[] = [
  text(
    "h1",
    H1,
    `Order hook card (own scale): ${r0(WALK.orderMs)} ms p50, ${r0(L.order.p95)} p95; target ${target("order").targetP50} / ${target("order").targetP95}`,
    1
  ),
  ...waterfall("order", X, W1, order, {
    ...orderOpts,
    step: 1,
    total: { ms: WALK.orderMs, label: `card ${r0(WALK.orderMs)} ms` },
  }),
  text(
    "h2",
    H2,
    `Safety question, encoder route: ${r0(WALK.safetyFirstMs)} ms (≈ ${r0(L.safetyFirst.p50)} mixed with drops); target ${n(target("first").targetP50)}`,
    2
  ),
  ...waterfall("safety", X, W2, safety, {
    ...common,
    step: 2,
    total: { ms: WALK.safetyFirstMs, label: `first verified sentence ${r0(WALK.safetyFirstMs)} ms` },
    marks: [{ ms: WALK.alertsMs, label: `alerts ${r0(WALK.alertsMs)} ms` }],
  }),
  text(
    "h3",
    H3,
    `Record question: ${r0(WALK.recordFirstMs)} ms (≈ ${r0(L.recordFirst.p50)} mixed); target ${n(target("record").targetP50)}`,
    3
  ),
  ...waterfall("record", X, W3, record, {
    ...common,
    step: 3,
    total: { ms: WALK.recordFirstMs, label: `first verified sentence ${r0(WALK.recordFirstMs)} ms` },
  }),
  text(
    "foot-1",
    FOOT,
    `p95: card ${r0(L.order.p95)} (≤ 500), alerts ${r0(L.safetyAlerts.p95)} (≤ 1,000), first sentence ${r0(L.safetyFirst.p95)} (≤ 3,000). Without prefetch the card is ${r0(L.orderNoPrefetch.p95)} p95.`,
    4
  ),
  text(
    "foot-2",
    FOOT + 20,
    `Breakpoints: vendor first-token p95 under ≈ ${r0(L.firstTokenP95Breakpoint)} ms (budgeted ${n(L.firstTokenP95)}); decode above ≈ ${Math.round(L.decodeP50Breakpoint)} tokens a second.`,
    4
  ),
  text(
    "foot-3",
    FOOT + 40,
    "All stage times are estimates for the illustrative network; the release gate measures them at peak.",
    4
  ),
];

/** One announcement per step (the voice agent's waterfall): headings and the first footer carry the ring. */
const quieted = shapes.map((sh) => (/^(h\d|foot-1)$/.test(sh.id) ? sh : { ...sh, quiet: true }));

const spec: LayoutSpec = {
  kind: "layout",
  title:
    "Latency per request type, p50: an order card in 64 ms, alerts at 507 ms, the first verified sentence at 1,530 ms",
  width: 880,
  height: FOOT + 66,
  steps: [
    { title: `Order hook card: ${r0(WALK.orderMs)} ms, no model on the path` },
    {
      title: `Safety question: alerts at ${r0(WALK.alertsMs)} ms, first verified sentence at ${r0(WALK.safetyFirstMs)} ms`,
    },
    { title: `Record question: first verified sentence at ${r0(WALK.recordFirstMs)} ms` },
    { title: "Where the budget breaks: vendor first token and decode speed" },
  ],
  shapes: quieted,
};

export default spec;
