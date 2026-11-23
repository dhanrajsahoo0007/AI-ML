import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// One price change, from a feed to search (zillow, Step 3 and Deep dive 2).
// Two steps: 1 the happy path: the feed sends listing 77 at \$550k with source version 5; ingest upserts the primary
// DB only if 5 is newer than the stored 4; change data capture puts the committed row on the change log; the indexer
// writes the document with external version 5, and the listing is searchable about a minute later · 2 duplicates and
// stale updates: the feed resends an older version 4 (\$560k), which the conditional upsert drops (0 rows); the log
// redelivers version 5 after an indexer restart, and the index rejects it as not newer, so a replay is harmless.
// Working: the index refreshes every 1 s and the log lag is seconds, so a change is searchable well inside the
// 5-minute target (N2).
// Layout: six lanes. Colours (PATTERN_TONE, section tones only): the feed orange (traffic), ingest and indexer teal
// (compute), the primary DB and the search index violet (store), the change log blue (data in motion). No red: nothing
// breaks, the stale writes are refused by design.

const spec: SequenceSpec = {
  kind: "sequence",
  title: "One price change: feed, database, change log, index",
  lanes: [
    { id: "feed", label: "Listing feed", icon: "feed", tone: PATTERN_TONE.traffic },
    { id: "ingest", label: "Ingest", icon: "pipeline", tone: PATTERN_TONE.compute },
    { id: "db", label: "Primary DB", icon: "database", tone: PATTERN_TONE.store },
    { id: "log", label: "Change log", icon: "topic", tone: PATTERN_TONE.data },
    { id: "indexer", label: "Indexer", icon: "workers", tone: PATTERN_TONE.compute },
    { id: "index", label: "Search index", icon: "search", tone: PATTERN_TONE.store },
  ],
  messages: [
    { from: "feed", to: "ingest", label: "77: $550k, v5", step: 1 },
    { from: "ingest", to: "db", label: "upsert if v5 > stored", step: 1 },
    { from: "db", to: "ingest", label: "1 row (was v4)", kind: "return", step: 1 },
    { from: "db", to: "log", label: "CDC: 77 v5", kind: "async", step: 1 },
    { from: "log", to: "indexer", label: "77 v5", kind: "async", step: 1 },
    { from: "indexer", to: "index", label: "index 77, version 5", step: 1 },
    { from: "index", to: "indexer", label: "ok", kind: "return", step: 1 },

    { from: "feed", to: "ingest", label: "77: $560k, v4 (late)", step: 2 },
    { from: "ingest", to: "db", label: "upsert if v4 > stored", step: 2 },
    { from: "db", to: "ingest", label: "0 rows: stale", kind: "return", step: 2 },
    { from: "log", to: "indexer", label: "77 v5 again (replay)", kind: "async", step: 2 },
    { from: "indexer", to: "index", label: "index 77, version 5", step: 2 },
    { from: "index", to: "indexer", label: "conflict: not newer", kind: "return", step: 2 },
  ],
  steps: [{ title: "A price change reaches search" }, { title: "Late and repeated updates do nothing" }],
};

export default spec;
