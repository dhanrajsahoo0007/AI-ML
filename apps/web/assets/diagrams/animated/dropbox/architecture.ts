import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// A Dropbox-style file sync service, built one requirement at a time (dropbox case study, the hero).
// Eight steps: 1 upload the whole file: the metadata service takes the bytes, writes them to the object store and a
// file row to the metadata DB (both shortcuts replaced in step 2) · 2 split files into 4 MB blocks addressed by their
// SHA-256 hash: the client puts blocks to the block service, which stores them by hash and records each hash in the
// block index; the client then saves the block list (replaced in step 3) · 3 the commit protocol: the client commits
// the block list, the metadata service asks the block service which hashes are missing, and the client uploads only
// those · 4 sync: every commit appends a row to the namespace's journal; the change log carries "namespace changed"
// to the notification service, which answers the laptop's long poll; the laptop then pulls changes after its cursor
// · 5 the client: a watcher and a local index of ids, hashes and the cursor · 6 conflicts: a commit names the
// revision it was based on and fails if that is no longer current; the loser saves a conflicted copy (replaces the
// step-3 commit edge) · 7 durable storage: storage jobs replicate new blocks across zones, then erasure-code sealed
// buckets, scrub and verify · 8 dedup and streaming sync: a metadata cache holds hot metadata and the block lists of
// uploads still in progress, so other devices can prefetch.
// Working (round numbers chosen to size the system): 100,000,000 daily users × 10 saved files = 1,000,000,000
// commits a day ÷ 86,400 s = 11,600/s, peak 3 × ≈ 35,000/s. 500 KB of new bytes per commit = 0.5 PB a day.
// 100,000,000 users × 5 GB = 500 PB stored. A 1 GB file is 1,024 ÷ 4 = 256 blocks; its block list is 256 × 32 bytes
// = 8 KB.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts. Clients column x 105: desktop 150, local index (glyph)
// 300, laptop 540. Edge x 297: load balancer 330. Core: metadata service (accent) 500, 130; notification service
// 650, 245. Services x 620, clear of the zone tab: block service 450,
// storage jobs 590. Async x 879: change log 360. Storage column x 1098:
// metadata cache 110, metadata DB 250, block index 400, object store 570. The async column holds only the change log
// so the metadata service's edges to the cache and the DB pass above it; every long edge was checked against the boxes
// it passes.
// Colours: the six zone tones; no red, because no step draws a failure on its own.

const spec: DiagramSpec = {
  title: "File sync high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "Upload the whole file", covers: "F1" },
    { title: "Blocks addressed by hash", covers: "F1" },
    { title: "The commit protocol", covers: "F1, F4" },
    { title: "Sync: journal, notify, pull", covers: "F2, F5" },
    { title: "The client: watch and index", covers: "F2, F3" },
    { title: "Conflicts: a conflicted copy", covers: "F3" },
    { title: "Durable block storage", covers: "N1" },
    { title: "Cache and streaming sync", covers: "N3, N4" },
  ],
  zones: zoneFrame({ core: "Sync core", services: "Block services" }),
  nodes: [
    { id: "desktop", label: "Desktop", sub: "sync client", icon: "server", fill: "pastel", x: 105, y: 150, w: 140 },
    {
      id: "local",
      label: "Local index",
      sub: "ids, hashes",
      icon: "database",
      tone: "neutral",
      variant: "glyph",
      step: 5,
      x: 105,
      y: 300,
    },
    {
      id: "laptop",
      label: "Laptop",
      sub: "same user",
      icon: "phone",
      fill: "pastel",
      step: 4,
      x: 105,
      y: 540,
      w: 140,
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "TLS, L7 routes",
      icon: "load-balancer",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 330,
      w: 150,
    },
    {
      id: "meta",
      label: "Metadata service",
      sub: "commit, versions",
      icon: "folder",
      tone: "green",
      accent: true,
      x: 500,
      y: 130,
      w: 170,
    },
    {
      id: "notify",
      label: "Notifications",
      sub: "long polls",
      icon: "bell",
      tone: "green",
      fill: "pastel",
      step: 4,
      x: 650,
      y: 245,
      w: 160,
    },
    {
      id: "blocks",
      label: "Block service",
      sub: "put, get by hash",
      icon: "hash",
      tone: "teal",
      fill: "pastel",
      step: 2,
      x: 620,
      y: 450,
      w: 200,
    },
    {
      id: "jobs",
      label: "Storage jobs",
      sub: "encode, scrub, GC",
      icon: "workers",
      tone: "teal",
      fill: "pastel",
      step: 7,
      x: 620,
      y: 590,
      w: 200,
    },
    {
      id: "changes",
      label: "Change log",
      sub: "journal appends",
      icon: "log",
      tone: "orange",
      fill: "pastel",
      step: 4,
      x: 879,
      y: 360,
      w: 190,
    },
    {
      id: "cache",
      label: "Metadata cache",
      sub: "hot rows, pending",
      icon: "cache",
      tone: "violet",
      variant: "glyph",
      step: 8,
      x: 1098,
      y: 110,
    },
    {
      id: "metadb",
      label: "Metadata DB",
      sub: "files, journal",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 250,
    },
    {
      id: "index",
      label: "Block index",
      sub: "hash to place",
      icon: "hash",
      tone: "violet",
      variant: "glyph",
      step: 2,
      x: 1098,
      y: 400,
    },
    {
      id: "objects",
      label: "Object store",
      sub: "blocks by hash",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 570,
    },
  ],
  edges: [
    { from: "desktop", to: "lb", label: "save file", flow: true, packet: true },
    { from: "lb", to: "meta", label: "PUT whole file", flow: true, packet: true, delay: 0.4, until: 1 },
    { from: "meta", to: "objects", label: "file bytes", until: 1 },
    { from: "meta", to: "metadb", label: "file row", dashed: true },

    { from: "lb", to: "blocks", label: "PUT block", flow: true, packet: true, delay: 0.4, step: 2 },
    { from: "blocks", to: "objects", label: "block by hash", step: 2 },
    { from: "blocks", to: "index", label: "hash stored", dashed: true, step: 2 },
    { from: "lb", to: "meta", label: "save list", step: 2, until: 2 },

    { from: "lb", to: "meta", label: "commit list", flow: true, packet: true, delay: 0.8, step: 3, until: 5 },
    { from: "meta", to: "blocks", label: "missing?", dashed: true, labelAt: 0.85, step: 3 },

    { from: "laptop", to: "lb", label: "long poll", dashed: true, step: 4 },
    { from: "metadb", to: "changes", label: "new rows", step: 4 },
    { from: "changes", to: "notify", label: "ns changed", flow: true, packet: true, step: 4 },
    { from: "lb", to: "notify", label: "poll, wake", bidirectional: true, labelAt: 0.3, step: 4 },

    { from: "desktop", to: "local", label: "watch, hash", dashed: true, step: 5 },

    { from: "lb", to: "meta", label: "commit if rev", flow: true, packet: true, delay: 0.8, step: 6 },

    { from: "jobs", to: "objects", label: "replicate, encode", step: 7 },

    { from: "meta", to: "cache", label: "hot, pending", dashed: true, step: 8 },
  ],
};

export default spec;
