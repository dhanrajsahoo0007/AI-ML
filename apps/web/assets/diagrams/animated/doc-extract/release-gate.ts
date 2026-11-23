import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { gate, gateSize, n, PROD_TONE } from "@/components/diagrams/presets/production";
import { GATES } from "@/components/diagrams/presets/gcase-docextract";

// The document-extraction release gate (design sheet §13): a release candidate (a new page classifier) against the
// seven gates, one failing, so the release is blocked before its canary. Thresholds from GATES in
// presets/gcase-docextract.ts; the measured values are ILLUSTRATIVE (RUN below):
//   1 critical accuracy, paired on GATES.n = 2,000 invoices: drop ≤ GATES.margin ≈ 0.93 points (SE 0.32): −0.2: pass
//   2 replayed escapes, paired: new − old ≤ GATES.escapeMargin = 2: +1: pass
//   3 kind and splitting: 0 of 90 credit notes and statements posted as invoices (60 + 30, GATES.credit; bound ≤ 3.3%
//     by the rule of three): 1 of 90: FAIL (the candidate read a credit note's sign wrong)
//   4 calibration at each family threshold within its interval: pass
//   5 poisoned documents: 0 of 200 change a posted value or bank detail (bound GATES.poisonedBound ≈ 1.5%): 0: pass
//   6 p95 per route within N3 and cost per invoice within 10%: pass
//   7 STP on the replay not lower by more than 1 point, paired (McNemar): −0.4: pass
// Gates 1–2 are smoke tests with little power; the canary (10% of suppliers for 2 weeks) is where a release is really
// tested, which the second note says.
// One step. Layout (880 wide): gate() from presets/production.ts, checks spread 62 px apart and widened to 240 px, the
// change and the result moved out by 60 px each (the voice agent's release gate, with seven checks); every arrow bends
// 24 px from the check column so it enters level and crosses no neighbouring check; a heading above, two notes below.
// Colours (gate builder): the change neutral, passing checks lime, the failing check red, Block red.

/** Measured on the candidate (ILLUSTRATIVE). */
const RUN: Record<string, number> = {
  accuracyDropPts: 0.2,
  escapeDelta: 1,
  creditAsInvoice: 1,
  poisoned: 0,
  stpDropPts: 0.4,
};
const creditFiles = GATES.credit.creditNotes + GATES.credit.statements;

const checks = [
  {
    label: "Critical accuracy, paired",
    pass: RUN.accuracyDropPts <= GATES.margin * 100,
    sub: `−${RUN.accuracyDropPts} pts, margin ${(GATES.margin * 100).toFixed(2)}`,
  },
  {
    label: "Replayed escapes, paired",
    pass: RUN.escapeDelta <= GATES.escapeMargin,
    sub: `+${RUN.escapeDelta}, at most +${GATES.escapeMargin}`,
  },
  {
    label: "Credit notes as invoices",
    pass: RUN.creditAsInvoice === 0,
    sub: `${RUN.creditAsInvoice} of ${creditFiles}: fail`,
  },
  { label: "Calibration at thresholds", pass: true, sub: "inside each interval" },
  {
    label: "Poisoned documents",
    pass: RUN.poisoned === 0,
    sub: `${RUN.poisoned} of 200 change a value`,
  },
  { label: "p95 per route, cost", pass: true, sub: "within N3, cost +3%" },
  { label: "STP on the replay", pass: RUN.stpDropPts <= 1, sub: `−${RUN.stpDropPts} pts, at most −1` },
];

const opts = {
  change: { label: "Release candidate", sub: "new page classifier" },
  checks,
  result: checks.every((c) => c.pass) ? ("promote" as const) : ("block" as const),
  resultSub: "fix credit notes",
};
const size = gateSize(opts);
const CHECK_H = 44;
const ROW_PITCH = CHECK_H + 18;
const CHECK_W = 240;
const EXTRA_GAP = 60;
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
    // Fan in and out level: each arrow bends 24 px from the check column, so no line crosses a neighbouring check.
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
  title: "The extraction release gate: seven checks, one failing, so the release is blocked before its canary",
  width: 880,
  height: NOTE_Y + 48,
  shapes: [
    text(
      "head",
      8,
      `Every model, prompt, schema, OCR or scorer change: ${n(GATES.n)} gold invoices, ${GATES.classifierFiles} multi-document files, 200 poisoned`
    ),
    ...placed,
    text(
      "note-1",
      NOTE_Y,
      `Credit notes and statements: 0 of ${creditFiles} allowed (≤ ${(GATES.credit.bound * 100).toFixed(1)}% by the rule of three). One failing check blocks the release.`
    ),
    text(
      "note-2",
      NOTE_Y + 20,
      "Gates 1–2 are smoke tests; a passing release then runs on 10% of suppliers for 2 weeks. Measured values are illustrative."
    ),
  ],
};

export default spec;
