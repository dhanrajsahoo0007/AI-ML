import type { DiagramSpec } from "@/components/diagrams/types";

// What fails together, told as Brightpost's afternoon without card payments (cloud/resilience/availability-math).
// Step 1: every order crosses six parts in a row: the CDN, the load balancer, an app server (one per zone), a session
// cache with one node in zone B, the orders database (primary in zone B, synchronous standby in zone C) and an
// outside card-payment provider. Step 2 (the failure step): the payment provider stops answering for 3 hours; the
// cloud is healthy, but every checkout fails. Step 3: a second payment provider in parallel. Step 4: the session cache
// gets a copy in another zone. Step 5: a new version goes out one zone at a time (C, then B, then A), so one bad push
// cannot reach all three servers at once. Step 6: the provider's health feed tells the pipeline to hold deploys
// while the cloud itself has an incident.
//
// Nodes never move between steps. The outage is a node (it stays, faded, as the reminder of what happened). The edge
// from server A to the payment provider has three twins: the normal one ends at step 1, a red one lives only in
// step 2, and the normal one returns at step 3.
//
// Layout: columns are failure domains. Zone A (x 25-250), zone B (x 270-510) and zone C (x 530-770) are side-by-side
// bands (subnet kind: inline label, no tab) inside the region outline. Rows: provider-wide things on top (y 70), the
// regional load balancer and the deploy pipeline (y 195), servers (y 310), cache (y 420), database (y 530), and
// outside the cloud at the bottom (payments y 690, the outage y 800).
//   shoppers 135,70 | cdn 390,78 | health 687,78 | lb 390,195 | pipeline 687,195 |
//   server-a 135,310 | server-b 390,310 | server-c 650,310 | cache 390,420 | cache-copy 650,420 |
//   db 390,530 | standby 650,530 | payments 135,690 | backup 390,690 | outage 135,800.
// One order is followed through server A: its edges to the cache, the database and both payment providers fan out
// from its bottom. The payment edge runs straight down zone A, which holds nothing else; the backup edge bends at
// (262, 612), in the gutter below the zone bands, and the database edge bends at (262, 500), so both clear the
// cache and the database. The load balancer's edge to server C bends at (592, 243) so it enters zone C right of the
// band's inline label; the pipeline and health feed sit right of x 604, clear of that edge.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left ~480 units. The payment path, the
// single-zone cache and the outage sit in the left and middle columns, so the free preview and the failure are
// visible without scrolling; only steps 4 to 6 need the right column. Canvas 790 wide, taller rather than wider.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Sized for the longest
// name the Services toggle shows: "Cloud Load Balancing" (lb, w 204), "Virtual Machines" and "Azure PostgreSQL"
// (servers and database, w 172), "Azure Pipelines" (pipeline, w 166).
const compute = { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" } as const;
const database = {
  aws: "aws-rds",
  gcp: "gcp-cloud-sql",
  azure: { id: "azure-postgresql", label: "Azure PostgreSQL" },
};
const cache = {
  aws: "aws-elasticache",
  gcp: "gcp-memorystore",
  azure: { id: "azure-managed-redis", label: "Managed Redis" },
};

const spec: DiagramSpec = {
  title: "What fails together on Brightpost's order path",
  width: 790,
  height: 870,
  steps: [
    { title: "Every order crosses six parts in a row" },
    { title: "The payment provider stops answering" },
    { title: "A second payment provider in parallel" },
    { title: "The cache gets a copy in another zone" },
    { title: "New versions go out one zone at a time" },
    { title: "The provider's health feed holds deploys" },
  ],
  zones: [
    { id: "customers", title: "Customers", tone: "neutral", kind: "subnet", x: 25, y: 10, w: 225, h: 122 },
    { id: "edge", title: "Edge, provider-wide", tone: "blue", kind: "subnet", x: 270, y: 10, w: 240, h: 122 },
    { id: "status", title: "Provider status", tone: "orange", kind: "subnet", x: 530, y: 10, w: 245, h: 122 },
    { id: "region", title: "Region (London)", tone: "neutral", kind: "region", x: 15, y: 145, w: 765, h: 462 },
    { id: "zone-a", title: "Zone A", tone: "blue", kind: "subnet", x: 25, y: 255, w: 225, h: 340 },
    { id: "zone-b", title: "Zone B", tone: "blue", kind: "subnet", x: 270, y: 255, w: 240, h: 340 },
    { id: "zone-c", title: "Zone C", tone: "blue", kind: "subnet", x: 530, y: 255, w: 240, h: 340 },
    { id: "outside", title: "Outside", tone: "neutral", kind: "subnet", x: 15, y: 630, w: 495, h: 225 },
  ],
  nodes: [
    // Step 1: the order path as it was when the wholesale contract was signed.
    {
      id: "shoppers",
      label: "Shoppers",
      sub: "shop and wholesale",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      x: 135,
      y: 62,
    },
    {
      id: "cdn",
      label: "CDN",
      sub: "pages and photos",
      icon: "cdn",
      tone: "blue",
      x: 390,
      y: 78,
      w: 156,
      cloud: { aws: "aws-cloudfront", gcp: "gcp-cloud-cdn", azure: "azure-front-door" },
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "spans all three zones",
      icon: "load-balancer",
      tone: "blue",
      x: 390,
      y: 195,
      w: 204,
      cloud: { aws: "aws-elb", gcp: "gcp-cloud-load-balancing", azure: "azure-app-gateway" },
    },
    {
      id: "server-a",
      label: "App server",
      sub: "zone A",
      icon: "server",
      tone: "teal",
      x: 135,
      y: 310,
      w: 172,
      cloud: compute,
    },
    {
      id: "server-b",
      label: "App server",
      sub: "zone B",
      icon: "server",
      tone: "teal",
      x: 390,
      y: 310,
      w: 172,
      cloud: compute,
    },
    {
      id: "server-c",
      label: "App server",
      sub: "zone C",
      icon: "server",
      tone: "teal",
      x: 650,
      y: 310,
      w: 172,
      cloud: compute,
    },
    {
      id: "cache",
      label: "Session cache",
      sub: "1 node, zone B only",
      icon: "cache",
      tone: "orange",
      x: 390,
      y: 420,
      w: 162,
      cloud: cache,
    },
    {
      id: "db",
      label: "Orders database",
      sub: "primary",
      icon: "database",
      tone: "violet",
      x: 390,
      y: 530,
      w: 172,
      cloud: database,
    },
    {
      id: "standby",
      label: "Database standby",
      sub: "synchronous copy",
      icon: "database",
      tone: "violet",
      x: 650,
      y: 530,
      w: 176,
      cloud: database,
    },
    {
      id: "payments",
      label: "Card payments",
      sub: "outside provider",
      icon: "card",
      tone: "neutral",
      x: 135,
      y: 690,
      w: 166,
    },

    // Step 2: the failure.
    {
      id: "outage",
      label: "Provider outage",
      sub: "no answer for 3 h",
      icon: "zap",
      tone: "red",
      step: 2,
      x: 135,
      y: 800,
      w: 166,
    },

    // Step 3
    {
      id: "backup",
      label: "Backup payments",
      sub: "second provider",
      icon: "card",
      tone: "neutral",
      step: 3,
      x: 390,
      y: 690,
      w: 174,
    },

    // Step 4
    {
      id: "cache-copy",
      label: "Cache copy",
      sub: "zone C, takes over",
      icon: "cache",
      tone: "orange",
      step: 4,
      x: 650,
      y: 420,
      w: 162,
      cloud: cache,
    },

    // Step 5
    {
      id: "pipeline",
      label: "Deploy pipeline",
      sub: "one zone at a time",
      icon: "pipeline",
      tone: "orange",
      step: 5,
      x: 687,
      y: 195,
      w: 166,
      cloud: { aws: "aws-codepipeline", gcp: "gcp-cloud-deploy", azure: "azure-pipelines" },
    },

    // Step 6
    {
      id: "health",
      label: "Provider health",
      sub: "status and alerts",
      icon: "signal",
      tone: "orange",
      step: 6,
      x: 687,
      y: 78,
      w: 166,
      cloud: {
        aws: { label: "AWS Health" },
        gcp: { label: "Service Health" },
        azure: { label: "Service Health" },
      },
    },
  ],
  edges: [
    // Step 1: one order, followed through server A.
    { from: "shoppers", to: "cdn", label: "order", packet: true },
    { from: "cdn", to: "lb", label: "checkout", packet: true, delay: 0.6 },
    { from: "lb", to: "server-a", packet: true, delay: 1.2 },
    { from: "lb", to: "server-b" },
    { from: "lb", to: "server-c", via: [[592, 243]] },
    { from: "server-a", to: "cache", label: "session", labelAt: 0.62 },
    { from: "server-a", to: "db", label: "save order", via: [[262, 500]], labelAt: 0.45 },
    { from: "db", to: "standby", label: "sync copy" },
    { from: "server-a", to: "payments", label: "charge card", packet: true, delay: 1.8, labelAt: 0.72, until: 1 },

    // Step 2: the provider stops answering; the cloud is healthy, but every checkout waits and fails.
    {
      from: "server-a",
      to: "payments",
      label: "no answer: 3 h",
      tone: "red",
      dashed: true,
      labelAt: 0.72,
      step: 2,
      until: 2,
    },

    // Step 3: the normal call returns, and a second provider takes over when the first does not answer.
    { from: "server-a", to: "payments", label: "charge card", packet: true, labelAt: 0.72, step: 3 },
    {
      from: "server-a",
      to: "backup",
      label: "if no answer",
      dashed: true,
      via: [[262, 612]],
      labelAt: 0.88,
      step: 3,
    },

    // Step 4: the session cache keeps a copy in zone C.
    { from: "cache", to: "cache-copy", label: "copy", dashed: true, flow: true, step: 4 },

    // Step 5: a new version reaches zone C first, then B, then A, each only if the last one stayed healthy.
    { from: "pipeline", to: "server-c", label: "1st: zone C", packet: true, step: 5 },
    { from: "server-c", to: "server-b", label: "then B", dashed: true, step: 5 },
    { from: "server-b", to: "server-a", label: "then A", dashed: true, step: 5 },

    // Step 6: while the provider reports an incident in this region, nothing new is deployed.
    { from: "health", to: "pipeline", label: "incident: hold", dashed: true, flow: true, step: 6 },
  ],
};

export default spec;
