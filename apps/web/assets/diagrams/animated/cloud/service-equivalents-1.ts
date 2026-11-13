import type { DiagramSpec } from "@/components/diagrams/types";

// A translation trap, told as Brightpost's trial copy of its shop on a second provider
// (cloud/start-here/service-equivalents). The Services toggle renames every box; the point is that one setting does
// not live in the same box on every cloud.
//
// Step 1: the copy is translated box by box. Every box has a counterpart, but the server group starts all 3 servers
// in zone A, because the zone setting stayed behind. Step 2 (the only failure step): a drill cuts zone A off for
// 15 minutes; nothing answers the load balancer, and every test shopper gets errors. Step 3: the zone-spread setting
// is put where this cloud keeps it, and the group starts 1 server in each zone. Step 4: the same drill again; the
// servers in zones B and C keep selling.
//
// Nodes never move and never disappear. What changes is carried by edges with `until`: "starts 3 here" ends at
// step 2, the failure edges end at step 2, and the load balancer's edge into zone A ends at step 3, because zone A is
// cut off again in step 4.
//
// Layout: zone bands are stacked rows, so every zone's server sits in the middle column and the left column can
// reach each one with a short edge.
//   Top, outside the region: test shoppers 100,58.
//   Region (x 4-782, y 140-630). Top row: load balancer 380,196 | private network 668,196.
//   Left column (regional, in no zone): zone drill 100,305 | server group 100,427 | zone spread 100,549.
//   Zone bands (subnet kind, inline label, x 226-774): A y 250-360 (app-a 380,305 | db 668,305),
//   B y 372-482 (app-b 380,427 | standby 668,427), C y 494-604 (app-c 380,549).
//
// Why this order: on a phone the figure opens on the left ~480 units. Steps 1 and 2 (the free picture and the
// failure) happen in the left and middle columns; only the database pair and the network sit on the right.
// Edge routes: the shoppers' edge bends at 180,196 so it passes right of the region tab. The error edge leaves the
// load balancer upwards and runs along the top row back to the shoppers. In step 4 the load balancer reaches zones B
// and C down two channels (x 530 and 556) between the servers and the database column.
// Text room: about 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Nodes are
// sized for the longest name the Services toggle shows: "Cloud Load Balancing" (lb, w 206), "VPC network, global"
// (network, w 196), "Auto Scaling group" (group, w 184), "Virtual Machines" (servers, w 174), "Azure Postgres"
// (database pair, w 166).
const server = { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" } as const;
const database = {
  aws: "aws-rds",
  gcp: "gcp-cloud-sql",
  azure: { id: "azure-postgresql", label: "Azure Postgres" },
};

const spec: DiagramSpec = {
  title: "One shop translated to another cloud: the zone setting that stayed behind",
  width: 790,
  height: 645,
  steps: [
    { title: "Translated box by box" },
    { title: "Zone drill: the copy goes dark" },
    { title: "Zone spread, set where this cloud keeps it" },
    { title: "Drill again: zones B and C keep selling" },
  ],
  zones: [
    { id: "region", title: "One region", tone: "neutral", kind: "region", x: 4, y: 140, w: 778, h: 490 },
    { id: "zone-a", title: "Zone A", tone: "blue", kind: "subnet", x: 226, y: 250, w: 548, h: 110 },
    { id: "zone-b", title: "Zone B", tone: "blue", kind: "subnet", x: 226, y: 372, w: 548, h: 110 },
    { id: "zone-c", title: "Zone C", tone: "blue", kind: "subnet", x: 226, y: 494, w: 548, h: 110 },
  ],
  nodes: [
    // Step 1: the copy, every box translated.
    {
      id: "shoppers",
      label: "Test shoppers",
      sub: "200 at once",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      x: 100,
      y: 58,
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "one address",
      icon: "load-balancer",
      tone: "blue",
      x: 380,
      y: 196,
      w: 206,
      cloud: {
        aws: { id: "aws-elb", label: "Application LB" },
        gcp: "gcp-cloud-load-balancing",
        azure: "azure-app-gateway",
      },
    },
    {
      id: "network",
      label: "Private network",
      sub: "holds the subnets",
      icon: "router",
      tone: "blue",
      x: 668,
      y: 196,
      w: 196,
      cloud: {
        aws: { id: "aws-vpc", label: "VPC, one region" },
        gcp: { id: "gcp-vpc", label: "VPC network, global" },
        azure: { id: "azure-vnet", label: "VNet, one region" },
      },
    },
    {
      id: "group",
      label: "Server group",
      sub: "keeps 3 running",
      icon: "controller",
      tone: "teal",
      x: 100,
      y: 427,
      w: 184,
      cloud: {
        aws: { label: "Auto Scaling group" },
        gcp: { label: "Instance group" },
        azure: { label: "VM Scale Set" },
      },
    },
    {
      id: "app-a",
      label: "App servers",
      sub: "in zone A",
      icon: "server",
      tone: "teal",
      x: 380,
      y: 305,
      w: 174,
      cloud: server,
    },
    {
      id: "db",
      label: "Orders database",
      sub: "main copy",
      icon: "database",
      tone: "violet",
      x: 668,
      y: 305,
      w: 166,
      cloud: database,
    },
    {
      id: "standby",
      label: "Standby copy",
      sub: "takes over in 2 min",
      icon: "database",
      tone: "violet",
      x: 668,
      y: 427,
      w: 166,
      cloud: database,
    },

    // Step 2: the failure.
    {
      id: "drill",
      label: "Zone drill",
      sub: "cuts zone A, 15 min",
      icon: "flag",
      tone: "red",
      step: 2,
      x: 100,
      y: 305,
      w: 184,
    },

    // Step 3: the fix.
    {
      id: "spread",
      label: "Zone spread",
      sub: "one server per zone",
      icon: "partition",
      tone: "green",
      step: 3,
      x: 100,
      y: 549,
      w: 184,
      cloud: {
        aws: { label: "3 subnets listed" },
        gcp: { label: "Regional group" },
        azure: { label: "Zones on the set" },
      },
    },
    {
      id: "app-b",
      label: "App servers",
      sub: "in zone B",
      icon: "server",
      tone: "teal",
      step: 3,
      x: 380,
      y: 427,
      w: 174,
      cloud: server,
    },
    {
      id: "app-c",
      label: "App servers",
      sub: "in zone C",
      icon: "server",
      tone: "teal",
      step: 3,
      x: 380,
      y: 549,
      w: 174,
      cloud: server,
    },
  ],
  edges: [
    // Step 1: shoppers reach the load balancer; the group starts every server in zone A.
    { from: "shoppers", to: "lb", label: "requests", packet: true, via: [[180, 196]], labelAt: 0.8 },
    { from: "lb", to: "app-a", label: "shares out", packet: true, delay: 1, until: 1 },
    { from: "group", to: "app-a", label: "starts 3 here", until: 2 },
    { from: "app-a", to: "db", label: "orders", packet: true, delay: 2, labelAt: 0.3 },
    { from: "db", to: "standby", label: "copies writes", dashed: true, flow: true },

    // Step 2: zone A is cut off. Nothing answers, and every test shopper gets an error page.
    { from: "drill", to: "app-a", label: "cuts zone A", tone: "red", step: 2, until: 2 },
    { from: "lb", to: "app-a", label: "no answer", tone: "red", dashed: true, step: 2, until: 2 },
    {
      from: "lb",
      to: "shoppers",
      label: "errors, 15 min",
      tone: "red",
      dashed: true,
      via: [[380, 58]],
      labelAt: 0.62,
      step: 2,
      until: 2,
    },

    // Step 3: the zone setting lives where this cloud keeps it, and the group starts one server per zone.
    { from: "spread", to: "group", label: "zones A, B, C", step: 3 },
    { from: "group", to: "app-a", step: 3 },
    { from: "group", to: "app-b", label: "1 each", step: 3 },
    { from: "group", to: "app-c", via: [[250, 549]], step: 3 },
    { from: "lb", to: "app-a", label: "shares out", packet: true, step: 3, until: 3 },

    // Step 4: the same drill again. Zones B and C take every request.
    { from: "drill", to: "app-a", label: "cuts zone A", tone: "red", step: 4 },
    {
      from: "lb",
      to: "app-b",
      packet: true,
      via: [
        [530, 196],
        [530, 427],
      ],
      step: 4,
    },
    {
      from: "lb",
      to: "app-c",
      label: "keeps selling",
      packet: true,
      delay: 0.6,
      via: [
        [556, 196],
        [556, 549],
      ],
      labelAt: 0.78,
      step: 4,
    },
  ],
};

export default spec;
