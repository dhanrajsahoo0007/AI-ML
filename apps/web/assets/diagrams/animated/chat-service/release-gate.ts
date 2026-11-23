import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE, gate, gateSize, n } from "@/components/diagrams/presets/production";
import { CAPACITY, LATENCY, STATS, TARGETS } from "@/components/diagrams/presets/gcase-chat";

// The release gate (chatgpt-style-chat-service, design sheet §13; preset STATS, TARGETS, LATENCY, CAPACITY in
// presets/gcase-chat.ts). A model, a system prompt, the router, the summariser, the memory extractor, a safety
// classifier or an engine release passes the same nine checks. The run drawn is ILLUSTRATIVE (RUN): every check passes
// except the behaviour evals (sycophancy 2.6 points worse, beyond its noise band), so the release is blocked whatever
// the win rate (OpenAI's April 2025 sycophancy rollback is the reason this check blocks on its own, dossier A39, A40):
//   pairwise win rate 51.2% (not lower, ± STATS.pairwise3000 ≈ 1.8 points on 3,000 conversations): pass
//   slices: worst slice −1.1 points (≤ 3 down): pass
//   compaction probes 96.4% (≥ TARGETS.compactionRetention 95%, ± 0.96 on 2,000): pass
//   router recall 0.81 (lower bound 0.75, ± 4.5 on 300 positives), FPR 1.9% (≤ 3%): pass
//   behaviour evals: sycophancy 2.6 points worse: FAIL
//   memory poisoning 0 planted of 2,000 (≤ STATS.poisonRuleOfThree 0.15%): pass
//   safety: red-team set passes, streaming false stops 0.06% (≤ 0.1%): pass
//   privacy: 0 of 3,000 cross-user probes (≤ 0.1%), deletion audit clean: pass
//   load replay: fast p95 LATENCY.fast.p95 ≈ 454 ms at ρ 0.6 (≤ 600): pass
// Step 2: the FP8 precision gates, run once before FP8 serves any traffic (review R3-1, interviewer B1): three arms on
// the same weights answer the 3,000 conversations and 2,000 probes: (1) BF16 KV and BF16 attention math, the reference;
// (2) FP8 KV storage with BF16 math, which tests storage; (3) FP8 KV and FP8 math, which tests the math. Storage and math
// each pass on their own: win rate not lower (± 1.8), long-chat slice (contexts ≥ 30,000 tokens) not lower, next-token
// agreement with arm 1 above a gold-set threshold. Both pass: CAPACITY.design.gpus = 14,520 (the plan). Storage fails:
// KV in BF16, CAPACITY.bf16Kv.fleet.gpus = 14,592 and the KV store grows to bf16Kv.pbPerRegionToKeepDwpd ≈ 16.1 PB a
// region. Math fails: BF16 attention, CAPACITY.bf16Attention.gpus = 16,896. The checks are drawn neutral: these gates
// have not run.
// Layout (880 wide): gate() from presets/production.ts, checks spread 52 px apart and widened to 330 px, arrows fanned
// through points 24 px from each check (as in llm-gateway/release-gate); step 2 boxes and arrows below.
// Colours: gate builder (change neutral, passing checks lime, the failing one red, Block red); step 2 the arms and
// the comparison neutral, Both pass green, the BF16 fallbacks orange.

const RUN = {
  winRate: 0.512,
  worstSlice: -1.1,
  probes: 0.964,
  recall: 0.81,
  fpr: 0.019,
  sycophancyWorse: 2.6,
  planted: 0,
  falseStops: 0.0006,
  leaks: 0,
};
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const pts = (v: number) => (v * 100).toFixed(1);
const fastP95 = Math.round(LATENCY.fast.p95);
const fastTarget = TARGETS.rows.find((r) => r.id === "fast")!.targetP95;

