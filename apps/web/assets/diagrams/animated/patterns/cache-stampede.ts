import type { SequenceSpec } from "@/components/diagrams/types";
import { FLASH_SALE, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A cache stampede on the kettle's product page (caching, Technical mechanics). At 12:00 the kettle key takes 690
// reads/s (presets/patterns.ts FLASH_SALE). When its TTL ends, every read in the rebuild window misses at once.
//
// Two steps: 1 the key expires and three app servers miss together; all three query the database, which slows down
// (one call times out) · 2 with single flight (or a lease) only the first miss rebuilds; the others wait a few
// milliseconds and then hit the refilled key.
//
// Layout: four lanes. Colours (PATTERN_TONE): readers orange (traffic), app servers teal (compute), cache and
// database violet (stores); the overloaded query is the red timeout arrow.
// Fact check (2026-11-16): the Memcache paper (NSDI 2013) hands out a lease token "only once every 10 seconds per
// key" and tells other clients to wait; on keys prone to thundering herds this cut the peak database query rate from
// 17K/s to 1.3K/s.

const key = `product:${FLASH_SALE.item}`;

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A cache stampede and single flight",
  lanes: [
    { id: "readers", label: `${FLASH_SALE.hotKeyReadsPerSecond} reads/s`, icon: "users", tone: PATTERN_TONE.traffic },
    { id: "app", label: "App servers", icon: "server", tone: PATTERN_TONE.compute },
    { id: "cache", label: "Cache", icon: "cache", tone: PATTERN_TONE.store },
    { id: "db", label: "Database", icon: "database", tone: PATTERN_TONE.store },
  ],
  messages: [
    // Step 1: the TTL ends and every reader misses.
    { from: "app", to: "cache", label: `GET ${key} (×3)`, step: 1 },
    { from: "cache", to: "app", label: "miss, miss, miss", kind: "return", step: 1 },
    { from: "app", to: "db", label: "SELECT product", step: 1 },
    { from: "app", to: "db", label: "SELECT product", step: 1 },
    { from: "app", to: "db", label: "SELECT product (overloaded)", kind: "timeout", step: 1, duration: 1.6 },

    // Step 2: single flight: one rebuild, the rest wait.
    { from: "app", to: "cache", label: `GET ${key} (×3)`, step: 2 },
    { from: "cache", to: "app", label: "miss: one rebuilds", kind: "return", step: 2 },
    { from: "app", to: "db", label: "SELECT product (once)", step: 2 },
    { from: "db", to: "app", label: "row", kind: "return", step: 2 },
    { from: "app", to: "cache", label: `SET ${key}`, kind: "async", step: 2 },
    { from: "app", to: "readers", label: "200 (others waited 10 ms)", kind: "return", step: 2 },
  ],
  notes: [
    { lane: "cache", text: "TTL ends at 12:00:00", step: 1, at: -0.5 },
    { lane: "db", text: "load spikes", step: 1, at: 4.5 },
  ],
  steps: [{ title: "The key expires: every reader misses" }, { title: "Single flight: one rebuild, the rest wait" }],
};

export default spec;
