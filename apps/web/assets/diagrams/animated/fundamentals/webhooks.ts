import type { SequenceSpec } from "@/components/diagrams/types";

// One webhook, three tries. A card payment for order 1042 succeeds at the payment provider, which turns it into
// event evt_81 and POSTs it to the lamp shop's endpoint, signed with the shared secret.
// Step 1: the shop is half-way through a deploy, so try 1 gets no answer within the 10 s timeout.
// Step 2: about 30 s later try 2 arrives; the shop checks the signature, stores evt_81 in its inbox table and
// answers 200, but the 200 is lost on the way back, so the sender still thinks the delivery failed.
// Step 3: about 2 min later try 3 arrives; the inbox already holds evt_81, so the shop answers 200 and does no new
// work. The order is marked paid once.
//
// Retry waits grow 4x per try (30 s, 2 min, 8 min, ...), matching the schedule on the page.
// Lane x (default width 760, 180 per lane): payments 110, sender 290, endpoint 470, inbox 650.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "A webhook that fails, retries and arrives twice",
  steps: [
    { title: "The event is signed and sent; try 1 gets no answer" },
    { title: "Try 2 is stored, but its 200 is lost" },
    { title: "Try 3 is a duplicate and changes nothing" },
  ],
  lanes: [
    { id: "payments", label: "Payments", icon: "card", tone: "teal" },
    { id: "sender", label: "Webhook sender", icon: "workers", tone: "orange" },
    { id: "endpoint", label: "Shop endpoint", icon: "api", tone: "green" },
    { id: "inbox", label: "Shop inbox", icon: "database", tone: "violet" },
  ],
  messages: [
    // Step 1: the event leaves the provider's core and the first POST times out.
    { from: "payments", to: "sender", label: "payment.succeeded evt_81", kind: "async", step: 1 },
    { from: "sender", to: "endpoint", label: "POST evt_81, try 1", kind: "timeout", step: 1, duration: 2 },

    // Step 2: the retry gets through; the reply does not.
    { from: "sender", to: "endpoint", label: "POST evt_81, try 2", step: 2, delay: 1.5 },
    { from: "endpoint", to: "endpoint", label: "verify signature", step: 2 },
    { from: "endpoint", to: "inbox", label: "insert evt_81 if new", step: 2 },
    { from: "inbox", to: "endpoint", label: "new row", kind: "return", step: 2 },
    { from: "endpoint", to: "sender", label: "200 OK (lost)", kind: "timeout", step: 2, duration: 2 },

    // Step 3: the duplicate is recognised by its event id.
    { from: "sender", to: "endpoint", label: "POST evt_81, try 3", step: 3, delay: 1.5 },
    { from: "endpoint", to: "endpoint", label: "verify signature", step: 3 },
    { from: "endpoint", to: "inbox", label: "insert evt_81 if new", step: 3 },
    { from: "inbox", to: "endpoint", label: "already there", kind: "return", step: 3 },
    { from: "endpoint", to: "sender", label: "200 OK, no new work", kind: "return", step: 3 },
  ],
  notes: [
    { lane: "sender", text: "Signs id, time, body", step: 1, at: 0.5 },
    { lane: "sender", text: "No answer in 10 s: retry in ~30 s", step: 1, at: 1.5 },
    { lane: "sender", text: "Saw no 200: retry in ~2 min", step: 2, at: 6.5 },
    { lane: "inbox", text: "Order 1042 paid once", step: 3 },
  ],
};

export default spec;
