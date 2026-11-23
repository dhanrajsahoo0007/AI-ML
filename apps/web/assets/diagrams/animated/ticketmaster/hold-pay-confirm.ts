import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Hold, pay, confirm as one workflow, with the failure path (ticketmaster, Step 4 and Deep dive 3).
// Two steps: 1 the seat is held until 10:10; the fan pays with idempotency key k9; the payment service authorises the
// card (funds reserved, not taken); the booking service claims the seat and writes the order in one transaction,
// only while the hold is still theirs; then the payment is captured and the fan gets order 5521 · 2 the fan pays at
// 10:11: the hold expired at 10:10 and the seat went to someone else; the claim changes 0 rows, so the authorisation
// is voided (no money moved) and the fan is told to pick again.
// Working: hold 10:00 to 10:10 (the 10-minute hold); ids are illustrative.
// Layout: five lanes. Colours (PATTERN_TONE): the fan orange (traffic), booking and payment teal (compute), the
// inventory DB violet (store), the card processor neutral (external); the failed claim is the red timeout arrow.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Hold, pay, confirm: authorise, claim, then capture",
  lanes: [
    { id: "fan", label: "Fan", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "svc", label: "Booking", icon: "lock", tone: PATTERN_TONE.compute },
    { id: "db", label: "Inventory DB", icon: "database", tone: PATTERN_TONE.store },
    { id: "pay", label: "Payment", icon: "card", tone: PATTERN_TONE.compute },
    { id: "card", label: "Card processor", icon: "coin", tone: PATTERN_TONE.infra },
  ],
  messages: [
    { from: "fan", to: "svc", label: "pay for A12, key k9", step: 1 },
    { from: "svc", to: "pay", label: "authorise, key k9", step: 1 },
    { from: "pay", to: "card", label: "authorise", step: 1 },
    { from: "card", to: "pay", label: "approved", kind: "return", step: 1 },
    { from: "pay", to: "svc", label: "authorised", kind: "return", step: 1 },
    { from: "svc", to: "db", label: "claim A12 if still mine + order", step: 1 },
    { from: "db", to: "svc", label: "1 row: sold, order 5521", kind: "return", step: 1 },
    { from: "svc", to: "pay", label: "capture k9", kind: "async", step: 1 },
    { from: "svc", to: "fan", label: "order 5521 confirmed", kind: "return", step: 1 },

    { from: "fan", to: "svc", label: "10:11: pay, key k9", step: 2 },
    { from: "svc", to: "pay", label: "authorise, key k9", step: 2 },
    { from: "pay", to: "svc", label: "authorised", kind: "return", step: 2 },
    { from: "svc", to: "db", label: "claim A12 if still mine", step: 2 },
    { from: "db", to: "svc", label: "0 rows: hold expired 10:10", kind: "timeout", step: 2 },
    { from: "svc", to: "pay", label: "void k9 (no money moved)", step: 2 },
    { from: "svc", to: "fan", label: "hold expired: pick again", kind: "return", step: 2 },
  ],
  steps: [{ title: "Authorise, claim, capture" }, { title: "The hold expired mid-payment" }],
};

export default spec;
