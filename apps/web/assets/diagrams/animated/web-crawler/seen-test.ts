import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Two ways to ask "have we seen this URL?" on one frontier shard (web-crawler, Deep dive 2).
// Two steps: 1 the Bloom filter in memory: a.com/x hashes to 7 bits, one is 0, so it is new: set the 7 bits and
// enqueue it; b.org/y finds all 7 bits set, so it is dropped as seen, which is wrong for about 0.8 % of truly new
// URLs (never a duplicate fetch, sometimes a missed page) · 2 the exact check on disk, batched: append each URL's
// 8-byte hash to a buffer; at 1,000,000 hashes sort the buffer, merge it with the sorted hash file in one sequential
// pass, and send only the hashes that were not in the file to the frontier; the file grows by those hashes.
// Working (round numbers): 10,000,000,000 known URLs over 8 shards = 1,250,000,000 a shard. Bloom filter: 10 bits a
// URL = 1.56 GB a shard; with k = 7, false positives (1 − e^(−7/10))^7 ≈ 0.8 %. Exact file: 1.25 billion × 8 B =
// 10 GB a shard. Links: 31,000/s ÷ 8 shards ≈ 3,900/s, so a 1,000,000-hash batch (8 MB) fills in ≈ 260 s; one merge
// reads 10 GB at 500 MB/s ≈ 20 s. A new URL waits about 4 to 5 minutes before the frontier sees it.
// Layout: five lanes (equal columns). Colours (PATTERN_TONE): parser teal (compute), the Bloom filter green (the
// pattern's own part), the batch buffer blue (data in motion), the sorted hash file violet (store), the frontier
// neutral.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "The URL-seen test: a Bloom filter, or a batched merge on disk",
  lanes: [
    { id: "parser", label: "Parser", icon: "file", tone: PATTERN_TONE.compute },
    { id: "bloom", label: "Bloom filter", icon: "hash", tone: PATTERN_TONE.pattern },
    { id: "buffer", label: "Batch buffer", icon: "queue", tone: PATTERN_TONE.data },
    { id: "file", label: "Sorted hashes", icon: "disk", tone: PATTERN_TONE.store },
    { id: "frontier", label: "Frontier", icon: "queue", tone: PATTERN_TONE.infra },
  ],
  messages: [
    { from: "parser", to: "bloom", label: "a.com/x: test 7 bits", step: 1 },
    { from: "bloom", to: "frontier", label: "a bit is 0: new; set bits, enqueue", step: 1 },
    { from: "parser", to: "bloom", label: "b.org/y: test 7 bits", step: 1 },
    { from: "bloom", to: "parser", label: "all 7 set: drop as seen", kind: "return", step: 1 },

    { from: "parser", to: "buffer", label: "append 8-byte hashes", step: 2 },
    { from: "buffer", to: "file", label: "1,000,000 sorted: merge pass", step: 2 },
    { from: "file", to: "file", label: "write merged file", kind: "note", step: 2 },
    { from: "file", to: "frontier", label: "hashes not in file: new URLs", kind: "async", step: 2 },
  ],
  notes: [
    { lane: "bloom", text: "≈ 0.8 % of new URLs wrongly dropped", step: 1, at: 3.5 },
    { lane: "file", text: "10 GB read in ≈ 20 s, every ≈ 260 s", step: 2, at: 6.5 },
  ],
  steps: [{ title: "In memory: a Bloom filter" }, { title: "Exact: batch, sort, merge on disk" }],
};

export default spec;
