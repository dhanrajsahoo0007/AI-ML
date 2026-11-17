import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { GENAI_TONE } from "@/components/diagrams/presets/genai-case";
import { DAILY, PRICES } from "@/components/diagrams/presets/gcase-answer";
import { PROD_TONE, curve, n } from "@/components/diagrams/presets/production";

// Deep dive 1 of the answer-engine case study (design sheet §15.1, §5): daily cost against the search-API price, for
// an API-only design sending 1, 2 or 3 calls a quick answer, and for our own head index (+ 1 API call on 25% of quick
// answers). Every number is DAILY in presets/gcase-answer.ts (ILLUSTRATIVE volumes and unit costs; list prices
// November 2026):
//   API only, n calls:  DAILY.apiOnlyFixed (≈ 148,690 USD a day: models, GPUs, platform, team, licensing, fetches)
//                       + DAILY.comparator.{one,two,three}.calls (13.0M, 22.5M, 32.0M a day) × price
//   own index:          DAILY.ownFixed (≈ 222,310, including the index's 75,800 a day) + DAILY.ownCalls (3.88M) × price
//   crossings: (ownFixed − apiOnlyFixed) ÷ (calls − ownCalls) = 8.1 / 4.0 / 2.6 USD per 1,000 calls (n = 1 / 2 / 3).
//   At 1 USD per 1,000 (PRICES.searchFastPerCall), 3 calls: 180,700 vs ours 226,200, so the index costs ≈ 45,500 more.
//   At 5 USD (PRICES.searchPerCall, list): 3 calls 308,700, 1 call 213,700, ours 241,700.
// Steps: 1 the four lines · 2 the three crossings · 3 the 1 USD marker · 4 the 5 USD markers.
// Layout (880 × 470): curve() from presets/production.ts at (20, 40), 840 × 380, x 0–10 USD per 1,000 calls (lines from
// 0.5), y 100k–500k USD a day. Line labels and extra marks are drawn here with the same mapping as curve(): left =
// x + padL (the y labels "500k" need 4 × 6.5 + 8 < 36, so 36), right = x + width − 12, top = y + 26, bottom = y + height
// − 42. Marks are post-stepped by id (c-m<i>).
// Colours: our index violet (a store), API only teal (a tool): 3 calls solid, 2 calls dashed; 1 call blue dashed.

const CX = 20;
const CY = 40;
const CW = 840;
const CH = 380;
const X_MAX = 10;
const Y_MIN = 100_000;
const Y_MAX = 500_000;
const left = CX + 36;
const right = CX + CW - 12;
const top = CY + 26;
const bottom = CY + CH - 42;
const toX = (v: number) => Math.round((left + (v / X_MAX) * (right - left)) * 10) / 10;
const toY = (v: number) => Math.round((bottom - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * (bottom - top)) * 10) / 10;

const { one, two, three } = DAILY.comparator;
const per1000 = (calls: number) => (p: number) => DAILY.apiOnlyFixed + (calls * p) / 1_000;
const ours = (p: number) => DAILY.ownFixed + (DAILY.ownCalls * p) / 1_000;
const line = (f: (p: number) => number): [number, number][] => [
  [0.5, f(0.5)],
  [X_MAX, f(X_MAX)],
];
const OURS: LayoutTone = GENAI_TONE.store;
const API: LayoutTone = GENAI_TONE.tool;
const API1: LayoutTone = GENAI_TONE.data;
const k = (v: number) => `${n(Math.round(v / 100) * 100)}`;
const usd = (v: number) => v.toFixed(1);
const fast = PRICES.searchFastPerCall * 1_000;
const list = PRICES.searchPerCall * 1_000;

