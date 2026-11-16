import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Two overlapping stays race for Saturday's last room (hotel-booking, Step 3 and Deep dive 1).
// Two steps: 1 the race: guest A wants Fri and Sat, guest B wants Sat and Sun; the booking service reads Saturday's
// count for each (9 of 10 taken), then writes 10 for each, so both are told "booked" and 11 guests hold 10 rooms ·
// 2 the guarded update: each booking is one transaction that updates its nights in date order with the guard
// held + sold + 1 ≤ total; A locks Fri, then Sat, and commits; B waits on Saturday's row lock, then re-checks the
// guard on the new value 10, changes 0 rows, rolls back its other night and is told Saturday is sold out.
// Working: total 10, 9 taken on Saturday before the race; 9 + 1 = 10 ≤ 10 for A; 10 + 1 = 11 > 10 for B.
// Updating nights in date order means two stays never lock each other's rows in opposite orders (no deadlock).
// Layout: four lanes. Colours (PATTERN_TONE): guests orange (traffic), booking teal (compute), inventory DB violet
// (store); the overbooking write and B's 0-row result are red (timeout arrows).

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Two overlapping stays, one last room",
  lanes: [
    { id: "a", label: "Guest A", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "b", label: "Guest B", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "svc", label: "Booking", icon: "lock", tone: PATTERN_TONE.compute },
    { id: "db", label: "Inventory DB", icon: "database", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "a", to: "svc", label: "book Fri, Sat", step: 1 },
    { from: "b", to: "svc", label: "book Sat, Sun", step: 1 },
    { from: "svc", to: "db", label: "read Sat (for A)", step: 1 },
    { from: "db", to: "svc", label: "9 of 10 taken", kind: "return", step: 1 },
    { from: "svc", to: "db", label: "read Sat (for B)", step: 1 },
    { from: "db", to: "svc", label: "9 of 10 taken", kind: "return", step: 1 },
    { from: "svc", to: "db", label: "write Sat = 10 (A)", step: 1 },
    { from: "svc", to: "db", label: "write Sat = 10 (B): 11 guests", kind: "timeout", step: 1 },
    { from: "svc", to: "a", label: "booked", kind: "return", step: 1 },
    { from: "svc", to: "b", label: "booked", kind: "return", step: 1 },

    { from: "svc", to: "db", label: "A: guarded UPDATE Fri, Sat", step: 2 },
    { from: "db", to: "svc", label: "2 rows: commit", kind: "return", step: 2 },
    { from: "svc", to: "db", label: "B: guarded UPDATE Sat, Sun", step: 2 },
    { from: "db", to: "svc", label: "Sat 10 + 1 > 10: roll back", kind: "timeout", step: 2 },
    { from: "svc", to: "a", label: "held until 10:15", kind: "return", step: 2 },
    { from: "svc", to: "b", label: "Sat sold out", kind: "return", step: 2 },
  ],
  steps: [{ title: "Read, then write: 11 guests, 10 rooms" }, { title: "Guarded update: one gets the room" }],
};

export default spec;
