import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PROD_TONE, TOKENS, n } from "@/components/diagrams/presets/production";
import { COST_DAY } from "@/components/diagrams/presets/production-observe";

// Brightpost's day of model spend, split by tag: total → team → feature → request (cost-tracking-attribution,
// Architecture). No steps. Illustrative list price (2 dollars in, 10 out per million tokens); working in
// presets/production-observe.ts COST_DAY:
//   one request: 2,200 × 2 / 1 M + 250 × 10 / 1 M = 0.0044 + 0.0025 = 0.0069 dollars;
//   support: 200,000 × 0.0069 = 1,380, split by feature: order questions 120,000 × 0.0069 = 828; returns and refunds
//     80,000 × 0.0069 = 552;
//   catalogue writer: 16 M in + 8 M out = 32 + 80 = 112; labs: 26.67 M in + 3.33 M out = 53.33 + 33.33 = 86.67, 87;
//   total 1,380 + 112 + 86.67 = 1,578.67, written 1,579. The rounded parts add up: 828 + 552 = 1,380; 1,380 + 112 + 87 = 1,579.
// Layout (880 x 372): level 0 at y 10 (x 340, w 200, h 54); teams at y 100 (w 190, h 54) at x 100 / 390 / 590; features at
// y 190 (w 170, h 54) at x 20 / 200 / 400 / 600; the request at y 280 under "returns" (x 200, w 170, h 54) with a tag box
// to its right (x 390, w 470); the check line at y 344.
// Colours (PROD_TONE): total and teams neutral (control), features blue (data), the request orange (traffic) with the one
// highlight. Three tones plus neutral.

const d = (v: number) => `$${n(Math.round(v))} a day`;

const box = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  sub: string,
  tone: LayoutShape["tone"],
  highlight = false
): LayoutShape => ({
  id,
  type: "box",
  x,
  y,
  w,
  h: 54,
  label,
  sub,
  tone,
  fill: "pastel",
  highlight: highlight || undefined,
});

const arrow = (from: string, to: string, label?: string): LayoutShape => ({
  id: `a-${from}-${to}`,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  label,
  tone: PROD_TONE.infra,
});

const check = `${d(COST_DAY.orders.cost)} + ${d(COST_DAY.returns.cost)} = ${d(COST_DAY.support)}; ${n(Math.round(COST_DAY.support))} + ${n(Math.round(COST_DAY.catalogue))} + ${n(Math.round(COST_DAY.labs))} = ${n(Math.round(COST_DAY.total))}. Illustrative prices.`;

const shapes: LayoutShape[] = [
  box("total", 340, 10, 200, "All model spend", d(COST_DAY.total), PROD_TONE.infra),
  box("support", 100, 100, 190, "Support assistant", d(COST_DAY.support), PROD_TONE.infra),
  box("catalogue", 390, 100, 190, "Catalogue writer", d(COST_DAY.catalogue), PROD_TONE.infra),
  box("labs", 590, 100, 190, "Labs prototypes", d(COST_DAY.labs), PROD_TONE.infra),
  box("f-orders", 20, 190, 170, "Order questions", d(COST_DAY.orders.cost), PROD_TONE.data),
  box("f-returns", 200, 190, 170, "Returns and refunds", d(COST_DAY.returns.cost), PROD_TONE.data),
  box("f-desc", 400, 190, 170, "Product descriptions", d(COST_DAY.catalogue), PROD_TONE.data),
  box("f-proto", 600, 190, 170, "Prompt experiments", d(COST_DAY.labs), PROD_TONE.data),
  box(
    "req",
    200,
    280,
    170,
    "One request",
    `$${COST_DAY.perRequest.toFixed(4)}: ${n(TOKENS.inputPerRequest)} in, ${TOKENS.outputPerRequest} out`,
    PROD_TONE.traffic,
    true
  ),
  box(
    "tags",
    390,
    280,
    470,
    "Tags the gateway stamps on every request",
    "team=support  feature=returns  env=prod  request_id",
    PROD_TONE.infra
  ),
  arrow("total", "support", "tag: team"),
  arrow("total", "catalogue"),
  arrow("total", "labs"),
  arrow("support", "f-orders", "tag: feature"),
  arrow("support", "f-returns"),
  arrow("catalogue", "f-desc"),
  arrow("labs", "f-proto"),
  arrow("f-returns", "req", "request ID"),
  {
    id: "check",
    type: "text",
    x: 20,
    y: 346,
    w: 850,
    h: 18,
    label: check,
    tone: PROD_TONE.infra,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Brightpost's daily model spend, split by tag from total down to one request",
  width: 880,
  height: 372,
  shapes,
};

export default spec;
