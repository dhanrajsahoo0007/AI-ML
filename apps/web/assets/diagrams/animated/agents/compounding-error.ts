import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { AGENT_TONE, COMPOUNDING } from "@/components/diagrams/presets/agents";

// Compounding error (agent-reliability-and-error-recovery, Core concepts "How errors compound over steps"). If each
// step of a run succeeds on its own with probability p, and a run succeeds only when every one of its n steps does,
// the run succeeds with p^n. Two curves for n = 0 to 20: p = 0.95 and p = 0.99. The marked points are the shared
// constants (COMPOUNDING in presets/agents, never retyped): 0.95^10 = 0.599, 0.95^20 = 0.358, 0.99^20 = 0.818. The
// curves themselves are computed here from p ** n, so they pass exactly through the marked points.
//
// Three steps: 1 the 95 % curve with 0.95^10 marked · 2 at 20 steps the run succeeds about one time in three (the
// highlight) · 3 the 99 % curve with 0.99^20 marked.
//
// Layout: plot x 80–640 (28 units per step, n = 0 to 20), y 50 (1.0) to 250 (0), 200 units per 1.0. Dashed guides at
// 1.0 and 0.5; tick labels under the axis every 5 steps; the curves' names and end values to the right (x 656). The
// 0.95^10 label sits above and right of its point, between the two curves. Axis text is quiet (no NEW ring).
//
// Colour (agents legend: a success rate is a score, lime): both curves lime, 99 % solid and 95 % dashed; the marker
// points pastel lime, one ringed; axes and text neutral. One tone plus neutral.

const PLOT = { x: 80, top: 50, base: 250, w: 560 } as const;
const N = 20;
const xAt = (n: number) => PLOT.x + (n * PLOT.w) / N;
const yAt = (v: number) => Math.round((PLOT.base - v * (PLOT.base - PLOT.top)) * 10) / 10;
const curve = (p: number): [number, number][] =>
  Array.from({ length: N + 1 }, (_, n) => [xAt(n), yAt(p ** n)] as [number, number]);

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  tone: LayoutTone = AGENT_TONE.infra,
  step = 1,
  quiet?: boolean
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone, step, quiet });

/** Axis and guide text: drawn in step 1 without a NEW ring, so the ring goes to the curve and its point. */
const axis = (id: string, x: number, y: number, w: number, h: number, label: string) =>
  text(id, x, y, w, h, label, AGENT_TONE.infra, 1, true);

const line = (id: string, points: [number, number][], dashed = false): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points,
  dashed,
  tone: AGENT_TONE.infra,
  quiet: true,
});

const dot = (id: string, n: number, v: number, step: number, highlight?: boolean): LayoutShape => ({
  id,
  type: "circle",
  x: xAt(n),
  y: yAt(v),
  w: 12,
  tone: AGENT_TONE.check,
  fill: "pastel",
  step,
  highlight,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Errors compound: the chance that all n steps succeed",
  width: 820,
  height: 316,
  steps: [
    { title: `95 % per step: ${COMPOUNDING.p95n10} after 10 steps` },
    { title: `After 20 steps, ${COMPOUNDING.p95n20}: about one run in three` },
    { title: `99 % per step: ${COMPOUNDING.p99n20} after 20 steps` },
  ],
  shapes: [
    axis("heading", PLOT.x, 8, PLOT.w, 22, "Chance that a run of n steps has no failed step = pⁿ"),
    line(
      "one",
      [
        [PLOT.x, PLOT.top],
        [xAt(N), PLOT.top],
      ],
      true
    ),
    line(
      "half",
      [
        [PLOT.x, yAt(0.5)],
        [xAt(N), yAt(0.5)],
      ],
      true
    ),
    line("x-axis", [
      [PLOT.x, PLOT.base],
      [xAt(N) + 8, PLOT.base],
    ]),
    line("y-axis", [
      [PLOT.x, PLOT.base],
      [PLOT.x, PLOT.top - 8],
    ]),
    axis("y-one", 30, PLOT.top - 9, 40, 18, "1.0"),
    axis("y-half", 30, yAt(0.5) - 9, 40, 18, "0.5"),
    axis("y-zero", 30, PLOT.base - 9, 40, 18, "0"),
    ...[0, 5, 10, 15, 20].map((n) => axis(`tick-${n}`, xAt(n) - 16, PLOT.base + 6, 32, 16, String(n))),
    axis("x-label", PLOT.x, PLOT.base + 28, PLOT.w, 20, "n = steps in a row"),

    // Step 1: 95 % per step.
    {
      id: "p95",
      type: "path",
      x: 0,
      y: 0,
      points: curve(0.95),
      smooth: true,
      dashed: true,
      tone: AGENT_TONE.check,
      weight: 0.9,
    },
    dot("d95-10", 10, COMPOUNDING.p95n10, 1),
    text("l95-10", xAt(10) - 20, yAt(COMPOUNDING.p95n10) - 38, 150, 20, `0.95¹⁰ = ${COMPOUNDING.p95n10}`),

    // Step 2: 20 steps at 95 %.
    dot("d95-20", 20, COMPOUNDING.p95n20, 2, true),
    text(
      "l95-20",
      xAt(N) + 16,
      yAt(COMPOUNDING.p95n20) - 18,
      150,
      36,
      `95 % per step\n0.95²⁰ = ${COMPOUNDING.p95n20}`,
      AGENT_TONE.infra,
      2
    ),

    // Step 3: 99 % per step.
    {
      id: "p99",
      type: "path",
      x: 0,
      y: 0,
      points: curve(0.99),
      smooth: true,
      tone: AGENT_TONE.check,
      weight: 0.9,
      step: 3,
    },
    dot("d99-20", 20, COMPOUNDING.p99n20, 3),
    text(
      "l99-20",
      xAt(N) + 16,
      yAt(COMPOUNDING.p99n20) - 18,
      150,
      36,
      `99 % per step\n0.99²⁰ = ${COMPOUNDING.p99n20}`,
      AGENT_TONE.infra,
      3
    ),
  ],
};

export default spec;
