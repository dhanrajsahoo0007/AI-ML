import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { CALIBRATION, CALIBRATION_BANDS, poissonPmf } from "@/components/diagrams/presets/gcase-docextract";
import { PROD_TONE, curve, n } from "@/components/diagrams/presets/production";

// Step 7 and §13 of the document-extraction case study: calibration you can check where it decides. Labels come from
// samples the scorer did not choose: a random 2% of auto-approved invoices (CALIBRATION.randomSlice ≈ 550 a month) and
// 10% of auto-approved critical fields within 0.004 of their threshold, inverse-probability weighted
// (CALIBRATION.bandLabelsQuarter ≈ 1,817 band labels a quarter). Numbers from presets/gcase-docextract.ts:
//   Left (CALIBRATION_BANDS): the band labels split by field count over the three threshold groups: amounts 4 fields at
//   0.995 → 661 labels, 3.3 errors expected, a calibrated scorer shows ≤ 7 (97.5%) → observed accuracy ≥ 98.94%;
//   PO and dates 2 at 0.997 → 330 labels, 0.99 expected, ≤ 3 → ≥ 99.09%; kind, parties and invoice number 5 at 0.998
//   → 826 labels, 1.65 expected, ≤ 5 → ≥ 99.39%. Each whisker spans up to a point of accuracy: one family's band
//   cannot convict the scorer alone.
//   Right: the pooled band. A calibrated scorer expects the three groups' errors together: 3.30 + 0.99 + 1.65 ≈ 5.9 a
//   quarter (CALIBRATION.expected, ≈ 0.33% of the band); the alarm fires at the smallest k with P(X ≥ k) ≤ 2.5%, ≥
//   CALIBRATION.alarmAt = 12, a false alarm CALIBRATION.falseAlarm ≈ 1.9% of quarters; a band 3× worse (λ ≈ 17.8)
//   trips it CALIBRATION.detectTriple ≈ 94% of the time. Curves are Poisson probabilities (poissonPmf), computed, not
//   sketched.
// Steps: 1 reliability at each family threshold with the interval a calibrated scorer stays inside · 2 the pooled band
// alarm.
// Layout (880 wide): two curve() plots from presets/production.ts, 420 × 300 at x 10 and x 450 from y 52, two heading
// lines over each (the second a key in the series' tones, so no series label collides with a curve), two footer lines.
// Each whisker has a mark at both ends: the threshold on the diagonal, and the group's name under its bottom.
// Colours: the diagonal neutral (perfect calibration), thresholds and their intervals lime (checks), the calibrated
// band lime, the 3× worse band and the alarm line red (failure).

const PLOT = { w: 420, h: 300, y: 52 } as const;
const LEFT_X = 10;
const RIGHT_X = 450;
const FOOT_Y = PLOT.y + PLOT.h + 16;

const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const lambda = CALIBRATION.expected;
const worse = 3 * lambda;
const pmf = (l: number, kMax: number): [number, number][] =>
  Array.from({ length: kMax + 1 }, (_, k) => [k, poissonPmf(k, l)] as [number, number]);

const text = (id: string, x: number, y: number, w: number, label: string, step: number): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h: 18,
  label,
  tone: PROD_TONE.infra,
  step,
});

const reliability = curve("rel", LEFT_X, PLOT.y, {
  width: PLOT.w,
  height: PLOT.h,
  xDomain: [0.993, 0.999],
  yDomain: [0.985, 1],
  xTicks: [0.993, 0.995, 0.997, 0.999],
  yTicks: [0.985, 0.99, 0.995, 1],
  formatX: (v) => v.toFixed(3),
  formatY: (v) => v.toFixed(3),
  xLabel: "scorer's P(correct) at the threshold",
  yLabel: "observed accuracy, band labels",
  series: [
    {
      points: [
        [0.993, 0.993],
        [0.999, 0.999],
      ],
      tone: PROD_TONE.infra,
      dashed: true,
    },
    ...CALIBRATION_BANDS.map((g) => ({
      points: [
        [g.threshold, g.accLow],
        [g.threshold, 1],
      ] as [number, number][],
      tone: GENAI_TONE.check,
    })),
  ],
  marks: CALIBRATION_BANDS.flatMap((g) => [
    { x: g.threshold, y: g.threshold, tone: GENAI_TONE.check },
    {
      x: g.threshold,
      y: g.accLow,
      label: g.label === "kind, parties, number" ? "kind, parties, no." : g.label,
      tone: GENAI_TONE.check,
      place: "below" as const,
    },
  ]),
  step: 1,
});

