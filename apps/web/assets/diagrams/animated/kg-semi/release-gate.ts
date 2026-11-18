import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { gate, gateSize, n, PROD_TONE } from "@/components/diagrams/presets/production";
import { EVAL, SEEDED_EFFECT_BINS } from "@/components/diagrams/presets/gcase-kgsemi";

// The release gate (kg-semiconductor-case-study, Step 8; design sheet §13): a release candidate (a ranker, prompt,
// template or ontology version) against nine checks, one failing, so it does not ship. Thresholds from EVAL in
// presets/gcase-kgsemi.ts; the measured values are ILLUSTRATIVE (RUN below):
//   1 rolling-origin replay of EVAL.gated = 270 confirmed excursions (300 minus 30 warm-up): hit@3 ≥ 70% (± 5.4),
//     hit@1 ≥ 45% (± 5.9): 73% and 48%: pass
//   2 candidate-kind coverage ≥ EVAL.coverageTarget 90% of confirmed causes: 93%: pass
//   3 paired comparison with the YMS commonality screen (McNemar on the same 270 cases; detectable difference
//     ≈ EVAL.mcnemarMdd 7.6 points at 80% power): + 12 points: pass
//   4 seeded faults EVAL.seeded.n = 2,000, the seeded chamber in the top 3 ≥ 90% (± 1.3), also gated per effect-size
//     bin SEEDED_EFFECT_BINS = 10, 20, 40 points: 92%: pass
//   5 the time-confounded slice, EVAL.seeded.timeConfounded = 500 faults injected with a benign co-occurring change,
//     ≥ 90%: 84%: FAIL (the sheet's example of a failing check)
//   6 null replays EVAL.seeded.nulls = 1,000: a "high" hypothesis on ≤ 5%: 3.2%: pass
//   7 query set: templates ≥ 95% on 300, generated ≥ 80% on 150, 50 misspelled names never "no rows": pass
//   8 bypass and leakage: 0 of EVAL.bypass.attempts 300 executed (≤ 1.0% at 95%), 0 leaks in EVAL.leakage.prompts 200
//     (≤ 1.5%): pass
//   9 calibration ("high" confirmed ≥ 60% with the Wilson lower bound ≥ 50% at n ≈ 100) and latency per request type
//     at p50 and gated p95 with measured reasoning tokens: pass
// One step. Layout (880 wide): gate() from presets/production.ts, checks spread 62 px apart and widened to 250 px, the
// change and the result moved out by 50 px each (the kg-health release gate's layout); every arrow bends 24 px from
// the check column so it enters level; a heading above, two notes below.
// Colours (gate builder): the change neutral, passing checks lime, the failing check red, Block red.

/** Measured on the candidate (ILLUSTRATIVE). */
const RUN = {
  hit3: 0.73,
  hit1: 0.48,
  coverage: 0.93,
  vsScreenPoints: 12,
  seeded: 0.92,
  timeConfounded: 0.84,
  nullHigh: 0.032,
  template: 0.963,
  generated: 0.82,
  misspelledNoRows: 0,
};
const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const S = EVAL.seeded;

const checks = [
  {
    label: "Replay, top 3 and top 1",
    pass: RUN.hit3 >= EVAL.hit3.target && RUN.hit1 >= EVAL.hit1.target,
    sub: `${pct(RUN.hit3)} ≥ 70%, ${pct(RUN.hit1)} ≥ 45% (${EVAL.gated} cases)`,
  },
  { label: "Candidate-kind coverage", pass: RUN.coverage >= EVAL.coverageTarget, sub: `${pct(RUN.coverage)} ≥ 90%` },
  {
    label: "Beats the YMS screen",
    pass: RUN.vsScreenPoints >= EVAL.mcnemarMdd * 100,
    sub: `+${RUN.vsScreenPoints} points, paired (McNemar)`,
  },
  {
    label: "Seeded faults",
    pass: RUN.seeded >= S.detect,
    sub: `${pct(RUN.seeded)} in top 3 of ${n(S.n)}; per bin ${SEEDED_EFFECT_BINS.join(", ")} pts`,
  },
  {
    label: "Time-confounded slice",
    pass: RUN.timeConfounded >= S.detect,
    sub: `${pct(RUN.timeConfounded)} < 90% of ${S.timeConfounded}: fail`,
  },
  {
    label: "Null replays",
    pass: RUN.nullHigh <= S.falseHigh,
    sub: `"high" on ${pct(RUN.nullHigh, 1)} of ${n(S.nulls)}`,
  },
  {
    label: "Query set by route",
    pass: RUN.template >= 0.95 && RUN.generated >= 0.8 && RUN.misspelledNoRows === 0,
    sub: `${pct(RUN.template, 1)}, ${pct(RUN.generated)}; 0 "no rows"`,
  },
  {
    label: "Bypass and leakage",
    pass: true,
    sub: `0 of ${EVAL.bypass.attempts}; 0 of ${EVAL.leakage.prompts}`,
  },
  { label: "Calibration, latency", pass: true, sub: "lower bound ≥ 50%; p95 per type" },
];

const opts = {
  change: { label: "Release candidate", sub: "ranker, prompts, ont-3.2.0" },
  checks,
  result: checks.every((c) => c.pass) ? ("promote" as const) : ("block" as const),
  resultSub: "nothing ships",
};
const size = gateSize(opts);
const CHECK_H = 44;
const ROW_PITCH = CHECK_H + 18;
const CHECK_W = 250;
const EXTRA_GAP = 50;
const built = gate("g", 0, 0, opts);
const check0 = built.find((sh) => sh.id === "g-check-0");
const extraW = CHECK_W - (check0?.w ?? CHECK_W);
const spreadH = checks.length * ROW_PITCH - 18;
const GX = Math.round((880 - (size.width + extraW + 2 * EXTRA_GAP)) / 2);
const GY = 40;
const midY = GY + spreadH / 2;
const checkX = GX + (check0?.x ?? 0) + EXTRA_GAP;
const checkY = (i: number) => midY - spreadH / 2 + i * ROW_PITCH + CHECK_H / 2;
const placed = built.map((sh): LayoutShape => {
  if (sh.type === "arrow") {
    const [kind, idx] = sh.id.split("-").slice(1);
    const i = Number(idx);
    const x = kind === "in" ? checkX - 24 : checkX + CHECK_W + 24;
    return { ...sh, via: [[x, checkY(i)]] };
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
  title:
    "The release gate: nine checks on as-of replays and seeded faults, one failing, so the candidate does not ship",
  width: 880,
  height: NOTE_Y + 48,
  shapes: [
    text(
      "head",
      8,
      `Every ranker, prompt, template or ontology release: ${EVAL.gated} replayed excursions, ${n(S.n)} seeded faults, ${n(S.nulls)} nulls`
    ),
    ...placed,
    text(
      "note-1",
      NOTE_Y,
      `${S.timeConfounded} of the seeded faults come with a benign change in the same window: the slice that catches time confounding.`
    ),
    text(
      "note-2",
      NOTE_Y + 20,
      "Replays run on as-of state, with knowledge approved before each case; measured values are illustrative."
    ),
  ],
};

export default spec;
