import type { DiagramSpec } from "@/components/diagrams/types";

// How a GraphQL server answers the podcast app's home-screen query: one resolver per field, each calling a service.
// Step 1: the query engine runs Query.me, which calls the user service once, then User.subscriptions, which calls
// the show service once and returns 40 shows.
// Step 2: Show.latestEpisode runs once per show, so a naive resolver calls the episode service 40 times for one
// screen: 1 + 1 + 40 = 42 service calls. This is the N+1 problem.
// Step 3: a per-request DataLoader collects the 40 ids and makes one batched call: 3 service calls in total.
// The direct latestEpisode -> episode service edge has `until: 2`, so the full view shows the batched path.
const spec: DiagramSpec = {
  title: "GraphQL resolvers calling services",
  width: 960,
  height: 520,
  steps: [
    { title: "Each field has a resolver" },
    { title: "N+1: one call per show" },
    { title: "DataLoader batches the calls" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 50, w: 150, h: 450 },
    { id: "server", title: "GraphQL server", tone: "green", x: 195, y: 50, w: 580, h: 450 },
    { id: "services", title: "Services", tone: "teal", x: 785, y: 50, w: 165, h: 450 },
  ],
  nodes: [
    { id: "phone", label: "Phone app", sub: "1 request", icon: "phone", tone: "neutral", x: 95, y: 230, w: 116, h: 58 },
    {
      id: "engine",
      label: "Query engine",
      sub: "parse, plan, run",
      icon: "api",
      tone: "green",
      accent: true,
      x: 320,
      y: 230,
      w: 140,
      h: 64,
    },
    { id: "r_me", label: "Query.me", sub: "runs once", icon: "code2", tone: "green", x: 520, y: 110, w: 170, h: 58 },
    {
      id: "r_subs",
      label: "User.subscriptions",
      sub: "runs once per user",
      icon: "code2",
      tone: "green",
      x: 520,
      y: 230,
      w: 170,
      h: 58,
    },
    {
      id: "r_latest",
      label: "Show.latestEpisode",
      sub: "runs once per show",
      icon: "code2",
      tone: "green",
      step: 2,
      x: 520,
      y: 350,
      w: 170,
      h: 58,
    },
    {
      id: "loader",
      label: "DataLoader",
      sub: "batch + cache",
      icon: "layers",
      tone: "green",
      step: 3,
      x: 700,
      y: 440,
      w: 120,
      h: 58,
    },
    {
      id: "users",
      label: "User service",
      sub: "GET /users/:id",
      icon: "users",
      tone: "teal",
      x: 870,
      y: 110,
      w: 146,
      h: 58,
    },
    {
      id: "shows",
      label: "Show service",
      sub: "GET /follows",
      icon: "feed",
      tone: "teal",
      x: 870,
      y: 230,
      w: 146,
      h: 58,
    },
    {
      id: "episodes",
      label: "Episode service",
      sub: "GET /episodes",
      icon: "media",
      tone: "teal",
      step: 2,
      x: 870,
      y: 350,
      w: 146,
      h: 58,
    },
  ],
  edges: [
    // Step 1: one request in, then the resolver tree runs top to bottom.
    { from: "phone", to: "engine", label: "1 query", flow: true, packet: true },
    { from: "engine", to: "r_me", label: "me", packet: true, delay: 0.8 },
    { from: "r_me", to: "users", label: "1 call", flow: true, packet: true, delay: 1.4 },
    { from: "r_me", to: "r_subs", label: "user 42", packet: true, delay: 1.8 },
    { from: "r_subs", to: "shows", label: "1 call", flow: true, packet: true, delay: 2.4 },

    // Step 2: one latestEpisode call per show: the N+1 problem.
    { from: "r_subs", to: "r_latest", label: "40 shows", packet: true, delay: 2.8 },
    {
      from: "r_latest",
      to: "episodes",
      label: "40 calls, one per show",
      tone: "red",
      flow: true,
      packet: true,
      delay: 3.2,
      duration: 0.8,
      until: 2,
    },

    // Step 3: the DataLoader gathers the 40 ids and sends one batch.
    { from: "r_latest", to: "loader", label: "40 loads", via: [[700, 350]], labelAt: 0.35, packet: true, delay: 3.2 },
    {
      from: "loader",
      to: "episodes",
      label: "1 batch call",
      tone: "green",
      via: [[870, 440]],
      labelAt: 0.4,
      flow: true,
      packet: true,
      delay: 3.8,
    },
  ],
};

export default spec;
