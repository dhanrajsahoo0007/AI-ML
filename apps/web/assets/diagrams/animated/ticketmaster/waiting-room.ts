import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The waiting room (ticketmaster, Step 6 and Deep dive 2).
// Two steps: 1 a fan arrives at 09:50 and waits in the pre-queue; at 10:00 the pre-queue is shuffled and every fan
// gets a position; this fan is at 812,345, so the wait is 812,345 ÷ 500 per second = 1,625 s ≈ 27 minutes; at their
// turn the waiting room hands out a signed token valid for 10 minutes; the gateway checks the signature and the
// expiry, then passes the hold to the booking service · 2 a request with no token, or an expired one, is redirected
// back to the waiting room and never reaches the booking service.
// Working: R = 500 admissions/s matches the checkout capacity of 500 orders/s (the page's round numbers).
// Layout: four lanes. Colours (PATTERN_TONE): the fan orange (traffic), the waiting room green (the pattern's own
// part), the gateway neutral (plumbing), the booking service teal (compute).

const R = 500;
const position = 812_345;
const waitMinutes = Math.round(position / R / 60); // 27

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A waiting room admits fans at the rate checkout can take",
  lanes: [
    { id: "fan", label: "Fan", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "wr", label: "Waiting room", icon: "users", tone: PATTERN_TONE.pattern },
    { id: "gw", label: "API gateway", icon: "gateway", tone: PATTERN_TONE.infra },
    { id: "svc", label: "Booking", icon: "lock", tone: PATTERN_TONE.compute },
  ],
  messages: [
    { from: "fan", to: "wr", label: "arrive 09:50: pre-queue", step: 1 },
    { from: "wr", to: "wr", label: "10:00: shuffle, assign positions", kind: "note", step: 1 },
    {
      from: "wr",
      to: "fan",
      label: `position ${position.toLocaleString("en-GB")}, about ${waitMinutes} min`,
      kind: "return",
      step: 1,
    },
    { from: "wr", to: "fan", label: `your turn (${R}/s): signed token, 10 min`, kind: "return", step: 1 },
    { from: "fan", to: "gw", label: "hold A12 + token", step: 1 },
    { from: "gw", to: "gw", label: "check signature, expiry", kind: "note", step: 1 },
    { from: "gw", to: "svc", label: "hold A12", step: 1 },

    { from: "fan", to: "gw", label: "hold A12, no token", step: 2 },
    { from: "gw", to: "fan", label: "302 to the waiting room", kind: "return", step: 2 },
  ],
  steps: [{ title: "Queue, token, admitted" }, { title: "No token: sent back" }],
};

export default spec;
