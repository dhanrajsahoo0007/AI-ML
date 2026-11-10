import type { SequenceSpec } from "@/components/diagrams/types";

// The two Crumb attacks aimed at customers' accounts rather than at the servers.
// Step 1 Credential stuffing: 1 million email and password pairs leaked from another site, tried over 24 hours from
//         about 9,000 IPs (about 40k attempts an hour, about 111 per IP per day, so per-IP limits never trip). The app
//         watches the whole login stream: the failure rate jumps from about 5% to about 95%, so it challenges
//         logins and then rate-limits. The real customer signs in with a second factor.
// Step 2 Stored XSS: a review containing a script tag is saved as text and escaped on the way out, and a
//         Content-Security-Policy header stops any inline script that slips through.
//
// Five lanes across 900 units (about 172 apart). Labels on one-gap arrows stay under about 24 characters.
const spec: SequenceSpec = {
  kind: "sequence",
  title: "Two attacks on customer accounts",
  width: 900,
  steps: [
    { title: "Credential stuffing: watch the whole login stream" },
    { title: "XSS: escape output and limit scripts" },
  ],
  lanes: [
    { id: "attacker", label: "Attacker", icon: "bot", tone: "red" },
    { id: "browser", label: "Customer", icon: "browser", tone: "neutral" },
    { id: "app", label: "App server", icon: "server", tone: "teal" },
    { id: "stats", label: "Login stats", icon: "chart", tone: "orange" },
    { id: "db", label: "Database", icon: "database", tone: "violet" },
  ],
  messages: [
    // Step 1: leaked pairs, spread thin across many addresses.
    { from: "attacker", to: "app", label: "POST /login, 40k an hour", step: 1, duration: 0.8 },
    { from: "app", to: "stats", label: "failure rate now?", step: 1 },
    { from: "stats", to: "app", label: "95%, normally 5%", kind: "return", step: 1 },
    { from: "app", to: "attacker", label: "bot challenge, then 429", kind: "return", step: 1 },
    { from: "browser", to: "app", label: "password + 6-digit code", step: 1, delay: 0.4 },
    { from: "app", to: "browser", label: "signed in", kind: "return", step: 1 },

    // Step 2: the script is stored as text and sent back escaped.
    { from: "attacker", to: "app", label: "review with <script>", step: 2 },
    { from: "app", to: "db", label: "store as plain text", step: 2 },
    { from: "browser", to: "app", label: "GET /cakes/7", step: 2, delay: 0.4 },
    { from: "app", to: "browser", label: "escaped text + CSP", kind: "return", step: 2 },
  ],
  notes: [
    { lane: "attacker", text: "1M leaked pairs, 9,000 IPs", step: 1, at: 0.5 },
    { lane: "browser", text: "Shows <script> as text", step: 2, at: 9.5 },
  ],
};

export default spec;
