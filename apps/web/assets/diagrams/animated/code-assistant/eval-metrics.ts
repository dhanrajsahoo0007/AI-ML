import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE, gate, gateSize, n } from "@/components/diagrams/presets/production";
import { AB_EXAMPLE, COMPLETION_BUDGET, EVAL } from "@/components/diagrams/presets/gcase-code";

// Retained characters, not raw acceptance, and the release gate (code-assistant, design sheet §13, N1, F7; preset
// AB_EXAMPLE, EVAL and COMPLETION_BUDGET in presets/gcase-code.ts). An ILLUSTRATION of the mechanism, not evidence:
//   model A shows 400 suggestions, 30% accepted = 120 × 40 characters × 80% kept at 10 minutes = 3,840 retained;
//   model B shows 300, 36% accepted = 108 × 32 characters × 85% kept ≈ 2,938 retained.
//   B wins on acceptance (36% vs 30%) and even keeps slightly more per shown suggestion (9.8 vs 9.6 characters), yet
//   ships less code: acceptance would pick B, total retained characters pick A (showing less raises acceptance; Cursor
//   reported 21% fewer suggestions and a 28% higher accept rate, dossier F2).
//   Release gate (every model and prompt version): retained characters at a 10% arm roll back on a 5% drop
//   (EVAL.rollbackDrop10; the clustered MDE is EVAL.mde10Clustered ≈ 4.3%, a 25% arm sees ≈ 3.0%); a 50 ms p95
//   regression or a p95 over 500 ms in any region; the FIM set (exact match and execution, held-out repositories and
//   commits); chat retrieval (recall at 10, citation validity); 300 past issues × 3 runs, paired per task (one run's
//   95% interval ± 5.5 points, ≈ 327 USD a suite run); the red-team set (injected READMEs and issues, config writes,
//   typo-squatted packages, invisible Unicode). Then dogfood → 1% → 10% → 50% → 100%, skipping pinned organisations.
// Steps: 1 model A vs model B · 2 the release gate.
// Layout (880 wide): four metric rows, each with an A bar and a B bar scaled to the larger of the two (x 260, up to
// 300 px), the value after each bar and a verdict on the right; below, gate() from presets/production.ts, its checks
// spread and its arrows bent so none crosses a check.
// Colours: model A blue, model B teal (two variants, no role meaning); the verdicts lime (a check); gate passes lime.

const X = 20;
const BAR_X = 250;
const BAR_MAX = 300;
const ROW0 = 40;
const ROW_PITCH = 46;
const BAR_H = 16;
const A_TONE: LayoutTone = GENAI_TONE.data;
const B_TONE: LayoutTone = PROD_TONE.compute;
const { a: A, b: B } = AB_EXAMPLE;

const pct = (v: number) => `${Math.round(v * 100)}%`;
const textW = (label: string) => Math.ceil(label.length * 6) + 6;
const text = (
  id: string,
  x: number,
  y: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra,
  quiet = true
): LayoutShape => ({ id, type: "text", x, y, w: textW(label), h: 18, label, tone, step, quiet });

const rows = [
  { id: "shown", label: "Suggestions shown", a: A.shown, b: B.shown, fa: n(A.shown), fb: n(B.shown) },
  {
    id: "accept",
    label: "Acceptance rate",
    a: A.acceptRate,
    b: B.acceptRate,
    fa: pct(A.acceptRate),
    fb: pct(B.acceptRate),
    verdict: "acceptance ships B",
  },
  {
    id: "per-shown",
    label: "Kept per shown suggestion",
    a: A.retainedPerShown,
    b: B.retainedPerShown,
    fa: `${A.retainedPerShown.toFixed(1)} chars`,
    fb: `${B.retainedPerShown.toFixed(1)} chars`,
  },
  {
    id: "retained",
    label: "Retained characters, 10 min",
    a: A.retainedChars,
    b: B.retainedChars,
    fa: n(A.retainedChars),
    fb: n(B.retainedChars),
    verdict: "retained characters ship A",
  },
];

const step1: LayoutShape[] = [
  text("h1", X, 6, "Two completion models in an A/B (an illustration, not evidence)", 1),
  ...rows.flatMap((r, i): LayoutShape[] => {
    const y = ROW0 + i * ROW_PITCH;
    const max = Math.max(r.a, r.b);
    const wA = Math.round((r.a / max) * BAR_MAX);
    const wB = Math.round((r.b / max) * BAR_MAX);
    const out: LayoutShape[] = [
      text(`${r.id}-label`, BAR_X - 12 - textW(r.label), y + 8, r.label, 1),
      {
        id: `${r.id}-a`,
        type: "cell",
        x: BAR_X,
        y,
        w: wA,
        h: BAR_H,
        label: "A",
        tone: A_TONE,
        fill: "pastel",
        step: 1,
        quiet: true,
      },
      {
        id: `${r.id}-b`,
        type: "cell",
        x: BAR_X,
        y: y + BAR_H + 4,
        w: wB,
        h: BAR_H,
        label: "B",
        tone: B_TONE,
        fill: "pastel",
        step: 1,
        quiet: true,
      },
      text(`${r.id}-fa`, BAR_X + wA + 6, y - 1, r.fa, 1),
      text(`${r.id}-fb`, BAR_X + wB + 6, y + BAR_H + 3, r.fb, 1),
    ];
    if (r.verdict)
      out.push({
        id: `${r.id}-v`,
        type: "cell",
        x: 640,
        y: y + 4,
        w: 220,
        h: 28,
        label: r.verdict,
        tone: GENAI_TONE.check,
        fill: "soft",
        step: 1,
        quiet: r.id !== "retained",
      });
    return out;
  }),
  text(
    "foot1",
    X,
    ROW0 + rows.length * ROW_PITCH + 2,
    `A: ${n(A.shown)} × ${pct(A.acceptRate)} × ${A.charsPerAccept} chars × 80% kept = ${n(A.retainedChars)}; B: ${n(B.shown)} × ${pct(B.acceptRate)} × ${B.charsPerAccept} × 85% ≈ ${n(B.retainedChars)}. Showing less raises acceptance.`,
    1
  ),
];

