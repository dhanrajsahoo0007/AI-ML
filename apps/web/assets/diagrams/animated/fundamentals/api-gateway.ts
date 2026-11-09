import type { DiagramSpec } from "@/components/diagrams/types";

// Spokes, a city bike-share app, puts one API gateway in front of its services and then adds a backend per client.
// Step 1: phone app, web dashboard and partner apps call one gateway; it routes by path and speaks gRPC inside.
// Step 2: the gateway checks each token (keys from the auth service) and counts requests per key in a shared store.
// Step 3: a mobile BFF builds the phone's home screen from rides, bikes and payments in one round trip.
//         The gateway's direct routes to rides and payments end at step 2 (until: 2).
// Step 4: a web BFF serves the operator dashboard; the gateway's direct route to users ends at step 3.
//         Partner apps keep calling the public bikes API through the gateway, with no BFF.
//
// Layout (centres; card boxes are centre +- w/2, +- h/2):
// clients x100 w140 (30-170): phone y110 (81-139), web y230 (201-259), partner y350 (321-379).
// edge x300: auth w140 y95 (230-370 x 66-124), gateway w150 h64 y230 (225-375 x 198-262),
//            limits w150 y365 (225-375 x 336-394). Vertical gaps 74 and 74.
// BFFs x520 w150 (445-595): mobile y140 (111-169), web y300 (271-329). Gap 102.
// services x750 w140 (680-820): rides y90, bikes y190, payments y290, users y390 (gaps 42).
// gateway -> bikes runs between the two BFFs (y 217 at x445, y 204 at x595).
// Zones: clients 20-180, edge 200-400, bff 430-610, services 640-860 (gaps 20 to 30).
const spec: DiagramSpec = {
  title: "An API gateway and backends for frontends",
  width: 880,
  height: 460,
  steps: [
    { title: "One front door routes every call" },
    { title: "Check who is calling, and how often" },
    { title: "A backend for the phone app" },
    { title: "A backend for each frontend" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 40, w: 160, h: 400 },
    { id: "edge", title: "Edge", tone: "blue", x: 200, y: 40, w: 200, h: 400 },
    { id: "bff", title: "Per-client backends", tone: "green", x: 430, y: 40, w: 180, h: 400 },
    { id: "services", title: "Services", tone: "teal", x: 640, y: 40, w: 220, h: 400 },
  ],
  nodes: [
    { id: "phone", label: "Phone app", sub: "riders", icon: "phone", x: 100, y: 110, w: 140 },
    { id: "web", label: "Web dashboard", sub: "fleet operators", icon: "browser", x: 100, y: 230, w: 140 },
    { id: "partner", label: "Partner apps", sub: "transit maps", icon: "users", x: 100, y: 350, w: 140 },
    {
      id: "gateway",
      label: "API gateway",
      sub: "TLS, routes, limits",
      icon: "gateway",
      tone: "green",
      accent: true,
      x: 300,
      y: 230,
      w: 150,
      h: 64,
    },
    {
      id: "auth",
      label: "Auth service",
      sub: "issues tokens",
      icon: "key",
      tone: "blue",
      step: 2,
      x: 300,
      y: 95,
      w: 140,
    },
    {
      id: "limits",
      label: "Limit counters",
      sub: "per key, per second",
      icon: "cache",
      tone: "orange",
      step: 2,
      x: 300,
      y: 365,
      w: 150,
    },
    {
      id: "mbff",
      label: "Mobile BFF",
      sub: "builds /home",
      icon: "server",
      tone: "green",
      step: 3,
      x: 520,
      y: 140,
      w: 150,
    },
    {
      id: "wbff",
      label: "Web BFF",
      sub: "tables, filters",
      icon: "server",
      tone: "green",
      step: 4,
      x: 520,
      y: 300,
      w: 150,
    },
    { id: "rides", label: "Rides", sub: "start, end", icon: "map", tone: "teal", x: 750, y: 90, w: 140 },
    { id: "bikes", label: "Bikes", sub: "where, battery", icon: "map-pin", tone: "teal", x: 750, y: 190, w: 140 },
    { id: "payments", label: "Payments", sub: "fares, wallet", icon: "card", tone: "teal", x: 750, y: 290, w: 140 },
    { id: "users", label: "Users", sub: "accounts", icon: "users", tone: "teal", x: 750, y: 390, w: 140 },
  ],
  edges: [
    // Step 1: every client calls the gateway over HTTPS; the gateway routes by path and calls services over gRPC.
    { from: "phone", to: "gateway", label: "HTTPS", tone: "blue", flow: true, packet: true, delay: 0 },
    { from: "web", to: "gateway", tone: "blue", flow: true, packet: true, delay: 0.2 },
    { from: "partner", to: "gateway", tone: "blue", flow: true, packet: true, delay: 0.4 },
    { from: "gateway", to: "rides", label: "gRPC", tone: "teal", flow: true, packet: true, delay: 1.0, until: 2 },
    { from: "gateway", to: "bikes", tone: "teal", flow: true, packet: true, delay: 1.0 },
    { from: "gateway", to: "payments", tone: "teal", flow: true, packet: true, delay: 1.0, until: 2 },
    { from: "gateway", to: "users", tone: "teal", flow: true, packet: true, delay: 1.0, until: 3 },

    // Step 2: checks at the door. Keys come from the auth service now and then; counters on every request.
    { from: "auth", to: "gateway", label: "signing keys", tone: "blue", dashed: true },
    { from: "gateway", to: "limits", label: "count +1", tone: "orange", dashed: true, flow: true },

    // Step 3: the phone's home screen goes through the mobile BFF, which calls three services in parallel.
    { from: "gateway", to: "mbff", label: "/home", tone: "green", flow: true, packet: true, delay: 0.8 },
    { from: "mbff", to: "rides", label: "gRPC", tone: "teal", flow: true, packet: true, delay: 1.6 },
    { from: "mbff", to: "bikes", tone: "teal", flow: true, packet: true, delay: 1.6 },
    { from: "mbff", to: "payments", tone: "teal", flow: true, packet: true, delay: 1.6 },

    // Step 4: the operator dashboard gets its own backend.
    { from: "gateway", to: "wbff", label: "/ops", tone: "green", flow: true, packet: true, delay: 0.8 },
    { from: "wbff", to: "bikes", tone: "teal", flow: true, packet: true, delay: 1.6 },
    { from: "wbff", to: "users", tone: "teal", flow: true, packet: true, delay: 1.6 },
  ],
};

export default spec;
