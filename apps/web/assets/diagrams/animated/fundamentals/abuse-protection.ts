import type { DiagramSpec } from "@/components/diagrams/types";

// Shelfie, a used-book marketplace, before and after a rate limiter at its API gateway.
// Step 1: real readers, a login bot (4,000 IPs, 400 attempts/s) and a buggy seller sync tool (300 req/s) all pass
//         through the gateway untouched; the login service tops out at about 160 password checks a second.
// Step 2: the gateway asks a rate limiter before routing; the limiter counts per key, IP and account in an
//         in-memory store. Over-limit callers get 429 back. The step-1 bot and sync edges end (until: 1) and are
//         replaced by two-way edges labelled 429.
//
// Layout (centres; card boxes are centre +- w/2, +- h/2):
// clients x100 w140 (30-170): users y110 (81-139), bots y230 (201-259), sync y350 (321-379). Gaps 62.
// edge x330 w150 (255-405): limiter y105 (76-134), gateway h64 y230 (198-262). Vertical gap 64.
// services x570 w150 (495-645): login y165 (136-194), listings y315 (286-344). Gap 92.
// storage x800: counters w150 y110 (725-875 x 81-139), db w140 y300 (730-870 x 271-329). Gap 132.
// limiter -> counters runs at y 105-110, 26 px above the login box.
// Zones: clients 20-180, edge 220-440, services 470-670, storage 700-900 (gaps 30 to 40).
const spec: DiagramSpec = {
  title: "A rate limiter at the API gateway",
  width: 920,
  height: 420,
  steps: [{ title: "No limits: every request reaches the services" }, { title: "A limiter at the gateway" }],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 40, w: 160, h: 360 },
    { id: "edge", title: "Edge", tone: "blue", x: 220, y: 40, w: 220, h: 360 },
    { id: "services", title: "Services", tone: "teal", x: 470, y: 40, w: 200, h: 360 },
    { id: "storage", title: "Storage", tone: "violet", x: 700, y: 40, w: 200, h: 360 },
  ],
  nodes: [
    { id: "users", label: "Real readers", sub: "about 2 logins/s", icon: "users", x: 100, y: 110, w: 140 },
    { id: "bots", label: "Login bot", sub: "4,000 IPs, 400/s", icon: "robot", tone: "red", x: 100, y: 230, w: 140 },
    {
      id: "sync",
      label: "Seller sync",
      sub: "buggy, 300 req/s",
      icon: "workers",
      tone: "orange",
      x: 100,
      y: 350,
      w: 140,
    },
    {
      id: "gateway",
      label: "API gateway",
      sub: "TLS, tokens, routes",
      icon: "gateway",
      tone: "green",
      x: 330,
      y: 230,
      w: 150,
      h: 64,
    },
    {
      id: "limiter",
      label: "Rate limiter",
      sub: "per key, IP, account",
      icon: "shield",
      tone: "green",
      accent: true,
      step: 2,
      x: 330,
      y: 105,
      w: 150,
    },
    {
      id: "login",
      label: "Login service",
      sub: "160 checks/s max",
      icon: "lock",
      tone: "teal",
      x: 570,
      y: 165,
      w: 150,
    },
    { id: "listings", label: "Listings", sub: "search, browse", icon: "search", tone: "teal", x: 570, y: 315, w: 150 },
    {
      id: "counters",
      label: "Counters",
      sub: "in-memory store",
      icon: "cache",
      tone: "orange",
      step: 2,
      x: 800,
      y: 110,
      w: 150,
    },
    { id: "db", label: "Database", sub: "users, listings", icon: "database", tone: "violet", x: 800, y: 300, w: 140 },
  ],
  edges: [
    // Step 1: everyone reaches the gateway and the gateway forwards everything.
    { from: "users", to: "gateway", label: "HTTPS", tone: "blue", flow: true, packet: true, delay: 0 },
    {
      from: "bots",
      to: "gateway",
      label: "400/s",
      tone: "red",
      flow: true,
      packet: true,
      delay: 0.2,
      duration: 1.2,
      until: 1,
    },
    {
      from: "sync",
      to: "gateway",
      label: "300/s",
      tone: "orange",
      flow: true,
      packet: true,
      delay: 0.4,
      duration: 1.2,
      until: 1,
    },
    { from: "gateway", to: "login", tone: "teal", flow: true, packet: true, delay: 1.0 },
    { from: "gateway", to: "listings", tone: "teal", flow: true, packet: true, delay: 1.0 },
    { from: "login", to: "db", tone: "violet", flow: true, packet: true, delay: 1.8 },
    { from: "listings", to: "db", tone: "violet", flow: true, packet: true, delay: 1.8 },

    // Step 2: the gateway checks the limiter first; callers over their limit get 429 back.
    { from: "gateway", to: "limiter", label: "check", tone: "green", flow: true, packet: true, delay: 0.6 },
    { from: "limiter", to: "counters", label: "count +1", tone: "orange", dashed: true, flow: true },
    { from: "bots", to: "gateway", label: "429", tone: "red", bidirectional: true, dashed: true, flow: true, step: 2 },
    {
      from: "sync",
      to: "gateway",
      label: "429",
      tone: "orange",
      bidirectional: true,
      dashed: true,
      flow: true,
      step: 2,
    },
  ],
};

export default spec;
