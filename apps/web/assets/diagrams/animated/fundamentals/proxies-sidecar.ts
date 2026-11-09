import type { DiagramSpec } from "@/components/diagrams/types";

// Sidecar proxies. The Orders app calls the Payments app; each app talks plain HTTP to a proxy in its own pod,
// and the two proxies talk mutual TLS to each other.
// Step 1: one call crosses two sidecars.
// Step 2: a control plane pushes routes, retry rules and certificates to every sidecar.
//
// Layout check (card boxes, centre ± w/2, ± h/2):
// orders 75-235 x 81-139, oside 75-235 x 188-252 (gap 49), payments 625-785 x 81-139, pside 625-785 x 188-252,
// control 345-515 x 311-369. The mTLS line runs at y 220 from x 235 to 625, above the control plane zone
// (top 290). Config lines run up from the control plane to the bottoms of the sidecars.
// Zones: opod 30-280 x 40-280, ppod 580-830 x 40-280, cp 320-540 x 290-385.
const spec: DiagramSpec = {
  title: "Sidecar proxies between two services",
  width: 860,
  height: 400,
  steps: [{ title: "One call, two sidecars" }, { title: "A control plane configures every sidecar" }],
  zones: [
    { id: "opod", title: "Orders pod", tone: "teal", x: 30, y: 40, w: 250, h: 240 },
    { id: "ppod", title: "Payments pod", tone: "teal", x: 580, y: 40, w: 250, h: 240 },
    { id: "cp", title: "Control plane", tone: "orange", x: 320, y: 290, w: 220, h: 95 },
  ],
  nodes: [
    { id: "orders", label: "Orders app", sub: "calls localhost", icon: "server", tone: "teal", x: 155, y: 110, w: 160 },
    {
      id: "oside",
      label: "Sidecar proxy",
      sub: "retries, mTLS, metrics",
      icon: "shield",
      tone: "green",
      accent: true,
      x: 155,
      y: 220,
      w: 160,
      h: 64,
    },
    {
      id: "payments",
      label: "Payments app",
      sub: "trusts its sidecar",
      icon: "server",
      tone: "teal",
      x: 705,
      y: 110,
      w: 160,
    },
    {
      id: "pside",
      label: "Sidecar proxy",
      sub: "checks caller's cert",
      icon: "shield",
      tone: "green",
      accent: true,
      x: 705,
      y: 220,
      w: 160,
      h: 64,
    },
    {
      id: "control",
      label: "Control plane",
      sub: "routes, certificates",
      icon: "coordinator",
      tone: "orange",
      step: 2,
      x: 430,
      y: 340,
      w: 170,
    },
  ],
  edges: [
    // Step 1: the call leaves through one sidecar and arrives through the other.
    { from: "orders", to: "oside", label: "plain HTTP", tone: "teal", flow: true, packet: true, delay: 0 },
    { from: "oside", to: "pside", label: "mTLS", tone: "green", flow: true, packet: true, delay: 0.8 },
    { from: "pside", to: "payments", label: "plain HTTP", tone: "teal", flow: true, packet: true, delay: 1.6 },

    // Step 2: configuration flows out from the control plane, never on the request path.
    { from: "control", to: "oside", label: "config, certs", tone: "orange", dashed: true, flow: true },
    { from: "control", to: "pside", label: "config, certs", tone: "orange", dashed: true, flow: true },
  ],
};

export default spec;
