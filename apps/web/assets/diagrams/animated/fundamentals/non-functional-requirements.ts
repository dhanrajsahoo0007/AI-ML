import type { DiagramSpec } from "@/components/diagrams/types";

// One notes app, the same two functions (save a note, open my notes), under three non-functional targets.
// Every node keeps its position; each step adds only the boxes the tighter target forces:
//   step 1  Target A (200 users, p99 1 s, 99%, nightly backup)            -> one app process, one database
//   step 2  Target B (50,000 users, p99 300 ms, 99.9%, no lost note)       -> + load balancer, cache, sync replica
//   step 3  Target C (50M users, p99 150 ms worldwide, 99.99%, region loss) -> + CDN, async replica in region B,
//                                                                              object store for attachments
// The step-1 edge user -> app is a shortcut that the load balancer replaces in step 2 (`until: 1`).
// Layout: app (505,280) spans x 420-590; the storage column sits at x=760 (cache, primary, sync replica) and
// x=910 (region B replica, object store), so app -> db has 128 px for its label. Hot reads leave the app's top
// and run along y=120; attachments leave its bottom and run along y=590, clear of every store.
const spec: DiagramSpec = {
  title: "One notes app under three non-functional targets",
  width: 1000,
  height: 640,
  steps: [
    { title: "Target A: a class project", covers: "p99 1 s, 99%, nightly backup" },
    { title: "Target B: a company tool", covers: "p99 300 ms, 99.9%, no lost note" },
    { title: "Target C: a consumer app", covers: "p99 150 ms worldwide, 99.99%, survives a region loss" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 60, w: 160, h: 550 },
    { id: "edge", title: "Edge", tone: "blue", x: 200, y: 60, w: 180, h: 550 },
    { id: "app-zone", title: "Request path", tone: "green", x: 400, y: 60, w: 210, h: 550 },
    { id: "storage", title: "Storage", tone: "violet", x: 640, y: 60, w: 340, h: 550 },
  ],
  nodes: [
    // Step 1: the smallest thing that saves and shows a note.
    { id: "user", label: "Users", sub: "web + mobile", icon: "phone", x: 100, y: 280, w: 140, h: 64 },
    {
      id: "app",
      label: "App tier",
      sub: "stateless web app",
      icon: "server",
      tone: "green",
      accent: true,
      x: 505,
      y: 280,
      w: 170,
      h: 64,
    },
    {
      id: "db",
      label: "Primary DB",
      sub: "all writes",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 760,
      y: 280,
    },

    // Step 2: 99.9% and "no lost note" add a second app box behind a balancer, a cache and a synchronous copy.
    {
      id: "lb",
      label: "Load balancer",
      sub: "health checks",
      icon: "load-balancer",
      tone: "blue",
      step: 2,
      x: 290,
      y: 280,
      w: 160,
      h: 64,
    },
    {
      id: "cache",
      label: "Cache",
      sub: "hot notes, TTL",
      icon: "cache",
      tone: "orange",
      variant: "glyph",
      step: 2,
      x: 760,
      y: 120,
    },
    {
      id: "replica",
      label: "Sync replica",
      sub: "same region",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 2,
      x: 760,
      y: 450,
    },

    // Step 3: 150 ms worldwide and "survives a region loss" add an edge cache, a second region and an object store.
    {
      id: "cdn",
      label: "CDN",
      sub: "static files",
      icon: "cdn",
      tone: "blue",
      step: 3,
      x: 290,
      y: 120,
      w: 160,
      h: 64,
    },
    {
      id: "region2",
      label: "Region B replica",
      sub: "async copy",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 3,
      x: 910,
      y: 280,
    },
    {
      id: "blob",
      label: "Object store",
      sub: "attachments, 3 AZs",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      step: 3,
      x: 910,
      y: 450,
    },
  ],
  edges: [
    // Step 1: browser straight to the one app process, app to the one database.
    { from: "user", to: "app", label: "HTTPS", tone: "blue", flow: true, packet: true, delay: 0, until: 1 },
    { from: "app", to: "db", label: "read / write", tone: "violet", flow: true, packet: true, delay: 1.2 },

    // Step 2: the balancer takes over the front door; reads try the cache; every write is copied before "saved".
    { from: "user", to: "lb", tone: "blue", flow: true, packet: true, delay: 0, step: 2 },
    { from: "lb", to: "app", tone: "blue", flow: true, packet: true, delay: 0.6, step: 2 },
    {
      from: "app",
      to: "cache",
      label: "hot reads",
      tone: "orange",
      dashed: true,
      via: [[505, 120]],
      labelAt: 0.68,
    },
    { from: "db", to: "replica", label: "sync copy", tone: "violet", flow: true, packet: true, delay: 1.8 },

    // Step 3: static files from the edge, an async copy in a second region, attachments in an object store.
    {
      from: "user",
      to: "cdn",
      label: "static files",
      tone: "blue",
      dashed: true,
      via: [[100, 120]],
      labelAt: 0.3,
    },
    { from: "db", to: "region2", label: "async", tone: "violet", dashed: true, flow: true },
    {
      from: "app",
      to: "blob",
      label: "attachments",
      tone: "violet",
      dashed: true,
      via: [
        [505, 590],
        [910, 590],
      ],
      labelAt: 0.63,
    },
  ],
};

export default spec;
