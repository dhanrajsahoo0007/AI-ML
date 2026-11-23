import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// An object store (S3-style), built one requirement at a time (s3 case study, the hero).
// Eight steps: 1 one node: the front end writes the file and a local key map on one storage node · 2 metadata apart
// from data: a metadata index holds bucket + key → where the bytes are; the record is the commit point · 3 placement
// and three copies across three zones (replaced in step 4) · 4 erasure coding: large objects as 10 + 5 shards; small
// objects append to replicated extents that an extent sealer erasure-codes when they fill · 5 metadata at scale:
// the index is cut into key ranges, a per-zone index cache serves lookups, and a witness says whether a cached entry
// is still the latest (the step-2 lookup edge goes away) · 6 multipart upload through the upload service · 7 a
// scrubber re-reads checksums and repair workers rebuild lost shards · 8 lifecycle and garbage collection move cold
// objects to a dense tier and expire old versions.
// Working (round numbers chosen to size the system): 1 EB of objects; 10 + 5 coding = 1.5 × → 1.5 EB raw; 20 TB
// drives filled to 75 % = 15 TB each → 1.5 EB ÷ 15 TB = 100,000 drives (three copies would need 3 EB ÷ 15 TB =
// 200,000). 100 billion objects × 1 KB of metadata = 100 TB of index.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts. Clients: client (105, 225). Edge column x 297: load
// balancer 150, front end 300. Core: metadata index (accent) 575, 125; witness 575, 235. Services column x 575: index
// cache (615) 390, placement 520, upload service 630. Async column x 879: extent sealer 120, scrubber 220, repair 380,
// lifecycle 465. Storage column x 1098: storage nodes (glyph) 300, cold tier (glyph) 560.
// The data path runs along y 300, the corridor between the core and services zones and between the scrubber and
// repair boxes. The upload service reaches the index up the right side (x 730) and the front end reaches the upload
// service down the edge column (x 297), so no edge crosses a box. The index cache sits right of centre (x 615, w 170) so the
// "fresh?" label clears the services zone title; the sealer edge runs right along y 120, then down to the drives.
// Colours: the zone tones of the preset; the index is the one accent.

