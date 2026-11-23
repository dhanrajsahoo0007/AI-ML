import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { curve } from "@/components/diagrams/presets/production";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Phi accrual: suspicion rises with silence, and how fast depends on how jittery the heartbeats have been
// (gossip-and-failure-detection, Technical mechanics).
// Working (computed below, Hayashibara et al.'s normal model): phi(t) = −log10 P_later(t), where P_later(t) is the
// chance that the next heartbeat comes more than t seconds after the last one, with inter-arrival times ~ Normal(μ, σ).
// Heartbeats arrive every μ = 1 s on average (illustrative). A steady network has σ = 0.2 s, a jittery one σ = 0.5 s
// (both illustrative). Threshold 8 (Cassandra's phi_convict_threshold default): phi passes 8 after 2.1 s of silence on
// the steady network and after 3.8 s on the jittery one. A fixed 2 s timeout on the jittery network: P_later(2 s) =
// 2.3 %, so about one heartbeat in 44 looks like a death (phi at 2 s is only 1.6).
// Layout: one curve, phi against seconds since the last heartbeat (0 to 5 s), phi clipped at 12.
// Colours (PATTERN_TONE): steady phi green and jittery phi blue (the pattern's own signal on two networks), the
// threshold lime (a check), the fixed timeout red (what flaps).
// Fact check (2026-11-16): Hayashibara, Défago, Yared and Katayama, "The φ Accrual Failure Detector" (SRDS 2004):
// phi = −log10(P_later(t_now − T_last)), sliding window of samples, normal distribution; Φ = 1 means about a 10 %
// chance of a wrong suspicion, Φ = 2 about 1 %, Φ = 3 about 0.1 %. Cassandra cassandra.yaml: phi_convict_threshold,
// default 8.

const MU = 1;
const THRESHOLD = 8;
const STEADY = 0.2;
const JITTERY = 0.5;
const FIXED = 2;
const Y_MAX = 12;

/** Complementary error function (Numerical Recipes erfcc, fractional error below 1.2e-7). */
function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))
    );
  return x >= 0 ? r : 2 - r;
}
const pLater = (t: number, sigma: number) => 0.5 * erfc((t - MU) / (sigma * Math.SQRT2));
const phi = (t: number, sigma: number) => -Math.log10(pLater(t, sigma));
const series = (sigma: number): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i <= 50; i++) {
    const t = i / 10;
    const v = phi(t, sigma);
    if (v > Y_MAX) break;
    out.push([t, Math.round(v * 100) / 100]);
  }
  return out;
};
/** First time phi reaches the threshold, to 0.01 s. */
const convictAt = (sigma: number) => {
  let lo = MU;
  let hi = 10;
  for (let i = 0; i < 50; i++) {
    const m = (lo + hi) / 2;
    if (phi(m, sigma) < THRESHOLD) lo = m;
    else hi = m;
  }
  return Math.round(lo * 100) / 100;
};
const steadyAt = convictAt(STEADY); // 2.12 s
const jitteryAt = convictAt(JITTERY); // 3.81 s
const oneIn = Math.round(1 / pLater(FIXED, JITTERY)); // 44

// The fixed timeout's label sits left of its line, near the top (x = 2 s maps to about 388 in this curve).
const fixedLabel: LayoutShape = {
  id: "fixed-label",
  type: "text",
  x: 110,
  y: 62,
  w: 270,
  h: 50,
  label: `fixed ${FIXED} s timeout: on the jittery\nnetwork, 1 beat in ${oneIn} is this late`,
  tone: PATTERN_TONE.fail,
};

const spec: LayoutSpec = {
  kind: "layout",
  title: "Phi rises with silence; jitter slows it down",
  width: 820,
  height: 380,
  shapes: [
    ...curve("phi", 10, 10, {
      width: 800,
      height: 360,
      xDomain: [0, 5],
      yDomain: [0, Y_MAX],
      xTicks: [0, 1, 2, 3, 4, 5],
      yTicks: [0, 4, 8, 12],
      formatX: (v) => `${v} s`,
      xLabel: "seconds since the last heartbeat (one expected every second)",
      yLabel: "phi (suspicion)",
      series: [
        {
          points: [
            [0, THRESHOLD],
            [5, THRESHOLD],
          ],
          tone: PATTERN_TONE.check,
          dashed: true,
          label: `threshold ${THRESHOLD}: declare dead`,
        },
        {
          points: [
            [FIXED, 0],
            [FIXED, Y_MAX],
          ],
          tone: PATTERN_TONE.fail,
          dashed: true,
        },
        { points: series(STEADY), tone: PATTERN_TONE.pattern, smooth: true },
        { points: series(JITTERY), tone: PATTERN_TONE.data, smooth: true },
      ],
      marks: [
        {
          x: FIXED,
          y: Math.round(phi(FIXED, JITTERY) * 10) / 10,
          label: `phi only ${phi(FIXED, JITTERY).toFixed(1)}`,
          tone: PATTERN_TONE.data,
          place: "right",
        },
        {
          x: steadyAt,
          y: THRESHOLD,
          label: `steady network: dead after ${steadyAt.toFixed(1)} s`,
          tone: PATTERN_TONE.pattern,
          place: "below-right",
        },
        {
          x: jitteryAt,
          y: THRESHOLD,
          label: `jittery network: dead after ${jitteryAt.toFixed(1)} s`,
          tone: PATTERN_TONE.data,
          place: "below-right",
        },
      ],
    }),
    fixedLabel,
  ],
};

export default spec;
