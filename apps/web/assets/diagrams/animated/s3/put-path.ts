import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The put path and a read right after it: bytes first, the record last, and a cache that asks before it answers
// (s3, Step 2, Step 5 and Deep dive 2).
// Three steps: 1 a PUT of photos/cat.jpg with a client checksum: the front end writes 10 data + 5 parity shards with a
// checksum on each (placement already chose 15 drives, 5 per zone), waits until all 15 are fsynced, then commits
// the metadata record; the partition gives it version v7 and tells the witness "cat.jpg is at v7" before it answers; only then does
// the client get 200 with the ETag · 2 a GET right after: the zone's index cache still holds v6; it asks the witness
// whether v6 is current, hears v7, reads the record from the index and serves v7, so the reader sees its own write
// · 3 a second PUT crashes after its shards are written and before the commit: a reader gets the whole of v7, never
// half an object, and garbage collection deletes the 15 orphan shards after a 24 h grace period.
// Working: a 100 MB object ÷ 10 data shards = 10 MB per shard; 15 × 10 MB = 150 MB written = 1.5 ×. Versions, ids
// and the 24 h grace are illustrative design choices of this page.
// Layout: six lanes. Colours (PATTERN_TONE): the client orange (traffic), the front end teal (compute), the witness
// green (the pattern's own part), the index cache, the metadata index and the storage nodes violet (stores); the
// crash is the red timeout.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "The put path: bytes first, the record last",
  lanes: [
    { id: "client", label: "Client", icon: "browser", tone: PATTERN_TONE.traffic },
    { id: "front", label: "Front end", icon: "api", tone: PATTERN_TONE.compute },
    { id: "cache", label: "Index cache", icon: "cache", tone: PATTERN_TONE.store },
    { id: "witness", label: "Witness", icon: "signal", tone: PATTERN_TONE.pattern },
    { id: "index", label: "Metadata index", icon: "tree", tone: PATTERN_TONE.store },
    { id: "drives", label: "Storage nodes", icon: "disk", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "client", to: "front", label: "PUT cat.jpg, CRC", step: 1 },
    { from: "front", to: "drives", label: "10 + 5 shards, CRC each", step: 1 },
    { from: "drives", to: "front", label: "15 fsynced", kind: "return", step: 1 },
    { from: "front", to: "index", label: "commit record", step: 1 },
    { from: "index", to: "witness", label: "cat.jpg = v7", step: 1 },
    { from: "index", to: "front", label: "version v7", kind: "return", step: 1 },
    { from: "front", to: "client", label: "200, ETag", kind: "return", step: 1 },

    { from: "client", to: "front", label: "GET cat.jpg", step: 2 },
    { from: "front", to: "cache", label: "record?", step: 2 },
    { from: "cache", to: "witness", label: "is v6 current?", step: 2 },
    { from: "witness", to: "cache", label: "no: v7", kind: "return", step: 2 },
    { from: "cache", to: "index", label: "read record", step: 2 },
    { from: "index", to: "cache", label: "v7", kind: "return", step: 2 },
    { from: "cache", to: "front", label: "v7, 15 drives", kind: "return", step: 2 },
    { from: "front", to: "client", label: "200: v7", kind: "return", step: 2 },

    { from: "client", to: "front", label: "PUT cat.jpg again", step: 3 },
    { from: "front", to: "drives", label: "10 + 5 shards", step: 3 },
    { from: "drives", to: "front", label: "15 fsynced", kind: "return", step: 3 },
    { from: "front", to: "index", label: "crash: no commit", kind: "timeout", step: 3 },
    { from: "client", to: "front", label: "GET cat.jpg", step: 3 },
    { from: "front", to: "client", label: "200: v7, whole", kind: "return", step: 3 },
  ],
  notes: [{ lane: "drives", text: "No record after 24 h: GC deletes the shards", step: 3 }],
  steps: [
    { title: "Bytes first, then the record" },
    { title: "Read your write through the cache" },
    { title: "A crash before the commit" },
  ],
};

export default spec;
