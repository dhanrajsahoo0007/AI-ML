import type { DiagramSpec } from "@/components/diagrams/types";

// Scaling the classroom quiz app's sockets. Room 42 has a teacher and 30 students; their sockets landed on three
// different gateways (teacher on gateway 1, 12 students on gateway 2, 18 on gateway 3). The drawing shows 3 of
// the 6 gateways that hold 200,000 sockets at exam peak.
//
// Step 1: a load balancer spreads long-lived sockets across gateways and keeps each one on its gateway. The
// teacher's "next question" arrives on gateway 1, which has no way to reach the students on gateways 2 and 3.
// Step 2: gateways only hold connections; they pass every event to a stateless quiz service, which saves
// answers. Business logic leaves the gateways, so they can be deployed and scaled on their own.
// Step 3: the quiz service publishes room events to a pub/sub channel (room:42). Every gateway with a member of
// room 42 subscribes, receives one copy and writes it to its local sockets.
//
// Layout (centres): teacher (100,130), students (100,280), lb (272,205), gw1/gw2/gw3 (458,110/205/300),
// quiz (668,115), db glyph (828,105), pubsub (668,285). Zones: clients 20-180, edge 196-348, gateways 368-548,
// services 568-748 (top), storage 768-888 (top), async 568-888 (bottom). gw3>quiz and pubsub>gw1 bend in the
// 548-568 gap (via) so they do not graze gateway 2's corners.
const spec: DiagramSpec = {
  title: "Scaling WebSockets: gateways and pub/sub",
  width: 900,
  height: 390,
  steps: [
    { title: "A load balancer spreads sockets across gateways" },
    { title: "Gateways hold sockets; a service holds the logic" },
    { title: "Pub/sub carries room events to every gateway" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 40, w: 160, h: 320 },
    { id: "edge", title: "Edge", tone: "blue", x: 196, y: 40, w: 152, h: 320 },
    { id: "gateways", title: "Socket gateways", tone: "green", x: 368, y: 40, w: 180, h: 320 },
    { id: "services", title: "Services", tone: "teal", x: 568, y: 40, w: 180, h: 150 },
    { id: "storage", title: "Storage", tone: "violet", x: 768, y: 40, w: 120, h: 150 },
    { id: "async", title: "Pub/sub", tone: "orange", x: 568, y: 210, w: 320, h: 150 },
  ],
  nodes: [
    { id: "teacher", label: "Teacher", sub: "starts question 3", icon: "browser", x: 100, y: 130, w: 140, h: 58 },
    { id: "students", label: "Students", sub: "30 in room 42", icon: "users", x: 100, y: 280, w: 140, h: 58 },
    {
      id: "lb",
      label: "Load balancer",
      sub: "pins each socket",
      icon: "load-balancer",
      tone: "blue",
      x: 272,
      y: 205,
      w: 136,
      h: 58,
    },
    {
      id: "gw1",
      label: "Gateway 1",
      sub: "teacher's socket",
      icon: "chat",
      tone: "green",
      x: 458,
      y: 110,
      w: 150,
      h: 58,
    },
    { id: "gw2", label: "Gateway 2", sub: "12 students", icon: "chat", tone: "green", x: 458, y: 205, w: 150, h: 58 },
    { id: "gw3", label: "Gateway 3", sub: "18 students", icon: "chat", tone: "green", x: 458, y: 300, w: 150, h: 58 },
    {
      id: "quiz",
      label: "Quiz service",
      sub: "rules, scores",
      icon: "server",
      tone: "teal",
      x: 668,
      y: 115,
      w: 140,
      h: 58,
      step: 2,
    },
    { id: "db", label: "Answers DB", icon: "database", tone: "violet", variant: "glyph", x: 828, y: 105, step: 2 },
    {
      id: "pubsub",
      label: "Pub/sub",
      sub: "channel room:42",
      icon: "queue",
      tone: "orange",
      accent: true,
      x: 668,
      y: 285,
      w: 150,
      h: 58,
      step: 3,
    },
  ],
  edges: [
    // Step 1: long-lived, two-way sockets through the load balancer.
    { from: "teacher", to: "lb", flow: true, packet: true, bidirectional: true },
    { from: "students", to: "lb", flow: true, packet: true, bidirectional: true, delay: 0.3 },
    { from: "lb", to: "gw1", flow: true, packet: true, bidirectional: true, delay: 0.6 },
    { from: "lb", to: "gw2", flow: true, packet: true, bidirectional: true, delay: 0.6 },
    { from: "lb", to: "gw3", flow: true, packet: true, bidirectional: true, delay: 0.6 },

    // Step 2: gateways forward events to the quiz service, which saves answers.
    { from: "gw1", to: "quiz", label: "events", flow: true, packet: true, delay: 1.2, step: 2 },
    { from: "gw2", to: "quiz", flow: true, packet: true, delay: 1.2, step: 2 },
    { from: "gw3", to: "quiz", flow: true, packet: true, delay: 1.2, step: 2, via: [[560, 250]] },
    { from: "quiz", to: "db", label: "save", dashed: true, step: 2 },

    // Step 3: one publish, one copy per subscribed gateway.
    { from: "quiz", to: "pubsub", label: "publish", flow: true, packet: true, delay: 1.8, step: 3 },
    { from: "pubsub", to: "gw1", flow: true, packet: true, delay: 2.4, step: 3, via: [[560, 160]] },
    { from: "pubsub", to: "gw2", flow: true, packet: true, delay: 2.4, step: 3 },
    { from: "pubsub", to: "gw3", flow: true, packet: true, delay: 2.4, step: 3 },
  ],
};

export default spec;
