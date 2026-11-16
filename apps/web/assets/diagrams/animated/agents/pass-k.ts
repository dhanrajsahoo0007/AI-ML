import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { AGENT_TONE, PASS_K, passAtK, passHatK } from "@/components/diagrams/presets/agents";

// Repeated runs of one task at a 70 % success rate (agentic-ai-evaluation, Core concepts; reused by
// agent-reliability-and-error-recovery). Two bar charts side by side for k = 1 to 8 runs: pass@k (at least one of k
// runs passes) climbs towards 1; pass^k (all k runs pass, as defined in tau-bench, Yao et al. 2024, arXiv 2406.12045)
// falls towards 0. Both start at 0.700 for k = 1. Values come from passAtK and passHatK with PASS_K.p, never retyped.
// pass^4 = 0.7^4 = 0.240 (PASS_K.passHat) is the figure's one highlight; pass@4 = 1 − 0.3^4 = 0.992.
//
// Two steps: 1 the pass@k chart · 2 the pass^k chart.
//
// Layout: each panel is eight bars 36 wide with 8-unit gaps (344 wide); the plot runs from y 80 (value 1) to y 280
// (value 0), 200 units per 1.0. Value labels sit over each bar, the k number under it, an axis title under that.
// A dashed line marks 1.0 across each panel. Left panel from x 60, right panel from x 470.
//
// Colour (agents legend: a score is lime): pass@k soft lime, pass^k pastel lime; axes and labels neutral. One tone
// plus neutral.

const P = PASS_K.p;
const KS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const BAR_W = 36;
const GAP = 8;
const PANEL_W = KS.length * BAR_W + (KS.length - 1) * GAP;
const TOP = 80;
const BASE = 280;
const SCALE = BASE - TOP;

/** 3 decimals, or "≈ 1" once it rounds to 1.000. */
const fmt = (v: number) => (v.toFixed(3) === "1.000" ? "≈ 1" : v.toFixed(3));

function panel(
  id: string,
  x0: number,
  title: string,
  value: (k: number) => number,
  fill: "soft" | "pastel",
  step: number,
  ringK?: number
): LayoutShape[] {
  const out: LayoutShape[] = [
    { id: `${id}-title`, type: "text", x: x0, y: 14, w: PANEL_W, h: 22, label: title, tone: AGENT_TONE.infra, step },
    {
      id: `${id}-one`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x0 - 6, TOP],
        [x0 + PANEL_W + 6, TOP],
      ],
      dashed: true,
      tone: AGENT_TONE.infra,
      step,
    },
    {
      id: `${id}-axis`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [x0 - 6, BASE],
        [x0 + PANEL_W + 6, BASE],
      ],
      tone: AGENT_TONE.infra,
      step,
    },
    {
      id: `${id}-k`,
      type: "text",
      x: x0,
      y: BASE + 26,
      w: PANEL_W,
      h: 18,
      label: "k = number of runs of the same task",
      tone: AGENT_TONE.infra,
      step,
    },
  ];
  KS.forEach((k, i) => {
    const v = value(k);
    const h = Math.max(2, Math.round(v * SCALE));
    const x = x0 + i * (BAR_W + GAP);
    out.push(
      {
        id: `${id}-v${k}`,
        type: "text",
        x: x - GAP / 2 + 1,
        y: BASE - h - 20,
        w: BAR_W + GAP - 2,
        h: 16,
        label: fmt(v),
        tone: AGENT_TONE.infra,
        step,
        quiet: true,
      },
      {
        id: `${id}-b${k}`,
        type: "cell",
        x,
        y: BASE - h,
        w: BAR_W,
        h,
        tone: AGENT_TONE.check,
        fill,
        highlight: k === ringK ? true : undefined,
        step,
        quiet: k !== ringK,
      },
      {
        id: `${id}-n${k}`,
        type: "text",
        x,
        y: BASE + 4,
        w: BAR_W,
        h: 18,
        label: String(k),
        tone: AGENT_TONE.infra,
        step,
        quiet: true,
      }
    );
  });
  return out;
}

const LEFT = 60;
const RIGHT = LEFT + PANEL_W + 66;

const spec: LayoutSpec = {
  kind: "layout",
  title: `pass@k and pass^k for k = 1 to 8 runs at a ${Math.round(P * 100)} % success rate`,
  width: RIGHT + PANEL_W + 30,
  height: BASE + 56,
  steps: [{ title: "pass@k: at least one of k runs passes" }, { title: "pass^k: every one of k runs passes" }],
  shapes: [
    { id: "one-l", type: "text", x: LEFT - 46, y: TOP - 9, w: 34, h: 18, label: "1.0", tone: AGENT_TONE.infra },
    { id: "zero-l", type: "text", x: LEFT - 46, y: BASE - 9, w: 34, h: 18, label: "0", tone: AGENT_TONE.infra },
    ...panel("at", LEFT, "pass@k: at least one run passes", (k) => passAtK(P, k), "soft", 1),
    ...panel("hat", RIGHT, "pass^k: all k runs pass", (k) => passHatK(P, k), "pastel", 2, PASS_K.k),
  ],
};

export default spec;
