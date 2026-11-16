import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, n } from "@/components/diagrams/presets/patterns";

// Ranking across shards: partition by key, keep a local top 10 per shard, merge (top-k-and-leaderboards, the
// Architecture figure).
// Four steps: 1 product views go into an event log keyed by product id, so every view of one product lands on the
// same counter shard · 2 each shard counts its own products and keeps its local top 10 · 3 a merger takes the 4 × 10
// = 40 candidates and picks the global top 10; this is exact because no product's count is split across shards ·
// 4 the merged list is written to a cache that the home page reads.
// Working: 2,300 views/s at peak ÷ 4 shards = 575 views/s per shard; 1,000,000 products ÷ 4 = 250,000 per shard;
// 4 shards × 10 = 40 candidates. Four shards and the 10 s refresh are illustrative.
// Layout (880 × 450): views and the log in a column at x 110; shards at x 400; local top-10 lists at x 605; the merger
// and the cache in a column at x 790.
// Colours (PATTERN_TONE): views orange (traffic), the log neutral (plumbing), shards teal (compute), the top-10 lists
// and the merger green (the pattern; the merger is the accent), the cache violet (a store).

const SHARDS = 4;
const K = 10;
const perShard = SHOP.peakReadsPerSecond / SHARDS; // 575
const productsPerShard = SHOP.catalogueProducts / SHARDS; // 250,000
const ROW_Y = [70, 170, 270, 370];

const spec: DiagramSpec = {
  title: "Top 10 across shards: partition by key, local top 10, merge",
  width: 880,
  height: 450,
  steps: [
    { title: "Partition views by product id" },
    { title: "Each shard keeps its local top 10" },
    { title: "Merge 40 candidates into one top 10" },
    { title: "Serve the list from a cache" },
  ],
  zones: [],
  nodes: [
    {
      id: "views",
      label: "Product views",
      sub: `${n(SHOP.peakReadsPerSecond)}/s at peak`,
      icon: "users",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      x: 110,
      y: 70,
      w: 180,
    },
    {
      id: "log",
      label: "Event log",
      sub: "keyed by product id",
      icon: "topic",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      x: 110,
      y: 270,
      w: 180,
    },
    ...ROW_Y.map((y, i) => ({
      id: `s${i + 1}`,
      label: `Counter shard ${i + 1}`,
      sub: `${n(productsPerShard)} products`,
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel" as const,
      x: 400,
      y,
      w: 190,
    })),
    ...ROW_Y.map((y, i) => ({
      id: `t${i + 1}`,
      label: `Top ${K}`,
      sub: `shard ${i + 1}`,
      icon: "meter",
      tone: PATTERN_TONE.pattern,
      fill: "pastel" as const,
      step: 2,
      x: 605,
      y,
      w: 130,
    })),
    {
      id: "merge",
      label: "Merge",
      sub: `${SHARDS * K} → top ${K}`,
      icon: "coordinator",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 3,
      x: 795,
      y: 150,
      w: 150,
    },
    {
      id: "cache",
      label: "Top-10 cache",
      sub: "home page reads",
      icon: "cache",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 4,
      x: 795,
      y: 350,
      w: 150,
    },
  ],
  edges: [
    { from: "views", to: "log", label: `${n(SHOP.peakReadsPerSecond)}/s`, packet: true },
    { from: "log", to: "s1", packet: true, delay: 0.2 },
    { from: "log", to: "s2", packet: true, delay: 0.4 },
    { from: "log", to: "s3", label: `≈ ${perShard}/s each`, labelAt: 0.55, packet: true, delay: 0.6 },
    { from: "log", to: "s4", packet: true, delay: 0.8 },

    { from: "s1", to: "t1", step: 2 },
    { from: "s2", to: "t2", step: 2 },
    { from: "s3", to: "t3", step: 2 },
    { from: "s4", to: "t4", step: 2 },

    { from: "t1", to: "merge", packet: true, step: 3 },
    { from: "t2", to: "merge", packet: true, delay: 0.2, step: 3 },
    { from: "t3", to: "merge", packet: true, delay: 0.4, step: 3 },
    { from: "t4", to: "merge", packet: true, delay: 0.6, step: 3 },

    { from: "merge", to: "cache", label: "every 10 s", packet: true, step: 4 },
  ],
};

export default spec;
