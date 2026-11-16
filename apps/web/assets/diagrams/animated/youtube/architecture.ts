import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// A video-on-demand site, built one requirement at a time (youtube case study, the hero).
// Eight steps: 1 upload the whole file through the upload service and play the same file back (the upload and the
// playback edges are replaced later) · 2 a direct, resumable upload: the upload service signs a session and the
// creator sends chunks straight to the blob store · 3 a transcoding pipeline: the upload service starts a workflow,
// the workflow puts encode tasks on a queue, workers write renditions back to the blob store · 4 adaptive streaming:
// the watch service returns a manifest and the player fetches 4 s segments (the single file goes away) · 5 a CDN
// serves segments; the origin is read only on a miss · 6 metadata at scale: a cache in front of the sharded metadata
// database and a channel service · 7 view counts: the engagement service appends view and like events to a log, a
// stream aggregator writes totals to the cache every 10 s · 8 hot at the edge, cold at the origin: renditions of
// videos nobody watches age out to a cold tier.
// Working (round numbers chosen to size the system): 100 hours uploaded a minute = 6,000 video-minutes a minute;
// 5 renditions × 6,000 = 30,000 rendition-minutes to encode every minute. 1,000,000,000 views a day × 6 minutes =
// 100,000,000 hours watched a day; ÷ 24 = 4,170,000 viewers at once on average; × 2.5 Mb/s ≈ 10 Tb/s average egress.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts. Clients: viewer (105, 100), creator (105, 420). Edge
// column x 297: CDN 100, API gateway 380. Core: the transcode workflow (accent) at 575, 190. Services column x 575:
// upload 375, engagement 460, watch 545, channel 630. Async column x 879: encode queue 150, encode workers 245,
// view-event log 335, count aggregator 425. Storage column x 1098: blob store 100, cold tier 260, cache 440,
// metadata DB 590. Corridors: y 100 (viewer to CDN to blob store, above every core and async node), y 36 above the
// zones (the creator's direct upload), x 201 between the clients and edge zones. Every long edge was checked against
// the boxes it passes: upload to DB crosses x 879 at y 500, watch to cache at y 484, both under the aggregator.
// Colours: zone tones from the preset; the step-1 shortcuts are drawn red only where they break (none here).
// Fact check (2026-11-17): no real-system fact is drawn; real figures are under "How real systems do it".

