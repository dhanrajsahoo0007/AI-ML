import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { FONTS, measureText } from "@/components/diagrams/text-width";

/** Width of a quiet text label (11.5 px), from the measured Inter widths the renderers and the spec lint share. */
const textWidth = (text: string) => measureText(text, FONTS.pill);
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE, meter, meterSize, n } from "@/components/diagrams/presets/production";
import { CAPACITY, HARDWARE, POOLS, TURN50 } from "@/components/diagrams/presets/gcase-chat";

// Capacity on tokens and KV-cache memory (chatgpt-style-chat-service, design sheet §5 and deep dive 3; preset
// HARDWARE, CAPACITY, POOLS in presets/gcase-chat.ts). Every throughput, hit rate and gap distribution is illustrative.
//   Step 1: KV a token. Latent attention stores 61 × (512 + 64) × 1 B = HARDWARE.model.kvBytesPerToken = 35,136 B in
//     FP8; a dense 70B with 8 KV heads (80 layers × 8 × 128 × 2 × 1 B) stores 163,840 (4.7×). Turn 50's 14,600 tokens
//     (the window + the answer) are 0.51 GB against 2.39 GB dense. One fast decode step per GPU at batch
//     CAPACITY.fast.batch ≈ 62: 1.15 × (t0 4.83 ms + 62.46 × (2 × 59.2 µs compute + max(L × 5.49 ns KV read,
//     2 × L × 5.66 ns MLA attention) + 2 × 6.16 µs expert traffic)) at L = CAPACITY.ctxFast ≈ 9,497 = 22.7 ms, inside
//     the 1.7 ÷ 60 = 28.3 ms a step at 60 tokens a second. Attention, not the KV read, is the binding term. FP8 decode
//     attention is an ASSUMPTION (review R3-1), gated before it serves; in BF16 the fleet is
//     CAPACITY.bf16Attention.gpus = 16,896 (63 + 48 racks) instead of 14,520.
//   Step 2: prefix tiers against the gap between a user's turns (lognormal, median 60 s, p90 20 min; illustrative).
//     Residency = capacity ÷ new KV written a second: home unit CAPACITY.cache.residencyLocalSec ≈ 18 min, regional KV
//     store residencyStoreSec ≈ 5.7 h. Shares of all turns (CAPACITY.cache.hit): first 16.7%, home-unit hit 68.0%,
//     store hit 9.5%, compaction (pre-filled) 3.7%, miss 2.2%: 99.4% of follow-ups find their prefix. Reserved for
//     90% (CAPACITY.plannedCache.hit): home 68.6%, store 2.7%, miss 8.4%.
//   Step 3: prompt tokens computed a turn: first 1,188 · hit 488 · miss 7,817 on average · fold 9,283 (background) ·
//     modelled mean CAPACITY.cache.computed ≈ 1,056 (× 1.23 for attention over the context = 1,299) · reserved mean
//     1,583 (1,922 weighted).
//   Step 4: the fleet (prefill units of 8 + decode racks of 72, each region rounded up): modelled 11,640 · 95% 12,984 ·
//     reserved 90% 14,520 (the plan, FP8) to 16,896 (BF16) · 85% 16,080 · 80% 17,664 · DeepSeek's measured 56.3% token
//     hit share 28,704; what each layer buys at the modelled rate: no KV store 15,696 · no affinity 12,480 · neither
//     43,080 · no multi-token prediction 13,368.
// Layout (880 wide): step 1 two KV bars and a meter() for the step; step 2 a log time axis 10 s to 1 day with the gap
// markers above and the tier residencies below, then two meter() bars of turn shares; step 3 bars on a 9,283-token
// scale; step 4 stacked prefill + decode bars on a 43,080-GPU scale, the BF16 extension as a soft cell.
// Colours: latent KV violet (a store), dense KV red (what it would cost); step parts: weights neutral, parameter compute
// green, attention teal, expert traffic blue; tiers: first turns neutral, home unit green, store violet, compaction
// orange, miss red; prefill teal (compute), decode green (models).