const checks = [
  {
    label: `Pairwise win rate, not lower (± ${pts(STATS.pairwise3000)})`,
    pass: true,
    sub: `${pct(RUN.winRate)} on 3,000 conversations`,
  },
  {
    label: "No slice more than 3 points down",
    pass: RUN.worstSlice > -3,
    sub: `worst: long chats −${Math.abs(RUN.worstSlice)}`,
  },
  {
    label: `Compaction probes ≥ ${pct(TARGETS.compactionRetention, 0)}`,
    pass: RUN.probes >= TARGETS.compactionRetention,
    sub: `${pct(RUN.probes)} of 2,000 facts at turn 50`,
  },
  {
    label: `Router recall ≥ ${TARGETS.routerRecall}, FPR ≤ ${pct(TARGETS.routerFprMax, 0)}`,
    pass: RUN.recall >= TARGETS.routerRecall && RUN.fpr <= TARGETS.routerFprMax,
    sub: `${RUN.recall.toFixed(2)} and ${pct(RUN.fpr)}`,
  },
  {
    label: "Behaviour evals block on their own",
    pass: false,
    sub: `sycophancy ${RUN.sycophancyWorse} points worse`,
  },
  {
    label: "Memory poisoning: 0 of 2,000",
    pass: RUN.planted === 0,
    sub: `${RUN.planted} planted (≤ ${pct(STATS.poisonRuleOfThree, 2)})`,
  },
  {
    label: "Safety: red team, false stops ≤ 0.1%",
    pass: RUN.falseStops <= 0.001,
    sub: `passes; false stops ${pct(RUN.falseStops, 2)}`,
  },
  {
    label: "Privacy: 0 of 3,000 leak probes",
    pass: RUN.leaks === 0,
    sub: "deletion audit clean",
  },
  {
    label: `Load replay: fast p95 ≤ ${fastTarget} ms`,
    pass: fastP95 <= fastTarget,
    sub: `${fastP95} ms at ρ 0.6`,
  },
];

const opts = {
  change: { label: "Model release", sub: "moe-2026-12" },
  checks,
  result: checks.every((c) => c.pass) ? ("promote" as const) : ("block" as const),
  resultSub: "sycophancy",
};
const size = gateSize(opts);
const CHECK_H = 44;
const ROW_PITCH = CHECK_H + 8;
const CHECK_W = 330;
const EXTRA_GAP = 24;
const built = gate("g", 0, 0, opts);
const check0 = built.find((sh) => sh.id === "g-check-0");
const extraW = CHECK_W - (check0?.w ?? CHECK_W);
const spreadH = checks.length * ROW_PITCH - 8;
const GX = Math.round((880 - (size.width + extraW + 2 * EXTRA_GAP)) / 2);
const GY = 34;
const midY = GY + spreadH / 2;
const checkX = (sh: LayoutShape | undefined) => GX + (sh?.x ?? 0) + EXTRA_GAP;
const rowY = (i: number) => midY - spreadH / 2 + i * ROW_PITCH + CHECK_H / 2;
const placed = built.map((sh): LayoutShape => {
  const q = { ...sh, quiet: sh.id !== "g-result" };
  if (sh.type === "arrow") {
    const inArrow = sh.id.startsWith("g-in-");
    const i = Number(sh.id.slice(inArrow ? "g-in-".length : "g-out-".length));
    const x = inArrow ? checkX(check0) - 24 : checkX(check0) + CHECK_W + 24;
    return { ...q, via: [[x, rowY(i)]] };
  }
  const i = sh.id.startsWith("g-check-") ? Number(sh.id.slice("g-check-".length)) : -1;
  if (i >= 0) return { ...q, x: GX + sh.x + EXTRA_GAP, y: midY - spreadH / 2 + i * ROW_PITCH, w: CHECK_W };
  const shift = sh.id === "g-result" ? extraW + 2 * EXTRA_GAP : 0;
  return { ...q, x: GX + sh.x + shift, y: midY - (sh.h ?? CHECK_H) / 2 };
});

const text = (
  id: string,
  y: number,
  label: string,
  step: number,
  quiet = true,
  tone: LayoutTone = PROD_TONE.infra
): LayoutShape => ({ id, type: "text", x: 12, y, w: 856, h: 18, label, tone, step, quiet });

