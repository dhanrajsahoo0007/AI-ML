import type { DiagramSpec } from "@/components/diagrams/types";

// Where RPC fits in the bookshop. Shoppers' apps and browsers speak REST with JSON over HTTPS to the API gateway.
// Step 1: every hop, inside too, is JSON over HTTP, with no shared schema and no deadlines.
// Step 2: the gateway keeps REST for the public, and turns each request into a gRPC call; checkout calls
// inventory, pricing and payments over gRPC with Protobuf contracts and deadlines.
//
// Layout (centres): phone 95,130 | browser 95,240 | gateway 270,185 (w 140) | checkout 450,185 (w 130) |
// inventory 700,100 | pricing 700,185 | payments 700,270 (all w 130). Vertical gaps between service boxes: 27 px.
const spec: DiagramSpec = {
  title: "REST at the edge, RPC inside",
  width: 880,
  height: 340,
  steps: [{ title: "JSON over HTTP on every hop" }, { title: "gRPC between services, REST at the edge" }],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 40, w: 150, h: 280 },
    { id: "edge", title: "Edge", tone: "blue", x: 190, y: 40, w: 160, h: 280 },
    { id: "core", title: "Request path", tone: "green", x: 370, y: 40, w: 160, h: 280 },
    { id: "services", title: "Internal services", tone: "teal", x: 550, y: 40, w: 310, h: 280 },
  ],
  nodes: [
    { id: "phone", label: "Mobile app", sub: "public client", icon: "phone", tone: "neutral", x: 95, y: 130 },
    { id: "browser", label: "Browser", sub: "public client", icon: "browser", tone: "neutral", x: 95, y: 240 },
    { id: "gateway", label: "API gateway", sub: "REST + JSON", icon: "gateway", tone: "blue", x: 270, y: 185, w: 140 },
    {
      id: "checkout",
      label: "Checkout",
      sub: "service",
      icon: "bag",
      tone: "green",
      accent: true,
      x: 450,
      y: 185,
      w: 130,
    },
    { id: "inventory", label: "Inventory", sub: "service", icon: "database", tone: "teal", x: 700, y: 100, w: 130 },
    { id: "pricing", label: "Pricing", sub: "service", icon: "ledger", tone: "teal", x: 700, y: 185, w: 130 },
    { id: "payments", label: "Payments", sub: "service", icon: "card", tone: "teal", x: 700, y: 270, w: 130 },
  ],
  edges: [
    // Public traffic: REST and JSON in both steps.
    { from: "phone", to: "gateway", label: "JSON", flow: true, packet: true },
    { from: "browser", to: "gateway", label: "JSON", flow: true, packet: true, delay: 0.4 },

    // Step 1: JSON over HTTP inside as well.
    { from: "gateway", to: "checkout", label: "JSON", dashed: true, packet: true, delay: 1, until: 1 },
    { from: "checkout", to: "inventory", label: "JSON", dashed: true, delay: 1.8, until: 1 },
    { from: "checkout", to: "pricing", label: "JSON", dashed: true, delay: 1.8, until: 1 },
    { from: "checkout", to: "payments", label: "JSON", dashed: true, delay: 1.8, until: 1 },

    // Step 2: gRPC with Protobuf inside, each call with a deadline.
    { from: "gateway", to: "checkout", label: "gRPC", tone: "green", flow: true, packet: true, delay: 1, step: 2 },
    { from: "checkout", to: "inventory", label: "gRPC", tone: "green", flow: true, packet: true, delay: 1.8, step: 2 },
    { from: "checkout", to: "pricing", label: "gRPC", tone: "green", flow: true, packet: true, delay: 2, step: 2 },
    { from: "checkout", to: "payments", label: "gRPC", tone: "green", flow: true, packet: true, delay: 2.2, step: 2 },
  ],
};

export default spec;
