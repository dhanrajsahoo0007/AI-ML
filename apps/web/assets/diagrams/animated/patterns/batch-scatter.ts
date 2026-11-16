import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// Scatter-gather with a deadline (batching-and-pipelining, the Architecture figure). Brightpost's product search
// index is split into 20 shards; a search asks all of them and merges the results.
// Four steps: 1 one index answers every search (the "before") · 2 the coordinator scatters the query to 20 shards
// (drawn as shards 1, 2, 3 and 20) · 3 each returns its top 10 and the coordinator merges them · 4 an 80 ms deadline:
// the coordinator answers with the shards that replied and drops the late one.
// Working: if each shard is slower than its own p99 1 % of the time, a search waits for all 20, so the chance that at
// least one is slow is 1 − 0.99^20 = 18 %.
// Layout (860 × 480): shopper at x 90; coordinator (accent) at x 360 with merge above and the deadline below; shards
// in a column at x 710. Colours (PATTERN_TONE): shopper orange (traffic), coordinator and merge green (the pattern),
// shards violet (stores), the deadline lime (a check).

const spec: DiagramSpec = {
  title: "Scatter-gather with a deadline",
  width: 860,
  height: 480,
  steps: [
    { title: "One index answers every search" },
    { title: "Scatter the query to 20 shards" },
    { title: "Gather the top 10 from each and merge" },
    { title: "Answer at the deadline with what arrived" },
  ],
  zones: [{ id: "shards", title: "20 index shards", tone: PATTERN_TONE.store, x: 615, y: 30, w: 190, h: 430 }],
  nodes: [
    {
      id: "shopper",
      label: "Shopper",
      sub: "search: kettle",
      icon: "search",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      x: 90,
      y: 240,
      w: 150,
    },
    { id: "s1", label: "Shard 1", icon: "database", tone: PATTERN_TONE.store, fill: "pastel", x: 710, y: 90, w: 150 },

    {
      id: "coord",
      label: "Coordinator",
      sub: "scatter, gather",
      icon: "coordinator",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 2,
      x: 360,
      y: 240,
      w: 180,
    },
    {
      id: "s2",
      label: "Shard 2",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 2,
      x: 710,
      y: 195,
      w: 150,
    },
    {
      id: "s3",
      label: "Shard 3",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 2,
      x: 710,
      y: 300,
      w: 150,
    },
    {
      id: "s20",
      label: "Shard 20",
      sub: "slow today",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 2,
      x: 710,
      y: 405,
      w: 150,
    },

    {
      id: "merge",
      label: "Merge top 10",
      sub: "200 candidates",
      icon: "chart",
      tone: PATTERN_TONE.pattern,
      fill: "pastel",
      step: 3,
      x: 360,
      y: 90,
      w: 180,
    },

    {
      id: "deadline",
      label: "Deadline 80 ms",
      sub: "answer with 19 of 20",
      icon: "timer",
      tone: PATTERN_TONE.check,
      fill: "pastel",
      step: 4,
      x: 360,
      y: 400,
      w: 180,
    },
  ],
  edges: [
    { from: "shopper", to: "s1", label: "one index", packet: true, until: 1 },

    { from: "shopper", to: "coord", packet: true, step: 2 },
    { from: "coord", to: "s1", packet: true, delay: 0.4, step: 2 },
    { from: "coord", to: "s2", label: "query", packet: true, delay: 0.5, step: 2 },
    { from: "coord", to: "s3", packet: true, delay: 0.6, step: 2 },
    { from: "coord", to: "s20", packet: true, delay: 0.7, step: 2, until: 3 },

    { from: "coord", to: "merge", label: "top 10 each", bidirectional: true, step: 3 },

    { from: "coord", to: "deadline", bidirectional: true, step: 4 },
    { from: "s20", to: "coord", label: "late: dropped", dashed: true, step: 4 },
  ],
};

export default spec;
