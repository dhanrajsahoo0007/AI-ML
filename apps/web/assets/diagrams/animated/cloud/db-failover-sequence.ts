import type { SequenceSpec } from "@/components/diagrams/types";

// A database failover seen from the app (cloud/resilience/ha-patterns). Brightpost's monthly failover drill at 06:00:
// the app writes through a name (the database endpoint) to the primary in zone A, which copies each write to the
// standby in zone B before it confirms. At 06:00 the primary stops; the app's next write times out and the app
// retries with growing waits. At about 06:01:40 the cloud promotes the standby and points the name at it. At 06:02
// the app looks up the name again, reconnects, and retries the same order with the same idempotency key, so the
// order is saved once. The labels are cloud-neutral: every provider has these four parts, though some keep the
// address and move it instead of changing the name (the page's Google Cloud tab says so).
// Lanes are ordered so the most frequent hop (app <-> endpoint) is between neighbours.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "A database failover, seen from the app",
  width: 800,
  steps: [
    { title: "Before: every order is in two zones" },
    { title: "06:00 the primary stops" },
    { title: "The standby is promoted" },
    { title: "Look up the name again and retry" },
  ],
  lanes: [
    { id: "app", label: "App server", icon: "server", tone: "teal" },
    { id: "endpoint", label: "DB endpoint", icon: "dns", tone: "blue" },
    { id: "primary", label: "Primary (A)", icon: "database", tone: "violet" },
    { id: "standby", label: "Standby (B)", icon: "database", tone: "violet" },
  ],
  messages: [
    // Step 1: the app finds the primary through a name; each write is in both zones before it counts.
    { from: "app", to: "endpoint", label: "where is orders-db?", step: 1 },
    { from: "endpoint", to: "app", label: "the primary, zone A", kind: "return", step: 1 },
    { from: "app", to: "primary", label: "INSERT order 5121", step: 1 },
    { from: "primary", to: "standby", label: "copy, then wait", step: 1 },
    { from: "standby", to: "primary", label: "stored", kind: "return", step: 1 },
    { from: "primary", to: "app", label: "committed", kind: "return", step: 1 },

    // Step 2: the drill stops the primary. The open connection breaks and the next write gets no answer.
    { from: "app", to: "primary", label: "06:00:02 INSERT order 5122", kind: "timeout", step: 2, duration: 2 },

    // Step 3: the cloud promotes the standby and moves the name to it.
    { from: "standby", to: "endpoint", label: "06:01:40 promoted: point the name here", step: 3, delay: 0.6 },

    // Step 4: the app looks the name up again and retries the same order with the same key.
    { from: "app", to: "endpoint", label: "06:02 where is orders-db?", step: 4, delay: 0.6 },
    { from: "endpoint", to: "app", label: "the new primary, zone B", kind: "return", step: 4 },
    { from: "app", to: "standby", label: "retry 5122, same key", step: 4 },
    { from: "standby", to: "app", label: "committed, once", kind: "return", step: 4 },
  ],
  notes: [
    { lane: "standby", text: "Saved orders are already here", step: 1, at: 5.5 },
    { lane: "app", text: "Waits 1 s, 2 s, 4 s between tries", step: 2, at: 6.5 },
    { lane: "endpoint", text: "Short TTL: seconds", step: 3, at: 7.5 },
    { lane: "standby", text: "Same key: no second order", step: 4, at: 11.5 },
  ],
};

export default spec;
