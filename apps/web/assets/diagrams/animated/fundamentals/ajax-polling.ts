import type { SequenceSpec } from "@/components/diagrams/types";

// Short polling on the bakery order page. The page asks every 5 seconds; the kitchen changes the status once,
// at t = 12 s, between two polls.
//
// Step 1: the first poll and the timer. The page sends GET, the API reads the row and answers 200 with the
// status and a version tag (ETag v1). Then the page waits 5 s.
// Step 2: an empty poll. At t = 5 s the page asks again and says which version it holds. Nothing changed, so the
// API still pays for a database read and answers 304 Not Modified with no body. The t = 10 s poll is the same
// (shown as a note to keep the drawing short).
// Step 3: an update lands between polls. The kitchen marks the order "out for delivery" at t = 12 s, but the page
// only learns it at its next tick, t = 15 s: 3 s late. The average delay is half the interval (2.5 s), the worst
// case the whole interval (5 s).
const spec: SequenceSpec = {
  kind: "sequence",
  title: "Short polling: ask every 5 seconds, mostly hear nothing new",
  width: 760,
  steps: [
    { title: "Ask, get an answer, wait 5 s" },
    { title: "Most polls come back empty" },
    { title: "An update waits for the next poll" },
  ],
  lanes: [
    { id: "page", label: "Order page", icon: "browser", tone: "neutral" },
    { id: "api", label: "API server", icon: "server", tone: "teal" },
    { id: "db", label: "Orders DB", icon: "database", tone: "violet" },
    { id: "kitchen", label: "Kitchen tablet", icon: "phone", tone: "orange" },
  ],
  messages: [
    // Step 1: first poll.
    { from: "page", to: "api", label: "t=0 s  GET /orders/1042", step: 1 },
    { from: "api", to: "db", label: "SELECT status", step: 1 },
    { from: "db", to: "api", label: "baking", kind: "return", step: 1 },
    { from: "api", to: "page", label: "200 baking, ETag v1", kind: "return", step: 1 },

    // Step 2: an empty poll.
    { from: "page", to: "api", label: "t=5 s  GET (have v1)", step: 2, delay: 0.8 },
    { from: "api", to: "db", label: "SELECT status", step: 2 },
    { from: "db", to: "api", label: "baking", kind: "return", step: 2 },
    { from: "api", to: "page", label: "304 Not Modified", kind: "return", step: 2 },

    // Step 3: the status changes at t = 12 s; the page sees it at t = 15 s.
    { from: "kitchen", to: "api", label: "t=12 s  PATCH status=out", kind: "async", step: 3, delay: 0.8 },
    { from: "api", to: "db", label: "UPDATE status", step: 3 },
    { from: "page", to: "api", label: "t=15 s  GET (have v1)", step: 3, delay: 0.6 },
    { from: "api", to: "db", label: "SELECT status", step: 3 },
    { from: "db", to: "api", label: "out for delivery", kind: "return", step: 3 },
    { from: "api", to: "page", label: "200 out, ETag v2", kind: "return", step: 3 },
  ],
  notes: [
    { lane: "page", text: "wait 5 s", step: 1, at: 3.5 },
    { lane: "page", text: "t=10 s: another 304", step: 2, at: 7.5 },
    { lane: "page", text: "seen 3 s after it happened", step: 3, at: 13.5 },
  ],
};

export default spec;
