import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The order state machine across customer, restaurant and courier (uber-eats, Deep dive 3).
// Steps: 1 the happy path: placed (card authorised), accepted by the restaurant, then two parts that finish in either
// order (the kitchen marks it ready; a courier accepts the offer), joined at picked up, which needs both, then
// delivered (card captured) · 2 the undo paths: a rejection or 5 minutes of silence ("rejected or silent") from the restaurant, or a customer
// cancel before pickup, ends in cancelled, and the card authorisation is voided instead of a refund.
// Working: about 6 status changes per order (placed, accepted, ready, courier assigned, picked up, delivered) × 600
// orders/s at the dinner peak = 3,600 conditional updates/s on the orders DB.
// Layout (870 × 400): five columns of boxes 130 wide, 40 apart (x 20, 190, 360, 550, 720); the middle column is 150
// wide and holds two boxes (y 50 and 210) inside a dotted "either order" group; the main row is at y 130; cancelled
// sits under accepted at y 300.
// Colours (PATTERN_TONE plus party tones): placed neutral (the customer's request), restaurant moves teal, courier
// moves blue, delivered green (the end the design is about), cancelled red (the failure path, step 2 only).

const W = 130;
const H = 56;
const MID_W = 150;
const ROW = 130;
const x = [20, 190, 360, 550, 720];

const box = (
  id: string,
  label: string,
  sub: string,
  bx: number,
  by: number,
  tone: LayoutShape["tone"],
  w = W,
  step = 1
): LayoutShape => ({ id, type: "box", x: bx, y: by, w, h: H, label, sub, tone, fill: "pastel", step });

const shapes: LayoutShape[] = [
  box("placed", "Placed", "card authorised", x[0], ROW, PATTERN_TONE.infra),
  box("accepted", "Accepted", "restaurant accepts", x[1], ROW, PATTERN_TONE.compute),
  box("ready", "Ready", "kitchen: food done", x[2], 50, PATTERN_TONE.compute, MID_W),
  box("assigned", "Courier assigned", "courier takes offer", x[2], 210, PATTERN_TONE.data, MID_W),
  box("picked", "Picked up", "needs both parts", x[3], ROW, PATTERN_TONE.data),
  box("delivered", "Delivered", "card captured", x[4], ROW, PATTERN_TONE.pattern),
  { id: "a1", type: "arrow", x: 0, y: 0, from: "placed", to: "accepted" },
  { id: "a2", type: "arrow", x: 0, y: 0, from: "accepted", to: "ready" },
  { id: "a3", type: "arrow", x: 0, y: 0, from: "accepted", to: "assigned" },
  { id: "a4", type: "arrow", x: 0, y: 0, from: "ready", to: "picked" },
  { id: "a5", type: "arrow", x: 0, y: 0, from: "assigned", to: "picked" },
  { id: "a6", type: "arrow", x: 0, y: 0, from: "picked", to: "delivered" },

  // Step 2: the undo paths.
  box("cancelled", "Cancelled", "authorisation voided", x[1], 300, PATTERN_TONE.fail, MID_W, 2),
  {
    id: "c1",
    type: "arrow",
    x: 0,
    y: 0,
    from: "placed",
    to: "cancelled",
    via: [[x[0] + W / 2, 328]],
    label: "rejected or silent",
    dashed: true,
    step: 2,
  },
  {
    id: "c2",
    type: "arrow",
    x: 0,
    y: 0,
    from: "accepted",
    to: "cancelled",
    label: "cancel before pickup",
    dashed: true,
    step: 2,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The order state machine",
  width: 870,
  height: 400,
  groups: [{ id: "either", title: "either order", tone: "neutral", x: 345, y: 20, w: 180, h: 262 }],
  shapes,
  steps: [{ title: "Happy path: two parts in either order" }, { title: "Cancel: void the card hold" }],
};

export default spec;
