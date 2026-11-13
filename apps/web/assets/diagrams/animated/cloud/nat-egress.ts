import type { DiagramSpec } from "@/components/diagrams/types";

// NAT and leaving the network, told as Brightpost's Saturday without a way out (cloud/networking/nat-and-egress).
// Step 1: the app server in zone A has only a private address. It calls the payment provider through a NAT gateway
// in a public subnet; a stranger who tries to start a connection inward is refused. Step 2: the app servers in zones
// B and C use the same NAT, so their calls cross into zone A. Step 3 (the failure step): zone A's network fails for
// 50 minutes, and zones B and C lose their only way out: every checkout fails. Step 4: one NAT per zone; each zone's
// servers leave through their own zone. Step 5: the bill: most gigabytes through the NATs go to the cloud's own
// storage service. Step 6: a private endpoint carries storage traffic, and the NAT never sees it. Step 7: an egress
// filter allows only known destinations; the printing partner allow-lists Brightpost's fixed NAT addresses, and a
// call to an unknown site is blocked.
//
// Nodes never move between steps. Edges that a later step replaces are twins: the cross-zone calls of step 2 end at
// step 2 (`until: 2`), their red step-3 versions end at step 3, and the NAT-to-storage edge of step 5 ends at step 5.
//
// Layout: the network is three zone columns side by side (A x 18-204, B x 207-393, C x 396-582). Inside each
// column a private subnet holds the app server (row y 230) and, below it, a public subnet holds the NAT (row y 360).
// Leaving the network goes DOWN, into the Internet band at the bottom (y 555-680), so no outbound edge crosses the
// zone and subnet labels, which sit at the top-left of their bands. The cross-zone calls of steps 2 and 3 run along
// the corridor between the two subnet rows (y 290). The private endpoint sits above the zone columns, inside the
// network (480,85); every server's edge to it runs up and to the right, and server A's edge goes straight up first,
// so it clears the zone B labels. The right column, outside the network, holds the cloud's storage service (700,240)
// and the egress filter (700,360).
//   serverA 111,230 | serverB 300,230 | serverC 489,230 | natA 111,360 | natB 300,360 | natC 489,360 |
//   fault 64,440 (glyph, zone A, left of NAT A's edges) | endpoint 480,85 | storage 700,240 | rules 700,360 |
//   stranger 160,620 | payment 330,620 | partner 560,620 | unknown 718,620.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left ~480 units. Steps 1 to 4 happen in
// zones A and B and most of zone C, with the stranger and the payment provider under them, so the free preview and
// the failure are visible without scrolling. Canvas 795 wide.
//
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Sized for the longest
// name the Services toggle shows: "Compute Engine" (servers, w 156), "Private Google Access" (endpoint, w 210),
// "Network Firewall" (filter, w 176). The Azure server name is shortened to "Azure VM" so the server fits its subnet.
const servers = { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: { id: "azure-vm", label: "Azure VM" } };
const nat = { aws: { label: "NAT gateway" }, gcp: { label: "Cloud NAT" }, azure: { label: "NAT Gateway" } };

