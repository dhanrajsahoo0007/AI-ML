import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Two fans, one seat (ticketmaster, Step 2 and Deep dive 1).
// Two steps: 1 the race: fans A and B both ask for seat A12 within a few milliseconds; the booking service reads
// "available" twice, then writes "held" twice, so B's write overwrites A's and both fans see "held" · 2 the
// conditional update: each request runs UPDATE seats SET status = 'held' … WHERE seat = 'A12' AND status =
// 'available'; the database runs them one after the other on the row, so A's changes 1 row and B's changes 0 rows,
// and B is told to pick another seat.
// Layout: four lanes. Colours (PATTERN_TONE): fans orange (traffic), the booking service teal (compute), the inventory
// DB violet (store); the overwrite is the red timeout arrow.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Two fans, one seat: the race and the conditional update",
  lanes: [
    { id: "a", label: "Fan A", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "b", label: "Fan B", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "svc", label: "Booking", icon: "lock", tone: PATTERN_TONE.compute },
    { id: "db", label: "Inventory DB", icon: "database", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "a", to: "svc", label: "hold A12", step: 1 },
    { from: "b", to: "svc", label: "hold A12", step: 1 },
    { from: "svc", to: "db", label: "read A12 (for A)", step: 1 },
    { from: "db", to: "svc", label: "available", kind: "return", step: 1 },
    { from: "svc", to: "db", label: "read A12 (for B)", step: 1 },
    { from: "db", to: "svc", label: "available", kind: "return", step: 1 },
    { from: "svc", to: "db", label: "write held by A", step: 1 },
    { from: "svc", to: "db", label: "write held by B: A lost", kind: "timeout", step: 1 },
    { from: "svc", to: "a", label: "held", kind: "return", step: 1 },
    { from: "svc", to: "b", label: "held", kind: "return", step: 1 },

    { from: "svc", to: "db", label: "A: UPDATE … WHERE available", step: 2 },
    { from: "db", to: "svc", label: "1 row changed", kind: "return", step: 2 },
    { from: "svc", to: "db", label: "B: UPDATE … WHERE available", step: 2 },
    { from: "db", to: "svc", label: "0 rows changed", kind: "return", step: 2 },
    { from: "svc", to: "a", label: "held until 10:10", kind: "return", step: 2 },
    { from: "svc", to: "b", label: "taken: pick another", kind: "return", step: 2 },
  ],
  steps: [{ title: "Read, then write: both fans get A12" }, { title: "One conditional update: one winner" }],
};

export default spec;
