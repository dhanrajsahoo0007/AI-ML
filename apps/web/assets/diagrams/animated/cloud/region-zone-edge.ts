import type { DiagramSpec } from "@/components/diagrams/types";

// Regions, zones and the edge, told as Brightpost's evening without power (cloud/fundamentals/regions-zones-edge).
// Step 1: the whole shop (one app server and the orders database) runs in zone A of a region near London.
// Step 2: a second zone gets a second app server and a standby copy of the database, kept in sync; a load balancer
// that spans both zones takes every request. Step 3 (the failure step): zone A loses power for 3 hours; the load
// balancer gets no answer from server A and sends all traffic to zone B, where the standby becomes the primary.
// Step 4: an edge site near Sydney keeps copies of product photos, so far-away customers wait 10 ms, not 250 ms.
// Step 5: a second region, previewed: an asynchronous copy of the data and a small standby fleet.
//
// Nodes never move between steps. The power cut is a node (it stays, faded, as the reminder of what happened);
// the edges that change at the failure are twins: the step-3 versions end with `until: 3`, and the normal edges
// from LB to the servers carry no label, so a twin drawn on top of one never puts two labels in the same place.
//
// Layout: the home region holds two zones drawn as side-by-side bands (subnet kind, inline label, no tab), with
// the load balancer above them, half over each band, because a regional load balancer serves both zones.
//   Home region x 15-475: lb 245,205 | server-a 135,345 | server-b 355,345 | db 95,465 | standby 315,465 |
//   power 178,560 (bottom right of zone A, below the database's label).
//   Right column x 530-785: edge site (cdn 700,205; Sydney customers 700,60 above it, so their edge enters the
//   zone right of its tab) and the second region
//   (standby-servers 650,430; db-copy 650,560).
// The LB-to-server edges bend at y 252 and enter each band vertically, clear of the band's inline label. The copy
// to the second region leaves the database downwards at x 95 (left of the power cut) and runs along y 615, below
// both bands, into the bottom of the database copy.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left ~470 units. Steps 1 to 3 happen in
// the home region (x 15-475), so the free preview and the failure are visible without scrolling. Canvas 790 wide.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Sized for the
// longest name the Services toggle shows: "Application Gateway" (lb, w 196), "Virtual Machines" (servers, w 170+),
// "Azure PostgreSQL" (database copy, w 176).
const compute = { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" } as const;
const database = {
  aws: "aws-rds",
  gcp: "gcp-cloud-sql",
  azure: { id: "azure-postgresql", label: "Azure PostgreSQL" },
};

const spec: DiagramSpec = {
  title: "From one zone to two zones, the edge and a second region",
  width: 790,
  height: 660,
  steps: [
    { title: "One zone" },
    { title: "Two zones behind one load balancer" },
    { title: "Zone A loses power" },
    { title: "An edge site near far customers" },
    { title: "A second region, previewed" },
  ],
  zones: [
    { id: "home", title: "Home region (London)", tone: "neutral", kind: "region", x: 15, y: 140, w: 460, h: 495 },
    { id: "zone-a", title: "Zone A", tone: "blue", kind: "subnet", x: 30, y: 260, w: 210, h: 340 },
    { id: "zone-b", title: "Zone B", tone: "blue", kind: "subnet", x: 250, y: 260, w: 210, h: 340 },
    { id: "edge", title: "Edge site", tone: "blue", x: 530, y: 150, w: 255, h: 120 },
    { id: "second", title: "Second region (preview)", tone: "neutral", kind: "region", x: 530, y: 330, w: 240, h: 300 },
  ],
  nodes: [
    // Step 1
    {
      id: "users",
      label: "UK customers",
      sub: "most orders",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      x: 245,
      y: 60,
    },
    {
      id: "server-a",
      label: "App server",
      sub: "zone A",
      icon: "server",
      tone: "teal",
      x: 135,
      y: 345,
      w: 170,
      cloud: compute,
    },
    {
      id: "db",
      label: "Database",
      sub: "primary",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 95,
      y: 465,
      cloud: database,
    },

    // Step 2
    {
      id: "lb",
      label: "Load balancer",
      sub: "spans both zones",
      icon: "load-balancer",
      tone: "blue",
      step: 2,
      x: 245,
      y: 205,
      w: 196,
      h: 54,
      cloud: { aws: "aws-elb", gcp: "gcp-cloud-load-balancing", azure: "azure-app-gateway" },
    },
    {
      id: "server-b",
      label: "App server",
      sub: "zone B",
      icon: "server",
      tone: "teal",
      step: 2,
      x: 355,
      y: 345,
      w: 170,
      cloud: compute,
    },
    {
      id: "standby",
      label: "Standby",
      sub: "kept in sync",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 2,
      x: 315,
      y: 465,
      cloud: database,
    },

    // Step 3: the failure
    {
      id: "power",
      label: "Power cut",
      sub: "dark for 3 h",
      icon: "zap",
      tone: "red",
      step: 3,
      x: 178,
      y: 560,
      w: 122,
      h: 46,
    },

    // Step 4
    {
      id: "sydney",
      label: "Sydney customers",
      sub: "30 orders a day",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      step: 4,
      x: 700,
      y: 60,
    },
    {
      id: "cdn",
      label: "Edge cache",
      sub: "copies of photos",
      icon: "cdn",
      tone: "blue",
      step: 4,
      x: 700,
      y: 205,
      w: 160,
      cloud: { aws: "aws-cloudfront", gcp: "gcp-cloud-cdn", azure: "azure-front-door" },
    },

    // Step 5
    {
      id: "standby-servers",
      label: "Standby servers",
      sub: "small, ready to grow",
      icon: "server",
      tone: "teal",
      step: 5,
      x: 650,
      y: 430,
      w: 176,
      cloud: compute,
    },
    {
      id: "db-copy",
      label: "Database copy",
      sub: "seconds behind",
      icon: "database",
      tone: "violet",
      step: 5,
      x: 650,
      y: 560,
      w: 176,
      cloud: database,
    },
  ],
  edges: [
    // Step 1: customers reach the one server directly; it writes orders to the database next to it.
    { from: "users", to: "server-a", label: "HTTPS", packet: true, until: 1 },
    { from: "server-a", to: "db", label: "orders", packet: true, delay: 1 },

    // Step 2: the load balancer takes every request and shares it between the zones. Both servers write to the
    // one primary; every write is copied to the standby in zone B before it counts.
    { from: "users", to: "lb", label: "HTTPS", packet: true, step: 2 },
    { from: "lb", to: "server-a", packet: true, delay: 1, via: [[135, 252]], step: 2 },
    { from: "lb", to: "server-b", packet: true, delay: 1.6, via: [[355, 252]], step: 2 },
    { from: "server-b", to: "db", label: "across zones", packet: true, delay: 2.4, step: 2 },
    { from: "db", to: "standby", label: "sync copy", dashed: true, flow: true, step: 2 },

    // Step 3: zone A is dark. Health checks to server A get no answer, so every request goes to zone B, and the
    // standby is promoted to primary. These twins end at step 3: the zone comes back and the normal edges remain.
    {
      from: "lb",
      to: "server-a",
      label: "no answer",
      tone: "red",
      dashed: true,
      via: [[135, 252]],
      labelAt: 0.75,
      step: 3,
      until: 3,
    },
    {
      from: "lb",
      to: "server-b",
      label: "all traffic",
      packet: true,
      via: [[355, 252]],
      labelAt: 0.75,
      step: 3,
      until: 3,
    },
    { from: "server-b", to: "standby", label: "new primary", packet: true, delay: 1, step: 3, until: 3 },

    // Step 4: far customers get photos from the edge site; only misses travel to the home region.
    { from: "sydney", to: "cdn", label: "photos, 10 ms", packet: true, labelAt: 0.4, step: 4 },
    { from: "cdn", to: "lb", label: "misses, 250 ms", dashed: true, packet: true, delay: 1, labelAt: 0.3, step: 4 },

    // Step 5: a copy of the data in a second region, a few seconds behind, and a small fleet that could take over.
    {
      from: "db",
      to: "db-copy",
      label: "async copy",
      dashed: true,
      flow: true,
      via: [
        [95, 615],
        [650, 615],
      ],
      labelAt: 0.6,
      step: 5,
    },
    { from: "standby-servers", to: "db-copy", label: "would use", dashed: true, step: 5 },
  ],
};

export default spec;
