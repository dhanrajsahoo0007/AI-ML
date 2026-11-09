import type { DiagramSpec } from "@/components/diagrams/types";

// Where the bakery's polls land at dinner peak: 20,000 open order pages, one poll every 5 s each, so about
// 4,000 requests a second, of which only about 22 a second carry news.
//
// Step 1: every poll goes through the load balancer to a stateless API server, which reads the orders database.
// Step 2: a small status cache (order id -> status + ETag) answers almost every poll; the database is read only
// on a miss. The direct API -> database read is replaced (until: 1).
// Step 3: kitchen tablets send the rare status change. The API writes it to the database (and overwrites the
// cache entry, described in the text), so the next poll returns 200 with the new version.
//
// Layout (centres): pages (110,130), kitchen (110,270), lb (300,130), api (490,130), cache (730,110),
// db (730,260). Zones: clients 20-200, edge 220-380, application 400-580, storage 600-860.
const spec: DiagramSpec = {
  title: "Short polling at dinner peak",
  width: 880,
  height: 350,
  steps: [
    { title: "Every open page polls the API every 5 s" },
    { title: "A status cache answers the empty polls" },
    { title: "Kitchen updates change the answer" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 40, w: 180, h: 290 },
    { id: "edge", title: "Edge", tone: "blue", x: 220, y: 40, w: 160, h: 290 },
    { id: "app", title: "Application", tone: "teal", x: 400, y: 40, w: 180, h: 290 },
    { id: "storage", title: "Storage", tone: "violet", x: 600, y: 40, w: 260, h: 290 },
  ],
  nodes: [
    { id: "pages", label: "Order pages", sub: "20k open, every 5 s", icon: "browser", x: 110, y: 130, w: 150, h: 64 },
    {
      id: "lb",
      label: "Load balancer",
      sub: "4,000 req/s",
      icon: "load-balancer",
      tone: "blue",
      x: 300,
      y: 130,
      w: 140,
      h: 64,
    },
    {
      id: "api",
      label: "API servers",
      sub: "stateless",
      icon: "server",
      tone: "teal",
      accent: true,
      x: 490,
      y: 130,
      w: 150,
      h: 64,
    },
    {
      id: "cache",
      label: "Status cache",
      sub: "status + ETag",
      icon: "cache",
      tone: "orange",
      x: 730,
      y: 110,
      w: 150,
      h: 64,
      step: 2,
    },
    {
      id: "db",
      label: "Orders DB",
      sub: "source of truth",
      icon: "database",
      tone: "violet",
      x: 730,
      y: 260,
      w: 150,
      h: 64,
    },
    {
      id: "kitchen",
      label: "Kitchen tablets",
      sub: "~22 changes/s",
      icon: "phone",
      tone: "orange",
      x: 110,
      y: 270,
      w: 150,
      h: 64,
      step: 3,
    },
  ],
  edges: [
    { from: "pages", to: "lb", label: "GET every 5 s", flow: true, packet: true },
    { from: "lb", to: "api", flow: true, packet: true, delay: 0.6 },
    { from: "api", to: "db", label: "SELECT per poll", flow: true, packet: true, delay: 1.2, until: 1 },
    { from: "api", to: "cache", label: "read", flow: true, packet: true, delay: 1.2, step: 2 },
    { from: "cache", to: "db", label: "miss", dashed: true, step: 2 },
    { from: "kitchen", to: "lb", label: "PATCH status", dashed: true, step: 3 },
    { from: "api", to: "db", label: "write change", dashed: true, step: 3 },
  ],
};

export default spec;
