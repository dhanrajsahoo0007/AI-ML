import type { DiagramSpec } from "@/components/diagrams/types";

// Where it breaks first: the exam-results site from the capacity-planning page, pushed toward its results-day peak
// of about 2,000 page views a second. Each step fixes the wall that load hits next, and a red card in the bottom
// strip records that wall, so the full view reads as a history of the bottleneck moving.
//   step 1  day-one setup: students -> load balancer (1 Gbit/s) -> 2 app servers -> database (max 100 connections)
//   step 2  wall 1, app CPU at about 1,600 views/s -> add app servers C and D (their direct DB edges turn red:
//           4 pools of 40 = 160 connections, over the database's limit of 100)
//   step 3  wall 2, database connections -> every app server talks to a connection pooler, which opens 40
//   step 4  wall 3, the 1 Gbit/s link at about 2,080 views/s -> static files move to a CDN, HTML is gzipped
// Edges with `until` are replaced by a later step (direct app -> database pools, the 60 KB user -> lb edge).
//
// Layout (centres): users (95,230); edge column x=265 (cdn y=110, lb y=230); app column x=465 at y=110/190/270/350
// (h 52, 28 px gaps); pooler (660,230); database glyph (830,230). Bottom strip cards at y=500, x=127/342/557/772.
const spec: DiagramSpec = {
  title: "Where it breaks first: an exam-results site on results day",
  width: 900,
  height: 560,
  steps: [
    { title: "Day-one setup and its ceilings", covers: "Peak 2,000 views/s" },
    { title: "Wall 1: app CPU, add two servers", covers: "CPU" },
    { title: "Wall 2: database connections, add a pooler", covers: "Connections" },
    { title: "Wall 3: the network link, add a CDN and gzip", covers: "Network" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 50, w: 150, h: 380 },
    { id: "edge", title: "Edge", tone: "blue", x: 185, y: 50, w: 170, h: 380 },
    { id: "app-tier", title: "App tier", tone: "green", x: 370, y: 50, w: 190, h: 380 },
    { id: "data", title: "Data", tone: "violet", x: 575, y: 50, w: 305, h: 380 },
    { id: "walls", title: "Walls hit, in order", tone: "red", x: 20, y: 448, w: 860, h: 100 },
  ],
  nodes: [
    // Step 1: the setup the team launched with.
    { id: "users", label: "Students", sub: "peak 2,000/s", icon: "users", x: 95, y: 230, w: 130, h: 58 },
    {
      id: "lb",
      label: "Load balancer",
      sub: "1 Gbit/s link",
      icon: "load-balancer",
      tone: "blue",
      x: 265,
      y: 230,
      w: 140,
      h: 58,
    },
    {
      id: "app-a",
      label: "App server A",
      sub: "8 cores, ~800/s",
      icon: "server",
      tone: "green",
      accent: true,
      x: 465,
      y: 190,
      w: 160,
      h: 52,
    },
    {
      id: "app-b",
      label: "App server B",
      sub: "8 cores, ~800/s",
      icon: "server",
      tone: "green",
      accent: true,
      x: 465,
      y: 270,
      w: 160,
      h: 52,
    },
    {
      id: "db",
      label: "Database",
      sub: "max 100 conns",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 830,
      y: 230,
    },
    {
      id: "target",
      label: "Peak 2,000 views/s",
      sub: "plan to stay under 70%",
      icon: "gauge",
      tone: "neutral",
      x: 127,
      y: 500,
      w: 190,
      h: 52,
    },

    // Step 2: CPU is the first wall; two more app servers.
    {
      id: "app-c",
      label: "App server C",
      sub: "8 cores, ~800/s",
      icon: "server",
      tone: "green",
      step: 2,
      x: 465,
      y: 110,
      w: 160,
      h: 52,
    },
    {
      id: "app-d",
      label: "App server D",
      sub: "8 cores, ~800/s",
      icon: "server",
      tone: "green",
      step: 2,
      x: 465,
      y: 350,
      w: 160,
      h: 52,
    },
    {
      id: "wall-cpu",
      label: "Wall 1: app CPU",
      sub: "hit at 1,600/s: 4 servers",
      icon: "cpu",
      tone: "red",
      step: 2,
      x: 342,
      y: 500,
      w: 190,
      h: 52,
    },

    // Step 3: 160 pooled connections against a limit of 100; a pooler in front of the database.
    {
      id: "pooler",
      label: "Conn pooler",
      sub: "160 in, 40 out",
      icon: "layers",
      tone: "teal",
      step: 3,
      x: 660,
      y: 230,
      w: 140,
      h: 58,
    },
    {
      id: "wall-conns",
      label: "Wall 2: DB connections",
      sub: "160 > 100 max: add pooler",
      icon: "database",
      tone: "red",
      step: 3,
      x: 557,
      y: 500,
      w: 190,
      h: 52,
    },

    // Step 4: the 1 Gbit/s link fills; static files go to a CDN and HTML is compressed.
    { id: "cdn", label: "CDN", sub: "static files", icon: "cdn", tone: "blue", step: 4, x: 265, y: 110, w: 140, h: 52 },
    {
      id: "wall-net",
      label: "Wall 3: network",
      sub: "2,080/s on 1 Gbit: CDN, gzip",
      icon: "network",
      tone: "red",
      step: 4,
      x: 772,
      y: 500,
      w: 190,
      h: 52,
    },
  ],
  edges: [
    // Step 1: the request path. 60 KB per page view crosses the load balancer until step 4.
    { from: "users", to: "lb", label: "60 KB a view", tone: "blue", flow: true, packet: true, delay: 0, until: 3 },
    { from: "lb", to: "app-a", tone: "blue", flow: true, packet: true, delay: 0.6 },
    { from: "lb", to: "app-b", tone: "blue", flow: true, packet: true, delay: 0.6 },
    { from: "app-a", to: "db", label: "pool of 40", tone: "violet", flow: true, packet: true, delay: 1.2, until: 2 },
    { from: "app-b", to: "db", label: "pool of 40", tone: "violet", flow: true, packet: true, delay: 1.2, until: 2 },

    // Step 2: the new servers' pools push the total to 160 connections; the database refuses the extra ones.
    { from: "lb", to: "app-c", tone: "blue", flow: true, packet: true, delay: 0.6 },
    { from: "lb", to: "app-d", tone: "blue", flow: true, packet: true, delay: 0.6 },
    { from: "app-c", to: "db", label: "refused", tone: "red", dashed: true, until: 2 },
    { from: "app-d", to: "db", label: "refused", tone: "red", dashed: true, until: 2 },

    // Step 3: every app server talks to the pooler; the pooler holds 40 real connections.
    { from: "app-a", to: "pooler", tone: "teal", flow: true, packet: true, delay: 1.2 },
    { from: "app-b", to: "pooler", tone: "teal", flow: true, packet: true, delay: 1.2 },
    { from: "app-c", to: "pooler", tone: "teal", flow: true, packet: true, delay: 1.2 },
    { from: "app-d", to: "pooler", tone: "teal", flow: true, packet: true, delay: 1.2 },
    { from: "pooler", to: "db", label: "40 conns", tone: "violet", flow: true, packet: true, delay: 1.8 },

    // Step 4: static files from the CDN, gzipped HTML through the load balancer.
    { from: "users", to: "cdn", label: "40 KB static", tone: "blue", flow: true, packet: true, delay: 0 },
    { from: "cdn", to: "lb", label: "miss", tone: "blue", dashed: true },
    { from: "users", to: "lb", label: "5 KB, gzip", tone: "blue", flow: true, packet: true, delay: 0, step: 4 },
  ],
};

export default spec;
