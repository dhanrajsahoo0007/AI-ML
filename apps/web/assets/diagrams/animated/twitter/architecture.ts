import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// A Twitter-style home timeline, built one requirement at a time (twitter case study, the hero).
// Eight steps: 1 pull at read time: the timeline service reads who the reader follows from the graph store and
// asks the post service for each account's recent posts, then merges (red, replaced in step 2) · 2 fan-out on write:
// the post store's change stream fills the post log; the fan-out service reads each new post, pages through the
// author's followers and appends the post id to every cached follower timeline; reading is one list read plus
// "posts by id" · 3 the celebrity problem: authors above 1,000,000 followers are not fanned out; the timeline service
// asks for their recent posts and merges them at read time (the step-2 hydrate edge is replaced) · 4 ids and the
// post store: 64-bit time-sortable ids in the post service, a post cache in front of the post store · 5 the timeline
// cache holds ids only, at most 500 per user, active users only; a miss asks the fan-out service to rebuild it ·
// 6 real-time search: an indexer reads the log into an in-memory index; the search service scatters each
// query to the index shards · 7 the ranker scores candidates for the ranked timeline · 8 counters: a like counter
// reads like events from the log and writes counts in 1-second batches.
// Working (round numbers chosen to size the system): 200,000,000 daily users × 20 timeline requests = 4,000,000,000
// a day ÷ 86,400 s = 46,300/s, peak 2 × ≈ 100,000/s. 200,000,000 posts a day ÷ 86,400 = 2,315/s. Average 100
// cached followers a post: 200,000,000 × 100 = 20,000,000,000 appends a day ÷ 86,400 = 231,000/s. Push threshold
// 1,000,000 followers (Deep dive 1).
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts. Clients x 105: author 170, reader 440. Edge x 297:
// CDN 140, API gateway 330. Core x 575: fan-out service (accent) 110, timeline service 225. Services: ranker x 490
// y 430 (w 140), search service x 662 y 370 (w 156), post service x 575 y 560 (a 20 px channel at x 575 between the two columns
// carries timeline → post). Async x 879: post log 280, indexer 410, like counter 470. Storage x 1098:
// timeline cache 110, graph store 220, search index 360, post store 520, post cache 615. Routed edges: gateway →
// post service down the edge column (x 297, empty below the gateway); post store → log up the gap at x 1000;
// log → like counter down the corridor at x 786. Every edge was checked against every box with a script (margin 6).
// Colours: the zone tones; the step-1 pull edge is red because it breaks at 100,000 reads/s.
// Fact check (2026-11-17): the hybrid with a read-time merge for very large accounts follows the query-expansion
// slide of "Timelines at Scale" (QCon SF 2012); it is drawn as this design's choice, not as a documented mechanism.

