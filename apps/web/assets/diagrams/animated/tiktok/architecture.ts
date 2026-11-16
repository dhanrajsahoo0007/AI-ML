import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// A short-video For You feed that learns within minutes, built one requirement at a time (tiktok case study, the hero).
// Eight steps: 1 a feed of followed accounts, newest first: the feed service reads the video metadata DB; videos play
// from a CDN in front of the blob store · 2 candidate generation and ranking: a retrieval service gathers candidates,
// the ranker (accent) scores them · 3 features and embeddings: an ANN index of video embeddings, parameter servers
// with the embedding tables, a feature store · 4 the event pipeline: the app batches events to an event collector,
// which appends them to the event log; a joiner labels each served impression and updates real-time counters in the
// feature store · 5 online training: a trainer reads the joined examples and pushes changed sparse parameters to the
// serving parameter servers every minute · 6 upload and prefetch: the creator uploads through the gateway to the
// upload service, which stores renditions in the blob store; the app prefetches the next videos (the step-1 "play"
// edge is replaced) · 7 the seen filter: the ranker drops candidates the viewer has already seen (a Bloom filter per
// user) · 8 cold start: a content model embeds each new video from its frames, sound and text and inserts it into
// the ANN index, so retrieval can find it before anyone has watched it.
// Working (round numbers chosen to size the system): 100,000,000 daily viewers × 100 videos = 10,000,000,000 plays a
// day; ÷ 10 videos a page = 1,000,000,000 feed pages a day ÷ 86,400 s ≈ 11,600 pages/s, × 3 at the evening peak ≈
// 35,000 pages/s. Events: 5 per play = 50,000,000,000 a day ≈ 580,000/s, peak ≈ 1,700,000/s. Sparse sync every
// 60 s; dense weights daily.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts. Clients x 105: creator app 140, viewer app 330.
// Edge x 297: API gateway 250, event collector 445, CDN 640. Core: feed service (575, 100, w 230), retrieval
// (515, 235) and ranker (670, 235, accent, w 140). Services (titled "Serving", a short tab so the retrieval → ANN line
// clears it): ANN index (515, 390), parameter servers (670, 390, w 140), upload
// (480, 520), content model (665, 520). Async x 884, cards 160 × 46: trainer 335, joiner 400, event log 465.
// Storage x 1098 (glyphs): video metadata 95, feature store 210, seen filter 330, blob store 600.
// Lanes: gateway → upload runs down the edge/core gap at x 393; joiner → feature store and the collector line pass
// through the async/storage gap at x 1001 and between the two services rows at y 445. Every edge was checked
// against every box it passes (scratchpad cross.ts, from geometry.ts edgePoints).
// Colours: zone tones from ZONE; red is not used (nothing in this figure breaks).
// Fact check: none; no real-system facts are drawn.

