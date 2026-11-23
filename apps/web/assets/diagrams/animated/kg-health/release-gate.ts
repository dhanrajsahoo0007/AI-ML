import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { gate, gateSize, n, PROD_TONE } from "@/components/diagrams/presets/production";
import { EVAL, LATENCY } from "@/components/diagrams/presets/gcase-kghealth";

// The release gate (kg-healthcare-case-study, Step 8; design sheet §13): a knowledge release candidate against nine
// checks, one failing, so the snapshot is not swapped. Thresholds from EVAL and LATENCY in presets/gcase-kghealth.ts;
// the measured values are ILLUSTRATIVE (RUN below):
//   1 high-priority interactions: EVAL.highPriorityCases = 15 pairs × 10 orderable variants = 150 of 150 (0 misses bound
//     the miss rate below EVAL.highPriorityUpperMiss = 2%, rule of three): pass
//   2 every interaction pair as orderable products: EVAL.exhaustiveCases = 300,000 × 10 = 3M deterministic cases, 100%
//     required (≈ 23 minutes on 64 cores): pass
//   3 patient contexts: EVAL.majorSample = 2,000 of 2,000 (bound ≈ 0.15% per order): pass
//   4 dosing grid: EVAL.slices.dosingGrid = 32 of 32 (0–3 criteria × inhibitor × intended 5 or 2.5 mg × AF or VTE): pass
//   5 outside-lab units slice: 0 errors allowed in EVAL.slices.units = 200 (0 of 200 bounds the rate below
//     EVAL.unitsWilsonAtZero ≈ 1.9%, Wilson): 2 of 200 (µmol/L creatinine read as mg/dL): FAIL
//   6 assertion F1 ≥ 0.95 on the linking set (EVAL.linkingMentions = 8,000 mentions): pass
//   7 clinician-graded set: acceptable ≥ 95% on EVAL.clinicianSet = 600, 0 major hallucinations: pass
//   8 abstention ≥ 95% on EVAL.abstentionSet = 150, wrong-patient cases 20 of 20: pass
//   9 peak-hour latency: vendor first-token p95 under LATENCY.firstTokenP95Breakpoint ≈ 1.74 s, decode above
//     LATENCY.decodeP50Breakpoint ≈ 70 tokens a second; alert burden ≤ 2 cards per 100 orders: pass
// One step. Layout (880 wide): gate() from presets/production.ts, checks spread 62 px apart and widened to 250 px, the
// change and the result moved out by 50 px each (the document-extraction release gate, with nine checks); every arrow
// bends 24 px from the check column so it enters level and crosses no neighbouring check; a heading above, two notes
// below.
// Colours (gate builder): the change neutral, passing checks lime, the failing check red, Block red.

/** Measured on the candidate (ILLUSTRATIVE). */
const RUN: Record<"unitErrors" | "assertionF1" | "clinicianAcceptable" | "abstention", number> = {
  unitErrors: 2,
  assertionF1: 0.96,
  clinicianAcceptable: 0.962,
  abstention: 0.96,
};
const s = EVAL.slices;

const checks = [
  { label: "High-priority interactions", pass: true, sub: `${EVAL.highPriorityCases} of ${EVAL.highPriorityCases}` },
  { label: "Every pair as products", pass: true, sub: `${n(EVAL.exhaustiveCases / 1e6)}M cases, 100%` },
  { label: "Patient contexts", pass: true, sub: `${n(EVAL.majorSample)} of ${n(EVAL.majorSample)}` },
  { label: "Dosing grid", pass: true, sub: `${s.dosingGrid} of ${s.dosingGrid} combinations` },
  {
    label: "Outside-lab units slice",
    pass: RUN.unitErrors === 0,
    sub: `${RUN.unitErrors} errors in ${s.units}: fail`,
  },
  { label: "Assertion F1", pass: RUN.assertionF1 >= 0.95, sub: `${RUN.assertionF1.toFixed(2)} ≥ 0.95` },
  {
    label: "Clinician-graded set",
    pass: RUN.clinicianAcceptable >= 0.95,
    sub: `${(RUN.clinicianAcceptable * 100).toFixed(1)}% acceptable, 0 major`,
  },
  {
    label: "Abstention, right patient",
    pass: RUN.abstention >= 0.95,
    sub: `${Math.round(RUN.abstention * 100)}%; ${s.wrongPatient} of ${s.wrongPatient} patient cases`,
  },
  { label: "Peak-hour latency, burden", pass: true, sub: "first token, decode, ≤ 2 per 100" },
];

const opts = {
  change: { label: "Knowledge release", sub: "vendor-2026.12.1 + map" },
  checks,
  result: checks.every((c) => c.pass) ? ("promote" as const) : ("block" as const),
  resultSub: "keep kg-2026-11-14",
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
  title: "The release gate: nine checks inside the PHI zone, one failing, so the snapshot is not swapped",
  width: 880,
  height: NOTE_Y + 48,
  shapes: [
    text(
      "head",
      8,
      `Every knowledge, mapping, model or prompt release: ${n(EVAL.exhaustiveCases)} rule cases, ${EVAL.clinicianSet} graded questions, slices`
    ),
    ...placed,
    text(
      "note-1",
      NOTE_Y,
      `Units slice: 0 errors allowed in ${s.units} (0 of ${s.units} bounds the rate below ${(EVAL.unitsWilsonAtZero[1] * 100).toFixed(1)}%). One failing check blocks the swap.`
    ),
    text(
      "note-2",
      NOTE_Y + 20,
      `Latency gate: vendor first-token p95 under ≈ ${(LATENCY.firstTokenP95Breakpoint / 1_000).toFixed(2)} s, decode above ≈ ${Math.round(LATENCY.decodeP50Breakpoint)} tokens a second. Measured values illustrative.`
    ),
  ],
};

export default spec;
