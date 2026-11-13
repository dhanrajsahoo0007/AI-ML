import type { DiagramSpec } from "@/components/diagrams/types";

// Peering, hub-and-spoke and transit, told as Brightpost's lost print jobs (cloud/networking/connecting-networks).
// Step 1: the shop network is peered with the printing partner's network, and print jobs cross that one peering.
// Step 2 (the failure step): the new wholesale network is peered with the shop network. Its print jobs reach the
// shop network, and the shop network does not pass them on to the partner: peering does not chain. Step 3: the fix
// by peerings alone: four networks need six peerings, one per pair. Step 4: a transit hub in the network account
// replaces the mesh; each network attaches once, and the partner link hangs off the hub. Step 5: a firewall in the
// hub inspects traffic between spokes. Step 6: the test network attaches to its own route table in the hub; it
// reaches the shared tools but has no route to the live shop.
//
// Nodes never move between steps. Peerings are edges that end at step 3 (`until: 3`), so the hub's attachments
// replace them without anything moving; the refused hop of step 2 ends at step 2.
//
// Layout: three columns and three rows, a plus sign around the hub.
//   Left (x 110): shop 110,330 | test 110,560.
//   Middle (x 370): partner 370,95 | hub 370,330 | wholesale 370,560.
//   Right (x 650): firewall 650,330 | tools 650,560.
// Every spoke reaches the hub on a straight line. The "Network account" zone uses the region kind, whose tab is
// narrower than a group's: it ends near x 354, so the partner's link drops down x 370 clear of it. The diagonal
// attachments from test and tools enter the zone through its bottom edge, where there is no tab. Peering 5 runs
// under the bottom row (y 622): the gap between wholesale and tools is too narrow for its label. Step 2's refused
// hop leaves the shop upwards along x 110 and turns right along y 95 into the partner, so it never lies on top of
// the diagonal peering 1.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 and 2 (the free
// preview and the failure) use only the shop, the partner and the wholesale network, all left of x 466. The right
// column is first needed in step 3. The canvas stays under 800 wide so labels are readable in the 660 px column.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. Nodes
// are sized for the longest name the Services toggle puts in them ("VNet 172.16.0.0/16", "Firewall appliance",
// "Virtual WAN hub", "Transit Gateway"), not only for the generic label.
const network = (range: string) => ({
  aws: { id: "aws-vpc", label: `VPC ${range}` },
  gcp: { id: "gcp-vpc", label: `VPC ${range}` },
  azure: { id: "azure-vnet", label: `VNet ${range}` },
});

const spec: DiagramSpec = {
  title: "From one peering to a transit hub",
  width: 795,
  height: 650,
  steps: [
    { title: "One peering: the shop and the printing partner" },
    { title: "A second peering does not chain" },
    { title: "Peering every pair: six links for four networks" },
    { title: "One hub, one attachment per network" },
    { title: "Inspection in the hub" },
    { title: "Route tables keep test away from live" },
  ],
  zones: [{ id: "netacct", title: "Network account", tone: "blue", kind: "region", x: 202, y: 262, w: 583, h: 136 }],
  nodes: [
    // Step 1
    {
      id: "shop",
      label: "Shop network",
      sub: "10.0.0.0/16",
      icon: "network",
      tone: "blue",
      x: 110,
      y: 330,
      w: 170,
      cloud: network("10.0.0.0/16"),
    },
    {
      id: "partner",
      label: "Partner network",
      sub: "172.16.0.0/16",
      icon: "building",
      tone: "neutral",
      x: 370,
      y: 95,
      w: 190,
      cloud: network("172.16.0.0/16"),
    },

    // Step 2: the failure
    {
      id: "wholesale",
      label: "Wholesale network",
      sub: "10.2.0.0/16",
      icon: "network",
      tone: "blue",
      step: 2,
      x: 370,
      y: 560,
      w: 190,
      cloud: network("10.2.0.0/16"),
    },

    // Step 3
    {
      id: "tools",
      label: "Shared tools",
      sub: "10.3.0.0/16",
      icon: "network",
      tone: "blue",
      step: 3,
      x: 650,
      y: 560,
      w: 180,
      cloud: network("10.3.0.0/16"),
    },

    // Step 4
    {
      id: "hub",
      label: "Transit hub",
      sub: "passes traffic on",
      icon: "router",
      tone: "blue",
      accent: true,
      step: 4,
      x: 370,
      y: 330,
      w: 176,
      cloud: {
        aws: { id: "aws-transit-gateway", label: "Transit Gateway" },
        gcp: { label: "NCC hub" },
        azure: { label: "Virtual WAN hub" },
      },
    },

    // Step 5
    {
      id: "firewall",
      label: "Hub firewall",
      sub: "inspects every hop",
      icon: "firewall",
      tone: "red",
      step: 5,
      x: 650,
      y: 330,
      w: 190,
      cloud: {
        aws: { label: "Network Firewall" },
        gcp: { label: "Firewall appliance" },
        azure: { label: "Azure Firewall" },
      },
    },

    // Step 6
    {
      id: "test",
      label: "Test network",
      sub: "10.1.0.0/16",
      icon: "network",
      tone: "blue",
      step: 6,
      x: 110,
      y: 560,
      w: 170,
      cloud: network("10.1.0.0/16"),
    },
  ],
  edges: [
    // Step 1: one peering carries the shop's print jobs to the partner.
    { from: "shop", to: "partner", label: "peering 1", packet: true, until: 3 },

    // Step 2: the wholesale network peers with the shop. Its print job reaches the shop network and stops there.
    { from: "wholesale", to: "shop", label: "peering 2", packet: true, until: 3 },
    {
      from: "shop",
      to: "partner",
      label: "wholesale job: dropped",
      tone: "red",
      dashed: true,
      via: [[110, 95]],
      labelAt: 0.62,
      step: 2,
      until: 2,
    },

    // Step 3: peering every pair. Four networks, six peerings, each with its own routes on both sides.
    { from: "wholesale", to: "partner", label: "peering 3", labelAt: 0.62, step: 3, until: 3 },
    { from: "shop", to: "tools", label: "peering 4", labelAt: 0.3, step: 3, until: 3 },
    {
      from: "wholesale",
      to: "tools",
      label: "peering 5",
      via: [
        [370, 622],
        [650, 622],
      ],
      step: 3,
      until: 3,
    },
    { from: "partner", to: "tools", label: "peering 6", labelAt: 0.4, step: 3, until: 3 },

    // Step 4: every network attaches once to the hub; the partner link hangs off the hub.
    { from: "wholesale", to: "hub", label: "attached", packet: true },
    { from: "hub", to: "partner", label: "one link", packet: true, delay: 1.2 },
    { from: "shop", to: "hub", label: "attached" },
    { from: "tools", to: "hub", label: "attached", labelAt: 0.35 },

    // Step 5: traffic between spokes turns through the firewall before it leaves the hub.
    { from: "hub", to: "firewall", label: "inspect", bidirectional: true, packet: true, step: 5 },

    // Step 6: the test network gets its own route table in the hub. It reaches the tools, never the live shop.
    { from: "test", to: "hub", label: "own table", labelAt: 0.35 },
    { from: "test", to: "shop", label: "no route", tone: "red", dashed: true },
  ],
};

export default spec;
