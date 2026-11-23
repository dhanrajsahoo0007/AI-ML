import type { SequenceSpec } from "@/components/diagrams/types";
import { FLASH_SALE, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Request coalescing (single flight) on one app server (hot-keys-and-coalescing, Core concepts). 500 requests for the
// kettle arrive while its cache entry is missing.
// Two steps: 1 without coalescing, 500 misses become 500 database queries · 2 with single flight, the first request
// becomes the leader and queries once; the other 499 wait on the same call and share its result.
// Layout: four lanes. Colours (PATTERN_TONE): requests orange (traffic), the app server teal (compute), cache and
// database violet (stores); the overloaded query batch is the red timeout arrow.
// Fact check (2026-11-16): Go's singleflight Group.Do lets "only one execution" run per key; a duplicate caller "waits
// for the original to complete and receives the same results".

const key = `product:${FLASH_SALE.item}`;

const spec: SequenceSpec = {
  kind: "sequence",
  title: "500 misses, one query: request coalescing",
  lanes: [
    { id: "req", label: "500 requests", icon: "users", tone: PATTERN_TONE.traffic },
    { id: "app", label: "App server", icon: "server", tone: PATTERN_TONE.compute },
    { id: "cache", label: "Shared cache", icon: "cache", tone: PATTERN_TONE.store },
    { id: "db", label: "Database", icon: "database", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "req", to: "app", label: `GET kettle (×500)`, step: 1 },
    { from: "app", to: "cache", label: `GET ${key} (×500)`, step: 1 },
    { from: "cache", to: "app", label: "miss (×500)", kind: "return", step: 1 },
    { from: "app", to: "db", label: "SELECT (×500)", kind: "timeout", step: 1, duration: 1.6 },

    { from: "req", to: "app", label: `GET kettle (×500)`, step: 2 },
    { from: "app", to: "app", label: "1 leader, 499 wait", step: 2 },
    { from: "app", to: "cache", label: `GET ${key} (×1)`, step: 2 },
    { from: "cache", to: "app", label: "miss", kind: "return", step: 2 },
    { from: "app", to: "db", label: "SELECT (×1)", step: 2 },
    { from: "db", to: "app", label: "row", kind: "return", step: 2 },
    { from: "app", to: "req", label: "500 answers, one result", kind: "return", step: 2 },
  ],
  steps: [{ title: "Without coalescing: 500 misses, 500 queries" }, { title: "Single flight: one query, 499 waiters" }],
};

export default spec;
