import type { DiagramSpec } from "@/components/diagrams/types";

// Where encryption starts and stops in the ticket shop. Maya is in Lisbon, the shop runs in Frankfurt.
// Step 1: the load balancer holds the certificate and decrypts; app servers get plain HTTP on the private network.
// Step 2: a CDN edge in Lisbon ends the handshake 5 ms from Maya and keeps a warm, encrypted connection to Frankfurt.
// Step 3: services encrypt to each other too, and both sides show a certificate from an internal CA (mutual TLS).
//
// Layout (centres): browser 95,200 | edge 290,200 | lb 460,200 (w 140) | app 660,130 | payments 805,130 |
// ca 730,270 (w 140). Gaps between boxes are at least 29 px.
const spec: DiagramSpec = {
  title: "Where TLS ends",
  width: 900,
  height: 370,
  steps: [
    { title: "Terminate TLS at the load balancer" },
    { title: "Move the handshake next to the user" },
    { title: "Mutual TLS between services" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 50, w: 150, h: 300 },
    { id: "edgezone", title: "Edge", tone: "blue", x: 195, y: 50, w: 355, h: 300 },
    { id: "services", title: "Services", tone: "teal", x: 575, y: 50, w: 305, h: 300 },
  ],
  nodes: [
    { id: "browser", label: "Browser", sub: "Lisbon", icon: "browser", tone: "neutral", x: 95, y: 200 },
    { id: "edge", label: "CDN edge", sub: "Lisbon, 5 ms", icon: "cdn", tone: "blue", x: 290, y: 200, step: 2 },
    {
      id: "lb",
      label: "Load balancer",
      sub: "holds the cert",
      icon: "load-balancer",
      tone: "green",
      accent: true,
      x: 460,
      y: 200,
      w: 140,
    },
    { id: "app", label: "Checkout", sub: "app server", icon: "server", tone: "teal", x: 660, y: 130 },
    { id: "payments", label: "Payments", sub: "service", icon: "card", tone: "teal", x: 805, y: 130, step: 3 },
    {
      id: "ca",
      label: "Internal CA",
      sub: "signs certs",
      icon: "shield",
      tone: "violet",
      x: 730,
      y: 270,
      w: 140,
      step: 3,
    },
  ],
  edges: [
    // Step 1: one TLS connection across the internet, plain HTTP behind the load balancer.
    { from: "browser", to: "lb", label: "HTTPS, 40 ms RTT", flow: true, packet: true, until: 1 },
    { from: "lb", to: "app", label: "plain HTTP", dashed: true, packet: true, delay: 1, until: 2 },

    // Step 2: the handshake ends near Maya; the long hop reuses an open connection.
    { from: "browser", to: "edge", label: "HTTPS", flow: true, packet: true, step: 2 },
    { from: "edge", to: "lb", label: "warm TLS", flow: true, packet: true, delay: 0.8, step: 2 },

    // Step 3: encrypt inside as well; both ends of service calls prove who they are.
    { from: "lb", to: "app", label: "TLS again", flow: true, packet: true, delay: 1.6, step: 3 },
    { from: "app", to: "payments", label: "mTLS", tone: "green", flow: true, packet: true, delay: 2.2, step: 3 },
    { from: "ca", to: "app", label: "cert", dashed: true, step: 3 },
    { from: "ca", to: "payments", label: "cert", dashed: true, step: 3 },
  ],
};

export default spec;