// ── Step 2: the release gate ─────────────────────────────────────────────────────────────────────────────────────
const H2_Y = ROW0 + rows.length * ROW_PITCH + 56;
const checks = [
  {
    label: `Retained chars: no ${pct(EVAL.rollbackDrop10)} drop`,
    pass: true,
    sub: `10% arm; MDE ≈ ${(EVAL.mde10Clustered * 100).toFixed(1)}% clustered`,
  },
  {
    label: `p95 ≤ ${COMPLETION_BUDGET.targetP95} ms, no +50 ms`,
    pass: true,
    sub: "every region, per stage",
  },
  { label: "FIM set: match, execution", pass: true, sub: "held-out repos and commits" },
  { label: "Chat: recall@10, citations", pass: true, sub: "300 questions, gold files" },
  {
    label: `${EVAL.suiteTasks} past issues × ${EVAL.runs}, paired`,
    pass: true,
    sub: `± ${(EVAL.ci * 100).toFixed(1)} points a run; ≈ ${Math.round(EVAL.suiteRunUsd)} USD`,
  },
  { label: "Red team: 0 escapes, 0 leaks", pass: true, sub: "injection, config writes, typosquats" },
];
const opts = {
  change: { label: "New model\nor prompt", sub: "per version" },
  checks,
  result: "promote" as const,
  resultLabel: "Roll out",
  resultSub: "1% → 10% → 50%",
  step: 2,
};
// The gate builder fans straight arrows from the change to every check, which cut through the inner checks with six
// rows; as in enterprise-assistant/release-gate and llm-gateway/release-gate, the checks are spread 54 px apart, widened
// to 300 px, the result moved right by the extra width, and every arrow bends at a point 24 px from its check.
const size = gateSize(opts);
const CHECK_H = 44;
const ROW_PITCH_G = CHECK_H + 10;
const CHECK_W = 300;
const EXTRA_GAP = 30;
const built = gate("g", 0, 0, opts);
const check0 = built.find((sh) => sh.id === "g-check-0");
const extraW = CHECK_W - (check0?.w ?? CHECK_W);
const spreadH = checks.length * ROW_PITCH_G - 10;
const GX = Math.round((880 - (size.width + extraW + 2 * EXTRA_GAP)) / 2);
const GY = H2_Y + 30;
const midY = GY + spreadH / 2;
const checkX = (sh: LayoutShape | undefined) => GX + (sh?.x ?? 0) + EXTRA_GAP;
const rowY = (i: number) => midY - spreadH / 2 + i * ROW_PITCH_G + CHECK_H / 2;
const placed = built.map((sh): LayoutShape => {
  if (sh.type === "arrow") {
    const inArrow = sh.id.startsWith("g-in-");
    const i = Number(sh.id.slice(inArrow ? "g-in-".length : "g-out-".length));
    const x = inArrow ? checkX(check0) - 24 : checkX(check0) + CHECK_W + 24;
    return { ...sh, via: [[x, rowY(i)]], quiet: true };
  }
  const i = sh.id.startsWith("g-check-") ? Number(sh.id.slice("g-check-".length)) : -1;
  if (i >= 0)
    return { ...sh, x: GX + sh.x + EXTRA_GAP, y: midY - spreadH / 2 + i * ROW_PITCH_G, w: CHECK_W, quiet: true };
  const shift = sh.id === "g-result" ? extraW + 2 * EXTRA_GAP : 0;
  return { ...sh, x: GX + sh.x + shift, y: midY - (sh.h ?? CHECK_H) / 2, quiet: sh.id !== "g-result" };
});
const GATE_BOTTOM = GY + spreadH;
const step2: LayoutShape[] = [
  text(
    "h2",
    X,
    H2_Y,
    "The release gate: every model and prompt version, then a staged rollout",
    2,
    PROD_TONE.infra,
    false
  ),
  ...placed,
  text(
    "foot2",
    X,
    GATE_BOTTOM + 14,
    `Public SWE-bench scores only shortlist: at least ${(EVAL.swebenchFloor * 100).toFixed(1)}% of Verified's 500 tasks have flawed tests. Pinned organisations opt in after 14 days.`,
    2
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: `Retained characters, not acceptance: model A keeps ${n(A.retainedChars)} characters to B's ${n(B.retainedChars)}, though B is accepted more`,
  width: 880,
  height: GATE_BOTTOM + 44,
  steps: [
    {
      title: `A/B: B wins acceptance (${pct(B.acceptRate)} vs ${pct(A.acceptRate)}); A keeps more code (${n(A.retainedChars)} vs ${n(B.retainedChars)})`,
    },
    { title: "The release gate: retained characters, latency, offline suites and the red team" },
  ],
  shapes: [...step1, ...step2],
};

export default spec;