const X = 12;
const LABEL_W = 210;
const BAR_X = X + LABEL_W + 8;
const BAR_W = 520;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra,
  quiet = true
): LayoutShape => ({ id, type: "text", x, y, w, h: 18, label, tone, step, quiet });
/** Text that starts at x (its box is as wide as the text, so the centred label reads left-aligned). */
const note = (id: string, x: number, y: number, label: string, step: number, tone: LayoutTone = PROD_TONE.infra) =>
  text(id, x, y, Math.ceil(textWidth(label)) + 6, label, step, tone);
/** A row label, right-aligned against the bars. */
const left = (id: string, y: number, label: string, step: number) => {
  const w = Math.ceil(textWidth(label)) + 6;
  return text(id, BAR_X - 10 - w, y, w, label, step);
};
const cell = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  tone: LayoutTone,
  step: number,
  label?: string,
  fill: LayoutShape["fill"] = "pastel"
): LayoutShape => ({ id, type: "cell", x, y, w: Math.max(2, w), h, tone, label, fill, step, quiet: true });
const heading = (id: string, y: number, label: string, step: number) =>
  text(id, X, y, 856, label, step, PROD_TONE.infra, false);

// Step 1: KV a token and one decode step.
const kv = HARDWARE.model.kvBytesPerToken;
const denseKv = 80 * 8 * 128 * 2 * 1; // a dense 70B, 8 KV heads, FP8 (Llama 3 70B shape)
const seqTokens = TURN50.total + POOLS.fastOutput; // the window + the answer: 14,600 (CAPACITY.turn50.compactGb)
const gbOf = (bytes: number) => ((seqTokens * bytes) / 1e9).toFixed(2);
const d = HARDWARE.decode;
const B = CAPACITY.fast.batch;
const L = CAPACITY.ctxFast;
const r1 = (v: number) => Math.round(v * 10) / 10;
/** Round each value to 0.1 so the parts add up to the rounded total (largest remainder). */
function tenths(values: number[]) {
  const total = Math.round(values.reduce((a, v) => a + v, 0) * 10);
  const floors = values.map((v) => Math.floor(v * 10));
  let left = total - floors.reduce((a, v) => a + v, 0);
  const order = values.map((v, i) => [v * 10 - floors[i], i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) if (left-- > 0) floors[i] += 1;
  return floors.map((f) => f / 10);
}
const parts: { label: string; ms: number; tone: LayoutTone }[] = [
  { label: "weights", ms: d.imbalance * d.t0 * 1e3, tone: PROD_TONE.infra },
  { label: "parameters", ms: d.imbalance * B * d.queriesPerStep * d.computePerToken * 1e3, tone: GENAI_TONE.model },
  {
    label: "MLA attention",
    ms: d.imbalance * B * Math.max(L * d.kvReadPerToken, d.queriesPerStep * L * d.attnPerCtxToken) * 1e3,
    tone: PROD_TONE.compute,
  },
  { label: "", ms: d.imbalance * B * d.queriesPerStep * d.commPerToken * 1e3, tone: PROD_TONE.data },
];
const rounded = tenths(parts.map((p) => p.ms));
parts.forEach((p, i) => (p.ms = rounded[i]));
const stepMs = r1(parts.reduce((s, p) => s + p.ms, 0));
const budgetMs = r1((d.mtpTokensPerStep / POOLS.fastSpeed) * 1e3);
const H1 = 4;
const K1 = H1 + 30;
const K2 = K1 + 30;
const M1 = K2 + 40;
const mSize = meterSize({ width: 640, barH: 26 });
const N1 = M1 + mSize.height + 6;
const step1: LayoutShape[] = [
  heading("h1", H1, "KV a token, and what one decode step costs a GPU", 1),
  left("kv-mla-l", K1 + 2, "Latent KV (MLA), FP8", 1),
  cell("kv-mla", BAR_X, K1, (BAR_W * kv) / denseKv, 22, PROD_TONE.store, 1),
  note(
    "kv-mla-v",
    BAR_X + Math.round((BAR_W * kv) / denseKv) + 8,
    K1 + 2,
    `${n(kv)} B a token; turn 50 ≈ ${gbOf(kv)} GB`,
    1
  ),
  left("kv-dense-l", K2 + 2, "Dense 70B, 8 KV heads", 1),
  cell("kv-dense", BAR_X, K2, BAR_W, 22, PROD_TONE.failure, 1, undefined, "soft"),
  note(
    "kv-dense-v",
    BAR_X + 8,
    K2 + 2,
    `${n(denseKv)} B (${(denseKv / kv).toFixed(1)}×); turn 50 ≈ ${gbOf(denseKv)} GB`,
    1
  ),
  ...meter("step", X, M1, {
    label: `One fast decode step, batch ${Math.round(B)} at ${POOLS.fastSpeed} tokens a second`,
    used: stepMs,
    limit: budgetMs,
    unit: "ms",
    width: 640,
    barH: 26,
    segments: parts.map((p) => ({ value: p.ms, tone: p.tone, label: p.label || undefined })),
    limitLabel: `1.7 tokens ÷ ${POOLS.fastSpeed} a second`,
    step: 1,
  }).map((s) => ({ ...s, quiet: true })),
  text("step-note", X + 650, M1 + 26, 206, `expert traffic ${parts[3].ms} ms`, 1, PROD_TONE.data),
  text(
    "n1",
    X,
    N1,
    856,
    `Attention binds. FP8 KV and FP8 math are gated assumptions: BF16 KV needs ${n(CAPACITY.bf16Kv.fleet.gpus)} GPUs, BF16 math ${n(CAPACITY.bf16Attention.gpus)}, not ${n(CAPACITY.design.gpus)}.`,
    1
  ),
];

// Step 2: tiers and residency against the gap between turns.
const H2 = N1 + 34;
const AX_Y = H2 + 62;
const AX_X = BAR_X - 120;
const AX_W = 620;
const LOG0 = Math.log10(10);
const LOG1 = Math.log10(86_400);
const tx = (sec: number) => Math.round(AX_X + ((Math.log10(sec) - LOG0) / (LOG1 - LOG0)) * AX_W);
const c = CAPACITY.cache;
const pc = CAPACITY.plannedCache;
const mark = (id: string, sec: number, label: string, above: boolean, tone: LayoutTone): LayoutShape[] => {
  const x = tx(sec);
  return [
    {
      id,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x, AX_Y - (above ? 14 : 0)],
        [x, AX_Y + (above ? 0 : 14)],
      ],
      tone,
      step: 2,
      quiet: true,
    },
    text(`${id}-l`, x - 90, above ? AX_Y - 34 : AX_Y + 16, 180, label, 2, tone),
  ];
};
const axisTicks: [number, string][] = [
  [10, "10 s"],
  [60, "1 min"],
  [600, "10 min"],
  [3_600, "1 h"],
  [36_000, "10 h"],
  [86_400, "1 day"],
];
const mins = (s: number) => Math.round(s / 60);
const hours = (s: number) => (s / 3_600).toFixed(1);
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const SHARE_W = 856;
/** One bar of turn shares: first, home-unit hit, store hit, compaction (pre-filled), miss; small parts named below. */
function shareBar(id: string, y: number, title: string, h: typeof c.hit): LayoutShape[] {
  const parts = [
    { key: "first", label: "first turns", v: h.first, tone: PROD_TONE.infra },
    { key: "home", label: "home-unit hit", v: h.local, tone: GENAI_TONE.model },
    { key: "store", label: "store hit", v: h.store, tone: PROD_TONE.store },
    { key: "fold", label: "fold, pre-filled", v: h.compaction, tone: "orange" as LayoutTone },
    { key: "miss", label: "miss", v: h.miss, tone: PROD_TONE.failure },
  ];
  const pcts = parts.map((p) => p.v * 100); // widths from the raw shares, labels rounded as the sheet prints them
  const out: LayoutShape[] = [note(`${id}-title`, X, y, title, 2)];
  let acc = 0;
  const small: string[] = [];
  parts.forEach((p, i) => {
    const x1 = X + Math.round((acc / 100) * SHARE_W);
    acc += pcts[i];
    const x2 = X + Math.round((acc / 100) * SHARE_W);
    const label = `${p.label} ${pcts[i].toFixed(1)}%`;
    const fits = x2 - x1 - 10 >= label.length * 7.2;
    if (!fits) small.push(label);
    out.push(cell(`${id}-${p.key}`, x1, y + 22, x2 - x1, 22, p.tone, 2, fits ? label : undefined));
  });
  out.push(note(`${id}-small`, X, y + 48, small.join(" · "), 2));
  return out;
}
const S1 = AX_Y + 62;
const S2 = S1 + 76;
const step2: LayoutShape[] = [
  heading("h2", H2, "Prefix tiers against the gap between a user's turns (log time)", 2),
  {
    id: "axis",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [AX_X, AX_Y],
      [AX_X + AX_W, AX_Y],
    ],
    step: 2,
    quiet: true,
  },
  ...axisTicks.map(([sec, label], i) => text(`tick-${i}`, tx(sec) - 30, AX_Y + 34, 60, label, 2)),
  ...mark("gap-median", POOLS.gapMedianSec, `median gap ${POOLS.gapMedianSec} s`, true, PROD_TONE.infra),
  ...mark("gap-p90", POOLS.gapP90Sec, `p90 gap ${mins(POOLS.gapP90Sec)} min`, true, PROD_TONE.infra),
  ...mark("res-unit", c.residencyLocalSec, `home unit ≈ ${mins(c.residencyLocalSec)} min`, false, GENAI_TONE.model),
  ...mark("res-store", c.residencyStoreSec, `KV store ≈ ${hours(c.residencyStoreSec)} h`, false, PROD_TONE.store),
  ...shareBar("share-m", S1, `Modelled: ${pct(c.followHit)} of follow-ups find their prefix`, c.hit),
  ...shareBar("share-r", S2, `Reserved for: ${pct(pc.followHit)}, until a month of traces shows the real rate`, pc.hit),
];

