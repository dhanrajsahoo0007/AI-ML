import type { SequenceSpec } from "@/components/diagrams/types";
import { ORDER, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A lost acknowledgement, a redelivery and the dead-letter queue (message-queues, Delivery guarantees).
// Two steps: 1 worker A receives the message for order 4471, reserves stock, then crashes before deleting it; after
// the 30 s visibility timeout worker B receives it again, and the idempotent check in the orders database skips the
// second reservation · 2 a poison message (it fails to parse) is received five times; at maxReceiveCount 5 the queue
// moves it to the dead-letter queue.
// Layout: five lanes. Colours (PATTERN_TONE): the queue neutral (plumbing), workers teal (compute), the orders
// database violet (store), the dead-letter queue green (the pattern's own part); the lost delete is the red timeout.
// Fact check (2026-11-16, SQS developer guide): visibility timeout defaults to 30 s, at most 12 h; an undeleted
// message "becomes visible again"; a redrive policy moves a message to the DLQ once its receive count exceeds
// maxReceiveCount.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A lost ack, a redelivery and a dead letter",
  lanes: [
    { id: "q", label: "Order queue", icon: "queue", tone: PATTERN_TONE.infra },
    { id: "a", label: "Worker A", icon: "server", tone: PATTERN_TONE.compute },
    { id: "b", label: "Worker B", icon: "server", tone: PATTERN_TONE.compute },
    { id: "db", label: "Orders DB", icon: "database", tone: PATTERN_TONE.store },
    { id: "dlq", label: "Dead letters", icon: "queue", tone: PATTERN_TONE.pattern },
  ],
  messages: [
    { from: "q", to: "a", label: `order ${ORDER.orderId} (receive 1)`, step: 1 },
    { from: "a", to: "db", label: "reserve stock, msg id m1", step: 1 },
    { from: "db", to: "a", label: "done", kind: "return", step: 1 },
    { from: "a", to: "q", label: "delete (crashed first)", kind: "timeout", step: 1 },
    { from: "q", to: "q", label: "30 s visibility timeout", kind: "note", step: 1 },
    { from: "q", to: "b", label: `order ${ORDER.orderId} (receive 2)`, step: 1 },
    { from: "b", to: "db", label: "reserve stock, msg id m1", step: 1 },
    { from: "db", to: "b", label: "m1 already done: skip", kind: "return", step: 1 },
    { from: "b", to: "q", label: "delete", step: 1 },

    { from: "q", to: "b", label: "bad message (receive 1 to 5)", step: 2 },
    { from: "b", to: "q", label: "parse error, no delete", kind: "timeout", step: 2 },
    { from: "q", to: "dlq", label: "maxReceiveCount 5: move", kind: "async", step: 2 },
  ],
  steps: [{ title: "A lost ack: redelivered, skipped" }, { title: "A poison message: dead-lettered" }],
};

export default spec;
