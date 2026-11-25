import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The object design of one garage (parking-garage, Deep dive 2: the class diagram most interviewers ask for).
// Two steps: 1 the things: a garage has levels and gates; a level has spaces; a gate issues a ticket for a vehicle,
// and the ticket records the space it parks in; a reservation becomes a ticket when the driver arrives · 2 the two
// strategies: the garage asks a SpaceAllocator for a space and a PricingPolicy for a fee, so new rules are new
// classes, not new branches (SmallestFit, NearestLift, EvFirst; Hourly, DailyMax, EventFlat).
// Layout (880 × 520): four columns at x 20, 250, 470, 680 (w 180 to 190, 60 high) and four rows at y 20, 150, 290,
// 430. The garage sits alone on the top row; strategies take the two right columns.
// Colours (PATTERN_TONE): the building (garage, level, space) violet, the gate teal, what drives in (ticket,
// vehicle, reservation) orange, the strategies green (the part this figure is about).

const H = 60;
const col = [20, 250, 470, 680];
const row = [20, 150, 290, 430];

const box = (
  id: string,
  c: number,
  r: number,
  label: string,
  sub: string,
  tone: (typeof PATTERN_TONE)[keyof typeof PATTERN_TONE],
  step = 1,
  w = 180
): LayoutShape => ({ id, type: "box", x: col[c], y: row[r], w, h: H, label, sub, tone, fill: "pastel", step });

const arrow = (id: string, from: string, to: string, label?: string, step = 1, dashed = false): LayoutShape => ({
  id,
  type: "arrow",
  x: 0,
  y: 0,
  from,
  to,
  label,
  step,
  dashed,
});

const shapes: LayoutShape[] = [
  { ...box("garage", 0, 0, "ParkingGarage", "levels, gates", PATTERN_TONE.store, 1, 200), x: 340 },
  box("level", 0, 1, "Level", "spaces by size", PATTERN_TONE.store),
  box("gate", 1, 1, "Gate", "entry or exit", PATTERN_TONE.compute),
  box("space", 0, 2, "ParkingSpace", "id, size, free", PATTERN_TONE.store),
  box("ticket", 1, 2, "Ticket", "entry, exit, state", PATTERN_TONE.traffic),
  box("reservation", 0, 3, "Reservation", "type, window, code", PATTERN_TONE.traffic),
  box("vehicle", 1, 3, "Vehicle", "plate, type", PATTERN_TONE.traffic),

  box("allocator", 2, 1, "SpaceAllocator", "pick(type)", PATTERN_TONE.pattern, 2, 190),
  box("pricing", 3, 1, "PricingPolicy", "fee(ticket)", PATTERN_TONE.pattern, 2),
  box("alloc-impl", 2, 2, "SmallestFit", "NearestLift, EvFirst", PATTERN_TONE.pattern, 2, 190),
  box("price-impl", 3, 2, "Hourly", "DailyMax, EventFlat", PATTERN_TONE.pattern, 2),

  arrow("g-level", "garage", "level", "1..n"),
  arrow("g-gate", "garage", "gate", "1..n"),
  arrow("l-space", "level", "space", "1..n"),
  arrow("gate-ticket", "gate", "ticket", "issues"),
  arrow("t-space", "ticket", "space"),
  arrow("t-vehicle", "ticket", "vehicle", "for"),
  arrow("r-ticket", "reservation", "ticket", "on arrival", 1, true),

  arrow("g-alloc", "garage", "allocator", "uses", 2),
  arrow("g-pricing", "garage", "pricing", "uses", 2),
  arrow("ai-alloc", "alloc-impl", "allocator", "implements", 2, true),
  arrow("pi-pricing", "price-impl", "pricing", "implements", 2, true),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The classes of one parking garage",
  width: 880,
  height: row[3] + H + 30,
  steps: [{ title: "The garage, its spaces and tickets" }, { title: "Allocation and pricing as strategies" }],
  shapes,
};

export default spec;