// Step 3: prompt tokens computed a turn.
const H3 = S2 + 82;
const ROW = 26;
const MAXTOK = c.pCompaction;
const tokRows: { id: string; label: string; tokens: number; tone: LayoutTone; note: string }[] = [
  { id: "first", label: "First turn", tokens: c.pFirst, tone: PROD_TONE.infra, note: "" },
  { id: "hit", label: "Follow-up, prefix hit", tokens: c.newTok, tone: GENAI_TONE.model, note: "" },
  { id: "miss", label: "Follow-up, miss (average)", tokens: c.missAvg, tone: PROD_TONE.failure, note: "" },
  { id: "fold", label: "Fold, pre-filled", tokens: c.pCompaction, tone: "orange", note: "in the background" },
  {
    id: "mean-m",
    label: "Mean, modelled",
    tokens: c.computed,
    tone: PROD_TONE.compute,
    note: `${n(Math.round(c.computedEff))} with attention`,
  },
  {
    id: "mean-r",
    label: "Mean, reserved (90%)",
    tokens: pc.computed,
    tone: PROD_TONE.compute,
    note: `${n(Math.round(pc.computedEff))} with attention`,
  },
];
const step3: LayoutShape[] = [
  heading("h3", H3, "Prompt tokens computed a turn, after the prefix cache", 3),
  ...tokRows.flatMap((r, i): LayoutShape[] => {
    const y = H3 + 28 + i * ROW;
    const w = Math.round((440 * r.tokens) / MAXTOK);
    return [
      left(`t-${r.id}-l`, y + 1, r.label, 3),
      cell(`t-${r.id}`, BAR_X, y, w, 20, r.tone, 3),
      note(`t-${r.id}-v`, BAR_X + w + 8, y + 1, `${n(Math.round(r.tokens))}${r.note ? ` · ${r.note}` : ""}`, 3),
    ];
  }),
];

