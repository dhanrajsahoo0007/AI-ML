// Constants and arithmetic for the Drift Detection page (llmops/drift-*.ts, silent-model-update.ts). Brightpost's numbers
// come from presets/production.ts and production-regress.ts. The intent shares, the embedding points and the weekly pass
// counts are ILLUSTRATIVE and labelled so on the figures; everything derived from them is computed here.

import { DATASETS } from "./production";
import { BAND, NOISE_MEAN } from "./production-regress";

// ── PSI ──────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Population stability index over bins: PSI = sum over bins of (actual − expected) × ln(actual ÷ expected), with the
 * shares as fractions. Brightpost's intent mix, baseline (expected) against this week (actual), illustrative:
 *   refunds 40 → 28 %, delivery 25 → 24 %, product questions 20 → 18 %, account 10 → 9 %, other 5 → 21 % (gift cards).
 *   Terms: refunds (−0.12) × ln(0.28 ÷ 0.40) = 0.0428; delivery (−0.01) × ln(0.96) = 0.0004;
 *   product (−0.02) × ln(0.90) = 0.0021; account (−0.01) × ln(0.90) = 0.0011; other (0.16) × ln(4.2) = 0.2296.
 *   Total 0.276. Rule of thumb (credit-scoring practice, Lewis; checked November 2026): under 0.10 no substantial change,
 *   0.10 to 0.25 a small change to watch, 0.25 or more a substantial change. The bands are conventions, not tests.
 */
export const INTENTS = [
  { name: "Refunds", base: 0.4, now: 0.28 },
  { name: "Delivery", base: 0.25, now: 0.24 },
  { name: "Product questions", base: 0.2, now: 0.18 },
  { name: "Account", base: 0.1, now: 0.09 },
  { name: "Other (gift cards)", base: 0.05, now: 0.21 },
] as const;
if (Math.abs(INTENTS.reduce((a, b) => a + b.base, 0) - 1) > 1e-9) throw new Error("baseline shares must sum to 1");
if (Math.abs(INTENTS.reduce((a, b) => a + b.now, 0) - 1) > 1e-9) throw new Error("current shares must sum to 1");
export const psiTerm = (base: number, now: number) => (now - base) * Math.log(now / base);
export const PSI_TERMS = INTENTS.map((i) => psiTerm(i.base, i.now));
export const PSI = PSI_TERMS.reduce((a, v) => a + v, 0);
export const PSI_BANDS = { stable: 0.1, alert: 0.25 } as const;
/** Share of the PSI that comes from the "other" bin: 0.2296 ÷ 0.276 = 83 %. */
export const PSI_OTHER_SHARE = PSI_TERMS[4] / PSI;

// ── Embedding shift ──────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A 2-D sketch in pixel units inside a 520 × 260 plot (the real space has 1,536 dimensions). Baseline questions form one
 * cluster; this month's questions have 8 points in the old region and 6 in a new one (gift cards). Centroid distance
 * and the share of this month's points outside the baseline's radius (the farthest baseline point from its centroid)
 * are computed from the points, not typed.
 */
export const PLOT = { w: 520, h: 260 } as const;
const around = (c: [number, number], offs: [number, number][]) =>
  offs.map(([dx, dy]): [number, number] => [c[0] + dx, c[1] + dy]);
export const BASE_PTS = around(
  [170, 165],
  [
    [-60, -30],
    [-35, -55],
    [-10, -62],
    [25, -50],
    [55, -25],
    [62, 10],
    [40, 45],
    [5, 60],
    [-30, 50],
    [-58, 22],
    [-20, -15],
    [18, -12],
    [10, 22],
    [-28, 12],
  ]
);
export const NOW_PTS = [
  ...around(
    [190, 170],
    [
      [-40, -20],
      [-15, -40],
      [20, -35],
      [45, 0],
      [25, 35],
      [-20, 30],
      [-5, 5],
      [10, -10],
    ]
  ),
  ...around(
    [430, 110],
    [
      [-30, -15],
      [0, -30],
      [30, -10],
      [25, 25],
      [-10, 30],
      [-35, 10],
    ]
  ),
];
const centroid = (pts: [number, number][]): [number, number] => [
  pts.reduce((a, p) => a + p[0], 0) / pts.length,
  pts.reduce((a, p) => a + p[1], 0) / pts.length,
];
const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const BASE_C = centroid(BASE_PTS);
export const NOW_C = centroid(NOW_PTS);
export const BASE_RADIUS = Math.max(...BASE_PTS.map((p) => dist(p, BASE_C)));
export const CENTROID_SHIFT = dist(BASE_C, NOW_C);
export const SHIFT_IN_RADII = CENTROID_SHIFT / BASE_RADIUS;
export const OUTSIDE = NOW_PTS.filter((p) => dist(p, BASE_C) > BASE_RADIUS).length;

// ── Silent model update ──────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Weekly pass counts on the 200-ticket golden set (illustrative). A pinned version scores 180 ± noise every week
 * (inside the noise band 175.5 to 184.5 of presets/production-regress.ts). An alias behaves the same until the provider
 * moves it in week 7, then scores about 168. Drop: 180 − 168 = 12 cases = 6 points of 200, against a band of ±4.5 cases.
 */
export const WEEKS = 12;
export const MOVE_WEEK = 7;
export const PINNED = [180, 181, 179, 180, 182, 180, 181, 179, 180, 181, 180, 179] as const;
export const ALIAS = [180, 181, 179, 180, 182, 180, 168, 167, 169, 168, 166, 168] as const;
export const ALIAS_AFTER = ALIAS.slice(MOVE_WEEK - 1).reduce((a, v) => a + v, 0) / (WEEKS - MOVE_WEEK + 1);
export const DROP_CASES = NOISE_MEAN - Math.round(ALIAS_AFTER);
export const DROP_POINTS = (DROP_CASES / DATASETS.goldenSet) * 100;
export const BAND_HALF = BAND.half;