const spec: DiagramSpec = {
  title: "Video platform high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "Upload a file, play the file", covers: "F1, F3" },
    { title: "Direct, resumable upload", covers: "F1, N3" },
    { title: "Transcode into renditions", covers: "F2, N4" },
    { title: "Adaptive streaming", covers: "F3, N1" },
    { title: "A CDN in front", covers: "F3, N2" },
    { title: "Metadata at scale", covers: "F4" },
    { title: "View counts and likes", covers: "F5, N7" },
    { title: "Hot at the edge, cold at the origin", covers: "N5" },
  ],
  zones: zoneFrame({ core: "Transcoding core" }),
  nodes: [
    { id: "viewer", label: "Viewer", sub: "player app", icon: "video", fill: "pastel", x: 105, y: 100, w: 140 },
    { id: "creator", label: "Creator", sub: "upload app", icon: "phone", fill: "pastel", x: 105, y: 420, w: 140 },
    {
      id: "cdn",
      label: "CDN",
      sub: "segments, hot first",
      icon: "cdn",
      tone: "blue",
      fill: "pastel",
      step: 5,
      x: 297,
      y: 100,
      w: 150,
    },
    {
      id: "gw",
      label: "API gateway",
      sub: "L7 LB, auth",
      icon: "gateway",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 380,
      w: 150,
    },
    {
      id: "workflow",
      label: "Transcode workflow",
      sub: "split, encode, package",
      icon: "workflow",
      tone: "green",
      accent: true,
      step: 3,
      x: 575,
      y: 190,
      w: 230,
    },
    {
      id: "upload",
      label: "Upload service",
      sub: "sessions, video rows",
      icon: "file",
      tone: "teal",
      fill: "pastel",
      x: 575,
      y: 375,
      w: 200,
    },
    {
      id: "engage",
      label: "Engagement",
      sub: "views, likes",
      icon: "heart",
      tone: "teal",
      fill: "pastel",
      step: 7,
      x: 575,
      y: 460,
      w: 200,
    },
    {
      id: "watch",
      label: "Watch service",
      sub: "page, manifest",
      icon: "eye",
      tone: "teal",
      fill: "pastel",
      x: 575,
      y: 545,
      w: 200,
    },
    {
      id: "channel",
      label: "Channel service",
      sub: "channel pages",
      icon: "users",
      tone: "teal",
      fill: "pastel",
      step: 6,
      x: 575,
      y: 630,
      w: 200,
    },
    {
      id: "queue",
      label: "Encode queue",
      sub: "one task per chunk",
      icon: "queue",
      tone: "orange",
      fill: "pastel",
      step: 3,
      x: 879,
      y: 150,
      w: 190,
    },
    {
      id: "workers",
      label: "Encode workers",
      sub: "idempotent tasks",
      icon: "workers",
      tone: "orange",
      fill: "pastel",
      step: 3,
      x: 879,
      y: 245,
      w: 190,
    },
    {
      id: "viewlog",
      label: "View-event log",
      sub: "keyed by video",
      icon: "topic",
      tone: "orange",
      fill: "pastel",
      step: 7,
      x: 879,
      y: 335,
      w: 190,
    },
    {
      id: "agg",
      label: "Count aggregator",
      sub: "dedup, 10 s windows",
      icon: "bar-chart",
      tone: "orange",
      fill: "pastel",
      step: 7,
      x: 879,
      y: 425,
      w: 190,
    },
    {
      id: "blob",
      label: "Blob store",
      sub: "originals, segments",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 100,
    },
    {
      id: "cold",
      label: "Cold tier",
      sub: "rarely watched",
      icon: "disk",
      tone: "violet",
      variant: "glyph",
      step: 8,
      x: 1098,
      y: 260,
    },
    {
      id: "cache",
      label: "Cache",
      sub: "metadata, counts",
      icon: "cache",
      tone: "violet",
      variant: "glyph",
      step: 6,
      x: 1098,
      y: 440,
    },
    {
      id: "db",
      label: "Metadata DB",
      sub: "MySQL, sharded",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 590,
    },
  ],
  edges: [
    // Step 1: everything through one service and one file.
    { from: "creator", to: "gw", flow: true, packet: true },
    { from: "gw", to: "upload", label: "whole file", flow: true, packet: true, delay: 0.4, until: 1 },
    { from: "upload", to: "blob", label: "store file", flow: true, packet: true, delay: 0.8, until: 1 },
    { from: "upload", to: "db", label: "video row", labelAt: 0.82, dashed: true },
    { from: "viewer", to: "gw", label: "watch page", dashed: true },
    { from: "gw", to: "watch", label: "page, manifest", dashed: true },
    { from: "watch", to: "db", label: "video row", dashed: true, until: 5 },
    { from: "viewer", to: "blob", label: "one MP4 file", flow: true, packet: true, until: 3 },

    // Step 2: direct, resumable upload.
    { from: "gw", to: "upload", label: "session", step: 2 },
    {
      from: "creator",
      to: "blob",
      label: "resumable chunks",
      flow: true,
      packet: true,
      step: 2,
      via: [
        [201, 420],
        [201, 36],
        [1098, 36],
      ],
    },

    // Step 3: the transcoding pipeline.
    { from: "upload", to: "workflow", label: "uploaded", step: 3 },
    { from: "workflow", to: "queue", label: "encode tasks", flow: true, packet: true, step: 3 },
    { from: "queue", to: "workers", label: "pull", step: 3 },
    { from: "workers", to: "blob", label: "renditions", labelAt: 0.72, flow: true, packet: true, delay: 0.4, step: 3 },

    // Step 4: adaptive streaming replaces the single file.
    { from: "viewer", to: "blob", label: "4 s segments", flow: true, packet: true, step: 4, until: 4 },

    // Step 5: the CDN.
    { from: "viewer", to: "cdn", flow: true, packet: true, step: 5 },
    { from: "cdn", to: "blob", label: "on a miss", dashed: true, step: 5 },

    // Step 6: metadata at scale.
    { from: "watch", to: "cache", label: "metadata, counts", labelAt: 0.62, step: 6 },
    { from: "gw", to: "channel", label: "channel page", dashed: true, step: 6 },
    { from: "channel", to: "db", label: "by channel shard", dashed: true, step: 6 },

    // Step 7: counting views.
    { from: "gw", to: "engage", label: "view, like", flow: true, packet: true, step: 7 },
    { from: "engage", to: "viewlog", label: "events", flow: true, packet: true, delay: 0.4, step: 7 },
    { from: "viewlog", to: "agg", label: "", step: 7 },
    { from: "agg", to: "cache", label: "totals / 10 s", step: 7 },

    // Step 8: cold renditions leave the hot store.
    { from: "blob", to: "cold", label: "age out", dashed: true, step: 8 },
  ],
};

export default spec;
