import type { DiagramSpec } from "@/components/diagrams/types";

// Scaling a web app from one server to millions of users, one component per build step:
// 1 one box -> 2 load balancer (database on its own machine) -> 3 stateless app copies -> 4 cache ->
// 5 read replicas -> 6 CDN -> 7 queue and workers.
//
// app1 sits on the main row (y = 250) with the users and the load balancer, so it is the one server that
// exists from step 1 and the one whose arrows stand for every copy. app2 and app3 join above and below it.
//
// Layout check (canvas 940 x 580):
//   zones  clients 20-170, edge 190-350, application 370-620 (all y 50-560),
//          storage 640-920 (y 50-390), background work 640-920 (y 410-560)
//   nodes  users 30-160 x 218-282; cdn glyph 232-308 x 93-182; lb 200-340 x 218-282
//          app2 / app1 / app3 415-575 x 118-182 / 218-282 / 318-382 (36 apart)
//          cache glyph 662-738 x 93-182; db glyph 662-738 x 273-362; replicas glyph 812-888 x 273-362
//          queue glyph 662-738 x 453-542; workers 790-910 x 456-514
//   trunks lb to apps at x = 370 (lb ends 340, apps start 415); app to stores at x = 600 (apps end 575,
//          stores start 662). The "reads" edge runs along y = 250, between the cache label (ends 182) and the
//          top of the database glyph (273). The workers' write-back runs along y = 400, in the 20 px gap between
//          the storage and background zones.
const spec: DiagramSpec = {
  title: "From one server to millions of users",
  width: 940,
  height: 580,
  steps: [
    { title: "One server does everything" },
    { title: "A load balancer in front, the database on its own machine" },
    { title: "Many identical, stateless app servers" },
    { title: "A cache for hot reads" },
    { title: "Read replicas take the remaining reads" },
    { title: "A CDN serves static files near the user" },
    { title: "A queue moves slow work off the request" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 50, w: 150, h: 510 },
    { id: "edge", title: "Edge", tone: "blue", x: 190, y: 50, w: 160, h: 510 },
    { id: "application", title: "Application", tone: "green", x: 370, y: 50, w: 250, h: 510 },
    { id: "storage", title: "Storage", tone: "violet", x: 640, y: 50, w: 280, h: 340 },
    { id: "async", title: "Background work", tone: "orange", x: 640, y: 410, w: 280, h: 150 },
  ],
  nodes: [
    { id: "users", label: "Users", sub: "browser / phone", icon: "users", x: 95, y: 250, w: 130, h: 64 },
    {
      id: "app1",
      label: "App server",
      sub: "runs your code",
      icon: "server",
      tone: "green",
      accent: true,
      x: 495,
      y: 250,
      w: 160,
      h: 64,
    },
    {
      id: "db",
      label: "Database",
      sub: "primary",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 700,
      y: 300,
    },

    {
      id: "lb",
      label: "Load balancer",
      sub: "health checks",
      icon: "load-balancer",
      tone: "blue",
      step: 2,
      x: 270,
      y: 250,
      w: 140,
      h: 64,
    },

    {
      id: "app2",
      label: "App server",
      sub: "same code, no state",
      icon: "server",
      tone: "green",
      step: 3,
      x: 495,
      y: 150,
      w: 160,
      h: 64,
    },
    {
      id: "app3",
      label: "App server",
      sub: "same code, no state",
      icon: "server",
      tone: "green",
      step: 3,
      x: 495,
      y: 350,
      w: 160,
      h: 64,
    },

    {
      id: "cache",
      label: "Cache",
      sub: "hot data in RAM",
      icon: "cache",
      tone: "orange",
      variant: "glyph",
      step: 4,
      x: 700,
      y: 120,
    },

    {
      id: "replicas",
      label: "Read replicas",
      sub: "copies for reads",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 5,
      x: 850,
      y: 300,
    },

    {
      id: "cdn",
      label: "CDN",
      sub: "static files",
      icon: "cdn",
      tone: "blue",
      variant: "glyph",
      step: 6,
      x: 270,
      y: 120,
    },

    {
      id: "queue",
      label: "Queue",
      sub: "jobs wait here",
      icon: "queue",
      tone: "orange",
      variant: "glyph",
      step: 7,
      x: 700,
      y: 480,
    },
    {
      id: "workers",
      label: "Workers",
      sub: "resize, notify",
      icon: "workers",
      tone: "orange",
      step: 7,
      x: 850,
      y: 485,
      w: 120,
      h: 58,
    },
  ],
  edges: [
    // Step 1: users reach the one server directly; code and database share its CPU and disk.
    { from: "users", to: "app1", label: "requests", tone: "green", flow: true, packet: true, delay: 0, until: 1 },
    {
      from: "app1",
      to: "db",
      label: "same machine",
      tone: "violet",
      flow: true,
      packet: true,
      delay: 1,
      via: [
        [600, 250],
        [600, 300],
      ],
      labelAt: 0.8,
      until: 1,
    },

    // Step 2: a load balancer becomes the one address users know; the database moves to its own machine.
    { from: "users", to: "lb", tone: "blue", flow: true, packet: true, delay: 0, step: 2 },
    { from: "lb", to: "app1", tone: "blue", flow: true, packet: true, delay: 0.5, step: 2 },
    {
      from: "app1",
      to: "db",
      label: "reads + writes",
      tone: "violet",
      flow: true,
      packet: true,
      delay: 1.2,
      via: [
        [600, 250],
        [600, 300],
      ],
      labelAt: 0.8,
      step: 2,
      until: 4,
    },

    // Step 3: the load balancer spreads requests over identical copies.
    {
      from: "lb",
      to: "app2",
      tone: "blue",
      flow: true,
      packet: true,
      delay: 0.5,
      via: [
        [370, 250],
        [370, 150],
      ],
    },
    {
      from: "lb",
      to: "app3",
      tone: "blue",
      flow: true,
      packet: true,
      delay: 0.5,
      via: [
        [370, 250],
        [370, 350],
      ],
    },

    // Step 4: the app checks the cache before the database.
    {
      from: "app1",
      to: "cache",
      label: "check first",
      tone: "orange",
      flow: true,
      packet: true,
      delay: 1,
      via: [
        [600, 250],
        [600, 120],
      ],
      labelAt: 0.75,
    },

    // Step 5: reads go to replicas, writes to the primary, which streams its changes to the replicas.
    {
      from: "app1",
      to: "replicas",
      label: "reads",
      tone: "violet",
      flow: true,
      packet: true,
      delay: 1.6,
      via: [[850, 250]],
      labelAt: 0.6,
    },
    {
      from: "app1",
      to: "db",
      label: "writes",
      tone: "violet",
      flow: true,
      packet: true,
      delay: 1.2,
      via: [
        [600, 250],
        [600, 300],
      ],
      labelAt: 0.8,
      step: 5,
    },
    { from: "db", to: "replicas", label: "copies", tone: "violet", dashed: true, flow: true },

    // Step 6: images, scripts and styles come from a nearby CDN edge; a miss goes back to the origin.
    {
      from: "users",
      to: "cdn",
      label: "images, scripts",
      tone: "blue",
      flow: true,
      packet: true,
      delay: 0,
      via: [[95, 120]],
      labelAt: 0.72,
    },
    { from: "cdn", to: "lb", label: "miss", tone: "blue", dashed: true },

    // Step 7: slow work becomes a job on a queue; workers pick it up and save the results.
    {
      from: "app1",
      to: "queue",
      label: "enqueue job",
      tone: "orange",
      flow: true,
      packet: true,
      delay: 1,
      via: [
        [600, 250],
        [600, 480],
      ],
      labelAt: 0.7,
    },
    { from: "queue", to: "workers", label: "pull", tone: "orange", flow: true, packet: true, delay: 1.8 },
    {
      from: "workers",
      to: "db",
      label: "save results",
      tone: "violet",
      dashed: true,
      via: [
        [850, 400],
        [700, 400],
      ],
      labelAt: 0.5,
    },
  ],
};

export default spec;
