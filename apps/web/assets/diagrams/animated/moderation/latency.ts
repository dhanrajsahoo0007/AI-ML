import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { LATENCY as L, TARGETS } from "@/components/diagrams/presets/gcase-moderation";
import { PROD_TONE, n, waterfall, waterfallSize, type WaterfallSpan } from "@/components/diagrams/presets/production";

// Latency per path (content-moderation-system, design sheet §12; LATENCY and TARGETS in presets/gcase-moderation.ts).
// Every stage is an ILLUSTRATIVE log-normal fit (no platform publishes per-stage moderation latency). Parallel branches
// are the maximum of their draws (maxOf); a path's p50 is the sum of stage p50s (approximate) and its p95 the sum of
// stage p95s (conservative).
//   Step 1, text pre-publish, inside the post request: hop 5 + normalise 2 + rules 4 + (features ∥ text classifier)
//     ≈ 20.8 + decide 2 = L.textPre.p50 ≈ 34 ms (p95 ≈ 97; target 50 / 150).
//   Step 2, image pre-publish, after upload: fetch 25 + (hash branch: hash 8 + (local banks ∥ PhotoDNA 150) ≈ 158 ∥
//     image classifiers 30 ∥ OCR branch 80) ≈ 171 + decide 2 = L.imagePre.p50 ≈ 198 ms (p95 ≈ 500; target 300 / 800).
//     Degraded (PhotoDNA down or past its 600 ms timeout): L.imagePreDegraded.p50 ≈ 110 ms on local checks, with
//     limited distribution.
//   Step 3, a held threat the mid model clears: pre-publish 34 + enqueue 5 + queue wait 200 (provisioned for ≈ 106
//     calls a second) + mid model (first token 500 + 90 tokens at 70 a second ≈ 1,786) + act 20 = L.heldRelease.p50
//     ≈ 2,045 ms (p95 ≈ 6,307; target 10,000 p95).
//   Step 4, every after-publish path at p95 on one scale against the 10 s held-release target: held text 6,307, held
//     image 7,110, small text 4,910, small image 5,310, mid 6,210 ms; the p50 printed after each bar.
// Layout (880 wide): waterfall() from presets/production.ts, four blocks with their own scales (said in each heading).
// Colours: hop, queue and decide neutral; normalise, rules, hashes and classifiers lime (checks); the models green;
// PhotoDNA green (a vendor model); act teal.

const X = 12;
const LABEL_W = 210;
const WIDTH = 856;
const r = (v: number) => n(Math.round(v));
const S = L.stages;

/** Serial spans from 0, each starting where the previous one ended. */
function chain(
  prefix: string,
  rows: { id: string; label: string; ms: number; p95: number; tone: WaterfallSpan["tone"] }[],
  step: number,
  inLabel = false
) {
  let t = 0;
  return rows.map((row): WaterfallSpan => {
    const s: WaterfallSpan = {
      id: `${prefix}-${row.id}`,
      label: inLabel ? `${row.label} (p95 ${r(row.p95)})` : row.label,
      startMs: Math.round(t),
      durationMs: Math.round(row.ms),
      tone: row.tone,
      ...(inLabel ? {} : { note: `p95 ${r(row.p95)}` }),
      step,
    };
    t += row.ms;
    return s;
  });
}

// Step 1: text pre-publish.
const textPar = {
  p50: L.textPre.p50 - S.hop.p50 - S.normalise.p50 - S.rules.p50 - S.decide.p50,
  p95: L.textPre.p95 - S.hop.p95 - S.normalise.p95 - S.rules.p95 - S.decide.p95,
};
const text = chain(
  "t",
  [
    { id: "hop", label: "Hop from post service", ms: S.hop.p50, p95: S.hop.p95, tone: PROD_TONE.infra },
    {
      id: "norm",
      label: "Normalise look-alikes",
      ms: S.normalise.p50,
      p95: S.normalise.p95,
      tone: GENAI_TONE.check,
    },
    { id: "rules", label: "Rules, exact lists", ms: S.rules.p50, p95: S.rules.p95, tone: GENAI_TONE.check },
    { id: "clf", label: "Features ‖ classifier", ms: textPar.p50, p95: textPar.p95, tone: GENAI_TONE.model },
    { id: "decide", label: "Decide: τ and band", ms: S.decide.p50, p95: S.decide.p95, tone: PROD_TONE.infra },
  ],
  1,
  true
);

