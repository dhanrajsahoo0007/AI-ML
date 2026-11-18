import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { FAB, STATS } from "@/components/diagrams/presets/gcase-kgsemi";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";

// Ranked hypotheses with evidence, then the engineer's confirmation (kg-semiconductor-case-study, Steps 5 and 7; design
// sheet §6 `hypotheses` event, §9, §10.15–10.17, §15.3). The investigation is INVENTED and illustrative; numbers are
// STATS and FAB in presets/gcase-kgsemi.ts:
//   1 The table, rendered by code before any model text: rank 1 "ETCH04 path B → strip 2, step 412" (chamber B and
//     strip chamber 2 have identical wafer sets, STATS.stripPathJaccard = 1, so they are one cluster); held-out effect
//     80% [70–87%] vs 4.0% [1.8–8.8%] (lot-cluster intervals, STATS.heldOutBCluster and .heldOutSisterCluster); 20 of
//     20 held-out ETCH04 lots; change-point at day 0, WO-55120; confidence "high" (calibrated on rolling-origin replay).
//     The "checked and not supported" list (WET07, PR-552, probe card) and the coverage gap (slurry lot known for 58% of
//     wafers, below the 80% floor: not testable, never "ruled out") sit under it. Only the first hypothesis is drawn:
//     the sheet's worked example gives no numbers for ranks 2 and 3.
//   2 Evidence per hypothesis: mechanism path edge-ring part → edge etch-rate shift → edge-ring signature (FMEA row
//     3311, approved); DC bias in the main etch +STATS.traceShiftPct = 6.1% after the swap; post-PM qualification (etch
//     rate in spec, edge not measured); past case EXC-2025-031; WIP at risk STATS.wipAtRiskPasses ≈ 10,700 wafer
//     passes through ETCH04-B in the last floor(FAB.sortLagDays) = 29 days, not yet sorted (FAB.wafersPerChamberPerDay
//     368 × 29).
//   3 Confirmation and the loop: checks from DETECTED_BY and past cases (the part record and edge-ring height for
//     WO-55120, inline edge CD on chamber-B wafers against sister chambers, a split of the next lot across B and A) →
//     the 8D owner's verdict (confirmed, rejected or inconclusive, with evidence ids and ranking_seen) → an
//     ExcursionCase node that feeds past-case search and the replay set. The engineer inhibits in MES; the assistant
//     never acts.
// Steps: 1 the ranked table · 2 the evidence behind rank 1 · 3 checks, verdict, excursion case.
// Layout (880 wide): a six-column table at y 34 (rank 50, hypothesis 260, effect 236, lots 90, change-point 130,
// confidence 90), full-width rows under it; five 164-wide evidence boxes at y 246; three 260-wide boxes at y 372.
// Colours: header cells neutral, rank 1 red (the suspect), ruled-out rows lime (checks), the gap neutral; evidence boxes
// blue (data), WIP at risk orange (what the engineer acts on); checks lime, the verdict orange (a person), the case
// violet (stored).

const COLS = [
  { id: "rank", x: 12, w: 50, head: "#" },
  { id: "hyp", x: 62, w: 260, head: "Hypothesis (a cluster)" },
  { id: "effect", x: 322, w: 236, head: "Held-out effect, lot-cluster" },
  { id: "lots", x: 558, w: 90, head: "Lots" },
  { id: "change", x: 648, w: 130, head: "Change-point" },
  { id: "conf", x: 778, w: 90, head: "Confidence" },
] as const;
const T0 = 34;
const HEAD_H = 28;
const ROW_H = 44;
const FULL_H = 30;

const cell = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone: LayoutTone,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "cell", x, y, w, h, label, tone, fill: "soft", step, quiet: true, ...extra });

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  sub: string,
  tone: LayoutTone,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "box", x, y, w, h, label, sub, tone, fill: "pastel", step, ...extra });

const text = (id: string, y: number, label: string, step: number, extra: Partial<LayoutShape> = {}): LayoutShape => ({
  id,
  type: "text",
  x: 12,
  y,
  w: 856,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
  ...extra,
});

const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const range = (ci: { low: number; high: number }, d = 0) =>
  `${(ci.low * 100).toFixed(d)}–${(ci.high * 100).toFixed(d)}%`;
const effect = `${pct(STATS.heldOutB.p)} [${range(STATS.heldOutBCluster)}] vs ${pct(STATS.heldOutSister.p, 1)} [${range(STATS.heldOutSisterCluster, 1)}]`;
const ROW1 = [
  "1",
  "ETCH04 path B → strip 2, step 412",
  effect,
  `${STATS.etch04LotsWithBSignature.heldOut} of ${STATS.etch04LotsWithBSignature.of}`,
  "day 0, WO-55120",
  "high",
];