const spec: DiagramSpec = {
  title: "Short-video feed high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "Followed accounts, newest first", covers: "F1" },
    { title: "Candidates, then a ranker", covers: "F1, N2" },
    { title: "Features and embeddings", covers: "F1, N2" },
    { title: "The event pipeline", covers: "F3" },
    { title: "Online training, minute sync", covers: "F4, N3" },
    { title: "Upload, and prefetch to play at once", covers: "F2, N1" },
    { title: "The seen filter", covers: "F1, N6" },
    { title: "Cold start for a new video", covers: "F5" },
  ],
  zones: zoneFrame({ core: "Feed and ranking", services: "Serving", async: "Learning loop" }),
  nodes: [
    {
      id: "creator",
      label: "Creator app",
      sub: "records, uploads",
      icon: "video",
      fill: "pastel",
      step: 6,
      x: 105,
      y: 140,
      w: 150,
    },
    { id: "viewer", label: "Viewer app", sub: "swipes, plays", icon: "phone", fill: "pastel", x: 105, y: 330, w: 140 },
    {
      id: "gw",
      label: "API gateway",
      sub: "auth, L7 routing",
      icon: "gateway",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 250,
      w: 150,
    },
    {
      id: "collector",
      label: "Event collector",
      sub: "batched events",
      icon: "api",
      tone: "blue",
      fill: "pastel",
      step: 4,
      x: 297,
      y: 445,
      w: 160,
    },
    {
      id: "cdn",
      label: "CDN",
      sub: "video segments",
      icon: "cdn",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 640,
      w: 150,
    },
    {
      id: "feed",
      label: "Feed service",
      sub: "page of 10, cursor",
      icon: "feed",
      tone: "green",
      fill: "pastel",
      x: 575,
      y: 100,
      w: 230,
    },
    {
      id: "retrieval",
      label: "Retrieval",
      sub: "many sources",
      icon: "search",
      tone: "green",
      fill: "pastel",
      step: 2,
      x: 515,
      y: 235,
      w: 150,
    },
    {
      id: "ranker",
      label: "Ranker",
      sub: "two stages",
      icon: "gpu",
      tone: "green",
      accent: true,
      step: 2,
      x: 670,
      y: 235,
      w: 140,
    },
    {
      id: "ann",
      label: "ANN index",
      sub: "video embeddings",
      icon: "hash",
      tone: "teal",
      fill: "pastel",
      step: 3,
      x: 515,
      y: 390,
      w: 150,
    },
    {
      id: "params",
      label: "Param servers",
      sub: "embeddings",
      icon: "server",
      tone: "teal",
      fill: "pastel",
      step: 3,
      x: 670,
      y: 390,
      w: 140,
    },
    {
      id: "upload",
      label: "Upload",
      sub: "store, transcode",
      icon: "file",
      tone: "teal",
      fill: "pastel",
      step: 6,
      x: 480,
      y: 520,
      w: 140,
    },
    {
      id: "content",
      label: "Content model",
      sub: "embed new videos",
      icon: "robot",
      tone: "teal",
      fill: "pastel",
      step: 8,
      x: 665,
      y: 520,
      w: 150,
    },
    {
      id: "trainer",
      label: "Trainer",
      sub: "online, per minute",
      icon: "cpu",
      tone: "orange",
      fill: "pastel",
      step: 5,
      x: 884,
      y: 335,
      w: 160,
      h: 46,
    },
    {
      id: "joiner",
      label: "Joiner",
      sub: "label by request id",
      icon: "workers",
      tone: "orange",
      fill: "pastel",
      step: 4,
      x: 884,
      y: 400,
      w: 160,
      h: 46,
    },
    {
      id: "log",
      label: "Event log",
      sub: "actions, features",
      icon: "log",
      tone: "orange",
      fill: "pastel",
      step: 4,
      x: 884,
      y: 465,
      w: 160,
      h: 46,
    },
    {
      id: "metadata",
      label: "Video metadata",
      sub: "videos, follows",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 95,
    },
    {
      id: "features",
      label: "Feature store",
      sub: "user, video, counts",
      icon: "cache",
      tone: "violet",
      variant: "glyph",
      step: 3,
      x: 1098,
      y: 210,
    },
    {
      id: "seen",
      label: "Seen filter",
      sub: "Bloom per viewer",
      icon: "hash",
      tone: "violet",
      variant: "glyph",
      step: 7,
      x: 1098,
      y: 330,
    },
    {
      id: "blob",
      label: "Blob store",
      sub: "renditions",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 600,
    },
  ],
  edges: [
    { from: "viewer", to: "gw", flow: true, packet: true },
    { from: "gw", to: "feed", label: "GET /feed", flow: true, packet: true, delay: 0.4 },
    { from: "feed", to: "metadata", label: "followed, newest", flow: true, packet: true, delay: 0.8, until: 1 },
    { from: "viewer", to: "cdn", label: "play", dashed: true, until: 5 },
    { from: "cdn", to: "blob", label: "origin pull", dashed: true },

    { from: "feed", to: "retrieval", label: "find", flow: true, packet: true, delay: 0.8, step: 2 },
    { from: "feed", to: "ranker", label: "score", flow: true, packet: true, delay: 1.2, step: 2 },
    { from: "feed", to: "metadata", label: "hydrate 10", dashed: true, step: 2 },

    { from: "retrieval", to: "ann", label: "nearest", dashed: true, labelAt: 0.3, step: 3 },
    { from: "ranker", to: "params", label: "vectors", dashed: true, labelAt: 0.3, step: 3 },
    { from: "ranker", to: "features", label: "features", dashed: true, step: 3 },

    { from: "viewer", to: "collector", label: "events", flow: true, packet: true, step: 4 },
    {
      from: "collector",
      to: "log",
      label: "key = viewer",
      labelAt: 0.82,
      flow: true,
      packet: true,
      delay: 0.4,
      step: 4,
    },
    { from: "log", to: "joiner", step: 4 },
    {
      from: "joiner",
      to: "features",
      label: "counts",
      labelAt: 0.25,
      dashed: true,
      step: 4,
      via: [
        [1001, 400],
        [1001, 250],
      ],
    },

    { from: "joiner", to: "trainer", step: 5 },
    { from: "trainer", to: "params", label: "sync", flow: true, packet: true, step: 5 },

    { from: "creator", to: "gw", label: "upload", step: 6 },
    {
      from: "gw",
      to: "upload",
      step: 6,
      via: [
        [393, 250],
        [393, 520],
      ],
    },
    {
      from: "upload",
      to: "blob",
      label: "renditions",
      step: 6,
      via: [[480, 585]],
    },
    { from: "viewer", to: "cdn", label: "play + prefetch 2", flow: true, packet: true, step: 6 },

    { from: "ranker", to: "seen", label: "drop seen", dashed: true, step: 7 },

    { from: "upload", to: "content", step: 8 },
    { from: "content", to: "ann", label: "insert", flow: true, packet: true, step: 8 },
  ],
};

export default spec;