// Step 4: the fleet.
const H4 = H3 + 28 + tokRows.length * ROW + 14;
const MAXGPU = CAPACITY.neither.gpus;
const FLEET_W = 500;
const gx = (g: number) => Math.round((FLEET_W * g) / MAXGPU);
type Fleet = { prefillGpus: number; decodeGpus: number; gpus: number };
const S = CAPACITY.sensitivity;
const fleetRows: { id: string; label: string; f: Fleet; note: string; plan?: boolean }[] = [
  { id: "modelled", label: `Modelled hits (${pct(c.followHit)})`, f: CAPACITY.modelled, note: "" },
  { id: "h95", label: "95% of follow-ups hit", f: S.h95, note: "" },
  { id: "h90", label: "Reserved: 90% (the plan)", f: CAPACITY.design, note: "", plan: true },
  { id: "h85", label: "85%", f: S.h85, note: "" },
  { id: "h80", label: "80%", f: S.h80, note: "" },
  { id: "ds", label: "DeepSeek's 56.3% token hits", f: CAPACITY.atDeepseekHit, note: "" },
  { id: "nostore", label: "No KV store", f: CAPACITY.noStore, note: "" },
  { id: "noaff", label: "No affinity", f: CAPACITY.noAffinity, note: "" },
  { id: "neither", label: "Neither store nor affinity", f: CAPACITY.neither, note: "" },
  { id: "nomtp", label: "No multi-token prediction", f: CAPACITY.noMtp, note: "" },
];
const FR = 24;
const F0 = H4 + 30;
const bf = CAPACITY.bf16Attention;
const step4: LayoutShape[] = [
  heading("h4", H4, `The fleet in GPUs: ${n(CAPACITY.design.gpus)} reserved (FP8) to ${n(bf.gpus)} (BF16)`, 4),
  ...fleetRows.flatMap((r, i): LayoutShape[] => {
    const y = F0 + i * FR + (i >= 6 ? 20 : 0);
    const pw = gx(r.f.prefillGpus);
    const dw = gx(r.f.decodeGpus);
    const out: LayoutShape[] = [
      left(`f-${r.id}-l`, y, r.label, 4),
      cell(`f-${r.id}-p`, BAR_X, y, pw, 18, PROD_TONE.compute, 4),
      cell(`f-${r.id}-d`, BAR_X + pw, y, dw, 18, GENAI_TONE.model, 4),
    ];
    if (r.plan) {
      const extra = gx(bf.decodeGpus - r.f.decodeGpus);
      out.push(
        cell(`f-${r.id}-bf16`, BAR_X + pw + dw, y, extra, 18, GENAI_TONE.model, 4, undefined, "soft"),
        note(`f-${r.id}-v`, BAR_X + pw + dw + extra + 8, y, `${n(r.f.gpus)} to ${n(bf.gpus)} in BF16`, 4)
      );
    } else {
      const delta = i >= 6 ? ` (+${n(r.f.gpus - CAPACITY.modelled.gpus)})` : "";
      out.push(note(`f-${r.id}-v`, BAR_X + pw + dw + 8, y, `${n(r.f.gpus)}${delta}`, 4));
    }
    return out;
  }),
  note("f-sep", X, F0 + 6 * FR + 1, "What each layer buys, at the modelled rate:", 4),
  text(
    "f-legend",
    X,
    F0 + fleetRows.length * FR + 28,
    856,
    "Teal: prefill (8-GPU units, sized on attention-weighted computed tokens at ρ 0.6). Green: decode (72-GPU racks).",
    4
  ),
];

const END = F0 + fleetRows.length * FR + 28 + 24;

const spec: LayoutSpec = {
  kind: "layout",
  title: `Capacity on tokens and KV memory: ${n(kv)} B a token, ${n(Math.round(c.computed))} prompt tokens computed a turn, ${n(CAPACITY.design.gpus)}–${n(bf.gpus)} GPUs`,
  width: 880,
  height: END,
  steps: [
    { title: `KV a token: ${n(kv)} B; one decode step ${stepMs} ms` },
    { title: `Prefix tiers: home unit ≈ ${mins(c.residencyLocalSec)} min, KV store ≈ ${hours(c.residencyStoreSec)} h` },
    {
      title: `Prompt tokens computed a turn: ${n(Math.round(c.computed))} modelled, ${n(Math.round(pc.computed))} reserved`,
    },
    { title: `The fleet: ${n(CAPACITY.design.gpus)} reserved (FP8) to ${n(bf.gpus)} (BF16)` },
  ],
  shapes: [...step1, ...step2, ...step3, ...step4],
};

export default spec;
