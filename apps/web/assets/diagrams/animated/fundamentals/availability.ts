import type { DiagramSpec } from "@/components/diagrams/types";

// Two ways to run a spare server. Step 1 (active-passive): the load balancer sends every request to
// server A and only health-checks server B; A copies its in-memory state to B so B can take over warm.
// Step 2 (active-active): the load balancer splits traffic across A and B and both use the shared
// database, so losing one server costs only the detection time.
//
// Layout (centres; card nodes 170x64, so boxes span x 515-685):
//   users (105,210)  lb (297,210)  appA (600,140)  appB (600,280)  db glyph (870,140)
// Gaps: appA bottom 172 to appB top 248 = 76. The trunk at x=392 sits between the edge and serving zones and
// leaves 119 px to the servers for the 14-character labels (about 87 px). appA reaches the database on a straight
// line; appB climbs a trunk at x=752, between the serving and storage zones.
// Nodes keep their positions in both steps; the step-1 edges carry `until: 1` and step 2 replaces them.
const spec: DiagramSpec = {
  title: "Active-passive and active-active redundancy",
  width: 980,
  height: 390,
  steps: [{ title: "Active-passive: one serves, one waits" }, { title: "Active-active: both serve" }],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 60, w: 170, h: 300 },
    { id: "edge", title: "Edge", tone: "blue", x: 212, y: 60, w: 170, h: 300 },
    { id: "serving", title: "Serving tier", tone: "green", x: 405, y: 60, w: 320, h: 300 },
    { id: "storage", title: "Storage", tone: "violet", x: 780, y: 60, w: 180, h: 300 },
  ],
  nodes: [
    { id: "users", label: "Users", sub: "browser / app", icon: "phone", x: 105, y: 210, w: 140, h: 64 },
    {
      id: "lb",
      label: "Load balancer",
      sub: "health checks",
      icon: "load-balancer",
      tone: "blue",
      x: 297,
      y: 210,
      w: 156,
      h: 64,
    },
    {
      id: "appA",
      label: "Server A",
      sub: "runs the app",
      icon: "server",
      tone: "green",
      accent: true,
      x: 600,
      y: 140,
      w: 170,
      h: 64,
    },
    {
      id: "appB",
      label: "Server B",
      sub: "identical copy",
      icon: "server",
      tone: "green",
      x: 600,
      y: 280,
      w: 170,
      h: 64,
    },
    {
      id: "db",
      label: "Database",
      sub: "replicated",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 870,
      y: 140,
    },
  ],
  edges: [
    // Both steps: users reach the load balancer.
    { from: "users", to: "lb", tone: "blue", flow: true, packet: true, delay: 0 },

    // Step 1: everything goes to A; B is idle and only health-checked; A copies its state to B.
    {
      from: "lb",
      to: "appA",
      label: "all traffic",
      tone: "green",
      flow: true,
      packet: true,
      delay: 0.6,
      via: [
        [392, 200],
        [392, 140],
      ],
      labelAt: 0.69,
      until: 1,
    },
    {
      from: "lb",
      to: "appB",
      label: "health check",
      tone: "neutral",
      dashed: true,
      via: [
        [392, 220],
        [392, 280],
      ],
      labelAt: 0.69,
      until: 1,
    },
    { from: "appA", to: "appB", label: "copy state", tone: "violet", dashed: true, flow: true, until: 1 },
    { from: "appA", to: "db", label: "read / write", tone: "violet", flow: true, packet: true, delay: 1.2 },

    // Step 2: both servers take traffic and both use the shared database.
    {
      from: "lb",
      to: "appA",
      label: "50% of traffic",
      tone: "green",
      flow: true,
      packet: true,
      delay: 0.6,
      via: [
        [392, 200],
        [392, 140],
      ],
      labelAt: 0.69,
      step: 2,
    },
    {
      from: "lb",
      to: "appB",
      label: "50% of traffic",
      tone: "green",
      flow: true,
      packet: true,
      delay: 0.6,
      via: [
        [392, 220],
        [392, 280],
      ],
      labelAt: 0.69,
      step: 2,
    },
    {
      from: "appB",
      to: "db",
      tone: "violet",
      flow: true,
      packet: true,
      delay: 1.2,
      via: [
        [752, 280],
        [752, 160],
        [810, 160],
      ],
      step: 2,
    },
  ],
};

export default spec;
