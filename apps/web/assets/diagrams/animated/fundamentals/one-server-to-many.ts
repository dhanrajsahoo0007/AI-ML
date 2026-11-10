import type { DiagramSpec } from "@/components/diagrams/types";

// "One server to many": the three-step preview used on "What system design is". It shows the four questions a
// design answers in picture form: step 1 is what the system does (one box runs the code and keeps the data),
// step 2 is how much (a load balancer spreads users over several app servers and the data moves to its own
// machine), step 3 is what breaks (a live copy of the data stands by). The full seven-step build lives on the
// scaling-journey page; this spec stops where that one starts to get interesting.
//
// Layout (centres): users (100,250) -> lb (280,250) -> app1 (490,150), app2 (490,250), app3 (490,350) ->
// db glyph (740,250), replica glyph (740,400). Boxes are 36px apart vertically; the edge trunk runs at x=370
// and the storage trunk at x=610, both clear of every box. app1 and app3 reach the database on their own
// horizontal lines (y 228 and 272), so the three arrowheads and the middle label do not touch.
const spec: DiagramSpec = {
  title: "From one server to many",
  width: 880,
  height: 500,
  steps: [
    { title: "One server does everything", covers: "What it does" },
    { title: "More users: spread the load, move the data out", covers: "How much, where the data lives" },
    { title: "Something will break: keep a live copy", covers: "What breaks" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 50, w: 160, h: 430 },
    { id: "edge", title: "Edge", tone: "blue", x: 200, y: 50, w: 160, h: 430 },
    { id: "application", title: "Application", tone: "green", x: 380, y: 50, w: 220, h: 430 },
    { id: "storage", title: "Storage", tone: "violet", x: 620, y: 50, w: 240, h: 430 },
  ],
  nodes: [
    { id: "users", label: "Users", sub: "browser / phone", icon: "users", x: 100, y: 250, w: 140, h: 64 },
    {
      id: "lb",
      label: "Load balancer",
      sub: "picks a server",
      icon: "load-balancer",
      tone: "blue",
      step: 2,
      x: 280,
      y: 250,
      w: 140,
      h: 64,
    },
    {
      id: "app1",
      label: "App server",
      sub: "runs the code",
      icon: "server",
      tone: "green",
      accent: true,
      x: 490,
      y: 150,
      w: 160,
      h: 64,
    },
    {
      id: "app2",
      label: "App server",
      sub: "same code",
      icon: "server",
      tone: "green",
      step: 2,
      x: 490,
      y: 250,
      w: 160,
      h: 64,
    },
    {
      id: "app3",
      label: "App server",
      sub: "same code",
      icon: "server",
      tone: "green",
      step: 2,
      x: 490,
      y: 350,
      w: 160,
      h: 64,
    },
    {
      id: "db",
      label: "Database",
      sub: "all the data",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 2,
      x: 740,
      y: 250,
    },
    {
      id: "replica",
      label: "Replica",
      sub: "live copy, takes over",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 3,
      x: 740,
      y: 400,
    },
  ],
  edges: [
    // Step 1: users talk straight to the one server, which keeps its data on its own disk.
    {
      from: "users",
      to: "app1",
      label: "request",
      tone: "green",
      flow: true,
      packet: true,
      delay: 0,
      via: [
        [370, 250],
        [370, 150],
      ],
      labelAt: 0.3,
      until: 1,
    },

    // Step 2: a load balancer in front, three identical app servers, one database on its own machine.
    { from: "users", to: "lb", tone: "blue", flow: true, packet: true, delay: 0, step: 2 },
    {
      from: "lb",
      to: "app1",
      tone: "blue",
      flow: true,
      packet: true,
      delay: 0.6,
      via: [
        [370, 250],
        [370, 150],
      ],
      step: 2,
    },
    { from: "lb", to: "app2", tone: "blue", flow: true, packet: true, delay: 0.6, step: 2 },
    {
      from: "lb",
      to: "app3",
      tone: "blue",
      flow: true,
      packet: true,
      delay: 0.6,
      via: [
        [370, 250],
        [370, 350],
      ],
      step: 2,
    },
    {
      from: "app1",
      to: "db",
      tone: "violet",
      dashed: true,
      via: [
        [610, 150],
        [610, 228],
        [690, 228],
      ],
      step: 2,
    },
    {
      from: "app2",
      to: "db",
      label: "reads + writes",
      tone: "violet",
      flow: true,
      packet: true,
      delay: 1.2,
      step: 2,
    },
    {
      from: "app3",
      to: "db",
      tone: "violet",
      dashed: true,
      via: [
        [610, 350],
        [610, 272],
        [690, 272],
      ],
      step: 2,
    },

    // Step 3: the database streams every change to a live copy that can take over.
    { from: "db", to: "replica", label: "copies changes", tone: "violet", dashed: true, flow: true, step: 3 },
  ],
};

export default spec;
