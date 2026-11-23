import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// Search typeahead, built one requirement at a time (typeahead case study, the hero).
// Eight steps: 1 a `LIKE 'ele%'` query on a table of past searches, served by the search service (replaced in step 2)
// · 2 a trie in memory, loaded from the table at start-up; a short prefix walks its whole subtree (red, replaced in
// step 3) · 3 the top five stored at every trie node: one walk, one list read · 4 built offline: every search goes to
// a search log, a daily job counts 30 days of it, a builder writes a trie snapshot that the index servers load and
// swap in (the table load and the per-search count go away) · 5 serving: a stateless suggest service (the aggregator)
// in front of full-copy index replicas (the load balancer stops calling the index directly) · 6 the client and the
// edge: the browser caches and debounces, a CDN caches the shared answers (the direct path to the load balancer goes)
// · 7 freshness: the search log also streams into a trending counter that writes a small trending layer the suggest
// service merges in · 8 filtering and personalisation: a policy service pushes the blocklist to the suggest service;
// the search service keeps each user's recent searches and hands them to the browser when the box gets focus.
// Working (round numbers chosen to size the system): 8,000,000 searches a day × 6 suggestion requests = 48,000,000
// a day ÷ 86,400 = 556/s; × 5 at peak = 2,780/s. Index: 10,000,000 queries; a radix trie has at most 2 × 10 M = 20 M
// nodes × 64 bytes = 1,280 MB, + 200 MB of query text + 40 MB of scores ≈ 1.5 GB per full copy.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts. Clients: browser (105, 300). Edge column x 297: load
// balancer 150, CDN 300. Core ("Suggest serving"): suggest service 120, trie index (accent) 235, both x 575.
// Services column x 575: search service 420, policy service 580. Async column x 879: trie builder 110, daily
// aggregation 230, search log 350, trending counter 455. Storage column x 1098: trie snapshots 110, query counts 230,
// trending layer 455, recent searches 600. Lanes: x 393 (the load balancer down to the search service, between the edge and core
// zones), x 730 (policy up to the suggest service), x 757 (the suggest service down to the trending layer, then the
// search service down to recent searches), y 165 (snapshots into the index, between the builder and the aggregation
// job, after a drop at x 1040 that clears the snapshot label), y 290 (the step-1 LIKE, between the aggregation job and the log), y 402 (between the log and the counter).
// Every long edge was checked against the boxes it passes.
// Colours: the six zone tones; nodes take their zone's tone; red only for the step-2 subtree walk.