const alarm = curve("band", RIGHT_X, PLOT.y, {
  width: PLOT.w,
  height: PLOT.h,
  xDomain: [0, 30],
  yDomain: [0, 0.18],
  xTicks: [0, 5, 10, 15, 20, 25, 30],
  yTicks: [0, 0.05, 0.1, 0.15],
  formatY: (v) => v.toFixed(2),
  xLabel: "errors found in a quarter's band labels",
  yLabel: "probability",
  series: [
    { points: pmf(lambda, 24), tone: GENAI_TONE.check, smooth: true },
    { points: pmf(worse, 30), tone: GENAI_TONE.failure, smooth: true },
    {
      points: [
        [CALIBRATION.alarmAt, 0],
        [CALIBRATION.alarmAt, 0.165],
      ],
      tone: GENAI_TONE.failure,
      dashed: true,
      label: `alarm at ≥ ${CALIBRATION.alarmAt}`,
    },
  ],
  step: 2,
});

/** Axes, ticks and labels appear without a NEW ring; the series lines carry it. */
const quietAxes = (sh: LayoutShape): LayoutShape => (/-s\d+$/.test(sh.id) ? sh : { ...sh, quiet: true });

const spec: LayoutSpec = {
  kind: "layout",
  title: "Calibration checked where it decides: wide intervals per family, so the alarm pools the threshold band",
  width: 880,
  height: FOOT_Y + 46,
  steps: [
    { title: "Reliability at each family threshold, with the interval a calibrated scorer stays inside" },
    { title: `The pooled band alarm: ≥ ${CALIBRATION.alarmAt} errors of ≈ ${lambda.toFixed(1)} expected` },
  ],
  shapes: [
    text(
      "h-left",
      LEFT_X,
      8,
      PLOT.w,
      `Per family: ${n(Math.round(CALIBRATION.bandLabelsQuarter))} band labels a quarter, split by fields`,
      1
    ),
    {
      ...text("h-left-2", LEFT_X, 28, PLOT.w, "dashed: calibrated · whisker: where a calibrated scorer lands", 1),
      quiet: true,
    },
    ...reliability.map(quietAxes),
    text("h-right", RIGHT_X, 8, PLOT.w, "Pooled: one alarm on the whole band", 2),
    {
      ...text("h-right-2", RIGHT_X, 28, 200, `calibrated, λ ≈ ${lambda.toFixed(1)}`, 2),
      tone: GENAI_TONE.check,
      quiet: true,
    },
    {
      ...text("h-right-3", RIGHT_X + 210, 28, 200, `3× worse, λ ≈ ${worse.toFixed(1)}`, 2),
      tone: GENAI_TONE.failure,
      quiet: true,
    },
    ...alarm.map(quietAxes),
    text(
      "foot-1",
      10,
      FOOT_Y,
      860,
      `False alarm ${pct(CALIBRATION.falseAlarm)} of quarters; a band 3× worse than predicted trips it ${pct(CALIBRATION.detectTriple, 0)} of the time.`,
      2
    ),
    {
      ...text(
        "foot-2",
        10,
        FOOT_Y + 22,
        860,
        `Labels: a random 2% of auto-approved invoices (≈ ${n(Math.round(CALIBRATION.randomSlice))} a month) and band samples, weighted by 1 ÷ selection probability.`,
        2
      ),
      quiet: true,
    },
  ],
};

export default spec;
