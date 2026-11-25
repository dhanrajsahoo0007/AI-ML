import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { gate, gateSize, n, PROD_TONE } from "@/components/diagrams/presets/production";
import { BUDGET, TARGETS } from "@/components/diagrams/presets/gcase-voice";

// The voice agent's release gate (design sheet §13): a release candidate (a new turn model) against the five gates,
// one failing, so the release is blocked. Targets from TARGETS in presets/gcase-voice.ts; the measured values are
// ILLUSTRATIVE (RUN below), except the p95 figures, which are the sheet's estimates from stage spreads (BUDGET.p95*,
// rounded to 50 ms: 1,494 → 1,500, 2,655 → 2,650, 1,716 → 1,700).
//   task success 87% ≥ 85% on 300 simulated callers: pass
//   order-number capture 98.6% ≥ 98% after read-back: pass
//   false cut-offs 6.1% > 5% on the 8 kHz turn-detection set: FAIL (a turn model trained on 16 kHz audio, the risk the
//   sheet names for Smart Turn)
//   p95 per turn type on 50 probe calls: no tool 1,500 ≤ 1,600, tool turn 2,650 ≤ 2,800, help 1,700 ≤ 1,900: pass
//   card digits in transcripts and prompts: 0 on the 100-call card-digit set: pass
// One step. Layout (880 wide): gate() from presets/production.ts, checks spread 74 px apart, widened to 220 px and
// moved 70 px further from the change and the result, so no arrow clips a neighbour, centred; a heading above and two notes below.
// Colours (gate builder): the change neutral, passing checks lime, the failing check red, Block red.

/** Measured on the candidate (ILLUSTRATIVE). */
const RUN = { taskSuccess: 0.87, orderNumbers: 0.986, falseCutoffs: 0.061, cardDigits: 0 } as const;
const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;
const r50 = (ms: number) => Math.round(ms / 50) * 50;

const checks = [
  {
    label: `Task success ≥ ${pct(TARGETS.taskSuccess)}`,
    pass: RUN.taskSuccess >= TARGETS.taskSuccess,
    sub: `${pct(RUN.taskSuccess)} on 300 simulated calls`,
  },
  {
    label: `Order numbers ≥ ${pct(TARGETS.orderNumberCapture)}`,
    pass: RUN.orderNumbers >= TARGETS.orderNumberCapture,
    sub: `${pct(RUN.orderNumbers, 1)} after read-back`,
  },
  {
    label: `False cut-offs ≤ ${pct(TARGETS.falseCutoffs)}`,
    pass: RUN.falseCutoffs <= TARGETS.falseCutoffs,
    sub: `${pct(RUN.falseCutoffs, 1)} on 8 kHz calls: fail`,
  },
  {
    label: "p95 per turn type",
    pass:
      BUDGET.p95NoTool <= TARGETS.p95NoToolMs &&
      BUDGET.p95Tool <= TARGETS.p95ToolContentMs &&
      BUDGET.p95Help <= TARGETS.p95HelpMs,
    sub: `${n(r50(BUDGET.p95NoTool))} / ${n(r50(BUDGET.p95Tool))} / ${n(r50(BUDGET.p95Help))} ms on probes`,
  },
  {
    label: `${TARGETS.cardDigits} card digits stored`,
    pass: RUN.cardDigits <= TARGETS.cardDigits,
    sub: `${RUN.cardDigits} on 100 digit calls`,
  },
];

const opts = {
  change: { label: "Release candidate", sub: "new turn model" },
  checks,
  result: checks.every((c) => c.pass) ? ("promote" as const) : ("block" as const),
  resultSub: "fix cut-offs",
};
const size = gateSize(opts);
// The builder packs checks 12 px apart, so the arrows to the outer checks clip their neighbours, and the p95 sub needs
// a wider box. Spread the checks to ROW_PITCH, widen them to CHECK_W and move the result right by the extra width; the
// arrows follow because they are drawn between shape ids.
const CHECK_H = 44;
const ROW_PITCH = CHECK_H + 30;
const CHECK_W = 220;
const EXTRA_GAP = 70; // added to each column gap, so the arrows to the outer checks pass left of the inner ones
const built = gate("g", 0, 0, opts);
const check0 = built.find((sh) => sh.id === "g-check-0");
const extraW = CHECK_W - (check0?.w ?? CHECK_W);
const spreadH = checks.length * ROW_PITCH - 30;
const GX = Math.round((880 - (size.width + extraW + 2 * EXTRA_GAP)) / 2);
const GY = 40;
const midY = GY + spreadH / 2;
const placed = built.map((sh): LayoutShape => {
  if (sh.type === "arrow") return sh;
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
  title: "The voice agent's release gate: five checks, one failing, so the release is blocked",
  width: 880,
  height: NOTE_Y + 48,
  shapes: [
    text(
      "head",
      8,
      "Every release, per intent: 300 simulated callers, the 8 kHz turn set, 50 probe calls, the card-digit set"
    ),
    ...placed,
    text(
      "note-1",
      NOTE_Y,
      `p95 targets: no tool ${n(TARGETS.p95NoToolMs)}, tool turn ${n(TARGETS.p95ToolContentMs)}, help ${n(TARGETS.p95HelpMs)} ms. One failing check blocks the release.`
    ),
    text(
      "note-2",
      NOTE_Y + 20,
      "Measured values are illustrative; the p95 figures are the sheet's estimates from stage spreads."
    ),
  ],
};

export default spec;
