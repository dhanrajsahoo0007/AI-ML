import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { STATS } from "@/components/diagrams/presets/gcase-kgsemi";
import { PROD_TONE, n } from "@/components/diagrams/presets/production";

// From candidates to a replicated effect (kg-semiconductor-case-study, Step 4 and deep dive 3; design sheet §9, §10.9,
// §10.10, §15.3). The worked investigation is INVENTED and illustrative; every number is STATS in
// presets/gcase-kgsemi.ts:
//   1 Change-point on chamber B at step 412 (process time, not sort date): STATS.before 10 of 250 = 4.0% [2.2–7.2%] in
//     the 10 days before day 0, STATS.after 200 of 250 = 80% [74.6–84.5%] after (Wilson intervals, as the sheet's §9
//     prints them); sister chambers flat at 4%. Day 0 is work order WO-55120 (edge ring, new part revision, part lot
//     PL-2291). Cohort: STATS.cohortLots 80 lots, STATS.cohortWafers 2,000 wafers.
//   2 Two ordered families, 10,000 within-lot permutations each, max-T (Westfall–Young): STATS.withinLot 5,360 at
//     α 0.04, then STATS.lotLevel 1,680 on the residual wafers at α 0.01 (material lots 200, test side 90, reticles 150,
//     tool at a step STATS.toolAtStep 1,120 and batch-tool runs STATS.batchRuns 120: a tool-wide cause shows no
//     within-lot difference, so it is lot level; family-wise error ≤ 0.05 under any dependence); without it,
//     268 + 84 = STATS.chanceHits 352 chance hits at p < 0.05 over STATS.tests 7,040. The top STATS.preRegistered 3
//     are pre-registered for held-out replication at 0.05 ÷ 3 ("replicated" is the statistic's word; "confirmed" is
//     the 8D owner's verdict).
//   3 Why the order matters (review item R2-4): WET07, a batch wet bench at step 414, ran STATS.wet07.etch04Lots 28 of
//     the 40 bad (ETCH04) lots against 12 of the 40 clean ones, so a lot-level test on its own would flag it; on the
//     residual non-B wafers its lots show 4.0% (33 of 825) against 4.0% (37 of 925) elsewhere: checked and not
//     supported. (Its one-sided p ≈ 3.5 × 10⁻⁴ is not printed: no p-value is evidence strength here.)
//   4 Held-out replication on 50 lots that did not select it: chamber B STATS.heldOutB 100 of 125 = 80%, sister
//     chambers in the same 20 ETCH04 lots STATS.heldOutSister 15 of 375 = 4.0%; lot-cluster-adjusted intervals (design
//     effect, illustrative intra-lot correlation STATS.icc 0.1): STATS.heldOutBCluster 70–87% and
//     STATS.heldOutSisterCluster 1.8–8.8% (the narrower Wilson intervals are not shown); risk difference 76 points;
//     20 of 20 ETCH04 lots show it. Checked and not supported: WET07, PR-552 (non-B 4.0% vs 4.0%), probe card and
//     tester (largest card 22% of signature wafers vs 20% of wafers tested; 0 of 30 recovered on retest).
// Steps: 1 the change-point · 2 two ordered families with max-T · 3 WET07, unconditional vs residual · 4 the held-out
// effect with intervals, and what was ruled out.
// Layout (880 wide): band 1 (y 0–200) a step chart, x = process day −10..10 over x 160–840, y = 0–100% over 120 px;
// band 2 (y 214) three boxes; band 3 (y 352) two boxes; band 4 (y 472) an interval chart, 0–100% over x 240–780.
// Colours: chamber B and its intervals red (the failure), sister chambers and residual tests lime (checks), the
// families lime (rank), the naive lot-level test red, text neutral.

const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const range = (ci: { low: number; high: number }, d = 0) =>
  `${(ci.low * 100).toFixed(d)}–${(ci.high * 100).toFixed(d)}%`;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "text", x, y, w, h: 18, label, tone: PROD_TONE.infra, step, ...extra });

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

const line = (id: string, points: [number, number][], step: number, extra: Partial<LayoutShape> = {}): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points,
  step,
  quiet: true,
  ...extra,
});

// Band 1: the step chart.
const dayX = (d: number) => 160 + ((d + 10) / 20) * 680;
const rateY = (p: number) => 170 - p * 120;
const B_BEFORE = STATS.before.p;
const B_AFTER = STATS.after.p;

// Band 2 and 3.
const B2 = 214;
const B3 = 352;