// Step 2: image pre-publish, three branches in parallel after the fetch.
const imgPar = L.imagePre.p50 - S.fetch.p50 - S.decide.p50;
const image: WaterfallSpan[] = [
  {
    id: "i-fetch",
    label: "Fetch, decode, resize",
    startMs: 0,
    durationMs: S.fetch.p50,
    tone: PROD_TONE.infra,
    step: 2,
  },
  {
    id: "i-hash",
    label: `Hashes ‖ PhotoDNA (p95 ${r(L.hashBranch.p95)})`,
    startMs: S.fetch.p50,
    durationMs: Math.round(L.hashBranch.p50),
    tone: GENAI_TONE.check,
    step: 2,
  },
  {
    id: "i-clf",
    label: `Image classifiers (p95 ${r(S.imageClassifiers.p95)})`,
    startMs: S.fetch.p50,
    durationMs: S.imageClassifiers.p50,
    tone: GENAI_TONE.model,
    step: 2,
  },
  {
    id: "i-ocr",
    label: `OCR → text classifier (p95 ${r(L.ocrBranch.p95)})`,
    startMs: S.fetch.p50,
    durationMs: Math.round(L.ocrBranch.p50),
    tone: GENAI_TONE.model,
    step: 2,
  },
  {
    id: "i-decide",
    label: "Decide (slowest branch ≈ " + r(imgPar) + ")",
    startMs: Math.round(S.fetch.p50 + imgPar),
    durationMs: S.decide.p50,
    tone: PROD_TONE.infra,
    step: 2,
  },
];

// Step 3: a held threat the mid model clears.
const midModel = S.midText;
const held = chain(
  "h",
  [
    { id: "pre", label: "Pre-publish check (held)", ms: L.textPre.p50, p95: L.textPre.p95, tone: GENAI_TONE.check },
    { id: "enq", label: "Enqueue", ms: S.enqueue.p50, p95: S.enqueue.p95, tone: PROD_TONE.infra },
    {
      id: "wait",
      label: "Queue wait (≈ 106 calls a second)",
      ms: S.queueWait.p50,
      p95: S.queueWait.p95,
      tone: PROD_TONE.infra,
    },
    { id: "mid", label: "Mid model: first token + 90", ms: midModel.p50, p95: midModel.p95, tone: GENAI_TONE.model },
    { id: "act", label: "Act: release, write", ms: S.act.p50, p95: S.act.p95, tone: GENAI_TONE.tool },
  ],
  3
);

// Step 4: every after-publish path at p95, one scale.
const pathRows = [
  { id: "p-held", label: "Held text released (mid)", p: L.heldRelease, tone: GENAI_TONE.rank },
  { id: "p-heldimg", label: "Held image released (mid)", p: L.heldReleaseImage, tone: GENAI_TONE.rank },
  { id: "p-small", label: "Band text decided (small)", p: L.modelText, tone: GENAI_TONE.model },
  { id: "p-smallimg", label: "Band image decided (small)", p: L.modelImage, tone: GENAI_TONE.model },
  { id: "p-mid", label: "Band decided (mid)", p: L.modelMid, tone: GENAI_TONE.model },
];
const paths: WaterfallSpan[] = pathRows.map((x) => ({
  id: x.id,
  label: x.label,
  startMs: 0,
  durationMs: Math.round(x.p.p95),
  tone: x.tone,
  note: `p50 ${r(x.p.p50)}`,
  step: 4,
}));

const opts = { width: WIDTH, labelW: LABEL_W, rowH: 24, barH: 16 };
const headText = (id: string, y: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x: X,
  y,
  w: WIDTH,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
});

