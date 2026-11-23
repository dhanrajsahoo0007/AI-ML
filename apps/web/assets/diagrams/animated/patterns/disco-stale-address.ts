import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Why a cached address goes stale (service-discovery-and-coordination, first figure). Brightpost's order service finds
// the product service through DNS with a 30 s TTL; a deploy replaces the instance it cached.
//
// Three steps: 1 resolve, cache the answer for 30 s, call the instance · 2 a deploy replaces the instance at 12:00:05;
// calls to the cached address fail until the TTL ends at 12:00:30 · 3 the next lookup returns the new address.
// Layout: four lanes. Colours (PATTERN_TONE): services teal (compute), DNS neutral (infra); failed calls use the red
// timeout arrow. Addresses and times are illustrative.
// Fact check (2026-11-16): a DNS answer may be cached by resolvers and clients for its TTL; Consul, for comparison,
// serves service lookups with a TTL of 0 by default to prevent caching.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A cached address outlives the instance",
  lanes: [
    { id: "caller", label: "Order service", icon: "server", tone: PATTERN_TONE.compute },
    { id: "dns", label: "DNS", icon: "dns", tone: PATTERN_TONE.infra },
    { id: "old", label: "Old instance", icon: "server", tone: PATTERN_TONE.compute },
    { id: "new", label: "New instance", icon: "server", tone: PATTERN_TONE.compute },
  ],
  messages: [
    { from: "caller", to: "dns", label: "resolve product-svc", step: 1 },
    { from: "dns", to: "caller", label: "10.0.1.7, TTL 30 s", kind: "return", step: 1 },
    { from: "caller", to: "old", label: "GET /p/kettle", step: 1 },
    { from: "old", to: "caller", label: "200", kind: "return", step: 1 },

    { from: "caller", to: "old", label: "GET (refused)", kind: "timeout", step: 2, duration: 1.4 },
    { from: "caller", to: "old", label: "GET (still cached)", kind: "timeout", step: 2, duration: 1.4 },

    { from: "caller", to: "dns", label: "resolve product-svc", step: 3 },
    { from: "dns", to: "caller", label: "10.0.2.9", kind: "return", step: 3 },
    { from: "caller", to: "new", label: "GET /p/kettle", step: 3 },
    { from: "new", to: "caller", label: "200", kind: "return", step: 3 },
  ],
  notes: [
    { lane: "old", text: "replaced at 12:00:05", step: 2, at: 3.5 },
    { lane: "caller", text: "TTL ends at 12:00:30", step: 2, at: 5.5 },
  ],
  steps: [
    { title: "Resolve once, cache the answer" },
    { title: "A deploy replaces the instance" },
    { title: "The next lookup finds the new one" },
  ],
};

export default spec;
