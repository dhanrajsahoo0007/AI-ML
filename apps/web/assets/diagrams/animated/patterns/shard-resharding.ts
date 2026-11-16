import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP, n } from "@/components/diagrams/presets/patterns";

// Splitting Brightpost's orders across shards, then splitting a shard online (sharding, the Architecture figure).
//
// Five steps: 1 one database holds every order (the "before") · 2 a router and a shard map split orders by
// hash(customer id) over two shards · 3 a third shard is added and the router dual-writes the range that will move ·
// 4 history for that range is backfilled from shard 2 · 5 reads move after a comparison, then writes; the map is
// updated and shard 2 keeps a way back. Nodes never move; replaced edges use `until`.
// Layout (780 × 470): the app at x 90; router (accent) and shard map at x 310; shards in a column at x 640.
// Colours (PATTERN_TONE): app teal (compute), router green (the pattern), shard map and shards violet (stores).
// Fact check (2026-11-16): Vitess's Reshard workflow copies data, verifies it with VDiff, switches reads and then
// writes with SwitchTraffic, and keeps reverse replication so ReverseTraffic can switch back.

const spec: DiagramSpec = {
  title: "Sharding orders, then splitting a shard online",
  width: 780,
  height: 470,
  steps: [
    { title: "One database holds every order" },
    { title: "A router splits orders over two shards" },
    { title: "Add a shard and dual-write the moving range" },
    { title: "Backfill the moving range" },
    { title: "Compare, switch reads, then writes" },
  ],
  zones: [{ id: "shards", title: "Order shards", tone: PATTERN_TONE.store, x: 540, y: 40, w: 200, h: 410 }],
  nodes: [
    {
      id: "app",
      label: "Order service",
      sub: `${n(SHOP.ordersPerDay)} orders/day`,
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 95,
      y: 235,
      w: 170,
    },
    {
      id: "s1",
      label: "Database 1",
      sub: "shard 1 from step 2",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: 640,
      y: 110,
      w: 170,
    },

    {
      id: "router",
      label: "Shard router",
      sub: "hash(customer id)",
      icon: "router",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 2,
      x: 320,
      y: 235,
      w: 180,
    },
    {
      id: "map",
      label: "Shard map",
      sub: "ranges to shards",
      icon: "map",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 2,
      x: 320,
      y: 395,
      w: 170,
    },
    {
      id: "s2",
      label: "Shard 2",
      sub: "hash 50-100 %",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 2,
      x: 640,
      y: 235,
      w: 170,
    },

    {
      id: "s3",
      label: "Shard 3",
      sub: "will own 75-100 %",
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 3,
      x: 640,
      y: 380,
      w: 170,
    },
  ],
  edges: [
    { from: "app", to: "s1", label: "every order", packet: true, until: 1 },

    { from: "app", to: "router", packet: true, step: 2 },
    { from: "router", to: "s1", label: "0-50 %", packet: true, delay: 0.4, step: 2 },
    { from: "router", to: "s2", label: "50-100 %", packet: true, delay: 0.6, step: 2 },
    { from: "router", to: "map", label: "lookup", bidirectional: true, step: 2 },

    { from: "router", to: "s3", label: "dual write", dashed: true, step: 3, until: 4 },

    { from: "s2", to: "s3", label: "backfill", flow: true, step: 4 },

    { from: "router", to: "s3", label: "75-100 %", packet: true, delay: 0.8, step: 5 },
  ],
};

export default spec;
