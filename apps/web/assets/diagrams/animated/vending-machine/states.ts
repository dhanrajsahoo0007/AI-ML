import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The vending machine as a state machine (vending-machine, Step 1 and Deep dive 1; the page's first figure).
// Three steps: 1 cash: Idle → Has credit (a coin or a note) → Dispensing (a selection whose price is covered) →
// Settling (pay change) → back to Idle · 2 card: Idle → Authorising (select, then tap) → Dispensing when approved, back
// to Idle when declined; Settling captures the hold instead of paying change · 3 failure paths (red): Has credit →
// Refunding on cancel or after 60 s with no choice; Dispensing → Refunding when the drop sensor sees nothing after one
// retry; Refunding returns the cash or releases the card hold, then goes back to Idle.
// Working: a $1.75 item paid with $2.00 gives $0.25 change; a card hold of $1.75 is captured or released, never both.
// Layout (880 × 404): boxes 150 × 56 in four columns at x 20, 250, 480, 710; the main row at y 60, the card and
// refund row at y 220; the "back to Idle" path runs above the main row at y 30; the refund path runs under the second
// row at y 316 and up the left at x 60; notes at y 340.
// Colours (PATTERN_TONE): Idle grey (infra), the two paying states orange (traffic), Dispensing teal (compute),
// Settling green (the state that ends a sale), Refunding and its arrows red (the failure paths).

const W = 150;
const H = 56;
const col = [20, 250, 480, 710];
const R1 = 60;
const R2 = 220;
const mid = (c: number) => col[c] + W / 2;

const st = (id: string, c: number, y: number, label: string, sub: string, tone: string, step = 1): LayoutShape => ({
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
  step,
});

const arrow = (
  id: string,
  from: string,
  to: string,
  label: string,
  step: number,
  extra: Partial<LayoutShape> = {}
): LayoutShape => ({ id, type: "arrow", x: 0, y: 0, from, to, label, step, ...extra });

const shapes: LayoutShape[] = [
  st("idle", 0, R1, "Idle", "shows prices", PATTERN_TONE.infra),
  st("credit", 1, R1, "Has credit", "cash inserted", PATTERN_TONE.traffic),
  st("dispensing", 2, R1, "Dispensing", "motor turns", PATTERN_TONE.compute),
  st("settling", 3, R1, "Settling", "change or capture", PATTERN_TONE.pattern),
  st("authorising", 1, R2, "Authorising", "card hold", PATTERN_TONE.traffic, 2),
  st("refunding", 2, R2, "Refunding", "return the money", PATTERN_TONE.fail, 3),

  arrow("a-coin", "idle", "credit", "coin, note", 1),
  arrow("a-select", "credit", "dispensing", "price covered", 1),
  arrow("a-drop", "dispensing", "settling", "item drops", 1),
  arrow("a-done", "settling", "idle", "change paid: back to Idle", 1, {
    via: [
      [mid(3), 30],
      [mid(0), 30],
    ],
  }),

  arrow("a-tap", "idle", "authorising", "select, tap", 2),
  arrow("a-approved", "authorising", "dispensing", "approved", 2),
  arrow("a-declined", "authorising", "idle", "declined", 2, { dashed: true, via: [[mid(0) + 20, R2 + H / 2]] }),

  arrow("a-cancel", "credit", "refunding", "cancel, 60 s", 3, { tone: PATTERN_TONE.fail }),
  arrow("a-nodrop", "dispensing", "refunding", "no drop", 3, { tone: PATTERN_TONE.fail }),
  arrow("a-returned", "refunding", "idle", "cash back or hold released", 3, {
    tone: PATTERN_TONE.fail,
    via: [
      [mid(2), R2 + H + 40],
      [60, R2 + H + 40],
    ],
  }),
  {
    id: "note",
    type: "text",
    x: col[0],
    y: R2 + H + 64,
    w: col[3] + W - col[0],
    h: 40,
    label:
      "Sold out: stay in Has credit and ask for another choice. Not enough coins for change: show “exact change only” first.\nDoor open or a fault: Out of service, after any credit is refunded.",
    tone: PATTERN_TONE.infra,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "The vending machine's states",
  width: 880,
  height: R2 + H + 128,
  steps: [{ title: "Cash: pay, vend, change" }, { title: "Card: authorise first" }, { title: "Failure paths: refund" }],
  shapes,
};

export default spec;
