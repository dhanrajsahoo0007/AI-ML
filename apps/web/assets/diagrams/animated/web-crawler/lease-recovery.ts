import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// A fetcher dies holding a lease (web-crawler, Deep dive 3: coordination when workers die).
// Two steps: 1 fetcher A leases 50 due URLs, one per host, for 60 s; it fetches a.com/x (0.4 s) and reports it done,
// so the frontier puts a.com back in the heap 4 s later; it fetches b.org/y and writes the page under the key of its
// URL hash, then crashes before reporting; no heartbeat arrives and the lease ends after 60 s · 2 the frontier hands
// b.org/y to fetcher B in a new lease; B fetches it again and writes the same key, which overwrites the first copy;
// B reports it done. One extra fetch, no duplicate page.
// Working: lease 60 s and 50 URLs are design choices of this page; 10 × 0.4 s = 4 s politeness gap (Deep dive 1).
// While a lease is live its hosts are marked busy, so no second fetcher contacts b.org at the same time.
// Layout: five lanes (equal columns). Colours (PATTERN_TONE): the frontier shard green (the pattern's own part),
// fetchers teal (compute), websites orange (traffic), the page store violet (store); the lost heartbeat is the red
// timeout arrow, the only red.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "A fetcher dies holding a lease",
  lanes: [
    { id: "frontier", label: "Frontier shard", icon: "queue", tone: PATTERN_TONE.pattern },
    { id: "a", label: "Fetcher A", icon: "workers", tone: PATTERN_TONE.compute },
    { id: "b", label: "Fetcher B", icon: "workers", tone: PATTERN_TONE.compute },
    { id: "web", label: "Websites", icon: "globe", tone: PATTERN_TONE.traffic },
    { id: "store", label: "Page store", icon: "blob", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "a", to: "frontier", label: "lease 50 URLs, 60 s", step: 1 },
    { from: "frontier", to: "a", label: "L7: 50 URLs, 50 hosts", kind: "return", step: 1 },
    { from: "a", to: "web", label: "GET a.com/x", step: 1 },
    { from: "web", to: "a", label: "200 in 0.4 s", kind: "return", step: 1 },
    { from: "a", to: "frontier", label: "done a.com/x: back in 4 s", step: 1 },
    { from: "a", to: "web", label: "GET b.org/y", step: 1 },
    { from: "a", to: "store", label: "put b.org/y, key = URL hash", step: 1 },
    { from: "a", to: "frontier", label: "crash: no heartbeat, L7 ends at 60 s", kind: "timeout", step: 1 },

    { from: "b", to: "frontier", label: "lease 50 URLs, 60 s", step: 2 },
    { from: "frontier", to: "b", label: "L8: b.org/y and 49 more", kind: "return", step: 2 },
    { from: "b", to: "web", label: "GET b.org/y again", step: 2 },
    { from: "b", to: "store", label: "put: same key, overwrite", step: 2 },
    { from: "b", to: "frontier", label: "done b.org/y", step: 2 },
  ],
  notes: [
    { lane: "frontier", text: "b.org busy while L7 is live", step: 1, at: 1.5 },
    { lane: "store", text: "1 extra fetch, 0 duplicate pages", step: 2 },
  ],
  steps: [{ title: "Fetcher A crashes mid-lease" }, { title: "Fetcher B redoes it; the write is idempotent" }],
};

export default spec;
