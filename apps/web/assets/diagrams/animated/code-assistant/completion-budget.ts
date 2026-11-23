import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE, n, waterfall, waterfallSize, type WaterfallSpan } from "@/components/diagrams/presets/production";
import { COMPLETION_BUDGET as B, DEBOUNCE_CURVE } from "@/components/diagrams/presets/gcase-code";

// The completion latency budget, last keystroke → ghost text (code-assistant, design sheet §12 and §5 debounce curve;
// preset COMPLETION_BUDGET and DEBOUNCE_CURVE in presets/gcase-code.ts; stage values illustrative, the only public split
// is dossier F14):
//   debounce 75 + context and gate 15 + network to the region 25 + gateway 5 + queue 3 (M/D/1 at 41% busy) + prefill
//   12 (490 new tokens) + first line 50 (8 drafted steps × 6.2 ms) + show or suppress 5 + network back 25 + render 10
//   = B.p50 = 225 ms (target 300). p95 = 225 + √(20² + 60² + 15² + 30² + 40² + 10²) ≈ 225 + 83 = B.p95 ≈ 308 (target
//   500); upper bound with every spread added 400.
//   Behind a corporate proxy (+40 ms at p50, spread 60): B.proxyP50 = 265, B.proxyP95 = 225 + 40 + √(83² + 60²) ≈ 367;
//   upper bound 500, at the target. Typed-through (the key matches the ghost text): ≈ 10 ms. A developer 150 ms RTT
//   from a region: p50 B.farUserP50 = 325, outside N2's scope (≤ 50 ms RTT).
//   Debounce curve (FUNNEL at d, per developer-day): p50 = d + 150; full-request equivalents 3,641 (50 ms), 3,276
//   (75), 1,981 (150), 1,280 (250): 150 ms would cut 40% of GPU work but put p50 at the 300 ms target.
// Steps: 1 the ten stages, direct, with the p95 mark · 2 p50 and p95, direct and behind a proxy · 3 typed-through and
// a far developer · 4 the debounce curve.
// Layout (880 wide): waterfall() from presets/production.ts, every block on one scale (0–500 ms, 856 wide), a heading
// over each. Colours: debounce, network and gateway neutral; client work orange; queue and prefill teal (GPU
// compute); first line green (the model); show or suppress lime (a check); in steps 2–4 a bar is green inside its
// target, red outside N2's scope, and the chosen debounce is ringed.

const X = 12;
const WIDTH = 856;
const LABEL_W = 214;
const ROW = { rowH: 22, barH: 15 } as const;

const TONE: Record<(typeof B.stages)[number]["id"], LayoutTone> = {
  debounce: PROD_TONE.infra,
  context: GENAI_TONE.user,
  uplink: PROD_TONE.infra,
  gateway: PROD_TONE.infra,
  queue: PROD_TONE.compute,
  prefill: PROD_TONE.compute,
  decode: GENAI_TONE.model,
  filter: GENAI_TONE.check,
  downlink: PROD_TONE.infra,
  render: GENAI_TONE.user,
};
const LABEL: Partial<Record<(typeof B.stages)[number]["id"], string>> = {
  context: "Gather context, gate (client)",
  queue: "Queue (41% busy)",
};

let at = 0;
const stages: WaterfallSpan[] = B.stages.map((s) => {
  const span: WaterfallSpan = {
    id: s.id,
    label: LABEL[s.id] ?? s.label,
    startMs: at,
    durationMs: s.ms,
    tone: TONE[s.id],
    step: 1,
    note: s.spread ? `p95 +${s.spread}` : undefined,
    highlight: s.id === "debounce",
  };
  at += s.ms;
  return span;
});

const r0 = (v: number) => Math.round(v);
const bar = (id: string, label: string, ms: number, target: number, step: number, note?: string): WaterfallSpan => ({
  id,
  label,
  startMs: 0,
  durationMs: r0(ms),
  tone: ms <= target ? GENAI_TONE.model : GENAI_TONE.failure,
  step,
  note,
});
const paths: WaterfallSpan[] = [
  bar("d50", "Direct, p50", B.p50, B.targetP50, 2),
  bar("d95", "Direct, p95", B.p95, B.targetP95, 2, `upper bound ${B.p95UpperBound}`),
  bar("p50", "Behind a proxy (+40), p50", B.proxyP50, B.targetP50, 2),
  bar("p95", "Behind a proxy, p95", B.proxyP95, B.targetP95, 2, `upper bound ${B.proxyUpperBound}`),
  bar("typed", "Typed-through key", B.typedThroughMs, B.targetP50, 3, "no request"),
  bar("far", "150 ms RTT developer, p50", B.farUserP50, B.targetP50, 3, "outside N2"),
];

