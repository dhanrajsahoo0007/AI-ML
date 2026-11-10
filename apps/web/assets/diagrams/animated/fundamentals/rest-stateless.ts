import type { DiagramSpec } from "@/components/diagrams/types";

// Why REST requests are stateless, and what that buys.
// Step 1: every request carries its own context (a token, the resource id), so the load balancer can send it to
//         any of three API servers; none of them keeps a session in memory. Shared state lives in the database.
// Step 2: because GET responses say how long they stay fresh, a CDN in front of the API answers repeat reads of
//         /clinics itself; only misses (and every write) travel on to the load balancer.
//
// Layout (centres): app x 90; edge column x 275 (cdn y 90, lb y 190); servers x 485 on y 90 / 190 / 290;
// database glyph x 690.
const spec: DiagramSpec = {
  title: "Stateless requests behind a load balancer and a CDN",
  width: 800,
  height: 360,
  steps: [{ title: "Every request carries its own context" }, { title: "Shared caches answer repeat GETs" }],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 40, w: 140, h: 300 },
    { id: "edge", title: "Edge", tone: "blue", x: 180, y: 40, w: 190, h: 300 },
    { id: "servers", title: "API servers", tone: "green", x: 390, y: 40, w: 190, h: 300 },
    { id: "storage", title: "Storage", tone: "violet", x: 600, y: 40, w: 180, h: 300 },
  ],
  nodes: [
    { id: "app", label: "Owner app", sub: "sends token", icon: "phone", x: 90, y: 190, w: 116, h: 58 },
    { id: "cdn", label: "CDN", sub: "caches GETs", icon: "cdn", tone: "blue", x: 275, y: 90, w: 140, h: 58, step: 2 },
    {
      id: "lb",
      label: "Load balancer",
      sub: "any server",
      icon: "load-balancer",
      tone: "blue",
      x: 275,
      y: 190,
      w: 150,
      h: 58,
    },
    { id: "api1", label: "Server A", sub: "no session", icon: "server", tone: "green", x: 485, y: 90, w: 140, h: 58 },
    {
      id: "api2",
      label: "Server B",
      sub: "no session",
      icon: "server",
      tone: "green",
      accent: true,
      x: 485,
      y: 190,
      w: 140,
      h: 58,
    },
    { id: "api3", label: "Server C", sub: "no session", icon: "server", tone: "green", x: 485, y: 290, w: 140, h: 58 },
    {
      id: "db",
      label: "Database",
      sub: "shared state",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 690,
      y: 170,
    },
  ],
  edges: [
    // Step 1: no CDN yet; the app talks to the load balancer.
    { from: "app", to: "lb", label: "token", flow: true, packet: true, until: 1 },
    { from: "lb", to: "api1", dashed: true },
    { from: "lb", to: "api2", flow: true, packet: true, delay: 0.6 },
    { from: "lb", to: "api3", dashed: true },
    { from: "api1", to: "db", dashed: true },
    { from: "api2", to: "db", flow: true, packet: true, delay: 1.2 },
    { from: "api3", to: "db", dashed: true },

    // Step 2: a CDN in front; repeat GETs stop at the edge.
    { from: "app", to: "cdn", label: "GET /clinics", flow: true, packet: true },
    { from: "cdn", to: "lb", label: "miss", dashed: true, flow: true },
  ],
};

export default spec;