const spec: DiagramSpec = {
  title: "Object store high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "One node: a file and a map", covers: "F1" },
    { title: "Metadata apart from data", covers: "F1, N2" },
    { title: "Three copies across zones", covers: "N1, N3" },
    { title: "Erasure coding for cost", covers: "N1, N6" },
    { title: "Metadata in key ranges", covers: "F2, N2, N4" },
    { title: "Multipart upload", covers: "F3" },
    { title: "Scrub and repair", covers: "N1" },
    { title: "Versions and lifecycle", covers: "F4, F5" },
  ],
  zones: zoneFrame({ core: "Metadata core", services: "Request services", async: "Background work" }),
  nodes: [
    { id: "client", label: "Client", sub: "SDK, CLI, app", icon: "browser", fill: "pastel", x: 105, y: 225, w: 140 },
    {
      id: "lb",
      label: "Load balancer",
      sub: "DNS + layer 4",
      icon: "router",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 150,
      w: 150,
    },
    {
      id: "front",
      label: "Front end",
      sub: "auth, checksums",
      icon: "api",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 300,
      w: 150,
    },
    {
      id: "index",
      label: "Metadata index",
      sub: "key ranges, 3 replicas",
      icon: "tree",
      tone: "green",
      accent: true,
      step: 2,
      x: 575,
      y: 125,
      w: 230,
    },
    {
      id: "witness",
      label: "Witness",
      sub: "latest version per key",
      icon: "signal",
      tone: "green",
      fill: "pastel",
      step: 5,
      x: 575,
      y: 235,
      w: 200,
    },
    {
      id: "cache",
      label: "Index cache",
      sub: "per zone",
      icon: "cache",
      tone: "teal",
      fill: "pastel",
      step: 5,
      x: 615,
      y: 390,
      w: 170,
    },
    {
      id: "placement",
      label: "Placement",
      sub: "pick 15 drives",
      icon: "coordinator",
      tone: "teal",
      fill: "pastel",
      step: 3,
      x: 575,
      y: 520,
      w: 200,
    },
    {
      id: "uploads",
      label: "Upload service",
      sub: "multipart parts",
      icon: "chunk",
      tone: "teal",
      fill: "pastel",
      step: 6,
      x: 575,
      y: 630,
      w: 200,
    },
    {
      id: "sealer",
      label: "Extent sealer",
      sub: "erasure-code extents",
      icon: "hash",
      tone: "orange",
      fill: "pastel",
      step: 4,
      x: 879,
      y: 120,
      w: 190,
    },
    {
      id: "scrubber",
      label: "Scrubber",
      sub: "re-read checksums",
      icon: "search",
      tone: "orange",
      fill: "pastel",
      step: 7,
      x: 879,
      y: 220,
      w: 190,
    },
    {
      id: "repair",
      label: "Repair workers",
      sub: "rebuild lost shards",
      icon: "workers",
      tone: "orange",
      fill: "pastel",
      step: 7,
      x: 879,
      y: 380,
      w: 190,
    },
    {
      id: "lifecycle",
      label: "Lifecycle + GC",
      sub: "tiers, old versions",
      icon: "timer",
      tone: "orange",
      fill: "pastel",
      step: 8,
      x: 879,
      y: 465,
      w: 190,
    },
    {
      id: "storage",
      label: "Storage nodes",
      sub: "100,000 drives",
      icon: "disk",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 300,
    },
    {
      id: "cold",
      label: "Cold tier",
      sub: "dense, slow disks",
      icon: "vault",
      tone: "violet",
      variant: "glyph",
      step: 8,
      x: 1098,
      y: 560,
    },
  ],
  edges: [
    { from: "client", to: "lb", label: "HTTPS", flow: true, packet: true },
    { from: "lb", to: "front", flow: true, packet: true, delay: 0.3 },
    { from: "front", to: "storage", label: "file + local map", flow: true, packet: true, delay: 0.6, until: 1 },

    { from: "front", to: "storage", label: "bytes", flow: true, packet: true, delay: 0.6, step: 2, until: 2 },
    { from: "front", to: "index", label: "lookup, commit", labelAt: 0.35, step: 2, until: 4 },

    { from: "front", to: "placement", label: "pick drives", step: 3 },
    {
      from: "front",
      to: "storage",
      label: "3 copies, 3 zones",
      flow: true,
      packet: true,
      delay: 0.6,
      step: 3,
      until: 3,
    },

    { from: "front", to: "storage", label: "10 + 5 shards", flow: true, packet: true, delay: 0.6, step: 4 },
    { from: "sealer", to: "storage", label: "seal extent", dashed: true, via: [[1060, 120]], labelAt: 0.15, step: 4 },

    { from: "front", to: "cache", label: "lookup", labelAt: 0.7, flow: true, packet: true, delay: 0.3, step: 5 },
    { from: "cache", to: "witness", label: "fresh?", step: 5 },
    { from: "index", to: "witness", label: "version", dashed: true, step: 5 },
    { from: "front", to: "index", label: "commit, miss", labelAt: 0.35, step: 5 },

    { from: "front", to: "uploads", label: "parts", via: [[297, 630]], step: 6 },
    {
      from: "uploads",
      to: "index",
      label: "complete",
      via: [
        [730, 630],
        [730, 125],
      ],
      labelAt: 0.4,
      step: 6,
    },

    { from: "scrubber", to: "storage", label: "verify", dashed: true, step: 7 },
    { from: "repair", to: "storage", label: "rebuild", step: 7 },
    { from: "scrubber", to: "repair", label: "bad shard", labelAt: 0.25, step: 7 },

    { from: "storage", to: "cold", label: "transition", dashed: true, step: 8 },
    { from: "lifecycle", to: "cold", label: "move, expire", step: 8 },
  ],
};

export default spec;
