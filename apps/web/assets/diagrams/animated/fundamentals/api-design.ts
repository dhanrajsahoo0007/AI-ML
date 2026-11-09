import type { DiagramSpec } from "@/components/diagrams/types";

// Where each part of an API contract lives, for the Crumbs cake-ordering story on the API design page.
// Step 1: two clients call the Orders API directly; it reads and writes the orders table.
// Step 2: an idempotency store remembers each Idempotency-Key and the reply it produced, so a retried POST
//         returns the saved reply instead of creating a second order or charge.
// Step 3: an API gateway in front checks the caller, counts requests per API key (rate limits) and routes
//         /v1 and /v2 to the right handler. The direct client -> API edges end at step 2 (until: 2).
//
// Layout (centres): clients x100 (app y120, partner y240), gateway x290 y180, api x530 y180,
// storage x780 (idem y120, db y240). Gaps between boxes: 50, 95 and 90 px.
const spec: DiagramSpec = {
  title: "Where an API's contract is enforced",
  width: 920,
  height: 340,
  steps: [
    { title: "Clients call resources with verbs" },
    { title: "Remember idempotency keys" },
    { title: "A gateway enforces limits and versions" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 40, w: 160, h: 270 },
    { id: "edge", title: "Edge", tone: "blue", x: 205, y: 40, w: 170, h: 270 },
    { id: "core", title: "Core request path", tone: "green", x: 440, y: 40, w: 180, h: 270 },
    { id: "storage", title: "Storage", tone: "violet", x: 660, y: 40, w: 240, h: 270 },
  ],
  nodes: [
    { id: "app", label: "Phone app", sub: "app v2.3", icon: "phone", x: 100, y: 120, w: 140 },
    { id: "partner", label: "Partner script", sub: "nightly sync", icon: "robot", x: 100, y: 240, w: 140 },
    {
      id: "gateway",
      label: "API gateway",
      sub: "limits · versions",
      icon: "gateway",
      tone: "blue",
      step: 3,
      x: 290,
      y: 180,
      w: 140,
      h: 64,
    },
    {
      id: "api",
      label: "Orders API",
      sub: "/v1/orders",
      icon: "api",
      tone: "green",
      accent: true,
      x: 530,
      y: 180,
      w: 150,
      h: 64,
    },
    {
      id: "idem",
      label: "Idempotency store",
      sub: "key → saved reply",
      icon: "key",
      tone: "orange",
      step: 2,
      x: 780,
      y: 120,
      w: 170,
    },
    { id: "db", label: "Orders DB", sub: "orders table", icon: "database", tone: "violet", x: 780, y: 240, w: 170 },
  ],
  edges: [
    // Step 1 shortcuts: clients talk to the API directly until the gateway arrives in step 3.
    { from: "app", to: "api", label: "POST /v1/orders", flow: true, packet: true, until: 2 },
    { from: "partner", to: "api", label: "GET /v1/orders", flow: true, packet: true, delay: 1.2, until: 2 },
    { from: "api", to: "db", label: "SQL", flow: true, packet: true, delay: 0.6 },
    // Step 2: the API checks the key before doing the work.
    { from: "api", to: "idem", label: "Idempotency-Key", packet: true, delay: 0.3 },
    // Step 3: every call passes the gateway first.
    { from: "app", to: "gateway", label: "HTTPS", flow: true, packet: true },
    { from: "partner", to: "gateway", label: "HTTPS", flow: true, packet: true, delay: 1 },
    { from: "gateway", to: "api", label: "v1 / v2", flow: true, packet: true, delay: 0.4 },
  ],
};

export default spec;
