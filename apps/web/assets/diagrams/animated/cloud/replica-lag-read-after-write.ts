import type { SequenceSpec } from "@/components/diagrams/types";

// A write to the primary followed by a read from a replica that has not caught up (cloud/data/managed-relational).
// Step 1: at 9:42:00 a shopper pays for order 5121; the shop app writes "paid" to the primary, which commits at once.
// The replica is still replaying changes from 9:41:20. Step 2: one second later the order page asks the replica,
// which answers "pending", because the payment has not reached it yet. Step 3: the shopper sees "Pay now" and pays
// again: a second payment for the same order. Step 4: the fix, read-your-writes routing. For 60 s after a write,
// that shopper's reads go to the primary, which answers "paid".
// Lane names are cloud-neutral, and no status code appears: every provider's replicas behave this way. Lanes are
// ordered so that the most frequent hops (shopper <-> app <-> primary) sit between neighbours.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "Reading your own write from a replica that is 40 seconds behind",
  width: 760,
  steps: [
    { title: "The payment is written to the primary" },
    { title: "The order page reads the replica" },
    { title: "The shopper pays again" },
    { title: "The fix: fresh reads go to the primary" },
  ],
  lanes: [
    { id: "shopper", label: "Shopper", icon: "phone", tone: "neutral" },
    { id: "app", label: "Shop app", icon: "server", tone: "teal" },
    { id: "primary", label: "Primary", icon: "database", tone: "violet" },
    { id: "replica", label: "Read replica", icon: "database", tone: "violet" },
  ],
  messages: [
    // Step 1: the write commits on the primary; the copy to the replica is on its way, 40 s behind.
    { from: "shopper", to: "app", label: "9:42:00 pay order 5121", step: 1 },
    { from: "app", to: "primary", label: "set 5121 to paid", step: 1 },
    { from: "primary", to: "app", label: "committed", kind: "return", step: 1 },
    { from: "app", to: "shopper", label: "go to order page", kind: "return", step: 1 },

    // Step 2: the order page reads the replica, which has not replayed the payment yet.
    { from: "shopper", to: "app", label: "9:42:01 open order page", step: 2, delay: 0.6 },
    { from: "app", to: "replica", label: "status of 5121?", step: 2 },
    { from: "replica", to: "app", label: "pending (as of 9:41:21)", kind: "return", step: 2 },
    { from: "app", to: "shopper", label: "payment pending, pay now?", kind: "return", step: 2 },

    // Step 3: the stale page invites a second payment.
    { from: "shopper", to: "app", label: "9:42:20 pay again", step: 3, delay: 0.6 },
    { from: "app", to: "primary", label: "second payment, 5121", step: 3 },
    { from: "primary", to: "app", label: "committed", kind: "return", step: 3 },

    // Step 4: read-your-writes routing. The app knows this shopper wrote 1 s ago, so it asks the primary.
    { from: "shopper", to: "app", label: "9:42:01 open order page", step: 4, delay: 0.6 },
    { from: "app", to: "primary", label: "status? (wrote 1 s ago)", step: 4 },
    { from: "primary", to: "app", label: "paid", kind: "return", step: 4 },
    { from: "app", to: "shopper", label: "order confirmed", kind: "return", step: 4 },
  ],
  notes: [
    { lane: "replica", text: "Replaying 9:41:20", step: 1, at: 1.5 },
    { lane: "replica", text: "Payment not here yet", step: 2, at: 6.5 },
    { lane: "shopper", text: "Charged twice", step: 3, at: 10.5 },
    { lane: "replica", text: "Gets this shopper's reads after 60 s", step: 4 },
  ],
};

export default spec;
