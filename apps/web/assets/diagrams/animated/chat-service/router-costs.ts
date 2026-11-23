import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { textWidth } from "@/components/diagrams/diagram-style";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";
import { CAPACITY, POOLS, ROUTER, ROUTER_COST } from "@/components/diagrams/presets/gcase-chat";

// Fast or reasoning: pricing the router's mistakes (chatgpt-style-chat-service, design sheet deep dive 2; preset
// ROUTER, ROUTER_COST, CAPACITY in presets/gcase-chat.ts). Router points and rates are ILLUSTRATIVE.
//   Step 1: what each mistake costs. A reasoning turn takes CAPACITY.gpuSecReason ≈ 1.404 GPU-seconds on the reserved
//     fleet against CAPACITY.gpuSecFast ≈ 0.426 for a fast one: ROUTER_COST.ratio ≈ 3.30×, plus BLOCKS.thinking 2,000
//     tokens ÷ 100 a second = 20 s of thinking the user waits through. A false positive (needless thinking) pays both.
//     A false negative (a hard turn answered fast) keeps a weaker answer, or the user regenerates with Thinking
//     (ROUTER.regenerateAfterMiss = 35%), which pays for the fast turn and the reasoning turn.
//   Step 2: three operating points per 1,000 auto turns, ROUTER.needsReasoning = 6% of them hard:
//     A (recall 0.60, FPR 0.5%): 40.7 reasoning turns, 24 missed, 4.7 needless, 15.6 weaker kept, 1,121 fast-turn eq.
//     B (recall 0.80, FPR 2%, chosen): 66.8, 12, 18.8, 7.8, 1,167.
//     C (recall 0.95, FPR 10%): 151, 3, 94, 1.95, 1,350 (and 1,880 s of needless thinking).
//     GPU = 1,000 − reasoning + (reasoning + regenerated) × 3.30. B halves A's weaker answers for 4.1% more GPU; C
//     buys 5.9 fewer for 15.7% more than B.
// Layout (880 wide): step 1 two cost cards on either side of a router box; step 2 a table with a GPU bar column.
// Colours: the router lime (ranking), fast turns green, reasoning turns teal (compute), mistakes red; the chosen row
// lime, the others neutral.

const X = 12;
const R = ROUTER_COST;
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
const note = (id: string, x: number, y: number, label: string, step: number, tone: LayoutTone = PROD_TONE.infra) =>
  text(id, x, y, Math.ceil(textWidth(label)) + 6, label, step, tone);
const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sub: string | undefined,
  tone: LayoutTone,
  step: number,
  quiet = true
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub, tone, fill: "pastel", step, quiet });
const arrow = (id: string, from: string, to: string, step: number): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  step,
  quiet: true,
});

// Step 1: the price of each mistake.
const thinkSec = R.thinkSec;
const fastS = CAPACITY.gpuSecFast;
const reasonS = CAPACITY.gpuSecReason;
const S1 = 34;
const step1: LayoutShape[] = [
  text(
    "h1",
    X,
    4,
    856,
    `A reasoning turn costs ${R.ratio.toFixed(2)}× a fast one and ${thinkSec} s of thinking`,
    1,
    PROD_TONE.infra,
    false
  ),
  box("router", 330, S1 + 40, 220, 50, "Turn router", "P(needs reasoning) ≥ threshold", GENAI_TONE.rank, 1),
  box(
    "fast",
    X,
    S1,
    250,
    50,
    "Fast racks",
    `${fastS.toFixed(3)} GPU-s a turn, ${POOLS.fastSpeed} tokens/s`,
    GENAI_TONE.model,
    1
  ),
  box(
    "reason",
    618,
    S1,
    250,
    50,
    "Reasoning racks",
    `${reasonS.toFixed(3)} GPU-s, ${thinkSec} s thinking`,
    PROD_TONE.compute,
    1
  ),
  arrow("to-fast", "router", "fast", 1),
  arrow("to-reason", "router", "reason", 1),
  box(
    "fn",
    X,
    S1 + 110,
    380,
    62,
    "Missed hard turn (false negative)",
    `a weaker answer kept, or a regenerate (${Math.round(ROUTER.regenerateAfterMiss * 100)}%) that pays for both`,
    GENAI_TONE.failure,
    1
  ),
  box(
    "fp",
    488,
    S1 + 110,
    380,
    62,
    "Needless thinking (false positive)",
    `${R.ratio.toFixed(2)}× the GPU time and ${thinkSec} s of waiting`,
    GENAI_TONE.failure,
    1
  ),
  arrow("fast-fn", "fast", "fn", 1),
  arrow("reason-fp", "reason", "fp", 1),
];

