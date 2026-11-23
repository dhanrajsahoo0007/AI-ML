import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The unknown outcome (kindle-payments, Step 4 and Deep dive 2): the provider does not answer inside the click's
// budget, the intent is saved as unknown, and the worker settles it later with the same key.
// Two steps: 1 the reader buys book 811 with key k7; the payment service saves the intent as authorising, calls the
// provider with k7 and gets no reply inside 1.5 s; it marks the intent unknown and answers 202 "confirming" · 2 the
// worker picks up unknown intents older than 30 s, sends the same authorisation with the same key, gets the first
// result back (approved, no second hold), saves "authorised" with an outbox row that grants the book; the app's next
// status poll sees it.
// Working: click budget 2 s = gateway and service ≈ 0.1 s + provider timeout 1.5 s + 0.4 s spare; worker delay 30 s
// so the provider has finished the first attempt; price £6 (the page's average); ids are illustrative.
// Layout: five lanes. Colours (PATTERN_TONE): the app orange (traffic), the payment service teal (compute), the
// payments DB violet (store), the worker green (the pattern's own part), the provider neutral (external); the call
// that never answered uses the red timeout arrow.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A timeout leaves the payment unknown; the worker settles it with the same key",
  lanes: [
    { id: "app", label: "Reader app", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "svc", label: "Payment svc", icon: "card", tone: PATTERN_TONE.compute },
    { id: "db", label: "Payments DB", icon: "database", tone: PATTERN_TONE.store },
    { id: "wk", label: "Worker", icon: "workers", tone: PATTERN_TONE.pattern },
    { id: "prov", label: "Provider", icon: "coin", tone: PATTERN_TONE.infra },
  ],
  messages: [
    { from: "app", to: "svc", label: "buy book 811, key k7", step: 1 },
    { from: "svc", to: "db", label: "insert intent: authorising, k7", step: 1 },
    { from: "svc", to: "prov", label: "authorise £6, key k7: no reply in 1.5 s", kind: "timeout", step: 1 },
    { from: "svc", to: "db", label: "mark intent unknown", step: 1 },
    { from: "svc", to: "app", label: "202: confirming purchase", kind: "return", step: 1 },

    { from: "wk", to: "db", label: "unknown intents older than 30 s", step: 2 },
    { from: "wk", to: "prov", label: "authorise again, same key k7", step: 2 },
    { from: "prov", to: "wk", label: "approved (the first result)", kind: "return", step: 2 },
    { from: "wk", to: "db", label: "authorised + outbox: grant", step: 2 },
    { from: "app", to: "svc", label: "GET status", step: 2 },
    { from: "svc", to: "app", label: "200: book on its way", kind: "return", step: 2 },
  ],
  steps: [{ title: "No answer inside the budget" }, { title: "The worker asks again, same key" }],
};

export default spec;
