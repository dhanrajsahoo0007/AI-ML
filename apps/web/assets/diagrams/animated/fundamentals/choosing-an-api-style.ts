import type { DiagramSpec } from "@/components/diagrams/types";

// Spokes, a city bike-share, has five kinds of conversation and picks one API style for each.
// Step 1: partner apps read the public dock list over REST through an API gateway.
// Step 2: the rider app's home screen asks one GraphQL server for exactly the fields it shows.
// Step 3: inside the data center, services call each other with gRPC (the step 1 and 2 shortcuts are replaced).
// Step 4: during a ride, the phone and a live gateway keep a WebSocket open; ride events are pushed down it.
// Step 5: the card processor (another company) tells billing about charges with a webhook; billing starts
// a charge with a plain REST call the other way.
//
// Columns: outside callers (x 96), entry points (x 354), services (x 620 and x 850).
// Rows: y 130, 240, 350, 460; the phone sits between rows 2 and 3 because it uses two entry points.
const spec: DiagramSpec = {
  title: "One system, five API styles",
  width: 960,
  height: 550,
  steps: [
    { title: "Partners read public data: REST" },
    { title: "Your own app's screens: GraphQL" },
    { title: "Service to service: gRPC" },
    { title: "Live updates during a ride: WebSocket" },
    { title: "Another company's server: webhooks" },
  ],
  zones: [
    { id: "outside", title: "Outside callers", tone: "neutral", x: 16, y: 50, w: 160, h: 480 },
    { id: "entry", title: "Entry points", tone: "green", x: 250, y: 50, w: 208, h: 480 },
    { id: "services", title: "Your services", tone: "teal", x: 530, y: 50, w: 414, h: 480 },
  ],
  nodes: [
    // Step 1: REST for partners.
    { id: "partner", label: "Partner app", sub: "city planners", icon: "globe", x: 96, y: 130, w: 136 },
    { id: "gateway", label: "API gateway", sub: "REST + JSON", icon: "gateway", tone: "green", x: 354, y: 130, w: 170 },
    { id: "docks", label: "Dock service", sub: "docks, bikes", icon: "server", tone: "teal", x: 620, y: 130, w: 150 },

    // Step 2: GraphQL for the rider app.
    { id: "phone", label: "Rider app", sub: "iOS, Android", icon: "phone", x: 96, y: 295, w: 136, step: 2 },
    {
      id: "graphql",
      label: "GraphQL server",
      sub: "one query per screen",
      icon: "api",
      tone: "green",
      x: 354,
      y: 240,
      w: 170,
      step: 2,
    },
    {
      id: "rides",
      label: "Ride service",
      sub: "unlock, end ride",
      icon: "server",
      tone: "teal",
      x: 620,
      y: 240,
      w: 150,
      step: 2,
    },

    // Step 3: gRPC between services.
    {
      id: "pricing",
      label: "Pricing service",
      sub: "fares, passes",
      icon: "chart",
      tone: "teal",
      x: 850,
      y: 240,
      w: 150,
      step: 3,
    },

    // Step 4: WebSocket for live ride updates.
    {
      id: "live",
      label: "Live gateway",
      sub: "holds WebSockets",
      icon: "chat",
      tone: "green",
      x: 354,
      y: 350,
      w: 170,
      step: 4,
    },

    // Step 5: webhooks from another company.
    { id: "processor", label: "Card processor", sub: "another company", icon: "card", x: 96, y: 460, w: 136, step: 5 },
    {
      id: "hooks",
      label: "Webhook receiver",
      sub: "verify, queue, 200",
      icon: "bell",
      tone: "green",
      x: 354,
      y: 460,
      w: 170,
      step: 5,
    },
    {
      id: "billing",
      label: "Billing service",
      sub: "charges, refunds",
      icon: "ledger",
      tone: "teal",
      x: 620,
      y: 460,
      w: 150,
      step: 5,
    },
  ],
  edges: [
    // Step 1: a partner reads the dock list.
    { from: "partner", to: "gateway", label: "GET /docks", flow: true, packet: true, step: 1 },
    { from: "gateway", to: "docks", flow: true, packet: true, delay: 1, step: 1, until: 2 },

    // Step 2: one GraphQL query fans out to two services.
    { from: "phone", to: "graphql", label: "POST /graphql", flow: true, packet: true, labelAt: 0.4, step: 2 },
    { from: "graphql", to: "rides", flow: true, packet: true, delay: 1, step: 2, until: 2 },
    { from: "graphql", to: "docks", dashed: true, step: 2, until: 2 },

    // Step 3: the internal calls become gRPC.
    { from: "gateway", to: "docks", label: "gRPC", flow: true, packet: true, delay: 1, step: 3 },
    { from: "graphql", to: "rides", label: "gRPC", flow: true, packet: true, delay: 1, step: 3 },
    { from: "graphql", to: "docks", flow: true, step: 3 },
    { from: "rides", to: "pricing", label: "gRPC", flow: true, packet: true, delay: 1.6, step: 3 },

    // Step 4: one open connection, messages both ways.
    {
      from: "phone",
      to: "live",
      label: "WebSocket",
      flow: true,
      packet: true,
      bidirectional: true,
      labelAt: 0.45,
      step: 4,
    },
    { from: "rides", to: "live", label: "ride events", dashed: true, packet: true, delay: 0.6, step: 4 },

    // Step 5: the processor calls you when a charge settles; you start charges with REST.
    { from: "processor", to: "hooks", label: "POST event", flow: true, packet: true, step: 5 },
    { from: "hooks", to: "billing", label: "enqueue", dashed: true, packet: true, delay: 1, step: 5 },
    {
      from: "billing",
      to: "processor",
      label: "charge (REST)",
      dashed: true,
      via: [
        [620, 512],
        [96, 512],
      ],
      step: 5,
    },
  ],
};

export default spec;