// Step 2: three operating points per 1,000 auto turns.
const H2 = S1 + 196;
const COLS = [
  { key: "point", label: "Recall, FPR", w: 150 },
  { key: "reasoning", label: "Reasoning", w: 96 },
  { key: "missed", label: "Missed hard", w: 104 },
  { key: "needless", label: "Needless", w: 96 },
  { key: "weaker", label: "Weaker kept", w: 104 },
  { key: "gpu", label: "GPU, fast-turn equivalents", w: 290 },
] as const;
const GAP = 4;
const colX = (i: number) => X + COLS.slice(0, i).reduce((s, c) => s + c.w + GAP, 0);
const ROW_H = 32;
const T0 = H2 + 28;
const maxGpu = Math.max(...R.rows.map((r) => r.gpuFastEq));
const BAR_MAX = COLS[5].w - 70;
const fmt1 = (v: number) =>
  Math.abs(v - Math.round(v)) < 1e-6 ? n(Math.round(v)) : v.toFixed(v < 10 ? 2 : 1).replace(/0$/, "");
const cell = (
  id: string,
  i: number,
  y: number,
  label: string,
  tone: LayoutTone,
  fill: LayoutShape["fill"],
  step: number
): LayoutShape => ({
  id,
  type: "cell",
  x: colX(i),
  y,
  w: COLS[i].w,
  h: ROW_H - 4,
  label,
  tone,
  fill,
  step,
  quiet: true,
});
const step2: LayoutShape[] = [
  text(
    "h2",
    X,
    H2,
    856,
    `Per 1,000 auto turns, ${Math.round(ROUTER.needsReasoning * 1_000)} of them hard (illustrative): three thresholds`,
    2,
    PROD_TONE.infra,
    false
  ),
  ...COLS.map((c, i) => cell(`th-${c.key}`, i, T0, c.label, PROD_TONE.infra, "soft", 2)),
  ...R.rows.flatMap((r, j): LayoutShape[] => {
    const y = T0 + (j + 1) * ROW_H;
    const chosen = r.id === ROUTER.chosen.id;
    const tone = chosen ? GENAI_TONE.check : PROD_TONE.infra;
    const fill = chosen ? "pastel" : "soft";
    const barW = Math.round((BAR_MAX * r.gpuFastEq) / maxGpu);
    return [
      cell(
        `p-${r.id}`,
        0,
        y,
        `${r.id}: ${r.recall.toFixed(2)}, FPR ${(r.fpr * 100).toFixed(1).replace(/\.0$/, "")}%${chosen ? " ✓" : ""}`,
        tone,
        fill,
        2
      ),
      cell(`r-${r.id}`, 1, y, fmt1(r.reasoning), tone, fill, 2),
      cell(`m-${r.id}`, 2, y, fmt1(r.fn), GENAI_TONE.failure, "soft", 2),
      cell(`n-${r.id}`, 3, y, fmt1(r.fp), GENAI_TONE.failure, "soft", 2),
      cell(`w-${r.id}`, 4, y, fmt1(r.badAnswersKept), GENAI_TONE.failure, "soft", 2),
      {
        id: `g-${r.id}`,
        type: "cell",
        x: colX(5),
        y: y + 4,
        w: barW,
        h: ROW_H - 12,
        tone: chosen ? GENAI_TONE.check : PROD_TONE.compute,
        fill: "pastel",
        step: 2,
        quiet: true,
      },
      note(`gv-${r.id}`, colX(5) + barW + 6, y + 5, n(Math.round(r.gpuFastEq)), 2),
    ];
  }),
];
const [A, B, C] = R.rows;
const FOOT = T0 + 4 * ROW_H + 8;
step2.push(
  text(
    "f1",
    X,
    FOOT,
    856,
    `B halves A's weaker answers for ${((B.gpuFastEq / A.gpuFastEq - 1) * 100).toFixed(1)}% more GPU; C keeps ${(B.badAnswersKept - C.badAnswersKept).toFixed(1)} fewer for ${((C.gpuFastEq / B.gpuFastEq - 1) * 100).toFixed(1)}% more, and ${n(C.needlessWaitSec)} s of needless thinking.`,
    2
  ),
  text(
    "f2",
    X,
    FOOT + 22,
    856,
    "Recall and FPR are measured on 5,000 auto turns answered both ways and graded pairwise.",
    2
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: `Pricing the router's mistakes: point B spends ${n(Math.round(B.gpuFastEq))} fast-turn equivalents per 1,000 auto turns and keeps ${B.badAnswersKept.toFixed(1)} weaker answers`,
  width: 880,
  height: FOOT + 48,
  steps: [
    { title: `What each mistake costs: ${R.ratio.toFixed(2)}× and ${thinkSec} s, or a weaker answer` },
    { title: "Three thresholds per 1,000 auto turns; B is chosen" },
  ],
  shapes: [...step1, ...step2],
};

export default spec;
