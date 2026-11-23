import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { textWidth } from "@/components/diagrams/diagram-style";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { PROD_TONE, curve, n } from "@/components/diagrams/presets/production";
import { LATENCY, POOLS, TARGETS } from "@/components/diagrams/presets/gcase-chat";

// Time to first token against prefill load (chatgpt-style-chat-service, design sheet §12 and deep dive 4; preset
// LATENCY.byRho and TARGETS in presets/gcase-chat.ts). Each point is a seeded simulation of one prefill unit's chunked
// queue (small jobs first) at the RESERVED hit mix (90% of follow-ups hit), 15,000 turns a point (100,000 at ρ 0.6),
// plus the other stages' fits. Offered load ρ on attention-weighted work; measured busy in brackets on the axis:
//   ρ 0.3 (0.33) 365 / 584 · 0.5 (0.55) 431 / 705 · 0.6 (0.66) 454 / 733 · 0.7 (0.75) 554 / 857 ·
//   0.8 (0.84) 629 / 1,062 · 0.9 (0.93) 709 / 1,329 ms (fast-turn p95 / miss p95).
// The fast target (p95 600 ms) is crossed between 0.7 and 0.8 (linear: ≈ 0.76); ρ 0.6 is the chosen operating point
// (POOLS.prefillRho), ρ 0.8 is rung 2 of the ladder (POOLS.prefillRhoHot): 629 ms, a degraded mode stated as such.
// Misses stay under their 1,200 ms target up to 0.8. Stage times are illustrative.
// Steps: 1 fast-turn p95 with its target and the two operating points · 2 the miss p95 with its target.
// Layout (880 wide): curve() from presets/production.ts for step 1 (axes, fast series, 600 ms target, marks); step 2's
// series, target and marks are drawn with the same data-to-pixel mapping (replicated from curve()).
// Colours: fast turns green (the hit path), misses red, targets dashed in the series' tone; the chosen point lime
// (a check), rung 2 orange.

const PLOT = { x: 12, y: 28, w: 856, h: 360 } as const;
const X_DOMAIN: [number, number] = [0.25, 0.95];
const Y_DOMAIN: [number, number] = [0, 1_400];
const Y_TICKS = [0, 200, 400, 600, 800, 1_000, 1_200, 1_400];
const rows = LATENCY.byRho;
const busyAt = (rho: number) => rows.find((r) => Math.abs(r.rho - rho) < 1e-9)?.busy;
const fmtX = (v: number) => {
  const b = busyAt(v);
  return b === undefined ? v.toFixed(1) : `${v.toFixed(1)} (${b.toFixed(2)})`;
};
const fastTarget = TARGETS.rows.find((r) => r.id === "fast")!.targetP95;
const missTarget = TARGETS.rows.find((r) => r.id === "miss")!.targetP95;
const at = (rho: number) => rows.find((r) => Math.abs(r.rho - rho) < 1e-9)!;
const chosen = at(POOLS.prefillRho);
const hot = at(POOLS.prefillRhoHot);
// Where the fast p95 crosses its target, by linear interpolation between the simulated points.
const crossing = (() => {
  for (let i = 1; i < rows.length; i++) {
    const [a, b] = [rows[i - 1], rows[i]];
    if (a.fastP95 <= fastTarget && b.fastP95 > fastTarget)
      return a.rho + ((fastTarget - a.fastP95) / (b.fastP95 - a.fastP95)) * (b.rho - a.rho);
  }
  return NaN;
})();

const plot = curve("c", PLOT.x, PLOT.y, {
  width: PLOT.w,
  height: PLOT.h,
  xDomain: X_DOMAIN,
  yDomain: Y_DOMAIN,
  xTicks: rows.map((r) => r.rho),
  yTicks: Y_TICKS,
  formatX: fmtX,
  xLabel: "offered prefill load ρ (measured busy)",
  yLabel: "first token, p95 (ms)",
  series: [
    { points: rows.map((r) => [r.rho, r.fastP95]), tone: GENAI_TONE.model, label: "fast turns, all paths" },
    {
      points: [
        [X_DOMAIN[0], fastTarget],
        [X_DOMAIN[1], fastTarget],
      ],
      tone: GENAI_TONE.model,
      dashed: true,
    },
  ],
  marks: [
    {
      x: chosen.rho,
      y: chosen.fastP95,
      label: `chosen ρ ${chosen.rho}: ${Math.round(chosen.fastP95)} ms`,
      tone: GENAI_TONE.check,
      place: "below-right",
    },
    {
      x: hot.rho,
      y: hot.fastP95,
      label: `rung 2, ρ ${hot.rho}: ${Math.round(hot.fastP95)} ms`,
      tone: "orange",
      place: "above-left",
    },
  ],
  step: 1,
});

