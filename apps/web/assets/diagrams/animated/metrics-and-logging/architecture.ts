import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// A metrics and logging service, built one requirement at a time (metrics-and-logging case study, the hero).
// Eight steps: 1 every point as a row in a relational database (red, replaced in step 2) · 2 a time-series store: the
// ingesters keep series keyed by labels in compressed in-memory chunks with a write-ahead log · 3 an ingest log
// between the gateway and the ingesters, partitioned by series hash, so a spike queues instead of failing (the
// direct gateway-to-ingester path goes away) · 4 shard and replicate: each partition is read by 3 ingester replicas;
// 2-hour blocks go to object storage, recent data stays in memory · 5 queries: a query frontend splits a range by
// day and caches results; queriers fan out to the ingesters (last 2 h) and object storage (older) and merge · 6
// alerting: alert rules run as standing queries against the ingesters directly, load rules from the config DB, and
// send firing alerts to a notifier that pages on-call · 7 retention: a compactor merges blocks and writes 1-minute and
// 1-hour rollups · 8 logs: log lines share the gateway and the ingest log; log ingesters build compressed chunks per
// label stream and write chunks and a label index to object storage.
// Working (round numbers chosen to size the system): 10,000,000 active series × 1 point per 10 s = 1,000,000
// points/s; raw 16 bytes a point = 16 MB/s = 1.38 TB a day; at 1.37 bytes a point = 1.37 MB/s = 118 GB a day.
// Two hours in memory: 1,000,000 × 7,200 s × 1.37 B = 9.9 GB, × 3 replicas = 30 GB.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts, core renamed "Ingest core", services "Read
// path" (a short title, so edges into the core clear its tab), async "Logs and compaction". Clients x 105: agents
// 110, engineers 450, on-call pager 630. Edge x 297: ingest gateway 110, query frontend 450. Core x 575: ingest log
// 110, ingesters (accent) 235. Services: queriers (540, 400), alert rules (672, 520), notifier (672, 630). Async
// x 879: log ingesters 110, compactor 400. Storage x 1098: object storage 250, results cache 450, relational DB 610
// (rows per point in step 1; rules, tenants and limits from step 6).
// Alert rules reach the ingesters by a vertical line at x 672 (via 672, 300), 52 px right of the queriers.
// Edges checked against the boxes they pass: the step-1 row-per-point edge crosses empty zones (nothing else is shown
// in step 1); queriers-to-object-storage passes 30 px above the compactor; query-frontend-to-cache passes 22 px under
// the queriers and 22 px under the compactor.

