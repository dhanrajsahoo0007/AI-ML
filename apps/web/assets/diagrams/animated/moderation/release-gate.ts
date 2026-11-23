import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { gate, gateSize, PROD_TONE } from "@/components/diagrams/presets/production";
import { GATES, LATENCY, REPLAY_SLICE, TARGETS } from "@/components/diagrams/presets/gcase-moderation";

// The moderation release gate (content-moderation-system, design sheet §13 "Gold sets and gates", after the
// interviewer pass; preset GATES and REPLAY_SLICE in presets/gcase-moderation.ts). A change to a classifier, edge,
// prompt, policy, model or normaliser meets seven gates. This release is a hate prompt change with a bug that doubles
// false alarms on German hate only. Measured values are ILLUSTRATIVE (RUN):
//   1 paired non-inferiority on the locked hold-out, per family, recall and specificity: margin GATES.margin ≈ 3.1
//     points at 3% discordance (SE √(0.03 ÷ 500) ≈ 0.0077; an equal release passes all ten with ≥ 90%); run: −0.8
//     points worst: pass (the hold-out has few German near-misses, so it misses this bug);
//   2 language and market slices: warnings above a 5-point drop: none: pass;
//   3 red-team regression set: every past attack still fails; injection 0 of 100 false allows: pass;
//   4 CSEA and NCII: none routed to the model; a replay of 10,000 known hashes loses none: pass;
//   5 shadow on live band traffic: action rate per family within ± 10% (hate +2.1% overall): pass;
//   6 latency p95 per path within N3, cost per 1,000 units within 10%: pass;
//   7 live guard after rollout, per market × model family slice (REPLAY_SLICE): 2,000 known-fine near-miss band units an
//     hour through the model, ≈ 3% false alarms → Poisson(60); trip at ≥ 84 in two consecutive hours (≈ 0.23% false a
//     day across 25 slices; a 2× bug caught ≈ 99.96% within two hours). Run: DE × hate 118 then 124: FAIL → roll back.
//     The global replay (200,000 known-fine units an hour, trip at ≥ GATES.replayK = 35) saw 21: a bug confined to
//     German hate trips it only REPLAY_SLICE.globalDeOnly2x ≈ 0.6% of hours.
// One step. Layout (880 wide): gate() from presets/production.ts, checks spread 54 px apart and widened to 320 px, the
// result moved right by the extra width, arrows fanned through points 24 px from each check (as in
// llm-gateway/release-gate); a heading above and notes below.
// Colours (gate builder): the change neutral, passing checks lime, the failing check red, the result red.

const RUN = {
  pairedWorstDrop: 0.008,
  sliceWarnings: 0,
  injectionFalseAllows: 0,
  hashesLost: 0,
  shadowHate: 0.021,
  latencyOk: LATENCY.textPre.p95 <= TARGETS.textPreP95Ms && LATENCY.heldRelease.p95 <= TARGETS.heldReleaseP95Ms,
  costDelta: 0.004,
  sliceHours: [118, 124],
  globalReplay: 21,
};
const pts = (v: number) => `${(v * 100).toFixed(1)}`;

const checks = [
  {
    label: `Paired hold-out: drop ≤ ${pts(GATES.margin)} points`,
    pass: RUN.pairedWorstDrop <= GATES.margin,
    sub: `worst family-metric −${pts(RUN.pairedWorstDrop)} points`,
  },
  {
    label: "Language and market slices",
    pass: RUN.sliceWarnings === 0,
    sub: "warnings above a 5-point drop: none",
  },
  {
    label: "Red-team regression set",
    pass: RUN.injectionFalseAllows === 0,
    sub: `past attacks fail; injection ${RUN.injectionFalseAllows} of 100 allowed`,
  },
  {
    label: "CSEA and NCII never reach the model",
    pass: RUN.hashesLost === 0,
    sub: "10,000 known hashes replayed: none lost",
  },
  {
    label: "Shadow: action rate within ± 10%",
    pass: Math.abs(RUN.shadowHate) <= 0.1,
    sub: `hate +${pts(RUN.shadowHate)}% overall`,
  },
  {
    label: "Latency p95 and cost within 10%",
    pass: RUN.latencyOk && RUN.costDelta <= 0.1,
    sub: `text ${Math.round(LATENCY.textPre.p95)} ms; cost +${pts(RUN.costDelta)}%`,
  },
  {
    label: `Live: replay per market × family`,
    pass: RUN.sliceHours.some((k) => k < REPLAY_SLICE.k),
    sub: `DE × hate: ${RUN.sliceHours.join(", then ")} (trips at ≥ ${REPLAY_SLICE.k} twice)`,
  },
];

const opts = {
  change: { label: "Hate prompt release", sub: "bug: 2× DE alarms" },
  checks,
  result: checks.every((c) => c.pass) ? ("promote" as const) : ("block" as const),
  resultSub: "roll back",
};
const size = gateSize(opts);
const CHECK_H = 44;
const ROW_PITCH = CHECK_H + 10;
const CHECK_W = 320;
const EXTRA_GAP = 30;
const built = gate("g", 0, 0, opts);
const check0 = built.find((sh) => sh.id === "g-check-0");
const extraW = CHECK_W - (check0?.w ?? CHECK_W);
const spreadH = checks.length * ROW_PITCH - 10;
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

const text = (id: string, y: number, label: string, quiet = false): LayoutShape => ({
  id,
  type: "text",
  x: 12,
  y,
  w: 856,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  quiet,
});

const spec: LayoutSpec = {
  kind: "layout",
  title:
    "The moderation release gate: a German-only hate bug passes six gates and trips the per-slice replay, so it rolls back",
  width: 880,
  height: NOTE_Y + 70,
  shapes: [
    text("head", 8, "Every classifier, edge, prompt, policy, model or normaliser change meets the same seven gates"),
    ...placed,
    text(
      "note-1",
      NOTE_Y,
      `Per slice: ${REPLAY_SLICE.units.toLocaleString("en-GB")} known-fine near-miss units an hour, about ${REPLAY_SLICE.base} false alarms expected; a 2× bug is caught within two hours ≈ ${(REPLAY_SLICE.catch2xTwoHours * 100).toFixed(2)}% of the time.`
    ),
    text(
      "note-2",
      NOTE_Y + 20,
      `The global replay saw ${RUN.globalReplay} (trips at ≥ ${GATES.replayK}): a bug in German hate alone trips it only ≈ ${(REPLAY_SLICE.globalDeOnly2x * 100).toFixed(1)}% of hours.`,
      true
    ),
    text("note-3", NOTE_Y + 40, "Measured values are illustrative; the thresholds are the design's.", true),
  ],
};

export default spec;