const curve: WaterfallSpan[] = DEBOUNCE_CURVE.map((f) => ({
  id: `c${f.debounce}`,
  label: `Debounce ${f.debounce} ms${f.debounce === B.debounce ? " (chosen)" : ""}`,
  startMs: 0,
  durationMs: f.p50,
  tone: f.debounce === B.debounce ? GENAI_TONE.model : PROD_TONE.infra,
  step: 4,
  note: n(Math.round(f.equivalents)),
  highlight: f.debounce === B.debounce,
}));

const TARGETS = [
  { ms: B.targetP50, label: `p50 target ${B.targetP50}`, tone: GENAI_TONE.check },
  { ms: B.targetP95, label: `p95 target ${B.targetP95}`, tone: GENAI_TONE.check },
];
// One scale for every block, fitted to the step-2 block, whose axis runs to the 500 ms p95 target.
const scale = waterfallSize(paths, {
  width: WIDTH,
  labelW: LABEL_W,
  tickMs: 50,
  total: false,
  marks: TARGETS,
  ...ROW,
});
const common = { msPerPx: scale.msPerPx, labelW: LABEL_W, tickMs: 50, ...ROW };

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

const TOP_Y = 28;
const top = waterfallSize(stages, { ...common, total: false });
const MID_HEAD = TOP_Y + top.height + 14;
const MID_Y = MID_HEAD + 24;
const midOpts = { ...common, total: false as const, marks: TARGETS };
const mid = waterfallSize(paths, midOpts);
const LOW_HEAD = MID_Y + mid.height + 14;
const LOW_Y = LOW_HEAD + 24;
const P50_TARGET = [TARGETS[0]];
const low = waterfallSize(curve, { ...common, total: false, marks: P50_TARGET });
const FOOT_Y = LOW_Y + low.height + 8;

const stepOf = (sh: LayoutShape, fallback: number) => sh.step ?? fallback;

const shapes: LayoutShape[] = [
  head("h1", 4, `Ten stages from the last key to ghost text: ${B.p50} ms at p50, ≈ ${r0(B.p95)} at p95`, 1),
  ...waterfall("s", X, TOP_Y, stages, {
    ...common,
    step: 1,
    // No marker lines here: the notes after the last bars would run through them (step 2 draws the targets).
    total: false,
  }),
  head("h2", MID_HEAD, "Every suggestion, direct and behind a corporate proxy, against the N2 targets", 2),
  // The p50 and p95 target lines belong to step 2; the step-3 rows arrive under them.
  ...waterfall("p", X, MID_Y, paths, { ...midOpts, step: 2 }).map((sh) => ({ ...sh, step: stepOf(sh, 2) })),
  head(
    "h4",
    LOW_HEAD,
    "The debounce curve: bars are p50; after each, full-request equivalents a developer-day (GPU work)",
    4
  ),
  ...waterfall("c", X, LOW_Y, curve, { ...common, step: 4, total: false, marks: P50_TARGET }),
  head(
    "foot",
    FOOT_Y,
    `p95 = p50 + √(sum of spreads²); a cancel is the default: the next key aborts the request it supersedes`,
    4
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: `Completion latency: ${B.p50} ms at p50 for every suggestion (≈ ${r0(B.p95)} at p95), ${B.proxyP50} behind a proxy`,
  width: 880,
  height: FOOT_Y + 24,
  steps: [
    { title: `Ten stages, direct: ${B.p50} ms at p50, ≈ ${r0(B.p95)} at p95` },
    {
      title: `Behind a proxy: ${B.proxyP50} ms at p50, ≈ ${r0(B.proxyP95)} at p95, under the ${B.targetP95} ms target`,
    },
    { title: `A typed-through key takes ≈ ${B.typedThroughMs} ms; a far developer is outside N2's scope` },
    { title: "The debounce curve: 150 ms would save 40% of GPU work and spend 75 ms on every suggestion" },
  ],
  // One ring a step: the debounce bar (step 1), the step-2 and step-4 headings and the far-developer bar (step 3); the chosen debounce is highlighted, not ringed.
  shapes: shapes.map((sh) => (/^(h[24]|s-debounce|p-far)$/.test(sh.id) ? sh : { ...sh, quiet: true })),
};

export default spec;