// Band 4: the interval chart.
const B4 = 472;
const ix = (p: number) => 240 + p * 540;
const ROW1 = B4 + 44;
const ROW2 = B4 + 84;
const AXIS = B4 + 112;
const interval = (
  id: string,
  y: number,
  ci: { low: number; high: number },
  p: number,
  tone: LayoutTone,
  label: string,
  value: string
): LayoutShape[] => [
  text(`${id}-label`, 12, y - 9, 216, label, 4, { quiet: true }),
  {
    id: `${id}-ci`,
    type: "cell",
    x: ix(ci.low),
    y: y - 4,
    w: Math.max(4, ix(ci.high) - ix(ci.low)),
    h: 8,
    tone,
    fill: "pastel",
    step: 4,
    quiet: true,
  },
  { id: `${id}-pt`, type: "circle", x: ix(p), y, w: 12, tone, fill: "pastel", step: 4, quiet: true },
  text(`${id}-value`, ix(ci.high) + 8, y - 9, 110, value, 4, { quiet: true }),
];

const ho = STATS.heldOut;
const res = STATS.wet07Residual;
const resK = Math.round(res.wafers * res.rate);
const otherK = Math.round(res.otherWafers * res.otherRate);

const spec: LayoutSpec = {
  kind: "layout",
  title: `From ${n(STATS.tests)} candidates to one replicated effect: change-point, ordered max-T, held-out lots, ruled-out suspects`,
  width: 880,
  height: AXIS + 96,
  steps: [
    { title: "A change-point on chamber B, in process time" },
    { title: `Two ordered families, max-T over ${n(STATS.tests)} candidates` },
    { title: "Why the order matters: WET07 tested alone, then on the residual wafers" },
    { title: "Replicated on held-out lots, with lot-cluster intervals; what was ruled out" },
  ],
  shapes: [
    // Step 1: the change-point.
    text(
      "h1",
      12,
      6,
      856,
      `Chamber B at step 412, signature rate by process day (cohort: ${STATS.cohortLots} lots, ${n(STATS.cohortWafers)} wafers)`,
      1
    ),
    line(
      "axis-1",
      [
        [dayX(-10), rateY(0)],
        [dayX(10), rateY(0)],
      ],
      1
    ),
    line(
      "b-rate",
      [
        [dayX(-10), rateY(B_BEFORE)],
        [dayX(0), rateY(B_BEFORE)],
        [dayX(0), rateY(B_AFTER)],
        [dayX(10), rateY(B_AFTER)],
      ],
      1,
      { tone: GENAI_TONE.failure, quiet: false, highlight: true }
    ),
    line(
      "sister-rate",
      [
        [dayX(0) + 4, rateY(STATS.background)],
        [dayX(10), rateY(STATS.background)],
      ],
      1,
      { dashed: true, tone: GENAI_TONE.check }
    ),
    line(
      "day0",
      [
        [dayX(0), rateY(1) - 4],
        [dayX(0), rateY(0) + 4],
      ],
      1,
      { dashed: true }
    ),
    text(
      "t-before",
      dayX(-10),
      rateY(B_BEFORE) - 24,
      300,
      `before: ${pct(B_BEFORE, 1)} [${range(STATS.before.ci, 1)}]`,
      1,
      {
        quiet: true,
      }
    ),
    text("t-after", dayX(0) + 12, rateY(B_AFTER) - 24, 300, `after: ${pct(B_AFTER)} [${range(STATS.after.ci, 1)}]`, 1, {
      quiet: true,
    }),
    text("t-sister", dayX(0) + 60, rateY(STATS.background) - 30, 270, "sister chambers A, C, D: flat at 4%", 1, {
      quiet: true,
    }),
    text("t-day0", dayX(0) - 330, rateY(1) - 2, 320, "day 0: WO-55120, edge ring, new revision", 1, { quiet: true }),
    text("t-dm10", dayX(-10) - 40, rateY(0) + 6, 80, "day −10", 1, { quiet: true }),
    text("t-d0", dayX(0) - 40, rateY(0) + 6, 80, "day 0", 1, { quiet: true }),
    text("t-d10", dayX(10) - 60, rateY(0) + 6, 80, "day 10", 1, { quiet: true }),
    text("t-y0", 100, rateY(0) - 9, 50, "0%", 1, { quiet: true }),
    text("t-y80", 100, rateY(B_AFTER) - 9, 50, "80%", 1, { quiet: true }),

    // Step 2: two ordered families, max-T.
    box(
      "fam-1",
      12,
      B2,
      300,
      64,
      `Within lot: ${n(STATS.withinLot)} candidates`,
      `chamber at step or any step, recipe body, PM; α ${STATS.alphaWithin}`,
      GENAI_TONE.rank,
      2
    ),
    box(
      "fam-2",
      352,
      B2,
      300,
      64,
      `Lot level: ${n(STATS.lotLevel)} on residual wafers`,
      `tool at a step, batch runs, materials; α ${STATS.alphaLot}`,
      GENAI_TONE.rank,
      2
    ),
    box(
      "top3",
      692,
      B2,
      176,
      64,
      `Top ${STATS.preRegistered}, pre-registered`,
      "for held-out lots",
      GENAI_TONE.check,
      2
    ),
    { id: "a-fam", type: "arrow", x: 0, y: 0, from: "fam-1", to: "fam-2", label: "then", step: 2 },
    { id: "a-top", type: "arrow", x: 0, y: 0, from: "fam-2", to: "top3", step: 2 },
    text(
      "t-maxt",
      12,
      B2 + 74,
      856,
      `${n(STATS.permutations)} within-lot permutations, max-T: family-wise error ≤ 0.05 under any dependence. Without it: ${STATS.chanceHitsWithin} + ${STATS.chanceHitsLot} = ${STATS.chanceHits} chance hits at p < 0.05.`,
      2,
      { quiet: true }
    ),

    // Step 3: WET07.
    text("h3", 12, B3 - 22, 856, "WET07, a batch wet bench at step 414 that ran most of the bad tool's lots", 3),
    box(
      "wet-naive",
      12,
      B3,
      380,
      64,
      `Tested alone, by lot: ${STATS.wet07.etch04Lots} of 40 bad lots vs 12 of 40`,
      "flagged: it shares the bad lots, not the cause",
      GENAI_TONE.failure,
      3
    ),
    box(
      "wet-residual",
      478,
      B3,
      390,
      64,
      `Residual non-B wafers: ${pct(res.rate, 1)} vs ${pct(res.otherRate, 1)}`,
      `${resK} of ${n(res.wafers)} vs ${otherK} of ${n(res.otherWafers)}: checked and not supported`,
      GENAI_TONE.check,
      3
    ),
    { id: "a-wet", type: "arrow", x: 0, y: 0, from: "wet-naive", to: "wet-residual", label: "ordered", step: 3 },

    // Step 4: held-out replication with lot-cluster intervals.
    text(
      "h4",
      12,
      B4,
      856,
      `Replicated on ${ho.lots} held-out lots that did not select it; the same ${STATS.etch04LotsWithBSignature.of} ETCH04 lots (lot-cluster intervals)`,
      4
    ),
    ...interval(
      "b",
      ROW1,
      STATS.heldOutBCluster,
      STATS.heldOutB.p,
      GENAI_TONE.failure,
      `Chamber B, ${ho.bWafers} wafers`,
      `${pct(STATS.heldOutB.p)} [${range(STATS.heldOutBCluster)}]`
    ),
    ...interval(
      "s",
      ROW2,
      STATS.heldOutSisterCluster,
      STATS.heldOutSister.p,
      GENAI_TONE.check,
      `Sisters A, C, D, ${ho.sisterWafers}`,
      `${pct(STATS.heldOutSister.p, 1)} [${range(STATS.heldOutSisterCluster, 1)}]`
    ),
    line(
      "axis-4",
      [
        [ix(0), AXIS],
        [ix(1), AXIS],
      ],
      4
    ),
    text("t-x0", ix(0) - 30, AXIS + 4, 60, "0%", 4, { quiet: true }),
    text("t-x50", ix(0.5) - 30, AXIS + 4, 60, "50%", 4, { quiet: true }),
    text("t-x100", ix(1) - 40, AXIS + 4, 60, "100%", 4, { quiet: true }),
    text(
      "foot-1",
      12,
      AXIS + 32,
      856,
      `Risk difference ${Math.round(STATS.riskDifference * 100)} points; ${STATS.etch04LotsWithBSignature.heldOut} of ${STATS.etch04LotsWithBSignature.of} lots show it; passes at 0.05 ÷ ${STATS.preRegistered}. No p-value is shown to the engineer.`,
      4,
      { quiet: true }
    ),
    text(
      "foot-2",
      12,
      AXIS + 52,
      856,
      `Checked and not supported: WET07; resist lot PR-552 (non-B ${pct(STATS.pr552.sigRateNonB, 1)} vs ${pct(STATS.pr552.otherLotsSigRateNonB, 1)}); probe card (${pct(STATS.probeCard.maxSigShare)} vs ${pct(STATS.probeCard.maxTestedShare)}, ${STATS.probeCard.recovered} of ${STATS.probeCard.retested} recovered).`,
      4,
      { quiet: true }
    ),
  ],
};

export default spec;
