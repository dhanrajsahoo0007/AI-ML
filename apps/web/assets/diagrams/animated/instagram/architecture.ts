import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// A photo-sharing feed, built one requirement at a time (instagram case study, the hero).
// Eight steps: 1 upload: the post service stores the photo in the blob store and a metadata row in the posts DB
// (the photo through the app server is replaced in step 2) · 2 the app sends the photo with a signed URL through the
// CDN edge to the blob store; resize workers (fed by a queue) write four sizes; the CDN serves images and fetches from
// the blob store on a miss · 3 ids that sort by time and carry the shard: the posts DB makes the id on insert
// (replaces the step-1 insert) · 4 the follow graph: graph service and two edge tables · 5 fan-out on write: the post
// log feeds fan-out workers, which read followers and append post ids to each follower's list in the feed cache; the
// feed service (accent) reads ids and hydrates posts from the post cache, filled from the posts DB on a miss ·
// 6 celebrities: accounts over 100,000 followers skip the push; the feed service reads their recent posts and merges
// them at read time · 7 likes: the like service writes the like row and adds batched counts (+n) in the posts DB ·
// 8 ranking and cursors: the ranker scores candidates; the feed is paged with a cursor.
// Working (round numbers chosen to size the system): 100,000,000 photos a day ÷ 86,400 s ≈ 1,160/s; 500,000,000
// daily users × 10 feed opens ÷ 86,400 s ≈ 58,000 feed reads/s, about 50 × the posts; 100,000,000 posts × 200
// followers ÷ 86,400 s ≈ 231,000 feed appends/s.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts. Clients: the app (y 370). Edge column x 297: load
// balancer 370, CDN 640. Core: feed service (accent) 575, 120; ranker 600, 225. Services x 575: post 380, like 460,
// graph 540, resize workers 620. Async x 879: post log 225, fan-out workers 315 (h 46). Storage x 1098 (glyphs): post
// cache 105, feed cache 215, posts DB 335, follow graph 460, blob store 590. Lanes: CDN to blob store under the zones
// (y 708) and up the storage zone's right margin (x 1165); posts DB to post cache up the same margin; the feed read
// bends at (1001, 150) in the gap before storage. Every long edge was checked against the boxes it passes.
// Colours: zone tones only; the feed service is the one accent.

