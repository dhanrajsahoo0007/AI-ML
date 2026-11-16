import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Why a lock needs a fencing token (concurrency-and-locking, Technical mechanics). Client 1 takes a lease, pauses longer
// than the lease, and wakes up still believing it holds the lock.
// Three steps: 1 client 1 gets the lease with token 33 · 2 client 1 pauses (a long GC pause); the lease expires and
// client 2 gets token 34 and writes with it · 3 client 1 wakes and writes with token 33; the storage has already seen 34
// and rejects it.
// Layout: four lanes. Colours (PATTERN_TONE): clients teal (compute), the lock service green (the pattern), storage
// violet (store); the stale write is the red timeout arrow.
// Fact check (2026-11-16): Kleppmann, "How to do distributed locking" (2016): the storage server "remembers that it
// has already processed a write with a higher token number" and rejects token 33 after 34.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A paused lock holder and a fencing token",
  lanes: [
    { id: "c1", label: "Client 1", icon: "server", tone: PATTERN_TONE.compute },
    { id: "lock", label: "Lock service", icon: "lock", tone: PATTERN_TONE.pattern },
    { id: "c2", label: "Client 2", icon: "server", tone: PATTERN_TONE.compute },
    { id: "store", label: "Storage", icon: "database", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "c1", to: "lock", label: "acquire", step: 1 },
    { from: "lock", to: "c1", label: "lease, token 33", kind: "return", step: 1 },

    { from: "c2", to: "lock", label: "acquire", step: 2 },
    { from: "lock", to: "c2", label: "lease, token 34", kind: "return", step: 2 },
    { from: "c2", to: "store", label: "write, token 34", step: 2 },
    { from: "store", to: "c2", label: "ok", kind: "return", step: 2 },

    { from: "c1", to: "store", label: "write, token 33", kind: "timeout", step: 3, duration: 1.6 },
    { from: "store", to: "c1", label: "rejected: 33 < 34", kind: "return", step: 3 },
  ],
  notes: [{ lane: "c1", text: "GC pause 30 s; lease expires", step: 2, at: 1.5 }],
  steps: [
    { title: "Client 1 takes the lease: token 33" },
    { title: "Client 1 pauses; client 2 gets token 34" },
    { title: "Client 1 wakes: its write is rejected" },
  ],
};

export default spec;