const spec: DiagramSpec = {
  title: "Metrics and logging service high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "A row per point", covers: "F1" },
    { title: "A time-series store", covers: "F1, N7" },
    { title: "A buffer in front of storage", covers: "F1, N1" },
    { title: "Shard, replicate, tier", covers: "N1, N6" },
    { title: "Queries and a results cache", covers: "F3, N3" },
    { title: "Alerting beside the data", covers: "F4, N2, N5" },
    { title: "Retention and downsampling", covers: "F5" },
    { title: "Logs: labels and chunks", covers: "F2, F3" },
  ],
  zones: zoneFrame({ core: "Ingest core", services: "Read path", async: "Logs and compaction" }),
  nodes: [
    { id: "agent", label: "Agents", sub: "every host", icon: "server", fill: "pastel", x: 105, y: 110, w: 140 },
    {
      id: "engineer",
      label: "Engineers",
      sub: "dashboards",
      icon: "browser",
      fill: "pastel",
      step: 5,
      x: 105,
      y: 450,
      w: 140,
    },
    {
      id: "pager",
      label: "On-call pager",
      sub: "external",
      icon: "bell",
      fill: "pastel",
      step: 6,
      x: 105,
      y: 630,
      w: 160,
    },
    {
      id: "gateway",
      label: "Ingest gateway",
      sub: "auth, limits",
      icon: "gateway",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 110,
      w: 160,
    },
    {
      id: "frontend",
      label: "Query frontend",
      sub: "split, cache",
      icon: "api",
      tone: "blue",
      fill: "pastel",
      step: 5,
      x: 297,
      y: 450,
      w: 160,
    },
    {
      id: "log",
      label: "Ingest log",
      sub: "partitioned by series",
      icon: "topic",
      tone: "green",
      fill: "pastel",
      step: 3,
      x: 575,
      y: 110,
      w: 220,
    },
    {
      id: "ingesters",
      label: "Ingesters",
      sub: "2 h in memory, × 3",
      icon: "chart",
      tone: "green",
      accent: true,
      step: 2,
      x: 575,
      y: 235,
      w: 240,
    },
    {
      id: "queriers",
      label: "Queriers",
      sub: "fan out, merge",
      icon: "search",
      tone: "teal",
      fill: "pastel",
      step: 5,
      x: 540,
      y: 400,
      w: 160,
    },
    {
      id: "rules",
      label: "Alert rules",
      sub: "every 15 s",
      icon: "timer",
      tone: "teal",
      fill: "pastel",
      step: 6,
      x: 672,
      y: 520,
      w: 140,
    },
    {
      id: "notifier",
      label: "Notifier",
      sub: "group, dedupe",
      icon: "webhook",
      tone: "teal",
      fill: "pastel",
      step: 6,
      x: 672,
      y: 630,
      w: 140,
    },
    {
      id: "logIngesters",
      label: "Log ingesters",
      sub: "chunks per stream",
      icon: "log",
      tone: "orange",
      fill: "pastel",
      step: 8,
      x: 879,
      y: 110,
      w: 190,
    },
    {
      id: "compactor",
      label: "Compactor",
      sub: "merge, downsample",
      icon: "history",
      tone: "orange",
      fill: "pastel",
      step: 7,
      x: 879,
      y: 400,
      w: 190,
    },
    {
      id: "objects",
      label: "Object storage",
      sub: "blocks, chunks",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      step: 4,
      x: 1098,
      y: 250,
    },
    {
      id: "cache",
      label: "Results cache",
      sub: "query + day",
      icon: "cache",
      tone: "violet",
      variant: "glyph",
      step: 5,
      x: 1098,
      y: 450,
    },
    {
      id: "config",
      label: "Relational DB",
      sub: "rules, limits",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 610,
    },
  ],
  edges: [
    { from: "agent", to: "gateway", flow: true, packet: true },
    { from: "gateway", to: "config", label: "INSERT a row per point", tone: "red", until: 1 },

    { from: "gateway", to: "ingesters", label: "append", flow: true, packet: true, delay: 0.4, step: 2, until: 2 },

    { from: "gateway", to: "log", label: "write", flow: true, packet: true, delay: 0.4, step: 3 },
    { from: "log", to: "ingesters", label: "by series", flow: true, packet: true, delay: 0.8, step: 3 },

    { from: "ingesters", to: "objects", label: "2 h blocks", step: 4 },

    { from: "engineer", to: "frontend", flow: true, packet: true, step: 5 },
    { from: "frontend", to: "queriers", flow: true, packet: true, delay: 0.4, step: 5 },
    { from: "frontend", to: "cache", label: "cached results", dashed: true, step: 5 },
    { from: "queriers", to: "ingesters", label: "last 2 h", step: 5 },
    { from: "queriers", to: "objects", label: "older blocks", labelAt: 0.55, dashed: true, step: 5 },

    {
      from: "rules",
      to: "ingesters",
      label: "standing queries",
      via: [[672, 300]],
      labelAt: 0.62,
      flow: true,
      packet: true,
      step: 6,
    },
    { from: "rules", to: "config", label: "load rules", dashed: true, step: 6 },
    { from: "rules", to: "notifier", label: "firing", step: 6 },
    { from: "notifier", to: "pager", label: "page", flow: true, packet: true, delay: 0.4, step: 6 },

    { from: "compactor", to: "objects", label: "rollups", bidirectional: true, step: 7 },

    { from: "log", to: "logIngesters", label: "log lines", flow: true, packet: true, delay: 0.8, step: 8 },
    { from: "logIngesters", to: "objects", label: "chunks, index", step: 8 },
  ],
};

export default spec;
