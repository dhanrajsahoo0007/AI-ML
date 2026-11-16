import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Multipart upload of a 1 TB object (s3, Step 6).
// Two steps: 1 the client creates upload u9, sends 1,000 parts of 1 GB, 8 at a time; each part is stored as its own
// 10 + 5 shards and its ETag is recorded against u9; "complete" with the list of part numbers and ETags makes the
// upload service write ONE metadata record that points at the parts, so no byte is copied · 2 part 417 fails half
// way (a reset connection): the client retries part 417 alone; an upload that is never completed is aborted after
// 7 days and its parts are garbage-collected.
// Working: 1 TB ÷ 1 GB = 1,000 parts; 8 streams × 125 MB/s = 1 GB/s → 1,000 GB ÷ 1 GB/s = 1,000 s ≈ 17 minutes;
// one stream at 125 MB/s takes 1,000,000 MB ÷ 125 MB/s = 8,000 s ≈ 2.2 h, and a reset at 90 % would resend 900 GB;
// with parts it resends 1 GB. Part size, part count and the 7-day abort are this page's design choices.
// Layout: five lanes. Colours (PATTERN_TONE): the client orange (traffic), the front end teal (compute), the upload
// service green (the pattern's own part), storage nodes and the metadata index violet (stores); the failed part is
// the red timeout.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Multipart upload: parts in parallel, one record at the end",
  lanes: [
    { id: "client", label: "Client", icon: "browser", tone: PATTERN_TONE.traffic },
    { id: "front", label: "Front end", icon: "api", tone: PATTERN_TONE.compute },
    { id: "uploads", label: "Upload service", icon: "chunk", tone: PATTERN_TONE.pattern },
    { id: "drives", label: "Storage nodes", icon: "disk", tone: PATTERN_TONE.store },
    { id: "index", label: "Metadata index", icon: "tree", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "client", to: "front", label: "create upload", step: 1 },
    { from: "front", to: "uploads", label: "new upload", step: 1 },
    { from: "uploads", to: "client", label: "upload id u9", kind: "return", step: 1 },
    { from: "client", to: "front", label: "parts 1 to 8 at once", step: 1 },
    { from: "front", to: "drives", label: "10 + 5 shards per part", step: 1 },
    { from: "front", to: "uploads", label: "part n: ETag", kind: "async", step: 1 },
    { from: "front", to: "client", label: "ETag per part", kind: "return", step: 1 },
    { from: "client", to: "front", label: "complete: 1,000 ETags", step: 1 },
    { from: "front", to: "uploads", label: "complete u9", step: 1 },
    { from: "uploads", to: "index", label: "one record: part list", step: 1 },
    { from: "front", to: "client", label: "200, object v1", kind: "return", step: 1 },

    { from: "client", to: "front", label: "part 417: reset", kind: "timeout", step: 2 },
    { from: "client", to: "front", label: "retry part 417 only", step: 2 },
    { from: "front", to: "drives", label: "shards of part 417", step: 2 },
    { from: "front", to: "client", label: "ETag 417", kind: "return", step: 2 },
  ],
  notes: [{ lane: "uploads", text: "Never completed: abort after 7 days, GC the parts", step: 2 }],
  steps: [{ title: "Parts in parallel, one record" }, { title: "Retry one part, not the object" }],
};

export default spec;
