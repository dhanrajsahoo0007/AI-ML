import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { gate, gateSize, n, PROD_TONE } from "@/components/diagrams/presets/production";
import { LATENCY, STATS, TARGETS } from "@/components/diagrams/presets/gcase-answer";

// The answer engine's release gate (design sheet §13): a release candidate (a new answer-model version) against seven
// gates, one failing, so the release is blocked. Targets from TARGETS and STATS in presets/gcase-answer.ts; measured
// values are ILLUSTRATIVE (RUN below) except the p95 figures, which are the sheet's estimates (LATENCY.ownP95 ≈ 1,980,
// LATENCY.apiP95 ≈ 2,910, rounded to 10 ms).
//   correctness on the 1,000-question gold set: 88.9%, not lower than the baseline (paired McNemar) and within
//   2 points (± STATS.gold = 2.0 points at 88%): pass
//   citation recall ≥ TARGETS.citationRecall 95% from the independent grader: 96.1%: pass
//   citation precision ≥ TARGETS.citationPrecision 90%: 88.0%: FAIL (the sheet's example)
//   followed injections: 0 of 1,000 adversarial cases (≤ STATS.ruleOfThree = 0.3%): pass
//   copyright tests: four copied sentences fail at the 2nd, four 18-word runs fail at the 3rd, a 9- and 15-word quote
//   pass: pass
//   freshness ≥ TARGETS.freshSetCorrect 85% on 400 changed-this-week questions (± STATS.fresh400 = 3.5): 87.3%: pass
//   p95 per path on peak-hour live traces of the 1% canary: own ≤ 2,500, API ≤ 3,200: pass
// One step. Layout (880 wide): gate() from presets/production.ts, checks spread 58 px apart and widened to 250 px, the
// result moved right by the extra width and gaps, centred; a heading above and two notes below.
// Colours (gate builder): the change neutral, passing checks lime, the failing check red, Block red.

/** Measured on the candidate (ILLUSTRATIVE). */
const RUN = {
  correctness: 0.889,
  recall: 0.961,
  precision: 0.88,
  injections: 0,
  fresh: 0.873,
} as const;
const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;
const r10 = (ms: number) => Math.round(ms / 10) * 10;

const checks = [
  {
    label: `Correctness, gold set`,
    pass: RUN.correctness >= TARGETS.correctness,
    sub: `${pct(RUN.correctness, 1)} on 1,000 (± ${(STATS.gold * 100).toFixed(1)}), not lower`,
  },
  {
    label: `Citation recall ≥ ${pct(TARGETS.citationRecall)}`,
    pass: RUN.recall >= TARGETS.citationRecall,
    sub: `${pct(RUN.recall, 1)}, independent grader`,
  },
  {
    label: `Citation precision ≥ ${pct(TARGETS.citationPrecision)}`,
    pass: RUN.precision >= TARGETS.citationPrecision,
    sub: `${pct(RUN.precision, 1)}: fail`,
  },
  {
    label: "Injections followed: 0",
    pass: RUN.injections === 0,
    sub: `${RUN.injections} of 1,000 (≤ ${pct(STATS.ruleOfThree, 1)})`,
  },
  { label: "Copyright tests", pass: true, sub: "3 of 3 behave as specified" },
  {
    label: `Freshness ≥ ${pct(TARGETS.freshSetCorrect)}`,
    pass: RUN.fresh >= TARGETS.freshSetCorrect,
    sub: `${pct(RUN.fresh, 1)} on 400 (± ${(STATS.fresh400 * 100).toFixed(1)})`,
  },
  {
    label: "p95 per path, live",
    pass: LATENCY.ownP95 <= TARGETS.ownP95Ms && LATENCY.apiP95 <= TARGETS.apiP95Ms,
    sub: `${n(r10(LATENCY.ownP95))} / ${n(r10(LATENCY.apiP95))} ms on the canary`,
  },
];

const opts = {
  change: { label: "Release candidate", sub: "new answer model" },
  checks,
  result: checks.every((c) => c.pass) ? ("promote" as const) : ("block" as const),
  resultSub: "fix citation precision",
};
const size = gateSize(opts);
// The builder packs checks 12 px apart, so the arrows to the outer checks clip their neighbours. Spread the checks to
// ROW_PITCH, widen them to CHECK_W and move the result right by the extra width; arrows follow the shape ids and
// fan out through a point 24 px from each check.
const CHECK_H = 44;
const ROW_PITCH = CHECK_H + 14;
const CHECK_W = 250;
const EXTRA_GAP = 50;
const built = gate("g", 0, 0, opts);
const check0 = built.find((sh) => sh.id === "g-check-0");
const extraW = CHECK_W - (check0?.w ?? CHECK_W);
const spreadH = checks.length * ROW_PITCH - 14;
const GX = Math.round((880 - (size.width + extraW + 2 * EXTRA_GAP)) / 2);
const GY = 40;
const midY = GY + spreadH / 2;
const checkX = (sh: LayoutShape | undefined) => GX + (sh?.x ?? 0) + EXTRA_GAP;
const rowY = (i: number) => midY - spreadH / 2 + i * ROW_PITCH + CHECK_H / 2;
const placed = built.map((sh): LayoutShape => {
  if (sh.type === "arrow") {
    // Fan the arrows: each runs to a point level with its check, 24 px out, then straight in (or out), so the
    // diagonals stay in the gaps and never cross a neighbouring check.
    const inArrow = sh.id.startsWith("g-in-");
    const i = Number(sh.id.slice(inArrow ? "g-in-".length : "g-out-".length));
    const x = inArrow ? checkX(check0) - 24 : checkX(check0) + CHECK_W + 24;
    return { ...sh, via: [[x, rowY(i)]] };
  }
  const i = sh.id.startsWith("g-check-") ? Number(sh.id.slice("g-check-".length)) : -1;
  if (i >= 0) return { ...sh, x: GX + sh.x + EXTRA_GAP, y: midY - spreadH / 2 + i * ROW_PITCH, w: CHECK_W };
  const shift = sh.id === "g-result" ? extraW + 2 * EXTRA_GAP : 0;
  return { ...sh, x: GX + sh.x + shift, y: midY - (sh.h ?? CHECK_H) / 2 };
});
const NOTE_Y = GY + spreadH + 18;

const text = (id: string, y: number, label: string): LayoutShape => ({
  id,
  type: "text",
  x: 12,
  y,
  w: 856,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  quiet: true,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The answer engine's release gate: seven checks, one failing, so the release is blocked",
  width: 880,
  height: NOTE_Y + 48,
  shapes: [
    text(
      "head",
      8,
      "Every release: gold sets graded by an independent grader, 1,000 attacks, copyright tests, a live canary"
    ),
    ...placed,
    text(
      "note-1",
      NOTE_Y,
      `p95 targets: own index ${n(TARGETS.ownP95Ms)}, API path ${n(TARGETS.apiP95Ms)} ms, on peak-hour live traces. One failing check blocks the release.`
    ),
    text(
      "note-2",
      NOTE_Y + 20,
      "Measured values are illustrative; the p95 figures are the sheet's estimates from stage spreads."
    ),
  ],
};

export default spec;
