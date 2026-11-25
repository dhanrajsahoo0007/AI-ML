// Constants and arithmetic for the A/B testing page (eval/ab-*.ts and the page's worked example). Brightpost's numbers
// come from presets/production.ts. The sample-size formula is the standard two-proportion one; the baseline and the
// lifts are illustrative choices for this page.

import { TRAFFIC } from "./production";

/** Standard normal quantiles: z(1 − 0.05/2) = 1.959964 for a two-sided α = 0.05; z(0.80) = 0.841621 for power 0.8. */
export const Z_ALPHA = 1.959964;
export const Z_POWER = 0.841621;

/**
 * Requests per arm to detect a change from p1 to p1 + delta with a two-sided α = 0.05 and power 0.8:
 *   n = (z_α/2 + z_β)² × (p1 (1 − p1) + p2 (1 − p2)) ÷ (p2 − p1)²,   with p2 = p1 + delta.
 * (z_α/2 + z_β)² = (1.959964 + 0.841621)² = 7.849. Example: p1 = 0.70, delta = 0.05, p2 = 0.75:
 * 7.849 × (0.21 + 0.1875) ÷ 0.0025 = 1,248 (rounded up).
 */
export function sampleSizePerArm(p1: number, delta: number): number {
  const p2 = p1 + delta;
  return Math.ceil(((Z_ALPHA + Z_POWER) ** 2 * (p1 * (1 - p1) + p2 * (1 - p2))) / delta ** 2);
}

/** Baseline resolution rate (the share of conversations resolved without a person). Illustrative. */
export const BASELINE = 0.7;

/** Lifts, in absolute points, drawn on the curve (1 to 10 points). */
export const LIFTS = [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1] as const;

/** Share of daily traffic that one arm sees in a 50/50 split of 200,000 requests a day: 100,000. */
export const ARM_PER_DAY = TRAFFIC.requestsPerDay / 2;

/**
 * A judge that flips a fraction e of its verdicts at random turns a true rate p into e + (1 − 2e) p.
 * With e = 0.10 (illustrative): 0.70 → 0.66 and 0.75 → 0.70, so a 5-point lift reads as 4 points.
 */
export const JUDGE_FLIP = 0.1;
export const observedRate = (p: number, e = JUDGE_FLIP) => e + (1 - 2 * e) * p;
