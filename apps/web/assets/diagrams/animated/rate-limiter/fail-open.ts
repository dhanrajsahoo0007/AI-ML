import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// When the counter store is the outage: fail open, then fall back to a local share (rate-limiter, Step 6 and
// Deep dive 3).
// Three steps: 1 normal: the gateway runs one token-bucket script in the store (about 0.4 ms in the same zone),
// forwards the allowed request and returns 200 with the rate-limit headers · 2 the store stops answering: the
// script call times out after 5 ms, the gateway allows the request anyway (fail open), counts a limiter error and
// forwards it · 3 errors pass 50 % for 10 s, so the gateway's circuit breaker opens: no more store calls; each gateway
// enforces a local share of the limit, 100/s ÷ 20 gateways = 5/s, rejects beyond it with 429, and probes the store
// every 5 s until it answers.
// Working: k42's plan allows 100 requests/s; the region has 20 gateways; local share = 100 ÷ 20 = 5/s per gateway.
// The 5 ms timeout and 5 s probe are this page's design choices (round numbers), not measured figures.
// Layout: four lanes. Colours (PATTERN_TONE): the client orange (traffic), the gateway and the API service teal
// (compute), the counter store violet (store); the call that never answers is the red timeout arrow.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Fail open, then a local share of the limit",
  lanes: [
    { id: "client", label: "Client k42", icon: "api", tone: PATTERN_TONE.traffic },
    { id: "gw", label: "Gateway", icon: "gateway", tone: PATTERN_TONE.compute },
    { id: "store", label: "Counter store", icon: "cache", tone: PATTERN_TONE.store },
    { id: "api", label: "API service", icon: "server", tone: PATTERN_TONE.compute },
  ],
  messages: [
    { from: "client", to: "gw", label: "GET /v1/orders", step: 1 },
    { from: "gw", to: "store", label: "bucket script (k42)", step: 1 },
    { from: "store", to: "gw", label: "allow, 57 left", kind: "return", step: 1 },
    { from: "gw", to: "api", label: "forward", step: 1 },
    { from: "api", to: "gw", label: "200", kind: "return", step: 1 },
    { from: "gw", to: "client", label: "200 + limit headers", kind: "return", step: 1 },

    { from: "client", to: "gw", label: "GET /v1/orders", step: 2 },
    { from: "gw", to: "store", label: "no answer in 5 ms", kind: "timeout", step: 2 },
    { from: "gw", to: "api", label: "forward anyway", step: 2 },
    { from: "api", to: "gw", label: "200", kind: "return", step: 2 },
    { from: "gw", to: "client", label: "200", kind: "return", step: 2 },

    { from: "client", to: "gw", label: "GET /v1/orders", step: 3 },
    { from: "gw", to: "client", label: "429 past 5/s", kind: "return", step: 3 },
    { from: "gw", to: "store", label: "probe every 5 s", kind: "async", step: 3 },
  ],
  notes: [
    { lane: "gw", text: "fail open: count a limiter error", step: 2, at: 7.5 },
    { lane: "gw", text: "breaker open: local share 100 ÷ 20 = 5/s", step: 3, at: 11.5 },
  ],
  steps: [
    { title: "Normal: one script, then forward" },
    { title: "Store silent: fail open" },
    { title: "Breaker open: a local share" },
  ],
};

export default spec;
