import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The life of a reservation and a ticket (parking-garage, Step 2 and Data model).
// Top row, the reservation: booked (its slots taken) → cancelled (all slots released) or no-show (30 minutes after
// the start with no arrival: the rest of the window released) or, when the driver arrives, a ticket. Bottom row, the
// ticket: a drive-up driver or an arriving reservation opens it (active, inside) → paid (15 minutes to leave) →
// exited (closed). A paid ticket whose 15 minutes pass goes back to active and owes the extra time.
// Layout (880 × 350): boxes 150 × 56 in four columns at x 20, 250, 480, 710; the reservation row at y 40, the ticket row
// at y 210; the grace arrow runs under the ticket row at y 300; a note line at y 318.
// Colours (PATTERN_TONE): the booking orange (traffic), the open ticket blue (data in motion), paid green (the
// state the exit gate checks), ended states grey (infra).

const W = 150;
const H = 56;
const col = [20, 250, 480, 710];
const R1 = 40;
const R2 = 210;
const st = (id: string, c: number, y: number, label: string, sub: string, tone: string): LayoutShape => ({
  id,
  type: "box",
  x: col[c],
  y,
  w: W,
  h: H,
  label,
  sub,
  tone: tone as LayoutShape["tone"],
  fill: "pastel",
});
const mid = (c: number) => col[c] + W / 2;

const shapes: LayoutShape[] = [
  st("cancelled", 0, R1, "Cancelled", "all slots released", PATTERN_TONE.infra),
  st("booked", 1, R1, "Booked", "slots taken", PATTERN_TONE.traffic),
  st("noshow", 2, R1, "No-show", "rest released", PATTERN_TONE.infra),
  {
    id: "driveup",
    type: "text",
    x: col[0],
    y: R2,
    w: W,
    h: H,
    label: "Drive-up\nno booking",
    tone: PATTERN_TONE.infra,
  },
  st("active", 1, R2, "Active", "car inside", PATTERN_TONE.data),
  st("paid", 2, R2, "Paid", "15 min to leave", PATTERN_TONE.pattern),
  st("exited", 3, R2, "Exited", "ticket closed", PATTERN_TONE.infra),

  { id: "a-cancel", type: "arrow", x: 0, y: 0, from: "booked", to: "cancelled", label: "cancel" },
  { id: "a-noshow", type: "arrow", x: 0, y: 0, from: "booked", to: "noshow", label: "30 min late", dashed: true },
  { id: "a-arrive", type: "arrow", x: 0, y: 0, from: "booked", to: "active", label: "arrives: code or plate" },
  { id: "a-drive", type: "arrow", x: 0, y: 0, from: "driveup", to: "active" },
  { id: "a-pay", type: "arrow", x: 0, y: 0, from: "active", to: "paid", label: "pay" },
  { id: "a-exit", type: "arrow", x: 0, y: 0, from: "paid", to: "exited", label: "exit gate" },
  {
    id: "a-grace",
    type: "arrow",
    x: 0,
    y: 0,
    from: "paid",
    to: "active",
    via: [
      [mid(2), R2 + H + 34],
      [mid(1), R2 + H + 34],
    ],
    label: "15 min passed: owes the extra",
    dashed: true,
  },
  {
    id: "note",
    type: "text",
    x: col[0],
    y: R2 + H + 52,
    w: col[3] + W - col[0],
    h: 22,
    label: "Lost ticket: the fee is the daily maximum. An exit taken offline uploads later under the same event id.",
    tone: PATTERN_TONE.infra,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The life of a reservation and a ticket",
  width: 880,
  height: R2 + H + 84,
  shapes,
};

export default spec;
