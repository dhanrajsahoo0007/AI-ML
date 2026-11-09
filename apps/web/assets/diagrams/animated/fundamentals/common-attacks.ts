import type { SequenceSpec } from "@/components/diagrams/types";

// Crumb, a bakery chain's order-ahead app, on the Saturday it was attacked. One attack per build step, each drawn
// as the attack arrow followed by the defence that stops it.
// Step 1 DDoS: a botnet of 20,000 devices x 20 requests/s = 400k requests/s against an app tier that handles about
//         2,000/s. The edge absorbs and filters it; the customer's real order still gets through.
// Step 2 Replay: a copy of a signed "wallet topped up by £20" webhook from a leaked log is sent again. The
//         signature is valid, so the app checks the signed timestamp (2 hours old, limit 5 minutes) and the event id.
// Step 3 Injection: the order-lookup box receives ' OR '1'='1. The query is parameterised, so the database treats
//         it as an odd email address and finds nothing.
// Step 4 CSRF: a page on another site holds a hidden form that posts to /points/send. The SameSite cookie is not
//         sent and there is no CSRF token, so the app refuses.
//
// Five lanes across 900 units (about 172 apart). Labels on one-gap arrows stay under about 24 characters.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "Four attacks on Crumb and the step that stops each",
  width: 900,
  steps: [
    { title: "DDoS: absorb and filter at the edge" },
    { title: "Replay: refuse old or already-seen messages" },
    { title: "Injection: send input as data, not code" },
    { title: "CSRF: demand proof the form is yours" },
  ],
  lanes: [
    { id: "attacker", label: "Attacker", icon: "bot", tone: "red" },
    { id: "browser", label: "Customer", icon: "browser", tone: "neutral" },
    { id: "edge", label: "Edge + WAF", icon: "shield", tone: "blue" },
    { id: "app", label: "App server", icon: "server", tone: "teal" },
    { id: "db", label: "Database", icon: "database", tone: "violet" },
  ],
  messages: [
    // Step 1: the flood lands on the edge, which has far more capacity than the four app servers.
    { from: "attacker", to: "edge", label: "flood: 400k requests/s", kind: "call", step: 1, duration: 0.8 },
    { from: "edge", to: "attacker", label: "dropped or 429", kind: "return", step: 1 },
    { from: "browser", to: "edge", label: "POST /order", step: 1, delay: 0.4 },
    { from: "edge", to: "app", label: "real traffic, 300/s", step: 1 },
    { from: "app", to: "browser", label: "201 order placed", kind: "return", step: 1 },

    // Step 2: same bytes, same valid signature, wrong time and an id already used.
    { from: "attacker", to: "app", label: "old top-up £20, valid signature", step: 2 },
    { from: "app", to: "db", label: "seen evt_81?", step: 2 },
    { from: "db", to: "app", label: "yes, at 09:02", kind: "return", step: 2 },
    { from: "app", to: "attacker", label: "400: stale and duplicate", kind: "return", step: 2 },

    // Step 3: the input travels to the database separately from the SQL text.
    { from: "attacker", to: "app", label: "email = ' OR '1'='1", step: 3 },
    { from: "app", to: "db", label: "WHERE email = $1", step: 3 },
    { from: "db", to: "app", label: "0 rows", kind: "return", step: 3 },
    { from: "app", to: "attacker", label: "no orders found", kind: "return", step: 3 },

    // Step 4: the attacker's page makes the customer's browser send the request.
    { from: "attacker", to: "browser", label: "page with hidden form", step: 4 },
    { from: "browser", to: "app", label: "POST /points/send, no token", step: 4 },
    { from: "app", to: "browser", label: "403: missing CSRF token", kind: "return", step: 4 },
  ],
  notes: [
    { lane: "edge", text: "Cache, per-IP limits, bot rules", step: 1, at: 1.5 },
    { lane: "app", text: "Signed 2 h ago; limit is 5 min", step: 2, at: 5.5 },
    { lane: "db", text: "Input is data, never SQL", step: 3, at: 10.5 },
    { lane: "browser", text: "SameSite cookie stays home", step: 4, at: 13.5 },
  ],
};

export default spec;
