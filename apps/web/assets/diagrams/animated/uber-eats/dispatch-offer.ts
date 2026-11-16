import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Offering a delivery to one courier at a time (uber-eats, Step 4 and Deep dive 2).
// Steps: 1 offer, timeout, next courier: dispatch finds free couriers within 3 km of restaurant R in the location
// store, claims courier A with SET NX and a 30 s expiry, offers order 7, hears nothing for 30 s, lets the claim
// expire, claims and offers courier B, who accepts; a conditional update in the orders DB makes the assignment
// final · 2 two orders want one courier: order 9's worker tries to claim B, finds the key taken and claims C instead ·
// 3 a late accept: A taps accept at 34 s; the conditional update changes 0 rows because B already holds the order, so
// A is told the offer expired.
// Working: 600 orders/s at peak × about 1.5 offers per order (illustrative decline rate) = 900 claims/s on the
// location store, against 250K position writes/s there: claims add under 0.4 %.
// Layout: five lanes. Colours (PATTERN_TONE): dispatch teal (compute), the location store and the orders DB violet
// (stores), couriers orange (traffic); the unanswered offer is the red timeout arrow.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Dispatch: claim a courier, offer, time out, try the next",
  width: 880,
  lanes: [
    { id: "d", label: "Dispatch", icon: "workers", tone: PATTERN_TONE.compute },
    { id: "loc", label: "Location store", icon: "cache", tone: PATTERN_TONE.store },
    { id: "a", label: "Courier A", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "b", label: "Courier B", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "db", label: "Orders DB", icon: "database", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "d", to: "loc", label: "free couriers within 3 km of R", step: 1 },
    { from: "loc", to: "d", label: "A 1.1 km, B 1.8 km", kind: "return", step: 1 },
    { from: "d", to: "loc", label: "SET claim:A order7 NX EX 30", step: 1 },
    { from: "loc", to: "d", label: "OK", kind: "return", step: 1 },
    { from: "d", to: "a", label: "offer order 7: no answer in 30 s", kind: "timeout", step: 1 },
    { from: "d", to: "loc", label: "SET claim:B order7 NX EX 30", step: 1 },
    { from: "loc", to: "d", label: "OK", kind: "return", step: 1 },
    { from: "d", to: "b", label: "offer order 7, 30 s", kind: "async", step: 1 },
    { from: "b", to: "d", label: "accept", step: 1 },
    { from: "d", to: "db", label: "set courier B where courier is null", step: 1 },
    { from: "db", to: "d", label: "1 row: assigned", kind: "return", step: 1 },

    { from: "d", to: "loc", label: "order 9: SET claim:B NX", step: 2 },
    { from: "loc", to: "d", label: "nil: B is taken", kind: "return", step: 2 },
    { from: "d", to: "loc", label: "order 9: SET claim:C NX", step: 2 },
    { from: "loc", to: "d", label: "OK: offer to C", kind: "return", step: 2 },

    { from: "a", to: "d", label: "accept order 7 (at 34 s)", step: 3 },
    { from: "d", to: "db", label: "set courier A where courier is null", step: 3 },
    { from: "db", to: "d", label: "0 rows", kind: "return", step: 3 },
    { from: "d", to: "a", label: "offer expired", kind: "return", step: 3 },
  ],
  notes: [{ lane: "loc", text: "claim:A expires after 30 s", step: 1, at: 4.5 }],
  steps: [
    { title: "Offer, no answer, next courier" },
    { title: "Two orders want courier B" },
    { title: "A late accept loses" },
  ],
};

export default spec;
