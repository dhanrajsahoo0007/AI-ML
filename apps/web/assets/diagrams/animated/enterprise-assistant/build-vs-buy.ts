import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { BUILD_BUY, COMPANY, COST, PLATFORM } from "@/components/diagrams/presets/gcase-enterprise";
import { PROD_TONE, curve, n } from "@/components/diagrams/presets/production";

// Deep dive 4 of the enterprise assistant (design sheet §15.4, "In practice: when buying a seat product is the better
// call"): monthly cost against the size of the build team. Every number is BUILD_BUY and PLATFORM in
// presets/gcase-enterprise.ts (ILLUSTRATIVE inputs; seat prices F12, F97, F107, F108):
//   build(e) = model COST.perMonth ≈ 4,777 + infrastructure PLATFORM.infraPerMonth 15,135 + e × 400,000 ÷ 12
//     → 4 engineers ≈ 153,200, 12 ≈ 419,900; this design's 9 engineers: PLATFORM.allInPerMonth ≈ 319,900 (≈ 64 a seat).
//   mixed purchase (flat in the build team): 2,000 knowledge seats × 25.5 = 51,000 + warehouse metered agents
//     2,160–32,400 (mid 17,280) + 5 engineers for Brightpost's own tools and tests 166,667 + their infrastructure 3,500
//     = BUILD_BUY.buyLow ≈ 223,300 … BUILD_BUY.buy ≈ 238,400 … BUILD_BUY.buyHigh ≈ 253,600 (≈ 48 a seat at the mid).
//   crossing: BUILD_BUY.breakevenEngineers ≈ 6.6 (build = buy at the mid); at 9 engineers building costs
//     BUILD_BUY.buildMinusBuy ≈ 81,500 a month more. Seat breakeven: BUILD_BUY.breakevenKnowledgeSeats ≈ 5,200.
// Steps: 1 the two lines and the band · 2 the crossing · 3 this design at 9 engineers.
// Layout (880 × 474): curve() from presets/production.ts at (20, 40), 840 × 380, x 4–12 engineers, y 100k–450k USD a
// month. The purchase's label sits above its band (mid and range in one label, the band is 27 px tall); the build
// label sits under its line near the right; the crossing label right of its drop. Labels and drops are drawn here with the same mapping as curve(): left = x + 36, right =
// x + width − 12, top = y + 26, bottom = y + height − 42. Marks are post-stepped by id (c-m<i>).
// Colours: building this design violet (our own system), the mixed purchase teal (a bought product): mid solid, the
// metered-agent range dashed.

const CX = 20;
const CY = 40;
const CW = 840;
const CH = 380;
const X_MIN = 4;
const X_MAX = 12;
const Y_MIN = 100_000;
const Y_MAX = 450_000;
const left = CX + 36;
const right = CX + CW - 12;
const top = CY + 26;
const bottom = CY + CH - 42;
const toX = (v: number) => Math.round((left + ((v - X_MIN) / (X_MAX - X_MIN)) * (right - left)) * 10) / 10;
const toY = (v: number) => Math.round((bottom - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * (bottom - top)) * 10) / 10;

const BUILD: LayoutTone = GENAI_TONE.store;
const BUY: LayoutTone = GENAI_TONE.tool;
const k = (v: number) => `${n(Math.round(v / 100) * 100)}`;
const flat = (v: number): [number, number][] => [
  [X_MIN, v],
  [X_MAX, v],
];
const build = BUILD_BUY.buildAtTeam;
const at9 = PLATFORM.engineers;
const crossing = BUILD_BUY.breakevenEngineers;