const spec: DiagramSpec = {
  title: "Search typeahead high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "A LIKE query on past searches", covers: "F1" },
    { title: "A trie in memory", covers: "F1, N1" },
    { title: "The top five at every node", covers: "F1, F2, N1" },
    { title: "Built offline from the search log", covers: "F2, N4" },
    { title: "Serving: an aggregator and replicas", covers: "N2, N3" },
    { title: "The browser and the edge", covers: "N1, N2" },
    { title: "Trending queries within minutes", covers: "F3, N4" },
    { title: "Filtering and personalisation", covers: "F4, F5, N5, N6" },
  ],
  zones: zoneFrame({ core: "Suggest serving" }),
  nodes: [
    {
      id: "client",
      label: "Browser / app",
      sub: "debounce, cache",
      icon: "browser",
      fill: "pastel",
      x: 105,
      y: 300,
      w: 150,
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "L7, any replica",
      icon: "load-balancer",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 150,
      w: 150,
    },
    {
      id: "cdn",
      label: "CDN",
      sub: "shared answers",
      icon: "cdn",
      tone: "blue",
      fill: "pastel",
      step: 6,
      x: 297,
      y: 300,
      w: 150,
    },
    {
      id: "suggest",
      label: "Suggest service",
      sub: "merge, filter, rank",
      icon: "api",
      tone: "green",
      fill: "pastel",
      step: 5,
      x: 575,
      y: 120,
      w: 220,
    },
    {
      id: "index",
      label: "Trie index",
      sub: "in memory, 1.5 GB",
      icon: "trie",
      tone: "green",
      accent: true,
      step: 2,
      x: 575,
      y: 235,
      w: 220,
    },
    {
      id: "search",
      label: "Search service",
      sub: "results, logs searches",
      icon: "search",
      tone: "teal",
      fill: "pastel",
      x: 575,
      y: 420,
      w: 200,
    },
    {
      id: "policy",
      label: "Policy service",
      sub: "blocklist, removals",
      icon: "shield",
      tone: "teal",
      fill: "pastel",
      step: 8,
      x: 575,
      y: 580,
      w: 200,
    },
    {
      id: "builder",
      label: "Trie builder",
      sub: "top 5, one file",
      icon: "tree",
      tone: "orange",
      fill: "pastel",
      step: 4,
      x: 879,
      y: 110,
      w: 190,
    },
    {
      id: "agg",
      label: "Daily aggregation",
      sub: "30-day counts",
      icon: "workers",
      tone: "orange",
      fill: "pastel",
      step: 4,
      x: 879,
      y: 230,
      w: 190,
    },
    {
      id: "log",
      label: "Search log",
      sub: "every search",
      icon: "topic",
      tone: "orange",
      fill: "pastel",
      step: 4,
      x: 879,
      y: 350,
      w: 190,
    },
    {
      id: "trend",
      label: "Trending counter",
      sub: "10-minute windows",
      icon: "chart",
      tone: "orange",
      fill: "pastel",
      step: 7,
      x: 879,
      y: 455,
      w: 190,
    },
    {
      id: "snapshots",
      label: "Trie snapshots",
      sub: "one file a day",
      icon: "snapshot",
      tone: "violet",
      variant: "glyph",
      step: 4,
      x: 1098,
      y: 110,
    },
    {
      id: "counts",
      label: "Query counts",
      sub: "query → count",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 230,
    },
    {
      id: "trendstore",
      label: "Trending layer",
      sub: "top 5 per prefix",
      icon: "cache",
      tone: "violet",
      variant: "glyph",
      step: 7,
      x: 1098,
      y: 455,
    },
    {
      id: "history",
      label: "Recent searches",
      sub: "per user, 90 days",
      icon: "history",
      tone: "violet",
      variant: "glyph",
      step: 8,
      x: 1098,
      y: 600,
    },
  ],
  edges: [
    // Step 1: the search service answers suggestions with LIKE on the counts table.
    { from: "client", to: "lb", label: "keystroke", flow: true, packet: true, until: 5 },
    {
      from: "lb",
      to: "search",
      label: "suggest, search",
      flow: true,
      packet: true,
      delay: 0.4,
      via: [
        [393, 175],
        [393, 440],
      ],
      until: 1,
    },
    {
      from: "search",
      to: "counts",
      label: "LIKE 'ele%', count + 1",
      tone: "red",
      via: [
        [757, 420],
        [757, 290],
        [1001, 290],
      ],
      until: 1,
    },

    // Steps 2 and 3: a trie in memory, loaded from the table; searches still count into it.
    {
      from: "lb",
      to: "search",
      label: "search",
      dashed: true,
      labelAt: 0.3,
      via: [
        [393, 175],
        [393, 440],
      ],
      step: 2,
    },
    {
      from: "search",
      to: "counts",
      label: "count + 1",
      dashed: true,
      via: [
        [757, 420],
        [757, 290],
        [1001, 290],
      ],
      step: 2,
      until: 3,
    },
    {
      from: "counts",
      to: "index",
      label: "load at start",
      dashed: true,
      via: [
        [1040, 165],
        [640, 165],
      ],
      step: 2,
      until: 3,
    },
    { from: "lb", to: "index", label: "walk the subtree", tone: "red", flow: true, packet: true, step: 2, until: 2 },
    { from: "lb", to: "index", label: "read top 5", flow: true, packet: true, step: 3, until: 4 },

    // Step 4: built offline from the search log.
    { from: "search", to: "log", label: "each search", step: 4 },
    { from: "log", to: "agg", step: 4 },
    { from: "agg", to: "counts", label: "counts", step: 4 },
    { from: "agg", to: "builder", step: 4 },
    { from: "builder", to: "snapshots", label: "write", step: 4 },
    {
      from: "snapshots",
      to: "index",
      label: "load, swap",
      dashed: true,
      via: [
        [1040, 110],
        [1040, 165],
        [640, 165],
      ],
      step: 4,
    },

    // Step 5: a stateless aggregator in front of the index replicas.
    { from: "lb", to: "suggest", flow: true, packet: true, delay: 0.4, step: 5 },
    { from: "suggest", to: "index", flow: true, packet: true, delay: 0.8, step: 5 },

    // Step 6: the browser goes through the CDN.
    { from: "client", to: "cdn", flow: true, packet: true, step: 6 },
    { from: "cdn", to: "lb", label: "miss", flow: true, packet: true, delay: 0.2, step: 6 },

    // Step 7: a trending layer from the same log.
    { from: "log", to: "trend", step: 7 },
    { from: "trend", to: "trendstore", label: "write", step: 7 },
    {
      from: "suggest",
      to: "trendstore",
      label: "trending",
      dashed: true,
      labelAt: 0.6,
      via: [
        [757, 120],
        [757, 402],
        [1001, 402],
      ],
      step: 7,
    },

    // Step 8: the blocklist and each user's recent searches.
    {
      from: "policy",
      to: "suggest",
      label: "blocklist",
      dashed: true,
      labelAt: 0.7,
      via: [
        [730, 580],
        [730, 140],
      ],
      step: 8,
    },
    {
      from: "search",
      to: "history",
      label: "my recent searches",
      dashed: true,
      via: [
        [757, 440],
        [757, 600],
      ],
      step: 8,
    },
  ],
};

export default spec;