// The same mapping as curve(), for step 2's shapes on the same axes.
const padL = Math.max(36, ...Y_TICKS.map((v) => textWidth(n(v)) + 8));
const left = PLOT.x + padL;
const right = PLOT.x + PLOT.w - 12;
const topY = PLOT.y + 26;
const bottomY = PLOT.y + PLOT.h - 42;
const toX = (v: number) =>
  Math.round((left + ((v - X_DOMAIN[0]) / (X_DOMAIN[1] - X_DOMAIN[0])) * (right - left)) * 10) / 10;
const toY = (v: number) =>
  Math.round((bottomY - ((v - Y_DOMAIN[0]) / (Y_DOMAIN[1] - Y_DOMAIN[0])) * (bottomY - topY)) * 10) / 10;

const label = (id: string, x: number, y: number, text: string, step: number, tone: LayoutTone): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w: Math.ceil(textWidth(text)) + 6,
  h: 18,
  label: text,
  tone,
  step,
  quiet: true,
});
const dot = (id: string, rho: number, ms: number, tone: LayoutTone, step: number): LayoutShape => ({
  id,
  type: "circle",
  x: toX(rho),
  y: toY(ms),
  w: 8,
  tone,
  fill: "pastel",
  step,
  quiet: true,
});

const step2: LayoutShape[] = [
  {
    id: "miss",
    type: "path",
    x: 0,
    y: 0,
    points: rows.map((r) => [toX(r.rho), toY(r.missP95)] as [number, number]),
    tone: GENAI_TONE.failure,
    step: 2,
  },
  {
    id: "miss-target",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [toX(X_DOMAIN[0]), toY(missTarget)],
      [toX(X_DOMAIN[1]), toY(missTarget)],
    ],
    tone: GENAI_TONE.failure,
    dashed: true,
    step: 2,
    quiet: true,
  },
  label("miss-label", toX(0.9) - 150, toY(at(0.9).missP95) - 4, "misses (recompute)", 2, GENAI_TONE.failure),
  label("miss-target-l", left + 8, toY(missTarget) - 20, `miss target ${n(missTarget)} ms`, 2, GENAI_TONE.failure),
  dot("miss-chosen", chosen.rho, chosen.missP95, GENAI_TONE.check, 2),
  label(
    "miss-chosen-l",
    toX(chosen.rho) + 8,
    toY(chosen.missP95) - 20,
    `${n(Math.round(chosen.missP95))} ms`,
    2,
    GENAI_TONE.check
  ),
  dot("miss-hot", hot.rho, hot.missP95, "orange", 2),
  label("miss-hot-l", toX(hot.rho) - 70, toY(hot.missP95) - 22, `${n(Math.round(hot.missP95))} ms`, 2, "orange"),
];

const FOOT = PLOT.y + PLOT.h + 6;
const foot = (id: string, y: number, text: string, step: number): LayoutShape => ({
  ...label(id, PLOT.x, y, text, step, PROD_TONE.infra),
  w: 856,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: `First token against prefill load: ${Math.round(chosen.fastP95)} ms p95 at ρ ${chosen.rho}, over ${fastTarget} ms near ρ ${crossing.toFixed(2)}`,
  width: 880,
  height: FOOT + 48,
  steps: [
    {
      title: `Fast turns: p95 ${Math.round(chosen.fastP95)} ms at ρ ${chosen.rho}; the ${fastTarget} ms target is crossed near ρ ${crossing.toFixed(2)}`,
    },
    {
      title: `Misses carry the load: ${n(Math.round(chosen.missP95))} ms at ρ ${chosen.rho}, ${n(Math.round(hot.missP95))} at ${hot.rho}`,
    },
  ],
  shapes: [
    {
      ...label(
        "h",
        PLOT.x,
        4,
        `One prefill unit, small jobs first, at the reserved hit mix (90% of follow-ups hit)`,
        1,
        PROD_TONE.infra
      ),
      w: 856,
      quiet: false,
    },
    ...plot.map((s) => ({ ...s, quiet: s.id !== "c-s0" })),
    label("fast-target-l", left + 8, toY(fastTarget) - 20, `fast target ${fastTarget} ms`, 1, GENAI_TONE.model),
    ...step2,
    foot(
      "f1",
      FOOT,
      `Small jobs first keeps hits fast; misses wait. Stages illustrative; 15,000 simulated turns a point, 100,000 at ρ 0.6.`,
      1
    ),
    foot(
      "f2",
      FOOT + 22,
      `Rung 2 runs prefill at ρ ${hot.rho}: fast p95 ${Math.round(hot.fastP95)} ms, a stated degraded mode; misses stay under ${n(missTarget)} ms.`,
      2
    ),
  ],
};

export default spec;