const spec: DiagramSpec = {
  title: "Photo-sharing feed high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "Upload a photo and a row", covers: "F1, F5" },
    { title: "Direct upload, sizes, a CDN", covers: "F1, N4" },
    { title: "Ids with time and shard", covers: "F1, F5" },
    { title: "The follow graph", covers: "F2" },
    { title: "Fan-out on write", covers: "F3, N1" },
    { title: "Celebrities: merge on read", covers: "F3, N2" },
    { title: "Likes and counts", covers: "F4" },
    { title: "Ranking and cursors", covers: "F3" },
  ],
  zones: zoneFrame({ core: "Feed core" }),
  nodes: [
    { id: "app", label: "App", sub: "phone, web", icon: "phone", fill: "pastel", x: 105, y: 370, w: 140 },
    {
      id: "lb",
      label: "Load balancer",
      sub: "L7, TLS, auth",
      icon: "load-balancer",
      tone: "blue",
      fill: "pastel",
      x: 297,
      y: 370,
      w: 160,
    },
    {
      id: "cdn",
      label: "CDN",
      sub: "uploads, images",
      icon: "cdn",
      tone: "blue",
      fill: "pastel",
      step: 2,
      x: 297,
      y: 640,
      w: 160,
    },
    {
      id: "feed",
      label: "Feed service",
      sub: "merge, hydrate, page",
      icon: "feed",
      tone: "green",
      accent: true,
      step: 5,
      x: 575,
      y: 120,
      w: 220,
    },
    {
      id: "ranker",
      label: "Ranker",
      sub: "score candidates",
      icon: "chart",
      tone: "green",
      fill: "pastel",
      step: 8,
      x: 600,
      y: 225,
      w: 180,
    },
    {
      id: "post",
      label: "Post service",
      sub: "create, profile grid",
      icon: "image",
      tone: "teal",
      fill: "pastel",
      x: 575,
      y: 380,
      w: 200,
    },
    {
      id: "like",
      label: "Like service",
      sub: "likes, comments",
      icon: "bell",
      tone: "teal",
      fill: "pastel",
      step: 7,
      x: 575,
      y: 460,
      w: 200,
    },
    {
      id: "graph",
      label: "Graph service",
      sub: "follow, unfollow",
      icon: "users",
      tone: "teal",
      fill: "pastel",
      step: 4,
      x: 575,
      y: 540,
      w: 200,
    },
    {
      id: "resizer",
      label: "Resize workers",
      sub: "queue, 4 sizes",
      icon: "workers",
      tone: "teal",
      fill: "pastel",
      step: 2,
      x: 575,
      y: 620,
      w: 200,
    },
    {
      id: "fanout",
      label: "Fan-out workers",
      sub: "push ids to feeds",
      icon: "workers",
      tone: "orange",
      fill: "pastel",
      step: 5,
      x: 879,
      y: 315,
      w: 180,
      h: 46,
    },
    {
      id: "log",
      label: "Post log",
      sub: "events by author",
      icon: "topic",
      tone: "orange",
      fill: "pastel",
      step: 5,
      x: 879,
      y: 225,
      w: 180,
      h: 46,
    },
    {
      id: "postcache",
      label: "Post cache",
      sub: "posts, counts",
      icon: "cache",
      tone: "violet",
      variant: "glyph",
      step: 5,
      x: 1098,
      y: 105,
    },
    {
      id: "feedcache",
      label: "Feed cache",
      sub: "500 ids a user",
      icon: "cache",
      tone: "violet",
      variant: "glyph",
      step: 5,
      x: 1098,
      y: 215,
    },
    {
      id: "postsdb",
      label: "Posts DB",
      sub: "sharded by author",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 335,
    },
    {
      id: "graphdb",
      label: "Follow graph",
      sub: "two edge tables",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 4,
      x: 1098,
      y: 460,
    },
    {
      id: "blob",
      label: "Blob store",
      sub: "originals, sizes",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 590,
    },
  ],
  edges: [
    // Step 1: everything through the post service.
    { from: "app", to: "lb", flow: true, packet: true },
    { from: "lb", to: "post", label: "create post", flow: true, packet: true, delay: 0.4 },
    { from: "post", to: "postsdb", label: "insert row", flow: true, packet: true, delay: 0.8, until: 2 },
    { from: "post", to: "blob", label: "photo via server", dashed: true, until: 1 },

    // Step 2: the photo goes in through the CDN edge with a signed URL; resize off the request path.
    { from: "app", to: "cdn", label: "PUT photo, GET image", flow: true, packet: true, step: 2 },
    {
      from: "cdn",
      to: "blob",
      label: "upload; fetch on a miss",
      flow: true,
      packet: true,
      delay: 0.4,
      step: 2,
      via: [
        [297, 708],
        [1165, 708],
        [1165, 590],
      ],
      labelAt: 0.45,
    },
    { from: "blob", to: "resizer", label: "original in, 4 sizes out", bidirectional: true, step: 2 },

    // Step 3: the database makes the id on insert.
    {
      from: "post",
      to: "postsdb",
      label: "INSERT, id from DB",
      flow: true,
      packet: true,
      delay: 0.8,
      step: 3,
      labelAt: 0.4,
    },

    // Step 4: follow graph.
    { from: "lb", to: "graph", label: "follow", step: 4 },
    { from: "graph", to: "graphdb", label: "2 edge rows", step: 4 },

    // Step 5: fan-out on write and the feed read.
    { from: "post", to: "log", label: "published", step: 5 },
    { from: "log", to: "fanout", step: 5 },
    { from: "fanout", to: "graphdb", label: "followers", dashed: true, step: 5, labelAt: 0.35 },
    { from: "fanout", to: "feedcache", label: "append id", step: 5, until: 5 },
    { from: "lb", to: "feed", label: "home feed", flow: true, packet: true, step: 5, until: 7 },
    {
      from: "feed",
      to: "feedcache",
      label: "read ids",
      flow: true,
      packet: true,
      delay: 0.4,
      step: 5,
      via: [[1001, 150]],
      labelAt: 0.4,
    },
    { from: "feed", to: "postcache", label: "hydrate", dashed: true, step: 5, until: 5 },
    {
      from: "postsdb",
      to: "postcache",
      label: "on a miss",
      dashed: true,
      step: 5,
      via: [
        [1165, 335],
        [1165, 105],
      ],
    },

    // Step 6: celebrities merged at read time.
    { from: "fanout", to: "feedcache", label: "if < 100k", step: 6 },
    { from: "feed", to: "postcache", label: "hydrate, big authors", dashed: true, step: 6 },

    // Step 7: likes, with counts batched into the posts DB.
    { from: "lb", to: "like", label: "like", step: 7 },
    { from: "like", to: "postsdb", label: "like row, +n", step: 7 },

    // Step 8: ranking and cursors.
    { from: "lb", to: "feed", label: "feed, cursor", flow: true, packet: true, step: 8 },
    { from: "feed", to: "ranker", label: "score", step: 8 },
  ],
};

export default spec;