const STEP_OF_MARK = [2, 3, 3];
const plot = curve("c", CX, CY, {
  width: CW,
  height: CH,
  xDomain: [X_MIN, X_MAX],
  yDomain: [Y_MIN, Y_MAX],
  xTicks: [4, 5, 6, 7, 8, 9, 10, 11, 12],
  yTicks: [100_000, 200_000, 300_000, 400_000],
  formatX: (v) => `${v}`,
  formatY: (v) => `${v / 1_000}k`,
  xLabel: "Engineers on the build team",
  yLabel: "Cost a month, USD (illustrative)",
  series: [
    {
      points: [
        [X_MIN, build(X_MIN)],
        [X_MAX, build(X_MAX)],
      ],
      tone: BUILD,
    },
    { points: flat(BUILD_BUY.buy), tone: BUY },
    { points: flat(BUILD_BUY.buyLow), tone: BUY, dashed: true },
    { points: flat(BUILD_BUY.buyHigh), tone: BUY, dashed: true },
  ],
  marks: [
    { x: crossing, y: BUILD_BUY.buy, tone: BUILD, place: "above-left" },
    { x: at9, y: BUILD_BUY.build, label: k(BUILD_BUY.build), tone: BUILD, place: "left" },
    { x: at9, y: BUILD_BUY.buy, tone: BUY, place: "below-right" },
  ],
}).map((s): LayoutShape => {
  const m = /^c-m(\d+)(-label)?$/.exec(s.id);
  if (m) return { ...s, step: STEP_OF_MARK[Number(m[1])] };
  return { ...s, step: 1, quiet: s.id === "c-axes" ? undefined : true };
});

const text = (
  id: string,
  x: number,
  y: number,
  label: string,
  step: number,
  tone: LayoutTone = PROD_TONE.infra
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w: Math.ceil(label.length * 6.5) + 6,
  h: 18,
  label,
  tone,
  step,
});
const endLabel = (id: string, label: string, v: number, dy: number, tone: LayoutTone) => {
  const w = Math.ceil(label.length * 6.5) + 6;
  return text(id, right - w, toY(v) + dy, label, 1, tone);
};
const vline = (id: string, x: number, y1: number, step: number, tone: LayoutTone): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points: [
    [toX(x), toY(y1) + 5],
    [toX(x), bottom],
  ],
  dashed: true,
  tone,
  step,
});

const crossLabel = `build = buy at ≈ ${crossing.toFixed(1)} engineers`;
const seat = (v: number) => Math.round(v / COMPANY.seats);

const spec: LayoutSpec = {
  kind: "layout",
  title: `Build or buy: building costs more than a mixed purchase above ≈ ${crossing.toFixed(1)} engineers; this design uses ${at9}`,
  width: 880,
  height: CY + CH + 54,
  steps: [
    { title: "Building grows with the team; a mixed purchase does not" },
    { title: `They cross at ≈ ${crossing.toFixed(1)} engineers` },
    { title: `This design: ${at9} engineers, ≈ ${k(BUILD_BUY.buildMinusBuy)} USD a month more than buying` },
  ],
  shapes: [
    ...plot,
    text("l-build", toX(10.6), toY(build(10.6)) + 8, "Build this design", 1, BUILD),
    endLabel(
      "l-buy",
      `Mixed purchase: ${k(BUILD_BUY.buy)} (${k(BUILD_BUY.buyLow)}–${k(BUILD_BUY.buyHigh)})`,
      BUILD_BUY.buyHigh,
      -24,
      BUY
    ),
    vline("v-cross", crossing, BUILD_BUY.buy, 2, BUILD),
    text("t-cross", toX(crossing) + 8, bottom - 26, crossLabel, 2, BUILD),
    vline("v-nine", at9, BUILD_BUY.build, 3, PROD_TONE.infra),
    text(
      "foot",
      CX,
      CY + CH + 26,
      `At ${at9}: build ≈ ${k(BUILD_BUY.build)} (${seat(BUILD_BUY.build)} USD a seat; team ${Math.round(PLATFORM.teamShare * 100)}%, model ${((COST.perMonth / BUILD_BUY.build) * 100).toFixed(1)}%) vs buy ≈ ${k(BUILD_BUY.buy)} (${seat(BUILD_BUY.buy)} a seat). Seat breakeven ≈ ${n(Math.round(BUILD_BUY.breakevenKnowledgeSeats / 100) * 100)} knowledge workers.`,
      3
    ),
  ],
};

export default spec;