const spec: DiagramSpec = {
  title: "From one shared NAT to a way out in every zone, a private path to storage and an egress allow-list",
  width: 795,
  height: 695,
  steps: [
    { title: "One NAT gateway: out yes, in no" },
    { title: "Three zones share one NAT" },
    { title: "Zone A fails, and every zone loses its way out" },
    { title: "One NAT per zone" },
    { title: "The bill: most NAT traffic goes to cloud storage" },
    { title: "A private endpoint for the cloud's own storage" },
    { title: "Fixed addresses and an egress allow-list" },
  ],
  zones: [
    { id: "network", title: "Network", tone: "blue", kind: "vpc", x: 10, y: 30, w: 590, h: 500 },
    { id: "zone-a", title: "Zone A", tone: "neutral", kind: "subnet", x: 18, y: 140, w: 186, h: 375 },
    { id: "zone-b", title: "Zone B", tone: "neutral", kind: "subnet", x: 207, y: 140, w: 186, h: 375 },
    { id: "zone-c", title: "Zone C", tone: "neutral", kind: "subnet", x: 396, y: 140, w: 186, h: 375 },
    { id: "priv-a", title: "Private", tone: "teal", kind: "subnet", x: 24, y: 170, w: 174, h: 105 },
    { id: "priv-b", title: "Private", tone: "teal", kind: "subnet", x: 213, y: 170, w: 174, h: 105 },
    { id: "priv-c", title: "Private", tone: "teal", kind: "subnet", x: 402, y: 170, w: 174, h: 105 },
    { id: "pub-a", title: "Public", tone: "blue", kind: "subnet", x: 24, y: 305, w: 174, h: 105 },
    { id: "pub-b", title: "Public", tone: "blue", kind: "subnet", x: 213, y: 305, w: 174, h: 105 },
    { id: "pub-c", title: "Public", tone: "blue", kind: "subnet", x: 402, y: 305, w: 174, h: 105 },
    { id: "services", title: "Cloud services", tone: "violet", kind: "subnet", x: 612, y: 150, w: 173, h: 140 },
    { id: "internet", title: "Internet", tone: "neutral", kind: "subnet", x: 10, y: 555, w: 780, h: 125 },
  ],
  nodes: [
    // Step 1
    {
      id: "serverA",
      label: "App server",
      sub: "private address",
      icon: "server",
      tone: "teal",
      x: 111,
      y: 230,
      w: 156,
      cloud: servers,
    },
    {
      id: "natA",
      label: "NAT gateway",
      sub: "one public address",
      icon: "nat",
      tone: "blue",
      x: 111,
      y: 360,
      w: 156,
      cloud: nat,
    },
    {
      id: "payment",
      label: "Payment provider",
      sub: "card checks",
      icon: "card",
      tone: "neutral",
      x: 330,
      y: 620,
      w: 176,
    },
    {
      id: "stranger",
      label: "Stranger",
      sub: "starts a call in",
      icon: "robot",
      tone: "red",
      x: 160,
      y: 620,
      w: 144,
    },

    // Step 2
    {
      id: "serverB",
      label: "App server",
      sub: "private address",
      icon: "server",
      tone: "teal",
      step: 2,
      x: 300,
      y: 230,
      w: 156,
      cloud: servers,
    },
    {
      id: "serverC",
      label: "App server",
      sub: "private address",
      icon: "server",
      tone: "teal",
      step: 2,
      x: 489,
      y: 230,
      w: 156,
      cloud: servers,
    },

    // Step 3: the failure
    {
      id: "fault",
      label: "Zone A down",
      sub: "50 minutes",
      icon: "flag",
      tone: "red",
      variant: "glyph",
      step: 3,
      x: 64,
      y: 440,
    },

    // Step 4
    {
      id: "natB",
      label: "NAT gateway",
      sub: "one public address",
      icon: "nat",
      tone: "blue",
      step: 4,
      x: 300,
      y: 360,
      w: 156,
      cloud: nat,
    },
    {
      id: "natC",
      label: "NAT gateway",
      sub: "one public address",
      icon: "nat",
      tone: "blue",
      step: 4,
      x: 489,
      y: 360,
      w: 156,
      cloud: nat,
    },

    // Step 5
    {
      id: "storage",
      label: "Object storage",
      sub: "release package",
      icon: "blob",
      tone: "violet",
      step: 5,
      x: 700,
      y: 240,
      w: 170,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },

    // Step 6
    {
      id: "endpoint",
      label: "Private endpoint",
      sub: "storage without NAT",
      icon: "link",
      tone: "blue",
      step: 6,
      x: 480,
      y: 85,
      w: 210,
      cloud: {
        aws: { label: "Gateway endpoint" },
        gcp: { label: "Private Google Access" },
        azure: { id: "azure-private-link", label: "Private endpoint" },
      },
    },

    // Step 7
    {
      id: "rules",
      label: "Egress filter",
      sub: "3 destinations allowed",
      icon: "firewall",
      tone: "red",
      step: 7,
      x: 700,
      y: 360,
      w: 176,
      cloud: {
        aws: { label: "Network Firewall" },
        gcp: { label: "Cloud NGFW" },
        azure: { label: "Azure Firewall" },
      },
    },
    {
      id: "partner",
      label: "Printing partner",
      sub: "lists 3 addresses",
      icon: "building",
      tone: "neutral",
      step: 7,
      x: 560,
      y: 620,
      w: 170,
    },
    {
      id: "unknown",
      label: "Unknown site",
      sub: "not on the list",
      icon: "globe",
      tone: "red",
      step: 7,
      x: 718,
      y: 620,
      w: 140,
    },
  ],
  edges: [
    // Step 1: the server calls out through the NAT; a call that starts outside has nowhere to go.
    { from: "serverA", to: "natA", label: "outbound", packet: true },
    { from: "natA", to: "payment", label: "card check", packet: true, delay: 1.2, until: 2 },
    { from: "stranger", to: "natA", label: "start a call in: refused", tone: "red", dashed: true, labelAt: 0.3 },

    // Step 2: zones B and C have no NAT of their own; their route sends them across to zone A.
    // Both run along the corridor between the subnet rows (y 290), then up into NAT A.
    {
      from: "serverB",
      to: "natA",
      packet: true,
      via: [
        [300, 290],
        [160, 290],
      ],
      until: 2,
    },
    {
      from: "serverC",
      to: "natA",
      label: "across to zone A",
      packet: true,
      via: [
        [489, 290],
        [160, 290],
      ],
      labelAt: 0.3,
      until: 2,
    },

    // Step 3: zone A fails; the only way out goes with it.
    {
      from: "serverB",
      to: "natA",
      tone: "red",
      dashed: true,
      via: [
        [300, 290],
        [160, 290],
      ],
      step: 3,
      until: 3,
    },
    {
      from: "serverC",
      to: "natA",
      label: "no way out",
      tone: "red",
      dashed: true,
      via: [
        [489, 290],
        [160, 290],
      ],
      labelAt: 0.3,
      step: 3,
      until: 3,
    },

    // Step 4: every zone leaves through its own NAT.
    { from: "serverB", to: "natB", label: "outbound", packet: true, step: 4 },
    { from: "serverC", to: "natC", label: "outbound", packet: true, step: 4 },
    { from: "natA", to: "payment", label: "card check", packet: true, delay: 1.2, step: 4 },
    { from: "natB", to: "payment", packet: true, delay: 1.2, step: 4 },
    { from: "natC", to: "payment", packet: true, delay: 1.2, step: 4 },

    // Step 5: the release package and other storage traffic goes out through the NAT and back into the cloud.
    {
      from: "natC",
      to: "storage",
      label: "8 in 10 NAT gigabytes",
      tone: "orange",
      packet: true,
      delay: 1.2,
      labelAt: 0.5,
      until: 5,
    },

    // Step 6: storage traffic takes the private endpoint; the NAT carries only internet traffic.
    {
      from: "serverA",
      to: "endpoint",
      label: "to storage",
      packet: true,
      via: [[111, 120]],
      labelAt: 0.55,
      step: 6,
    },
    { from: "serverB", to: "endpoint", packet: true, step: 6 },
    { from: "serverC", to: "endpoint", packet: true, step: 6 },
    { from: "endpoint", to: "storage", label: "private path", packet: true, delay: 1.2, step: 6 },

    // Step 7: every outbound call passes the filter. The partner sees a fixed address; an unknown site is refused.
    { from: "natC", to: "rules", packet: true, step: 7 },
    { from: "rules", to: "partner", label: "listed address", packet: true, delay: 1.2, step: 7 },
    { from: "rules", to: "unknown", label: "blocked", tone: "red", dashed: true, step: 7 },
  ],
};

export default spec;
