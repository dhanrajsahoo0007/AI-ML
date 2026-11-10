import type { SequenceSpec } from "@/components/diagrams/types";

// One cold DNS lookup for recipes.example.com, top to bottom, then the cheap warm lookup that follows.
// Step 1: the laptop misses its own cache and asks its resolver (about 10 ms away).
// Step 2: the resolver misses too and walks the tree: root (about 15 ms), .com (about 20 ms), then the site's
// authoritative name server at its DNS provider (about 40 ms). Cold total: 10 + 15 + 20 + 40 = about 85 ms.
// Step 3: the resolver keeps the answer for its TTL (300 s); a neighbour's lookup two minutes later costs only the
// 10 ms hop to the resolver.
// Packet durations follow the distances: the trip to the far authoritative server is the slowest.
const NEAR = 0.8;
const MID = 1.1;
const FAR = 1.6;

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A recursive DNS lookup, with caches",
  width: 820,
  steps: [
    { title: "Ask the resolver" },
    { title: "Walk down the tree on a miss" },
    { title: "Cache the answer for its TTL" },
  ],
  lanes: [
    { id: "laptop", label: "Your laptop", icon: "browser", tone: "neutral" },
    { id: "resolver", label: "Resolver", icon: "dns", tone: "blue" },
    { id: "root", label: "Root server", icon: "globe", tone: "neutral" },
    { id: "tld", label: ".com server", icon: "registry", tone: "teal" },
    { id: "auth", label: "Authoritative", icon: "server", tone: "green" },
  ],
  messages: [
    // Step 1: local caches first, then one question to the resolver.
    { from: "laptop", to: "laptop", label: "Local cache: miss", kind: "note", step: 1 },
    { from: "laptop", to: "resolver", label: "recipes.example.com?", step: 1, duration: NEAR },
    { from: "resolver", to: "resolver", label: "Cache: miss", kind: "note", step: 1 },

    // Step 2: two referrals, then the real answer.
    { from: "resolver", to: "root", label: "recipes.example.com?", step: 2, duration: NEAR },
    { from: "root", to: "resolver", label: "try the .com servers", kind: "return", step: 2, duration: NEAR },
    { from: "resolver", to: "tld", label: "recipes.example.com?", step: 2, duration: MID },
    { from: "tld", to: "resolver", label: "try ns1.example.com", kind: "return", step: 2, duration: MID },
    { from: "resolver", to: "auth", label: "recipes.example.com?", step: 2, duration: FAR },
    { from: "auth", to: "resolver", label: "203.0.113.10, TTL 300", kind: "return", step: 2, duration: FAR },

    // Step 3: keep the answer, hand it back, and serve the next asker from memory.
    { from: "resolver", to: "resolver", label: "Keep for 300 s", kind: "note", step: 3 },
    { from: "resolver", to: "laptop", label: "203.0.113.10", kind: "return", step: 3, duration: NEAR },
    { from: "laptop", to: "resolver", label: "same name, 2 min later", step: 3, delay: 0.6, duration: NEAR },
    { from: "resolver", to: "laptop", label: "cached: 203.0.113.10", kind: "return", step: 3, duration: NEAR },
  ],
  notes: [{ lane: "laptop", text: "Cold 85 ms, warm 10 ms", step: 3 }],
};

export default spec;
