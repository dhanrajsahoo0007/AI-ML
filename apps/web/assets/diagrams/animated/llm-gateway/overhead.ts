import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE, n, waterfall, waterfallSize, type WaterfallSpan } from "@/components/diagrams/presets/production";
import { AVAILABILITY, FAILOVER, OVERHEAD } from "@/components/diagrams/presets/gcase-gateway";

// The gateway's own latency (llm-platform-gateway, design sheet §12; preset OVERHEAD and FAILOVER in
// presets/gcase-gateway.ts; targets, to be measured). Spans before the request leaves for the provider, p50 (spread):
//   hop to the cell router 0.5 (1) · cell router to replica 0.5 (1) · workload identity 1 (1) · parse, count bytes,
//   hash 0.3 (0.5) · reserve, one Redis script 2 (3) · regex and dictionary 0.3 (0.3) · route and translate 1 (1)
//   → plain path OVERHEAD.plain.p50 = 5.6 ms; p95 = 5.6 + √13.34 = 9.3 ms (stage sum 13.4); target p50 ≤ 8, p95 ≤ 20.
//   With an inline CPU name scan 13.5 (16.5) before routing → OVERHEAD.ner.p50 = 19.1 ms; p95 = 19.1 + √285.59 =
//   36.0 ms (stage sum 43.4); target p50 ≤ 30, p95 ≤ 60. Support and voice pre-scan, so they take the plain path.
// Fallback first tokens against the T0 SLI line AVAILABILITY.sliThresholdMs = 800 ms (FAILOVER):
//   normal 400 · breaker open, straight to B 400 + 150 cold = 550 · voice 429/529 to B at once 50 + 400 + 150 = 600 ·
//   a silent A: 800 deadline + 400 + 150 = 1,350 · the first unlucky call before the breaker opens
//   50 + 1,000 + 2,000 + 400 = 3,450 (serving/gateway-fallback).
// Steps: 1 the plain path · 2 the inline-NER path on the same scale · 3 fallback first tokens on a second scale.
// Layout (880 wide): waterfall() from presets/production.ts; steps 1 and 2 share one msPerPx fitted to the NER path
// (to 36 ms so the p95 mark fits); step 3 has its own axis to 3,500 ms. A heading over each, working underneath.
// Colours: hops and identity neutral, reserve violet (the counter store), regex and the name scan lime (checks),
// route lime (ranking); fallback bars green when good by the SLI, red when bad.

const X = 12;
const LABEL_W = 196;
const ROW = { rowH: 24, barH: 16 } as const;

const TONE: Record<(typeof OVERHEAD.spans)[number]["id"], LayoutTone> = {
  hop: PROD_TONE.infra,
  cell: PROD_TONE.infra,
  auth: PROD_TONE.infra,
  parse: PROD_TONE.infra,
  reserve: GENAI_TONE.store,
  regex: GENAI_TONE.check,
  ner: GENAI_TONE.check,
  route: GENAI_TONE.rank,
};

const r1 = (v: number) => Math.round(v * 10) / 10;
const pathSpans = (withNer: boolean, step: number): WaterfallSpan[] => {
  let at = 0;
  return OVERHEAD.spans
    .filter((s) => withNer || !s.ner)
    .map((s) => {
      const span: WaterfallSpan = {
        id: s.id,
        label: s.label,
        startMs: r1(at),
        durationMs: s.p50,
        tone: TONE[s.id],
        step,
        highlight: s.ner,
      };
      at += s.p50;
      return span;
    });
};

const plain = pathSpans(false, 1);
const ner = pathSpans(true, 2);
const fmt1 = (v: number) => v.toFixed(1);

const sli = AVAILABILITY.sliThresholdMs;
const good = (ms: number): LayoutTone => (ms <= sli ? GENAI_TONE.model : GENAI_TONE.failure);
const fb = (id: string, label: string, ms: number): WaterfallSpan => ({
  id,
  label,
  startMs: 0,
  durationMs: ms,
  tone: good(ms),
  step: 3,
});
const fallback: WaterfallSpan[] = [
  fb("normal", "Normal, A answers", 400),
  fb("open", "Breaker open: straight to B", FAILOVER.openPathMs),
  fb("voice", "Voice: 429 or 529, to B at once", FAILOVER.voiceFast429Ms),
  fb("silent", "A silent: 800 ms deadline, B", FAILOVER.voiceSilentMs),
  fb("unlucky", "First unlucky call (closed)", FAILOVER.firstUnluckyMs),
];