const R1 = T0 + HEAD_H;
const R2 = R1 + ROW_H;
const R3 = R2 + FULL_H;
const NOTE1 = R3 + FULL_H + 8;
const E = 246;
const EW = 164;
const ex = (i: number) => 12 + i * (EW + 9);
const C = 372;
const CW = 260;
const cx = (i: number) => 12 + i * (CW + 38);
const wip = Math.round(STATS.wipAtRiskPasses / 100) * 100;

const spec: LayoutSpec = {
  kind: "layout",
  title: "Ranked hypotheses with evidence, then the engineer's checks, verdict and excursion case",
  width: 880,
  height: C + 130,
  steps: [
    { title: "The ranked table, rendered by code before any model text" },
    { title: "The evidence behind rank 1, and the WIP at risk" },
    { title: "Confirmation checks, the 8D owner's verdict, an excursion case" },
  ],
  shapes: [
    // Step 1: the table.
    text(
      "h1",
      8,
      "hypotheses event: effect sizes with intervals, lots involved, change-point, confidence; no p-value",
      1
    ),
    ...COLS.map((c) => cell(`head-${c.id}`, c.x, T0, c.w, HEAD_H, c.head, "neutral", 1)),
    ...COLS.map((c, i) =>
      cell(`r1-${c.id}`, c.x, R1, c.w, ROW_H, ROW1[i], i === 1 ? GENAI_TONE.failure : "neutral", 1, {
        fill: i === 1 ? "pastel" : "soft",
        ...(i === 1 ? { highlight: true, quiet: false } : {}),
      })
    ),
    cell(
      "ruled-out",
      12,
      R2,
      856,
      FULL_H,
      `Checked and not supported: WET07 (residual ${pct(STATS.wet07Residual.rate, 1)} vs ${pct(STATS.wet07Residual.otherRate, 1)}) · PR-552 (${pct(STATS.pr552.sigRateNonB, 1)} vs ${pct(STATS.pr552.otherLotsSigRateNonB, 1)}) · probe card (${pct(STATS.probeCard.maxSigShare)} vs ${pct(STATS.probeCard.maxTestedShare)}; ${STATS.probeCard.recovered} of ${STATS.probeCard.retested} recovered)`,
      GENAI_TONE.check,
      1
    ),
    cell(
      "gap",
      12,
      R3,
      856,
      FULL_H,
      "Not testable: slurry lot known for 58% of wafers (floor 80%); never shown as ruled out",
      "neutral",
      1
    ),
    text(
      "note-1",
      NOTE1,
      "The explanation cannot add, drop or re-rank a row; every number it quotes must be in the evidence.",
      1,
      {
        quiet: true,
      }
    ),

    // Step 2: the evidence behind rank 1.
    text("h2", E - 26, "Evidence behind rank 1, each an id the explanation cites", 2),
    box("ev-mech", ex(0), E, EW, 56, "Mechanism path", "FMEA row 3311, approved", GENAI_TONE.data, 2),
    box("ev-sensor", ex(1), E, EW, 56, "Sensor", `DC bias +${STATS.traceShiftPct}% after swap`, GENAI_TONE.data, 2),
    box("ev-qual", ex(2), E, EW, 56, "Post-PM monitor", "edge not measured", GENAI_TONE.data, 2),
    box("ev-case", ex(3), E, EW, 56, "Past case", "EXC-2025-031", GENAI_TONE.data, 2),
    box(
      "ev-wip",
      ex(4),
      E,
      EW,
      56,
      "WIP at risk",
      `≈ ${n(wip)} passes, ${Math.floor(FAB.sortLagDays)} days`,
      GENAI_TONE.user,
      2,
      {
        highlight: true,
      }
    ),

    // Step 3: checks, verdict, case.
    box("check", cx(0), C, CW, 60, "Confirmation checks", "part record, edge CD, split lot", GENAI_TONE.check, 3),
    box("verdict", cx(1), C, CW, 60, "8D owner's verdict", "evidence ids, ranking_seen", GENAI_TONE.user, 3, {
      highlight: true,
    }),
    box("case", cx(2), C, CW, 60, "ExcursionCase", "past cases, replay set", GENAI_TONE.store, 3),
    { id: "a-verdict", type: "arrow", x: 0, y: 0, from: "check", to: "verdict", step: 3 },
    { id: "a-case", type: "arrow", x: 0, y: 0, from: "verdict", to: "case", step: 3 },
    text(
      "note-3",
      C + 76,
      "Confirmed, rejected or inconclusive. The engineer inhibits in MES; the assistant never acts.",
      3,
      {
        quiet: true,
      }
    ),
  ],
};

export default spec;
