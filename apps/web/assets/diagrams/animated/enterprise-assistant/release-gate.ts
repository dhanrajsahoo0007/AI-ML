import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { gate, gateSize, n, PROD_TONE } from "@/components/diagrams/presets/production";
import { EVAL, LATENCY } from "@/components/diagrams/presets/gcase-enterprise";

// The enterprise assistant's release gate (design sheet §13): a release candidate against eight of the gates, one
// failing, so the release is blocked. Targets and sizes from EVAL and LATENCY in presets/gcase-enterprise.ts; measured
// values are ILLUSTRATIVE (RUN below) except the p95 figures, which are the sheet's estimates from stage spreads
// (LATENCY.answer.p95 ≈ 1,799, answerSensitive ≈ 1,975, answerFederated ≈ 2,856, rounded to 5 ms).
//   gold set ≥ 85% on EVAL.gold = 1,200 questions (± EVAL.goldMargin = 2.0 points): 87.1%: pass
//   filtered recall@100 ≥ EVAL.filteredRecallTarget 95% of an exact scan, per persona (the warehouse persona is the
//   hard case): 96.2%: pass
//   permission suite: 0 restricted canaries retrieved, prompted, quoted or summarised in EVAL.probes = 5,600 probes:
//   1 leak, an org-linked file the persona never redeemed: FAIL (the sheet's example)
//   injection suite: 0 of EVAL.injection = 700 followed (≤ 0.43%): pass
//   action simulator pass^4 ≥ 85% on EVAL.scenarios = 400 (± EVAL.passHat4Margin = 3.1), not lower than the last
//   release: 88.5% (EVAL.passHat4, 0.97 a run): pass
//   router misroutes ≤ 5% on 1,000 labelled turns: 3.4%: pass
//   grounding ≥ 95% of sentences supported: 96.4%: pass
//   p95 per path on a 5,000-turn replay: indexed ≤ 2,500, live check ≤ 2,500, live search ≤ 3,500: pass
// The department slices, cost a turn (within 10%) and the drift audit also gate; the note says so.
// One step. Layout (880 wide): gate() from presets/production.ts, checks spread 58 px apart and widened to 260 px, the
// result moved right by the extra width and gaps, arrows fanned through points 24 px from each check (as in
// answer-engine/release-gate), centred; a heading above and two notes below.
// Colours (gate builder): the change neutral, passing checks lime, the failing check red, Block red.

/** Measured on the candidate (ILLUSTRATIVE). */
const RUN = {
  gold: 0.871,
  filteredRecall: 0.962,
  leaks: 1,
  injections: 0,
  misroutes: 0.034,
  supported: 0.964,
};
const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;
const r5 = (ms: number) => Math.round(ms / 5) * 5;
const T = LATENCY.targets;

const checks = [
  {
    label: `Gold set ≥ ${pct(0.85)}`,
    pass: RUN.gold >= 0.85,
    sub: `${pct(RUN.gold, 1)} on ${n(EVAL.gold)} (± ${EVAL.goldMargin.toFixed(1)})`,
  },
  {
    label: `Filtered recall ≥ ${pct(EVAL.filteredRecallTarget)}`,
    pass: RUN.filteredRecall >= EVAL.filteredRecallTarget,
    sub: `${pct(RUN.filteredRecall, 1)}, warehouse persona`,
  },
  {
    label: "Permission suite: 0 leaks",
    pass: RUN.leaks === 0,
    sub: `${RUN.leaks} in ${n(EVAL.probes)}: unredeemed org link`,
  },
  {
    label: "Injections followed: 0",
    pass: RUN.injections === 0,
    sub: `${RUN.injections} of ${EVAL.injection}, 7 egress families`,
  },
  {
    label: `Simulator pass^4 ≥ ${pct(0.85)}`,
    pass: EVAL.passHat4 >= 0.85,
    sub: `${pct(EVAL.passHat4, 1)} on ${EVAL.scenarios} (± ${EVAL.passHat4Margin.toFixed(1)})`,
  },
  {
    label: "Router misroutes ≤ 5%",
    pass: RUN.misroutes <= 0.05,
    sub: `${pct(RUN.misroutes, 1)} on 1,000 labelled turns`,
  },
  {
    label: "Grounding ≥ 95% supported",
    pass: RUN.supported >= 0.95,
    sub: `${pct(RUN.supported, 1)} of sentences`,
  },
  {
    label: "p95 per path, replay",
    pass:
      LATENCY.answer.p95 <= T.answer.p95 &&
      LATENCY.answerSensitive.p95 <= T.answer.p95 &&
      LATENCY.answerFederated.p95 <= T.federated.p95,
    sub: `${n(r5(LATENCY.answer.p95))} / ${n(r5(LATENCY.answerSensitive.p95))} / ${n(r5(LATENCY.answerFederated.p95))} ms`,
  },
];

const opts = {
  change: { label: "Release candidate", sub: "new prompt + ranker" },
  checks,
  result: checks.every((c) => c.pass) ? ("promote" as const) : ("block" as const),
  resultSub: "fix the org-link grant",
};
const size = gateSize(opts);
// The builder packs checks 12 px apart, so the arrows to the outer checks clip their neighbours. Spread the checks to
// ROW_PITCH, widen them to CHECK_W and move the result right by the extra width; arrows follow the shape ids and fan
// out through a point 24 px from each check.
const CHECK_H = 44;
const ROW_PITCH = CHECK_H + 14;
const CHECK_W = 260;
const EXTRA_GAP = 44;
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
  title: "The assistant's release gate: eight checks, one leak in 5,600 probes, so the release is blocked",
  width: 880,
  height: NOTE_Y + 48,
  shapes: [
    text(
      "head",
      8,
      `Every release: gold set, ${EVAL.probes / 400} personas × 400 probes against 600 canaries, ${EVAL.injection} attacks, ${EVAL.scenarios} simulated actions, a replay`
    ),
    ...placed,
    text(
      "note-1",
      NOTE_Y,
      `p95 targets: ${n(T.answer.p95)} ms indexed or with a live check, ${n(T.federated.p95)} with a live search. Slices, cost a turn and drift also gate.`
    ),
    text(
      "note-2",
      NOTE_Y + 20,
      `Zero leaks in ${n(EVAL.probes)} bounds the rate at ${pct(EVAL.leakBoundPerProbe, 3)} a probe for these personas. Measured values are illustrative.`
    ),
  ],
};

export default spec;