const textOpts = {
  ...opts,
  tickMs: 10,
  total: { ms: L.textPre.p50, label: `${r(L.textPre.p50)} ms` },
  marks: [{ ms: TARGETS.textPreP50Ms, label: `target ${TARGETS.textPreP50Ms}`, tone: PROD_TONE.failure }],
};
const imageOpts = {
  ...opts,
  tickMs: 50,
  total: { ms: L.imagePre.p50, label: `${r(L.imagePre.p50)} ms` },
  marks: [
    { ms: L.imagePreDegraded.p50, label: `degraded ${r(L.imagePreDegraded.p50)}` },
    { ms: TARGETS.imagePreP50Ms, label: `target ${TARGETS.imagePreP50Ms}`, tone: PROD_TONE.failure },
  ],
};
const heldOpts = {
  ...opts,
  tickMs: 500,
  total: { ms: L.heldRelease.p50, label: `visible at ${r(L.heldRelease.p50)} ms` },
};
const pathOpts = {
  ...opts,
  tickMs: 2_000,
  total: false as const,
  marks: [{ ms: TARGETS.heldReleaseP95Ms, label: "held target 10 s p95", tone: PROD_TONE.failure }],
};

const H1 = 4;
const W1 = H1 + 22;
const s1 = waterfallSize(text, textOpts);
const H2 = W1 + s1.height + 14;
const W2 = H2 + 22;
const s2 = waterfallSize(image, imageOpts);
const H3 = W2 + s2.height + 14;
const W3 = H3 + 22;
const s3 = waterfallSize(held, heldOpts);
const H4 = W3 + s3.height + 14;
const W4 = H4 + 22;
const s4 = waterfallSize(paths, pathOpts);
const FOOT = W4 + s4.height + 10;

const shapes: LayoutShape[] = [
  headText(
    "h1",
    H1,
    `Text, inside the post request (ms, p50): ${r(L.textPre.p50)} ms; p95 ${r(L.textPre.p95)} (target ${TARGETS.textPreP50Ms} / ${TARGETS.textPreP95Ms})`,
    1
  ),
  ...waterfall("text", X, W1, text, { ...textOpts, step: 1 }),
  headText(
    "h2",
    H2,
    `Image, after upload (ms, p50): ${r(L.imagePre.p50)} ms; p95 ${r(L.imagePre.p95)} (target ${TARGETS.imagePreP50Ms} / ${TARGETS.imagePreP95Ms})`,
    2
  ),
  ...waterfall("image", X, W2, image, { ...imageOpts, step: 2 }),
  headText(
    "h3",
    H3,
    `A held threat the mid model clears (ms, p50): ${r(L.heldRelease.p50)} ms; p95 ${r(L.heldRelease.p95)} (target ${n(TARGETS.heldReleaseP95Ms)} p95)`,
    3
  ),
  ...waterfall("held", X, W3, held, { ...heldOpts, step: 3 }),
  headText("h4", H4, "Every path after publish at p95 (ms), the p50 after each bar", 4),
  ...waterfall("paths", X, W4, paths, { ...pathOpts, step: 4 }),
  headText(
    "foot",
    FOOT,
    `Stage latencies are illustrative fits. A timed-out held call falls back after 4 s: ≈ ${r(L.heldRetry.p95)} ms at p95.`,
    4
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: `Moderation latency: ≈ ${r(L.textPre.p50)} ms inside the post request, a held threat visible again in ≈ ${r(L.heldRelease.p50)} ms`,
  width: 880,
  height: FOOT + 26,
  steps: [
    { title: `Text inside the post request: ≈ ${r(L.textPre.p50)} ms p50` },
    { title: `Images: the PhotoDNA branch sets ≈ ${r(L.imagePre.p50)} ms` },
    { title: `A held threat the model clears is visible in ≈ ${r(L.heldRelease.p50)} ms` },
    { title: "Every after-publish path inside the 10 s line at p95" },
  ],
  shapes,
};

export default spec;
