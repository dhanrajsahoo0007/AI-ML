import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Request-reply against pipelining on one connection (batching-and-pipelining, Technical mechanics). The product
// service reads three keys from Redis.
// Two steps: 1 request-reply: each GET waits for its reply before the next is sent, three round trips · 2 pipelined:
// all three GETs go out back to back and the three replies come back together, one round trip.
// Layout: two lanes. Colours (PATTERN_TONE): the app server teal (compute), Redis violet (store).
// Fact check (2026-11-16): Redis docs: with a 250 ms round trip a client can do at most four requests a second
// without pipelining; pipelining also cuts read() and write() system calls, up to about 10 times the throughput.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Three round trips, or one",
  width: 640,
  lanes: [
    { id: "app", label: "App server", icon: "server", tone: PATTERN_TONE.compute },
    { id: "redis", label: "Redis", icon: "cache", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "app", to: "redis", label: "GET price:kettle", step: 1 },
    { from: "redis", to: "app", label: "42.00", kind: "return", step: 1 },
    { from: "app", to: "redis", label: "GET stock:kettle", step: 1 },
    { from: "redis", to: "app", label: "9,712", kind: "return", step: 1 },
    { from: "app", to: "redis", label: "GET rating:kettle", step: 1 },
    { from: "redis", to: "app", label: "4.6", kind: "return", step: 1 },

    { from: "app", to: "redis", label: "GET price:kettle", kind: "async", step: 2 },
    { from: "app", to: "redis", label: "GET stock:kettle", kind: "async", step: 2, delay: 0 },
    { from: "app", to: "redis", label: "GET rating:kettle", kind: "async", step: 2, delay: 0 },
    { from: "redis", to: "app", label: "42.00 · 9,712 · 4.6", kind: "return", step: 2 },
  ],
  notes: [
    { lane: "redis", text: "3 round trips", step: 1, at: 5.5 },
    { lane: "redis", text: "1 round trip", step: 2, at: 9.5 },
  ],
  steps: [{ title: "Request-reply: three round trips" }, { title: "Pipelined: one round trip" }],
};

export default spec;
