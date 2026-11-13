import type { DiagramSpec } from "@/components/diagrams/types";

// FLAGSHIP of the Networking & APIs hub (cloud/networking/vpc-and-subnets). Later pages and case studies embed it by
// step and highlight nodes by id, so the ids are part of the contract: users, scanner, igw, rt-public, rt-private,
// lb, app-a, app-b, app-c, db, db-standby, zone-loss. Never rename one.
//
// Step 1: Brightpost's first network. The app server and the orders database each have a public address, so
// customers reach the server directly and scanners on the internet reach the database. Step 2: a public subnet in
// front holds the load balancer, the only thing with a public address; the server and the database keep only
// private ones, and the scanners find nothing. Step 3: the same tiers in three zones: an app server in each, and a
// standby copy of the database in zone B. Step 4: the internet gateway and two route tables: the public subnets send
// 0.0.0.0/0 to the gateway, the app and data subnets have no route out at all. Step 5 (the only failure step):
// zone A is lost; the load balancer gets no answer from server A and shares the traffic between B and C, and the
// standby becomes the primary.
//
// Engine notes. A zone is drawn when it holds a visible node, and nodes never move, so the network, the app band and
// the data band are already there in step 1: every cloud server sits in some network, and step 1's problem is the
// two public addresses (edges with `until: 1`), not a missing boundary. Edges that a later step replaces are twins:
// customers go straight to the load balancer in steps 2-3 (`until: 3`) and through the gateway from step 4; the
// failure twins of step 5 end at step 5. The normal load-balancer-to-server edges carry no label, so a twin drawn on
// top never puts two labels in one place.
//
// Layout: rows are tiers, columns are zones. Tier bands (subnet kind) run across the network; the three zones are
// region-kind outlines drawn after the bands, so their lines cut each band into one piece per zone. That reads right
// on every cloud: one subnet per tier per zone where subnets are zonal, one subnet per tier where they span zones.
// The public band sits above the zone columns, because the load balancer serves all three zones and must not look
// as if it lives in zone A. The internet gateway straddles the region and network walls on the left: it is the door.
//   Internet (x 8-102): users 54,245 | scanner 54,530.
//   Top strip of the network: rt-public 470,132 | rt-private 680,132.
//   Public row (y 180-290): igw 196,245 (on the walls) | lb 460,245 in the public band (x 296-762).
//   Zone columns (y 320-690): A x 176-368 | B x 376-568 | C x 576-768; tabs end at x 260 / 460 / 660.
//   App band y 345-455: app-a 272,410 | app-b 472,410 | app-c 672,410.
//   Data band y 470-610: db 310,530 | db-standby 472,530 (zone C's data slice stays empty, room for a third copy).
//   zone-loss 272,650, under the data band in zone A.
// Edge routes: load balancer to server A runs down to y 300 (the corridor between the public band and the zone
// tabs), left to x 320 and down into server A's top, clear of the "APP SUBNETS" label and the zone A tab. To server
// B it drops at x 472 (right of the zone B tab); to server C it runs right along y 245 and drops at x 672. Server A
// reaches the database down x 310, right of the "DATA SUBNETS" label; that is why the database sits at x 310. Step 1's
// customer edge runs down the gutter between the Internet zone and the region (x 125). The route edge leaves the
// public route table to the left along y 132 and drops into the gateway.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left ~480 units. Steps 1, 2 and 5 (the free
// preview and the failure) happen in the Internet column, zone A and the load balancer, all left of x 560. The canvas
// stays under 800 wide so labels are readable in the 660 px article column.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Sized for the longest
// name the Services toggle shows: "Cloud Load Balancing" (lb, w 200), "Virtual Machines" (servers, w 168),
// "Internet gateway" (igw, w 176), "Azure PostgreSQL" (database glyphs).
const server = { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" } as const;
const database = {
  aws: "aws-rds",
  gcp: "gcp-cloud-sql",
  azure: { id: "azure-postgresql", label: "Azure PostgreSQL" },
};
const routes = {
  aws: { id: "aws-vpc", label: "Route table" },
  gcp: { id: "gcp-vpc", label: "VPC routes" },
  azure: { id: "azure-vnet", label: "Route table" },
};

// Load balancer to server A: down into the corridor, left, then down into the server's top.
const toServerA: [number, number][] = [
  [440, 300],
  [320, 300],
  [320, 376],
];

const spec: DiagramSpec = {
  title: "From two public machines to a private three-tier network across three zones",
  width: 800,
  height: 735,
  steps: [
    { title: "Two machines with public addresses" },
    { title: "Public, app and data subnets" },
    { title: "The same tiers in three zones" },
    { title: "Route tables and the internet gateway" },
    { title: "Zone A is lost" },
  ],
  zones: [
    { id: "internet", title: "Internet", tone: "neutral", x: 8, y: 190, w: 94, h: 430 },
    { id: "region", title: "London region", tone: "neutral", kind: "region", x: 148, y: 40, w: 644, h: 680 },
    { id: "network", title: "Shop network · 10.0.0.0/16", tone: "blue", kind: "vpc", x: 160, y: 80, w: 624, h: 625 },
    { id: "public", title: "Public subnets", tone: "green", kind: "subnet", x: 296, y: 180, w: 466, h: 110 },
    { id: "app", title: "App subnets", tone: "teal", kind: "subnet", x: 182, y: 345, w: 580, h: 110 },
    { id: "data", title: "Data subnets", tone: "violet", kind: "subnet", x: 182, y: 470, w: 580, h: 140 },
    { id: "zone-a", title: "Zone A", tone: "blue", kind: "region", x: 176, y: 320, w: 192, h: 370 },
    { id: "zone-b", title: "Zone B", tone: "blue", kind: "region", x: 376, y: 320, w: 192, h: 370 },
    { id: "zone-c", title: "Zone C", tone: "blue", kind: "region", x: 576, y: 320, w: 192, h: 370 },
  ],
  nodes: [
    // Step 1
    {
      id: "users",
      label: "Customers",
      sub: "on the internet",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      x: 54,
      y: 245,
    },
    {
      id: "scanner",
      label: "Scanners",
      sub: "140 addresses",
      icon: "radar",
      tone: "red",
      variant: "glyph",
      x: 54,
      y: 530,
    },
    {
      id: "app-a",
      label: "App server",
      sub: "zone A, 10.0.11.7",
      icon: "server",
      tone: "teal",
      x: 272,
      y: 410,
      w: 168,
      cloud: server,
    },
    {
      id: "db",
      label: "Database",
      sub: "primary, 10.0.21.5",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 310,
      y: 530,
      cloud: database,
    },

    // Step 2
    {
      id: "lb",
      label: "Load balancer",
      sub: "the only public address",
      icon: "load-balancer",
      tone: "blue",
      step: 2,
      x: 460,
      y: 245,
      w: 200,
      h: 54,
      cloud: { aws: "aws-elb", gcp: "gcp-cloud-load-balancing", azure: "azure-app-gateway" },
    },

    // Step 3
    {
      id: "app-b",
      label: "App server",
      sub: "zone B, 10.0.12.4",
      icon: "server",
      tone: "teal",
      step: 3,
      x: 472,
      y: 410,
      w: 168,
      cloud: server,
    },
    {
      id: "app-c",
      label: "App server",
      sub: "zone C, 10.0.13.9",
      icon: "server",
      tone: "teal",
      step: 3,
      x: 672,
      y: 410,
      w: 168,
      cloud: server,
    },
    {
      id: "db-standby",
      label: "Standby",
      sub: "zone B, in sync",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 3,
      x: 472,
      y: 530,
      cloud: database,
    },

    // Step 4
    {
      id: "igw",
      label: "Internet gateway",
      sub: "door to the internet",
      icon: "router",
      tone: "blue",
      step: 4,
      x: 196,
      y: 245,
      w: 176,
      h: 54,
      cloud: {
        aws: { id: "aws-vpc", label: "Internet gateway" },
        gcp: { id: "gcp-vpc", label: "Internet gateway" },
        azure: { id: "azure-vnet", label: "System route" },
      },
    },
    {
      id: "rt-public",
      label: "Public routes",
      sub: "0.0.0.0/0 → gateway",
      icon: "map",
      tone: "blue",
      step: 4,
      x: 470,
      y: 132,
      w: 170,
      h: 52,
      cloud: routes,
    },
    {
      id: "rt-private",
      label: "Private routes",
      sub: "10.0.0.0/16 → local",
      icon: "map",
      tone: "blue",
      step: 4,
      x: 680,
      y: 132,
      w: 170,
      h: 52,
      cloud: routes,
    },

    // Step 5: the failure
    {
      id: "zone-loss",
      label: "Zone A lost",
      sub: "every machine in it",
      icon: "zap",
      tone: "red",
      step: 5,
      x: 272,
      y: 650,
      w: 164,
      h: 46,
    },
  ],
  edges: [
    // Step 1: two public addresses. Customers reach the server directly; scanners reach the database.
    {
      from: "users",
      to: "app-a",
      label: "public address",
      packet: true,
      via: [
        [125, 245],
        [125, 410],
      ],
      labelAt: 0.55,
      until: 1,
    },
    { from: "app-a", to: "db", label: "orders", packet: true, delay: 1, via: [[310, 445]], labelAt: 0.25 },
    { from: "scanner", to: "db", label: "public address", tone: "red", packet: true, until: 1 },

    // Step 2: only the load balancer is public. The server and the database keep private addresses only.
    { from: "users", to: "lb", label: "HTTPS", packet: true, step: 2, until: 3 },
    { from: "lb", to: "app-a", packet: true, delay: 1, via: toServerA },
    { from: "scanner", to: "db", label: "no public address", tone: "red", dashed: true, step: 2 },

    // Step 3: a server in each zone; every write is copied to the standby in zone B before it counts.
    { from: "lb", to: "app-b", packet: true, delay: 1.4, via: [[472, 300]] },
    { from: "lb", to: "app-c", packet: true, delay: 1.8, via: [[672, 245]] },
    { from: "db", to: "db-standby", label: "sync copy", dashed: true, flow: true },

    // Step 4: every packet from the internet passes the gateway. Only the public route table points at it.
    { from: "users", to: "igw", packet: true, step: 4 },
    { from: "igw", to: "lb", packet: true, delay: 0.6, step: 4 },
    { from: "rt-public", to: "igw", label: "0.0.0.0/0", dashed: true, via: [[196, 132]], step: 4 },

    // Step 5: zone A is dark. Health checks to server A get no answer; B and C take half each; the standby takes over.
    {
      from: "lb",
      to: "app-a",
      label: "no answer",
      tone: "red",
      dashed: true,
      via: toServerA,
      step: 5,
      until: 5,
    },
    { from: "lb", to: "app-b", label: "half", packet: true, via: [[472, 300]], labelAt: 0.85, step: 5, until: 5 },
    { from: "lb", to: "app-c", label: "half", packet: true, via: [[672, 245]], labelAt: 0.85, step: 5, until: 5 },
    { from: "app-b", to: "db-standby", label: "new primary", packet: true, delay: 1, step: 5, until: 5 },
  ],
};

export default spec;