const spec: DiagramSpec = {
  title: "Home timeline high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "Pull at read time", covers: "F1, F2, F3" },
    { title: "Fan-out on write", covers: "F3, N1" },
    { title: "Big accounts: merge at read time", covers: "F3, N2" },
    { title: "Time-sorted ids and a post cache", covers: "F1, N5" },
    { title: "A bounded timeline cache", covers: "N1, N6" },
    { title: "Real-time search", covers: "F4, N3" },
    { title: "Rank the candidates", covers: "F3" },
    { title: "Counts", covers: "F5" },
  ],
  zones: zoneFrame({ core: "Timeline core" }),
  nodes: [
    { id: "author", label: "Author", sub: "posts, likes", icon: "phone", fill: "pastel", x: 105, y: 170, w: 140 },
    { id: "reader", label: "Reader", sub: "timeline, search", icon: "phone", fill: "pastel", x: 105, y: 440, w: 144 },
    {
      id: "cdn",
      label: "CDN",
      sub: "media, avatars",
      icon: "cdn",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 140,
      w: 150,
    },
    {
      id: "gw",
      label: "API gateway",
      sub: "auth, rate limits",
      icon: "gateway",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 330,
      w: 150,
    },
    {
      id: "fanout",
      label: "Fan-out service",
      sub: "push ids to followers",
      icon: "workers",
      tone: "green",
      accent: true,
      step: 2,
      x: 575,
      y: 110,
      w: 230,
    },
    {
      id: "timeline",
      label: "Timeline service",
      sub: "read, merge, page",
      icon: "feed",
      tone: "green",
      fill: "pastel",
      x: 575,
      y: 225,
      w: 230,
    },
    {
      id: "ranker",
      label: "Ranker",
      sub: "scores posts",
      icon: "chart",
      tone: "teal",
      fill: "pastel",
      step: 7,
      x: 490,
      y: 430,
      w: 140,
    },
    {
      id: "search",
      label: "Search service",
      sub: "scatter, gather",
      icon: "search",
      tone: "teal",
      fill: "pastel",
      step: 6,
      x: 662,
      y: 370,
      w: 156,
    },
    {
      id: "post",
      label: "Post service",
      sub: "write, posts by id",
      icon: "api",
      tone: "teal",
      fill: "pastel",
      x: 575,
      y: 560,
      w: 200,
    },
    {
      id: "log",
      label: "Post log",
      sub: "posts, likes, deletes",
      icon: "log",
      tone: "orange",
      variant: "glyph",
      step: 2,
      x: 879,
      y: 280,
    },
    {
      id: "ingest",
      label: "Indexer",
      sub: "index in 10 s",
      icon: "pipeline",
      tone: "orange",
      fill: "pastel",
      step: 6,
      x: 879,
      y: 410,
      w: 160,
      h: 46,
    },
    {
      id: "counter",
      label: "Like counter",
      sub: "1 s batches",
      icon: "meter",
      tone: "orange",
      fill: "pastel",
      step: 8,
      x: 879,
      y: 470,
      w: 160,
      h: 46,
    },
    {
      id: "tlcache",
      label: "Timeline cache",
      sub: "500 ids a user",
      icon: "cache",
      tone: "violet",
      variant: "glyph",
      step: 2,
      x: 1098,
      y: 110,
    },
    {
      id: "graph",
      label: "Graph store",
      sub: "follow edges",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 220,
    },
    {
      id: "index",
      label: "Search index",
      sub: "in memory, by time",
      icon: "search",
      tone: "violet",
      variant: "glyph",
      step: 6,
      x: 1098,
      y: 360,
    },
    {
      id: "posts",
      label: "Post store",
      sub: "by post id",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 520,
    },
    {
      id: "pcache",
      label: "Post cache",
      sub: "by id, by author",
      icon: "cache",
      tone: "violet",
      variant: "glyph",
      step: 4,
      x: 1098,
      y: 615,
    },
  ],
  edges: [
    // Step 1: the naive pull.
    { from: "reader", to: "gw", label: "open timeline", flow: true, packet: true },
    { from: "author", to: "gw", label: "post", flow: true, packet: true, delay: 0.2 },
    { from: "reader", to: "cdn", label: "media", dashed: true },
    { from: "gw", to: "timeline", flow: true, packet: true, delay: 0.4 },
    { from: "gw", to: "post", via: [[297, 560]], flow: true, packet: true, delay: 0.4 },
    { from: "post", to: "posts", label: "write", flow: true, packet: true, delay: 0.8 },
    { from: "timeline", to: "graph", label: "who I follow", dashed: true },
    { from: "timeline", to: "post", label: "200 accounts' posts", tone: "red", labelAt: 0.85, until: 1 },

    // Step 2: fan-out on write.
    {
      from: "posts",
      to: "log",
      label: "changes",
      labelAt: 0.3,
      via: [
        [1000, 520],
        [1000, 280],
      ],
      step: 2,
    },
    { from: "log", to: "fanout", label: "new post", labelAt: 0.25, flow: true, packet: true, step: 2 },
    { from: "fanout", to: "graph", label: "followers", labelAt: 0.8, dashed: true, step: 2 },
    { from: "fanout", to: "tlcache", label: "append id", flow: true, packet: true, delay: 0.4, step: 2 },
    { from: "timeline", to: "tlcache", label: "read ids", labelAt: 0.8, flow: true, packet: true, delay: 0.6, step: 2 },
    { from: "timeline", to: "post", label: "posts by id", labelAt: 0.85, step: 2, until: 2 },

    // Step 3: big accounts are merged at read time.
    { from: "timeline", to: "post", label: "ids + big authors", labelAt: 0.85, step: 3 },

    // Step 4: the post cache.
    { from: "post", to: "pcache", label: "by id", dashed: true, step: 4 },

    // Step 5: rebuild a missing timeline.
    { from: "timeline", to: "fanout", label: "miss: rebuild", dashed: true, step: 5 },

    // Step 6: search.
    { from: "gw", to: "search", flow: true, packet: true, delay: 0.4, step: 6 },
    { from: "log", to: "ingest", step: 6 },
    { from: "ingest", to: "index", step: 6 },
    { from: "search", to: "index", label: "query shards", flow: true, packet: true, delay: 0.8, step: 6 },

    // Step 7: ranking.
    { from: "timeline", to: "ranker", label: "candidates", labelAt: 0.9, step: 7 },

    // Step 8: counts.
    {
      from: "log",
      to: "counter",
      via: [
        [786, 300],
        [786, 470],
      ],
      label: "likes",
      step: 8,
    },
    { from: "counter", to: "posts", label: "counts", step: 8 },
  ],
};

export default spec;