const STEP_OF_MARK = [2, 2, 2, 3, 3, 4, 4, 4];
const plot = curve("c", CX, CY, {
  width: CW,
  height: CH,
  xDomain: [0, X_MAX],
  yDomain: [Y_MIN, Y_MAX],
  xTicks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  yTicks: [100_000, 200_000, 300_000, 400_000, 500_000],
  formatX: (v) => `${v}`,
  formatY: (v) => `${v / 1_000}k`,
  xLabel: "Search-API price, USD per 1,000 calls",
  yLabel: "Cost a day, USD (illustrative)",
  series: [
    { points: line(per1000(three.calls)), tone: API },
    { points: line(per1000(two.calls)), tone: API, dashed: true },
    { points: line(per1000(one.calls)), tone: API1, dashed: true },
    { points: line(ours), tone: OURS },
  ],
  marks: [
    {
      x: three.breakevenPer1000,
      y: ours(three.breakevenPer1000),
      tone: API,
      place: "below-right",
    },
    {
      x: two.breakevenPer1000,
      y: ours(two.breakevenPer1000),
      tone: API,
      place: "below-right",
    },
    {
      x: one.breakevenPer1000,
      y: ours(one.breakevenPer1000),
      tone: API1,
      place: "below-right",
    },
    { x: fast, y: three.atFast, label: k(three.atFast), tone: API, place: "above-left" },
    {
      x: fast,
      y: ours(fast),
      label: k(ours(fast)),
      tone: OURS,
      place: "above-left",
    },
    { x: list, y: three.atList, label: k(three.atList), tone: API, place: "left" },
    { x: list, y: ours(list), label: k(ours(list)), tone: OURS, place: "below-left" },
    { x: list, y: one.atList, label: k(one.atList), tone: API1, place: "below-right" },
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
const endLabel = (id: string, label: string, f: (p: number) => number, dy: number, tone: LayoutTone) => {
  const w = Math.ceil(label.length * 6.5) + 6;
  return text(id, right - w, toY(f(X_MAX)) + dy, label, 1, tone);
};
const vline = (id: string, p: number, step: number): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points: [
    [toX(p), top],
    [toX(p), bottom],
  ],
  dashed: true,
  tone: PROD_TONE.infra,
  step,
});

// Crossing labels sit in the empty band above the x axis (no line goes below 155k), each joined to its crossing by a
// dotted drop, so no label lands on a line.
const LABEL_Y = toY(122_000);
const crossing = (id: string, p: number, label: string, tone: LayoutTone): LayoutShape[] => {
  const w = Math.ceil(label.length * 6.5) + 6;
  return [
    {
      id: `${id}-drop`,
      type: "path",
      x: 0,
      y: 0,
      points: [
        [toX(p), toY(ours(p)) + 5],
        [toX(p), LABEL_Y],
      ],
      dashed: true,
      tone,
      step: 2,
    },
    text(id, toX(p) - w / 2, LABEL_Y + 2, label, 2, tone),
  ];
};

const spec: LayoutSpec = {
  kind: "layout",
  title: "Own index or search API: daily cost against the API price, for 1, 2 or 3 calls an answer",
  width: 880,
  height: CY + CH + 52,
  steps: [
    { title: "API only at 1, 2 or 3 calls an answer, and our own head index" },
    {
      title: `The index pays on cost above ${usd(three.breakevenPer1000)}, ${usd(two.breakevenPer1000)} or ${usd(one.breakevenPer1000)} USD per 1,000`,
    },
    { title: `At ${fast} USD per 1,000 the index costs ${k(DAILY.premiumAtFast)} USD a day more` },
    { title: `At ${list} USD, list price` },
  ],
  shapes: [
    vline("at-fast", fast, 3),
    vline("at-list", list, 4),
    ...plot,
    ...crossing("x-three", three.breakevenPer1000, `${usd(three.breakevenPer1000)} (3 calls)`, API),
    ...crossing("x-two", two.breakevenPer1000, `${usd(two.breakevenPer1000)} (2)`, API),
    ...crossing("x-one", one.breakevenPer1000, `${usd(one.breakevenPer1000)} (1 call)`, API1),
    endLabel("l-three", "API only, 3 calls", per1000(three.calls), -22, API),
    endLabel("l-two", "API only, 2 calls", per1000(two.calls), -22, API),
    endLabel("l-one", "API only, 1 call", per1000(one.calls), -24, API1),
    text("l-ours", toX(5.7), toY(ours(6.5)) - 26, "Own index + API on 25%", 1, OURS),
    text(
      "foot",
      CX,
      CY + CH + 24,
      `Ours: ${k(DAILY.ownFixed)} a day before API calls (index ${k(DAILY.index)}) + ${n(Math.round(DAILY.ownCalls / 1e4) / 100)}M calls. API only: ${k(DAILY.apiOnlyFixed)} + ${n(Math.round(three.calls / 1e5) / 10)}M calls at 3 an answer.`,
      2
    ),
  ],
};

export default spec;
