import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A quorum write with one replica down, then a quorum read that repairs it (key-value-store, Step 3 and Deep dive 1).
// Two steps: 1 the client puts k = v2 with N = 3, W = 2; the coordinator sends it to A, B and C; B is down and times
// out; A and C acknowledge, so 2 of 3 acks meet W = 2 and the client gets OK; the coordinator parks a hint for B on
// the next healthy node (the note) · 2 B is back but has not yet received the hint, so it still holds v1; the client
// gets k with R = 2; the coordinator asks A and B; A answers v2 (version A:2), B answers v1 (version A:1); A:2
// descends from A:1, so v2 wins, the client gets v2, and the coordinator writes v2 back to B (read repair).
// Working: W + R = 2 + 2 = 4 > N = 3, so the read set {A, B} overlaps the write set {A, C} in A: the overlap is what
// returns v2. Versions are illustrative.
// Layout: five lanes. Colours (PATTERN_TONE): the client orange (traffic), the coordinator green (the pattern's own
// part), the replicas teal (compute); the timeout to B is red.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A quorum write with a replica down, then a read that repairs",
  lanes: [
    { id: "client", label: "Client", icon: "server", tone: PATTERN_TONE.traffic },
    { id: "coord", label: "Coordinator", icon: "coordinator", tone: PATTERN_TONE.pattern },
    { id: "a", label: "Replica A", icon: "node", tone: PATTERN_TONE.compute },
    { id: "b", label: "Replica B", icon: "node", tone: PATTERN_TONE.compute },
    { id: "c", label: "Replica C", icon: "node", tone: PATTERN_TONE.compute },
  ],
  messages: [
    { from: "client", to: "coord", label: "put k = v2 (W = 2)", step: 1 },
    { from: "coord", to: "a", label: "write v2, A:2", step: 1 },
    { from: "coord", to: "b", label: "write v2: B is down", kind: "timeout", step: 1 },
    { from: "coord", to: "c", label: "write v2, A:2", step: 1 },
    { from: "a", to: "coord", label: "ack 1", kind: "return", step: 1 },
    { from: "c", to: "coord", label: "ack 2", kind: "return", step: 1 },
    { from: "coord", to: "client", label: "OK: 2 of 3 acks", kind: "return", step: 1 },

    { from: "client", to: "coord", label: "get k (R = 2)", step: 2 },
    { from: "coord", to: "a", label: "read k", step: 2 },
    { from: "coord", to: "b", label: "read k", step: 2 },
    { from: "a", to: "coord", label: "v2, A:2", kind: "return", step: 2 },
    { from: "b", to: "coord", label: "v1, A:1 (stale)", kind: "return", step: 2 },
    { from: "coord", to: "client", label: "v2 (A:2 is newer)", kind: "return", step: 2 },
    { from: "coord", to: "b", label: "read repair: write v2", kind: "async", step: 2 },
  ],
  notes: [
    { lane: "coord", text: "hint for B kept on the next node", step: 1, at: 6.5 },
    { lane: "b", text: "back, hint not yet replayed", step: 2, at: 6.8 },
  ],
  steps: [
    { title: "Write: B is down, 2 of 3 acks are enough" },
    { title: "Read: the overlap returns v2 and repairs B" },
  ],
};

export default spec;
