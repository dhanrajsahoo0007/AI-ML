import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, TRAFFIC, n } from "@/components/diagrams/presets/production";
import { ROUTE_PRICE, ROUTING, usd } from "@/components/diagrams/presets/production-routing";

// Brightpost's day with and without a difficulty router (multi-model-routing-fallbacks, worked example). Four steps:
//   1 the router splits 200,000 requests: 70 % easy (140,000) to the small model, 30 % hard (60,000) to the large one;
//   2 what one request costs on each (illustrative prices, large $2 in / $10 out per million tokens, small a tenth);
//   3 the day's bill to scale: all on large $1,380; routed $96.60 + $414 = $510.60, saving $869.40 (63 %);
//   4 the router's failure: if it misses 10 % of the hard questions, 6,000 a day reach the small model.
// All numbers come from presets/production-routing.ts, which checks them.
//
// Grid (860 wide): requests x 20 · router x 230 · models x 470 (w 210) · prices x 700. Top rows y 15 and 105; the
// miss box y 175; the cost group y 250; bars from x 230, $1,380 → 560 px (0.4058 px per dollar), rows y 296 and 350.
// Colours (PROD_TONE): requests orange, router neutral, both models green (the large one is the bigger block of the
// two bars), the miss red. Three tones plus neutral.
//
// Rings: bars, names and working text are `quiet`; each step rings one thing (the two model boxes, the price notes,
// the routed total, the miss box).

const H = 56;
const BAR_X = 230;
const BAR_H = 34;
const PX = 560 / ROUTING.allLarge;
const R = { small: 15, large: 105, miss: 180, bar1: 306, bar2: 360 } as const;

/** A text box as wide as its longest line (about 6.5 px per character), so a centred label reads left-aligned. */
const hug = (label: string) => Math.round(Math.max(...label.split("\n").map((l) => l.length)) * 6.5) + 8;
const text = (
  id: string,
  x: number,
  y: number,
  label: string,
  step: number,
  tone: LayoutShape["tone"] = PROD_TONE.infra,
  quiet = true
): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w: hug(label),
  h: 20 * label.split("\n").length,
  label,
  tone,
  step,
  ...(quiet ? { quiet: true } : {}),
});

const wSmall = Math.round(ROUTING.smallPart * PX * 10) / 10; // 96.60 × 0.4058 = 39.2
const wLarge = Math.round(ROUTING.largePart * PX * 10) / 10; // 414 × 0.4058 = 168.0
const wAll = 560;

