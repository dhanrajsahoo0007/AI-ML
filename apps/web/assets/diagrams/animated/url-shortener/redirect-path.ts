import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// One click, three ways (url-shortener, Deep dive 2: the status code and the click event).
// Three steps: 1 a cache hit: the redirect server reads the code from the link cache, answers 302 with the long URL,
// and only then hands a click event to the click log, so the click never waits for analytics · 2 a cache miss: read
// the link store, put the entry in the cache with a TTL no later than the link's expiry, answer 302, log the click
// · 3 the same link answered with 301: the browser may keep the redirect, so its next click never reaches us and is
// never counted.
// Working (illustrative timings): a cache read ≈ 1 ms, a store read ≈ 5 ms; cache TTL = min(1 hour, expires_at).
// At 3,900 redirects/s and a 95 % hit ratio, 3,900 × 0.05 ≈ 195 store reads/s.
// Layout: five lanes. Colours (PATTERN_TONE): the browser orange (traffic), the redirect server teal (compute), cache
// and link store violet (stores), the click log blue (data in motion); the lost click is the red timeout arrow.
// Fact check (2026-11-17): RFC 9110 (June 2022) §15.1, §15.4: 301 and 308 are heuristically cacheable by default;
// 302 and 307 are not.

const code = "FkFnj3r";
const url = "https://shop.example/p/kettle";

const spec: SequenceSpec = {
  kind: "sequence",
  title: "One click: cache hit, cache miss, and a 301",
  lanes: [
    { id: "browser", label: "Browser", icon: "browser", tone: PATTERN_TONE.traffic },
    { id: "redir", label: "Redirect server", icon: "link", tone: PATTERN_TONE.compute },
    { id: "cache", label: "Link cache", icon: "cache", tone: PATTERN_TONE.store },
    { id: "store", label: "Link store", icon: "database", tone: PATTERN_TONE.store },
    { id: "log", label: "Click log", icon: "topic", tone: PATTERN_TONE.data },
  ],
  messages: [
    { from: "browser", to: "redir", label: `GET /${code}`, step: 1 },
    { from: "redir", to: "cache", label: `GET ${code}`, step: 1 },
    { from: "cache", to: "redir", label: "hit (≈ 1 ms)", kind: "return", step: 1 },
    { from: "redir", to: "browser", label: "302 Location: long URL", kind: "return", step: 1 },
    { from: "redir", to: "log", label: "click event, no wait", kind: "async", step: 1 },

    { from: "browser", to: "redir", label: `GET /${code}`, step: 2 },
    { from: "redir", to: "cache", label: `GET ${code}`, step: 2 },
    { from: "cache", to: "redir", label: "miss", kind: "return", step: 2 },
    { from: "redir", to: "store", label: `read ${code} (≈ 5 ms)`, step: 2 },
    { from: "store", to: "redir", label: "URL, expires_at", kind: "return", step: 2 },
    { from: "redir", to: "cache", label: "SET, TTL ≤ expiry", kind: "async", step: 2 },
    { from: "redir", to: "browser", label: "302 Location: long URL", kind: "return", step: 2 },
    { from: "redir", to: "log", label: "click event", kind: "async", step: 2 },

    { from: "redir", to: "browser", label: "301: browser keeps it", kind: "return", step: 3 },
    { from: "browser", to: "redir", label: "next click: never sent", kind: "timeout", step: 3 },
  ],
  notes: [{ lane: "browser", text: `goes straight to ${url}`, step: 3 }],
  steps: [
    { title: "Cache hit: answer, then log the click" },
    { title: "Cache miss: read the store, fill the cache" },
    { title: "A 301: the next click is never counted" },
  ],
};

export default spec;