const scale = waterfallSize(ner, {
  width: 856,
  labelW: LABEL_W,
  total: { ms: OVERHEAD.ner.p95 },
  tickMs: 5,
});
const common = { msPerPx: scale.msPerPx, labelW: LABEL_W, tickMs: 5, ...ROW };

const head = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: X,
  y,
  w: Math.ceil(label.length * 6.5) + 6,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
});

const TOP_Y = 30;
const top = waterfallSize(plain, { ...common, total: { ms: OVERHEAD.plain.p95 } });
const MID_HEAD = TOP_Y + top.height + 14;
const MID_Y = MID_HEAD + 26;
const mid = waterfallSize(ner, { ...common, total: { ms: OVERHEAD.ner.p95 } });
const LOW_HEAD = MID_Y + mid.height + 14;
const LOW_Y = LOW_HEAD + 26;
const low = waterfallSize(fallback, {
  width: 856,
  labelW: LABEL_W,
  tickMs: 500,
  total: false,
  marks: [{ ms: sli, label: "" }],
  ...ROW,
});
const FOOT_Y = LOW_Y + low.height + 8;

const shapes: LayoutShape[] = [
  head("h1", 4, `Plain path: leaves for the provider at ${fmt1(OVERHEAD.plain.p50)} ms (target ≤ 8)`, 1),
  ...waterfall("p", X, TOP_Y, plain, {
    ...common,
    step: 1,
    total: { ms: OVERHEAD.plain.p50, label: `p50 ${fmt1(OVERHEAD.plain.p50)}` },
    marks: [
      { ms: OVERHEAD.plain.p95, label: `p95 ${fmt1(OVERHEAD.plain.p95)}` },
      { ms: OVERHEAD.targets.plain.p95, label: `p95 target ${OVERHEAD.targets.plain.p95} ms` },
    ],
  }),
  head(
    "h2",
    MID_HEAD,
    `With an inline name scan: ${fmt1(OVERHEAD.ner.p50)} ms (target ≤ 30); support and voice pre-scan instead`,
    2
  ),
  ...waterfall("x", X, MID_Y, ner, {
    ...common,
    step: 2,
    total: { ms: OVERHEAD.ner.p50, label: `p50 ${fmt1(OVERHEAD.ner.p50)}` },
    marks: [{ ms: OVERHEAD.ner.p95, label: `p95 ${fmt1(OVERHEAD.ner.p95)} ms` }],
  }),
  head("h3", LOW_HEAD, `Fallback, first token at the tenant: green is good by the ${n(sli)} ms SLI line`, 3),
  ...waterfall("f", X, LOW_Y, fallback, {
    width: 856,
    labelW: LABEL_W,
    tickMs: 500,
    total: false,
    step: 3,
    marks: [{ ms: sli, label: `SLI ${n(sli)} ms`, tone: GENAI_TONE.failure }],
    ...ROW,
  }),
  head(
    "foot",
    FOOT_Y,
    `p95 = p50 + √(sum of spreads²): ${fmt1(OVERHEAD.plain.p95)} plain, ${fmt1(OVERHEAD.ner.p95)} with the scan; A keeps ${fmt1(OVERHEAD.providerShareMs)} of the tenants' 400 ms`,
    3
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: `Gateway overhead: ${fmt1(OVERHEAD.plain.p50)} ms plain, ${fmt1(OVERHEAD.ner.p50)} ms with a name scan; fallbacks against the ${n(sli)} ms line`,
  width: 880,
  height: FOOT_Y + 24,
  steps: [
    { title: `The plain path: ${fmt1(OVERHEAD.plain.p50)} ms p50, ${fmt1(OVERHEAD.plain.p95)} ms p95` },
    { title: `An inline name scan: ${fmt1(OVERHEAD.ner.p50)} ms p50, ${fmt1(OVERHEAD.ner.p95)} ms p95` },
    { title: `Fallback first tokens against the ${n(sli)} ms SLI line` },
  ],
  // One ring a step: the step-1 reserve bar and the step-2 and step-3 headings carry it (a ring on the top heading
  // would sit above the canvas); the bars, labels, axis and marks arrive quietly.
  shapes: shapes.map((sh) => (/^(h[23]|p-reserve)$/.test(sh.id) ? sh : { ...sh, quiet: true })),
};

export default spec;