const shapes: LayoutShape[] = [
  // Step 1: the split.
  {
    id: "req",
    type: "box",
    x: 20,
    y: 60,
    w: 150,
    h: H,
    label: "Requests",
    sub: `${n(TRAFFIC.requestsPerDay)} a day`,
    tone: PROD_TONE.traffic,
    fill: "pastel",
    step: 1,
    quiet: true,
  },
  {
    id: "router",
    type: "box",
    x: 230,
    y: 60,
    w: 150,
    h: H,
    label: "Router",
    sub: "easy or hard?",
    tone: PROD_TONE.infra,
    fill: "pastel",
    step: 1,
    quiet: true,
  },
  {
    id: "small",
    type: "box",
    x: 470,
    y: R.small,
    w: 210,
    h: H,
    label: "Small model",
    sub: `${n(ROUTING.easy)} requests`,
    tone: PROD_TONE.model,
    fill: "pastel",
    step: 1,
  },
  {
    id: "large",
    type: "box",
    x: 470,
    y: R.large,
    w: 210,
    h: H,
    label: "Large model",
    sub: `${n(ROUTING.hard)} requests`,
    tone: PROD_TONE.model,
    fill: "pastel",
    step: 1,
  },
  { id: "req>router", type: "arrow", x: 0, y: 0, from: "req", to: "router", step: 1, quiet: true },
  {
    id: "router>small",
    type: "arrow",
    x: 0,
    y: 0,
    from: "router",
    to: "small",
    via: [[430, R.small + H / 2]],
    label: `${Math.round(ROUTING.easyShare * 100)} % easy`,
    step: 1,
    quiet: true,
  },
  {
    id: "router>large",
    type: "arrow",
    x: 0,
    y: 0,
    from: "router",
    to: "large",
    via: [[430, R.large + H / 2]],
    label: `${Math.round((1 - ROUTING.easyShare) * 100)} % hard`,
    step: 1,
    quiet: true,
  },

  // Step 2: the price of one request.
  text(
    "price-small",
    696,
    R.small + 8,
    `${usd(ROUTING.smallEach)} a request\n(${ROUTE_PRICE.small.inputPerM} / ${ROUTE_PRICE.small.outputPerM} per M tokens)`,
    2,
    PROD_TONE.infra,
    false
  ),
  text(
    "price-large",
    696,
    R.large + 8,
    `${usd(ROUTING.largeEach)} a request\n(${ROUTE_PRICE.large.inputPerM} / ${ROUTE_PRICE.large.outputPerM} per M tokens)`,
    2,
    PROD_TONE.infra,
    false
  ),

  // Step 3: the day's bill, to scale.
  text("name-all", 20, R.bar1 + 4, "Everything\non the large model", 3),
  {
    id: "bar-all",
    type: "cell",
    x: BAR_X,
    y: R.bar1,
    w: wAll,
    h: BAR_H,
    label: `${usd(ROUTING.allLarge)} a day`,
    tone: PROD_TONE.model,
    fill: "pastel",
    step: 3,
    quiet: true,
  },
  text("name-routed", 20, R.bar2 + 4, "With the router", 3),
  {
    id: "bar-small",
    type: "cell",
    x: BAR_X,
    y: R.bar2,
    w: wSmall,
    h: BAR_H,
    tone: PROD_TONE.model,
    fill: "pastel",
    step: 3,
    quiet: true,
  },
  {
    id: "bar-large",
    type: "cell",
    x: BAR_X + wSmall,
    y: R.bar2,
    w: wLarge,
    h: BAR_H,
    label: `large ${usd(ROUTING.largePart)}`,
    tone: PROD_TONE.model,
    fill: "pastel",
    step: 3,
    quiet: true,
  },
  text(
    "sum-routed",
    BAR_X + wSmall + wLarge + 10,
    R.bar2 + 7,
    `small ${usd(ROUTING.smallPart)} + large ${usd(ROUTING.largePart)} = ${usd(ROUTING.routed)} a day`,
    3,
    PROD_TONE.infra,
    true
  ),
  text(
    "sum-saving",
    BAR_X,
    R.bar2 + BAR_H + 6,
    `Saves ${usd(ROUTING.saving)} a day (${ROUTING.savingPct} %), about ${usd(ROUTING.savingPerMonth)} over 30 days`,
    3,
    PROD_TONE.model,
    false
  ),

  // Step 4: the router's failure.
  {
    id: "miss",
    type: "box",
    x: 470,
    y: R.miss,
    w: 380,
    h: 48,
    label: `Misses ${Math.round(ROUTING.missRate * 100)} % of hard questions`,
    sub: `${n(ROUTING.missedPerDay)} a day go to the small model`,
    tone: PROD_TONE.failure,
    fill: "pastel",
    step: 4,
  },
  {
    id: "router>miss",
    type: "arrow",
    x: 0,
    y: 0,
    from: "router",
    to: "miss",
    via: [[305, R.miss + 24]],
    dashed: true,
    tone: PROD_TONE.failure,
    step: 4,
    quiet: true,
  },
  text(
    "miss-note",
    20,
    R.miss + 4,
    "Nothing downstream notices:\nthe small model answers confidently.",
    4,
    PROD_TONE.failure
  ),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Brightpost's day with and without a router",
  width: 860,
  height: R.bar2 + BAR_H + 6 + 20 + 28,
  groups: [
    {
      id: "g-cost",
      title: "Cost of one day, to scale (illustrative prices)",
      tone: "neutral",
      x: 12,
      y: 252,
      w: 836,
      h: R.bar2 + BAR_H + 6 + 20 + 12 - 252,
    },
  ],
  steps: [
    { title: "A router sends easy questions to the small model" },
    { title: "One request costs a tenth on the small model" },
    { title: "The day's bill with and without the router" },
    { title: "A router that is wrong sends hard questions to the small model" },
  ],
  shapes,
};

export default spec;