// Step 2: the FP8 precision gates (three arms).
const S2 = GY + spreadH + 52;
const B2 = S2 + 30;
const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sub: string,
  tone: LayoutTone,
  quiet = true
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub: sub || undefined, tone, fill: "pastel", step: 2, quiet });
const arrow = (id: string, from: string, to: string): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step: 2,
  quiet: true,
});
const ARM_W = 232;
const ARM_H = 46;
const ARM_GAP = 12;
const armY = (i: number) => B2 + i * (ARM_H + ARM_GAP);
const blockH = 3 * ARM_H + 2 * ARM_GAP;
const CMP_X = 12 + ARM_W + 44;
const CMP_W = 262;
const OUT_X = CMP_X + CMP_W + 44;
const OUT_W = 868 - OUT_X;
const fp8 = CAPACITY.design.gpus;
const bfMath = CAPACITY.bf16Attention.gpus;
const bfKv = CAPACITY.bf16Kv.fleet.gpus;
const kvPb = CAPACITY.bf16Kv.pbPerRegionToKeepDwpd;
const arms = [
  ["Arm 1: BF16 KV, BF16 math", "the reference"],
  ["Arm 2: FP8 KV, BF16 math", "tests KV storage"],
  ["Arm 3: FP8 KV, FP8 math", "tests attention math"],
] as const;
const step2: LayoutShape[] = [
  text(
    "h2",
    S2,
    "Once, before FP8 serves any traffic: storage and math gated on their own, same weights, same sets",
    2,
    false
  ),
  ...arms.map(([label, sub], i) => box(`arm${i}`, 12, armY(i), ARM_W, ARM_H, label, sub, PROD_TONE.infra)),
  box(
    "cmp",
    CMP_X,
    B2 + blockH / 2 - 52,
    CMP_W,
    104,
    "Arms 2 and 3 against arm 1:\nwin rate, long chats not lower;\nnext-token agreement ≥ threshold",
    "",
    PROD_TONE.infra
  ),
  ...arms.map((_, i) => arrow(`arm${i}-in`, `arm${i}`, "cmp")),
  box("pass", OUT_X, armY(0), OUT_W, ARM_H, "Both pass: FP8", `${n(fp8)} GPUs, the plan`, GENAI_TONE.model),
  box(
    "kvfail",
    OUT_X,
    armY(1),
    OUT_W,
    ARM_H,
    "Storage fails: BF16 KV",
    `${n(bfKv)} GPUs; store ${kvPb.toFixed(1)} PB a region`,
    "orange"
  ),
  box("mathfail", OUT_X, armY(2), OUT_W, ARM_H, "Math fails: BF16 attention", `${n(bfMath)} GPUs`, "orange"),
  arrow("cmp-pass", "cmp", "pass"),
  arrow("cmp-kv", "cmp", "kvfail"),
  arrow("cmp-math", "cmp", "mathfail"),
  text(
    "n2",
    B2 + blockH + 12,
    "Until any extra GPUs and drives arrive, the degradation ladder covers the gap at peak.",
    2
  ),
];
const END = B2 + blockH + 12 + 30;

const spec: LayoutSpec = {
  kind: "layout",
  title:
    "The release gate blocks on a behaviour eval, and one-off gates decide FP8 or BF16 for KV storage and attention math",
  width: 880,
  height: END,
  steps: [
    { title: "Nine checks for every release; sycophancy 2.6 points worse blocks it" },
    { title: `The FP8 gates: ${n(fp8)} GPUs if both pass, ${n(bfKv)} (BF16 KV) or ${n(bfMath)} (BF16 math) if not` },
  ],
  shapes: [
    text(
      "head",
      8,
      "Every model, prompt, router, summariser, memory-extractor, classifier or engine release runs the same checks",
      1,
      false
    ),
    ...placed,
    text(
      "note-1",
      GY + spreadH + 12,
      "Measured values are illustrative; the targets and confidence bands are the design's.",
      1
    ),
    ...step2,
  ],
};

export default spec;
