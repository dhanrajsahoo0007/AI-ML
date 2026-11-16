import type { SequenceSpec } from "@/components/diagrams/types";
import { FLASH_SALE, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Cache-aside, the default read path (caching, the Architecture figure). Brightpost's app server reads the kettle's
// product page: first with no cache, then checking the cache, missing, reading the database and filling the cache
// with a 60 s TTL, then hitting on the next read.
//
// Four steps: 1 without a cache every read goes to the database (the "before") · 2 check the cache first: a miss ·
// 3 read the database, fill the cache with a TTL, answer · 4 the next read is a hit and never touches the database.
// Rows keep their place in every step view, so each step adds rows under the last.
//
// Layout: four lanes. Colours (PATTERN_TONE): the shopper orange (traffic), the app server teal (compute), the cache
// and the database violet (stores). Timings on the labels are illustrative.
// Fact check (2026-11-16): Facebook's memcache paper (NSDI 2013) describes this "demand-filled look-aside" cache: on a
// miss the web server reads the database and "populates the cache"; on a write it deletes the key.

const key = `product:${FLASH_SALE.item}`;

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Cache-aside: check the cache, fall back to the database",
  lanes: [
    { id: "shopper", label: "Shopper", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "app", label: "App server", icon: "server", tone: PATTERN_TONE.compute },
    { id: "cache", label: "Cache", icon: "cache", tone: PATTERN_TONE.store },
    { id: "db", label: "Database", icon: "database", tone: PATTERN_TONE.store },
  ],
  messages: [
    // Step 1: no cache.
    { from: "shopper", to: "app", label: "GET /p/kettle", step: 1 },
    { from: "app", to: "db", label: "SELECT product (10 ms)", step: 1 },
    { from: "db", to: "app", label: "row", kind: "return", step: 1 },

    // Step 2: check the cache first.
    { from: "app", to: "cache", label: `GET ${key}`, step: 2 },
    { from: "cache", to: "app", label: "miss", kind: "return", step: 2 },

    // Step 3: read the database and fill the cache.
    { from: "app", to: "db", label: "SELECT product (10 ms)", step: 3 },
    { from: "db", to: "app", label: "row", kind: "return", step: 3 },
    { from: "app", to: "cache", label: `SET ${key} EX 60`, kind: "async", step: 3, delay: 0.3 },
    { from: "app", to: "shopper", label: "200 page", kind: "return", step: 3 },

    // Step 4: the next read is a hit.
    { from: "shopper", to: "app", label: "GET /p/kettle", step: 4 },
    { from: "app", to: "cache", label: `GET ${key}`, step: 4 },
    { from: "cache", to: "app", label: "hit (1 ms)", kind: "return", step: 4 },
    { from: "app", to: "shopper", label: "200 page", kind: "return", step: 4 },
  ],
  notes: [{ lane: "cache", text: "expires in 60 s", step: 3, at: 7.5 }],
  steps: [
    { title: "Without a cache: every read hits the database" },
    { title: "Check the cache first: a miss" },
    { title: "Read the database and fill the cache" },
    { title: "The next read is a hit" },
  ],
};

export default spec;
