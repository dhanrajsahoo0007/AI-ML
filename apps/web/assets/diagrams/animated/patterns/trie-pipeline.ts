import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, n } from "@/components/diagrams/presets/patterns";

// Building and serving Brightpost's typeahead (tries-and-typeahead, the Architecture figure).
// Six steps: 1 shoppers send each prefix to the suggest servers and their finished searches to the search service,
// which logs them (the system before the pipeline: the servers have nothing to answer from) · 2 a daily aggregation
// job counts searches per query over the last 30 days · 3 a builder turns the counts into a trie with the top 5 stored
// at every node and writes it as one snapshot file · 4 every suggest server loads the new snapshot and swaps it in
// · 5 a fast path: a stream job counts the last minutes of searches and pushes a short trending list that the
// servers merge in · 6 an edge cache answers repeated prefixes before they reach a server.
// Working: 2,000,000 shoppers × 4 searches = 8,000,000 searches a day (illustrative 4 per shopper); 8 M × 6 suggestion
// requests per search = 48 M a day, ÷ 86,400 = 556/s on average, × 5 (the shop's peak factor) = 2,780/s at peak.
// 10 M distinct queries in the 30-day window (illustrative).
// Layout (880 × 450): shoppers at x 95; edge cache and search service at x 295; suggest servers, the trending
// counter and the search log in a column at x 520 (rows y 80, 230, 380); snapshot store, trie builder and aggregation
// job in a column at x 770. The two short edges into the middle column carry no label (60 px).
// Colours (PATTERN_TONE): shoppers orange (traffic), servers and jobs teal (compute), the log and the snapshot store
// violet (stores), the trie builder and the trending counter green (the pattern), the edge cache neutral (plumbing).

const SEARCHES_PER_DAY = SHOP.shoppersPerDay * 4; // 8,000,000
const REQUESTS_PER_DAY = SEARCHES_PER_DAY * 6; // 48,000,000
const AVG = Math.round(REQUESTS_PER_DAY / SHOP.secondsPerDay); // 556

const spec: DiagramSpec = {
  title: "Building and serving typeahead suggestions",
  width: 880,
  height: 450,
  steps: [
    { title: "Shoppers type, the search service logs" },
    { title: "Count searches per query every day" },
    { title: "Build a trie with the top 5 per node" },
    { title: "Ship the snapshot to every server" },
    { title: "A fast path for trending queries" },
    { title: "Cache popular prefixes at the edge" },
  ],
  zones: [],
  nodes: [
    {
      id: "shoppers",
      label: "Shoppers",
      sub: `${n(AVG)} prefixes/s`,
      icon: "users",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      x: 95,
      y: 230,
      w: 160,
    },
    {
      id: "edge",
      label: "Edge cache",
      sub: "short prefixes",
      icon: "cdn",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      step: 6,
      x: 295,
      y: 80,
      w: 160,
    },
    {
      id: "search",
      label: "Search service",
      sub: "full searches",
      icon: "search",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 295,
      y: 380,
      w: 160,
    },
    {
      id: "servers",
      label: "Suggest servers",
      sub: "trie in memory",
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 520,
      y: 80,
      w: 170,
    },
    {
      id: "trending",
      label: "Trending counter",
      sub: "last 10 minutes",
      icon: "chart",
      tone: PATTERN_TONE.pattern,
      fill: "pastel",
      step: 5,
      x: 520,
      y: 230,
      w: 170,
    },
    {
      id: "log",
      label: "Search log",
      sub: `${n(SEARCHES_PER_DAY / 1e6)} M a day`,
      icon: "log",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 520,
      y: 380,
      w: 170,
    },
    {
      id: "snapshot",
      label: "Snapshot store",
      sub: "one file a day",
      icon: "snapshot",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 3,
      x: 770,
      y: 80,
      w: 170,
    },
    {
      id: "builder",
      label: "Trie builder",
      sub: "top 5 per node",
      icon: "trie",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 3,
      x: 770,
      y: 230,
      w: 170,
    },
    {
      id: "agg",
      label: "Aggregation job",
      sub: "30-day counts",
      icon: "workers",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 2,
      x: 770,
      y: 380,
      w: 170,
    },
  ],
  edges: [
    { from: "shoppers", to: "servers", label: "prefix “ke”", packet: true, until: 5 },
    { from: "shoppers", to: "search", label: "search", packet: true },
    { from: "search", to: "log", packet: true },

    { from: "log", to: "agg", label: "daily batch", packet: true, step: 2 },

    { from: "agg", to: "builder", label: "10 M queries", packet: true, step: 3 },
    { from: "builder", to: "snapshot", label: "trie file", packet: true, step: 3 },

    { from: "snapshot", to: "servers", label: "load, swap", packet: true, step: 4 },

    { from: "log", to: "trending", label: "stream", packet: true, step: 5 },
    { from: "trending", to: "servers", label: "merge", packet: true, step: 5 },

    { from: "shoppers", to: "edge", label: "prefix", packet: true, step: 6 },
    { from: "edge", to: "servers", packet: true, step: 6 },
  ],
};

export default spec;
