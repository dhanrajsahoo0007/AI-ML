import type { SequenceSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// One home-timeline page with the hybrid: pushed ids from the cache, big accounts merged at read time (twitter,
// Step 3 and Deep dive 1).
// Three steps: 1 the first page: read 40 cached ids (twice the page, so deleted or blocked posts can be dropped),
// ask for the recent posts of the 3 big accounts the reader follows, merge by id (ids sort by time), hydrate 20,
// drop the one that was deleted, return 19 and a cursor max_id = the oldest id shown · 2 the next page: the cursor
// asks for ids below max_id, so the 40 posts that arrived meanwhile cannot shift the page or repeat a post · 3 a
// reader away for 45 days has no cached list: the service rebuilds the first page from the follow list and the post
// store, and asks the fan-out service to store the newest 500 ids.
// Working: 40 ids = 2 × the 20-post page; the reader follows 200 accounts, 3 of them above the 1,000,000-follower
// threshold (illustrative), so a page costs 1 list read + 3 recent-list reads + 1 batched hydrate.
// Layout: five lanes. Colours (PATTERN_TONE, section tones only on lanes): reader orange (traffic), the timeline
// and fan-out services green (the pattern's own part), the timeline cache violet (store), the post service teal
// (compute).

const spec: SequenceSpec = {
  kind: "sequence",
  title: "One timeline page: cached ids, big accounts merged on read, a cursor",
  lanes: [
    { id: "reader", label: "Reader", icon: "phone", tone: PATTERN_TONE.traffic },
    { id: "tl", label: "Timeline svc", icon: "feed", tone: PATTERN_TONE.pattern },
    { id: "cache", label: "Timeline cache", icon: "cache", tone: PATTERN_TONE.store },
    { id: "post", label: "Post service", icon: "api", tone: PATTERN_TONE.compute },
    { id: "fanout", label: "Fan-out", icon: "workers", tone: PATTERN_TONE.pattern },
  ],
  messages: [
    { from: "reader", to: "tl", label: "GET home, limit 20", step: 1 },
    { from: "tl", to: "cache", label: "first 40 ids of tl:42", step: 1 },
    { from: "cache", to: "tl", label: "40 ids", kind: "return", step: 1 },
    { from: "tl", to: "post", label: "recent ids of 3 big accounts", step: 1 },
    { from: "post", to: "tl", label: "12 ids", kind: "return", step: 1 },
    { from: "tl", to: "post", label: "hydrate newest 20 by id", step: 1 },
    { from: "post", to: "tl", label: "19 posts, 1 deleted", kind: "return", step: 1 },
    { from: "tl", to: "reader", label: "19 posts, max_id = oldest", kind: "return", step: 1 },

    { from: "reader", to: "tl", label: "GET home, max_id", step: 2 },
    { from: "tl", to: "cache", label: "40 ids below max_id", step: 2 },
    { from: "cache", to: "tl", label: "older ids only", kind: "return", step: 2 },
    { from: "tl", to: "reader", label: "next 20, no repeats", kind: "return", step: 2 },

    { from: "reader", to: "tl", label: "GET home (away 45 days)", step: 3 },
    { from: "tl", to: "cache", label: "read tl:42", step: 3 },
    { from: "cache", to: "tl", label: "miss", kind: "return", step: 3 },
    { from: "tl", to: "post", label: "recent posts, 200 accounts", step: 3 },
    { from: "post", to: "tl", label: "merged newest 500", kind: "return", step: 3 },
    { from: "tl", to: "reader", label: "first page", kind: "return", step: 3 },
    { from: "tl", to: "fanout", label: "store these 500 ids", kind: "async", step: 3 },
    { from: "fanout", to: "cache", label: "write tl:42", kind: "async", step: 3 },
  ],
  notes: [{ lane: "tl", text: "merge by id: ids sort by time", step: 1, at: 4.5 }],
  steps: [
    { title: "First page: cached ids plus big accounts" },
    { title: "Next page by cursor" },
    { title: "A returning reader: rebuild on a miss" },
  ],
};

export default spec;
