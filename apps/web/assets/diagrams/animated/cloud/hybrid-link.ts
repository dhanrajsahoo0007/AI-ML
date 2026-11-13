import type { DiagramSpec } from "@/components/diagrams/types";

// Hybrid connectivity, told as the story of Brightpost's link to its printing partner's factory
// (cloud/networking/hybrid-connectivity). Step 1: print orders leave the shop through the NAT gateway and cross the
// public internet to the factory, which allow-lists the NAT's addresses. Step 2: a site-to-site VPN: one encrypted
// tunnel from the cloud's VPN gateway to the factory router, and print jobs travel over it. Step 3 (the failure step):
// on a sale day that one tunnel drops for 2 h 15 min and 1,100 print jobs wait in the shop. Step 4: two tunnels, each
// with a BGP session, so routes move to the healthy one. Step 5: a private line through a meeting site carries the
// traffic, and the tunnels stay as the backup path. Step 6: DNS lookups are forwarded both ways over the link.
//
// Nodes never move between steps. A tunnel is an edge, not a node, so the one tunnel of steps 2-3 can be replaced by
// two tunnels in step 4 (`until`), and the busy tunnels of step 4 become dashed standby tunnels in step 5.
//
// Layout: four rows that read top to bottom, from the factory to the cloud.
//   Row A (y 100), the factory: print server | factory router | factory DNS.
//   Row B (y 250), in between: the public internet (left, inside the Internet zone) | the meeting site (right).
//   Row C (y 420), the cloud's edge: NAT gateway | VPN gateway | private line.
//   Row D (y 570), inside the cloud: print API | network hub | DNS resolver.
// Columns (centres): left x 130 | middle x 375 | right x 665. The middle column ends at x 465, so a phone shows it.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 to 4 use only the
// left and middle columns; the private line (step 5) and DNS (step 6) live in the right column.
//
// The tunnels run straight up the middle column through the Internet zone, which is what a VPN is: a private path
// over the public one. The private line runs up the right column and never touches that zone.
// Zone title tabs sit on a zone's top-left corner. The Internet tab ends near x 120 and the Cloud tab near x 86, so
// the vertical edges of the left column (x 130) clear them. Node tops sit at least 26 below each zone's top.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. Nodes are
// sized for the longest name the Services toggle shows ("Direct Connect location", "DNS Private Resolver",
// "Cloud Interconnect", "Site-to-Site VPN", "Virtual Machines").
const spec: DiagramSpec = {
  title: "From print orders over the internet to a private line with a VPN behind it",
  width: 790,
  height: 660,
  steps: [
    { title: "Print orders cross the internet" },
    { title: "One encrypted tunnel" },
    { title: "The tunnel drops on a sale day" },
    { title: "Two tunnels, routes by BGP" },
    { title: "A private line, the tunnels as backup" },
    { title: "Names resolve both ways" },
  ],
  zones: [
    { id: "factory", title: "Partner's factory", tone: "neutral", x: 10, y: 40, w: 770, h: 120 },
    { id: "internet", title: "Internet", tone: "neutral", x: 10, y: 190, w: 490, h: 120 },
    { id: "cloud", title: "Cloud", tone: "blue", kind: "vpc", x: 10, y: 355, w: 770, h: 290 },
  ],
  nodes: [
    // Step 1: today's path, over the public internet.
    {
      id: "printsrv",
      label: "Print server",
      sub: "prints the posters",
      icon: "server",
      tone: "neutral",
      x: 130,
      y: 100,
      w: 170,
    },
    {
      id: "internet",
      label: "Public internet",
      sub: "speed varies",
      icon: "globe",
      tone: "neutral",
      x: 130,
      y: 250,
      w: 170,
    },
    {
      id: "nat",
      label: "NAT gateway",
      sub: "3 fixed addresses",
      icon: "nat",
      tone: "blue",
      x: 130,
      y: 420,
      w: 170,
      cloud: {
        aws: { label: "NAT gateway" },
        gcp: { label: "Cloud NAT" },
        azure: { label: "NAT Gateway" },
      },
    },
    {
      id: "api",
      label: "Print API",
      sub: "sends print jobs",
      icon: "server",
      tone: "teal",
      x: 130,
      y: 570,
      w: 170,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },

    // Step 2: a site-to-site VPN.
    {
      id: "router",
      label: "Factory router",
      sub: "ends the tunnels",
      icon: "router",
      tone: "neutral",
      step: 2,
      x: 375,
      y: 100,
      w: 180,
    },
    {
      id: "vpngw",
      label: "VPN gateway",
      sub: "cloud end of tunnel",
      icon: "tunnel",
      tone: "blue",
      step: 2,
      x: 375,
      y: 420,
      w: 180,
      cloud: {
        aws: { label: "Site-to-Site VPN" },
        gcp: { label: "HA VPN gateway" },
        azure: { label: "VPN Gateway" },
      },
    },
    {
      id: "hub",
      label: "Network hub",
      sub: "learns routes",
      icon: "router",
      tone: "blue",
      step: 2,
      x: 375,
      y: 570,
      w: 180,
      cloud: {
        aws: "aws-transit-gateway",
        gcp: { label: "Cloud Router" },
        azure: { id: "azure-vnet", label: "Hub VNet" },
      },
    },

    // Step 5: a private line through a meeting site.
    {
      id: "meet",
      label: "Meeting site",
      sub: "40 km from factory",
      icon: "building",
      tone: "neutral",
      step: 5,
      x: 665,
      y: 250,
      w: 224,
      cloud: {
        aws: { label: "Direct Connect location" },
        gcp: { label: "Colocation facility" },
        azure: { label: "Peering location" },
      },
    },
    {
      id: "linkgw",
      label: "Private line",
      sub: "steady path",
      icon: "link",
      tone: "blue",
      step: 5,
      x: 665,
      y: 420,
      w: 200,
      cloud: { aws: "aws-direct-connect", gcp: "gcp-interconnect", azure: "azure-expressroute" },
    },

    // Step 6: hybrid DNS.
    {
      id: "fdns",
      label: "Factory DNS",
      sub: "factory names",
      icon: "dns",
      tone: "neutral",
      step: 6,
      x: 665,
      y: 100,
      w: 200,
    },
    {
      id: "resolver",
      label: "DNS resolver",
      sub: "cloud names",
      icon: "dns",
      tone: "blue",
      step: 6,
      x: 665,
      y: 570,
      w: 200,
      cloud: {
        aws: { id: "aws-route53", label: "Route 53 Resolver" },
        gcp: { id: "gcp-cloud-dns", label: "Cloud DNS" },
        azure: { id: "azure-dns", label: "DNS Private Resolver" },
      },
    },
  ],
  edges: [
    // Step 1: print orders go out through the NAT and across the internet; the factory checks the address and the key.
    { from: "api", to: "nat", label: "print orders", packet: true, until: 1 },
    { from: "nat", to: "internet", packet: true, delay: 0.8, until: 1 },
    { from: "internet", to: "printsrv", label: "allow-list + key", packet: true, delay: 1.6, labelAt: 0.68, until: 1 },

    // Step 2: the hub sends the factory's range to the VPN gateway, and one tunnel carries it over the internet.
    { from: "api", to: "hub", label: "jobs", packet: true, step: 2 },
    { from: "hub", to: "vpngw", label: "to 10.50.0.0/16", packet: true, delay: 0.8, step: 2, until: 2 },
    { from: "vpngw", to: "router", label: "encrypted tunnel", packet: true, delay: 1.6, step: 2, until: 2 },
    { from: "router", to: "printsrv", label: "jobs", packet: true, delay: 2.4, step: 2, until: 2 },

    // Step 3: the one tunnel is down, there is no other path, and jobs wait in the shop.
    { from: "vpngw", to: "router", label: "tunnel down 2 h 15 min", tone: "red", dashed: true, step: 3, until: 3 },
    { from: "hub", to: "vpngw", label: "no path: 1,100 jobs wait", tone: "red", dashed: true, step: 3, until: 3 },

    // Step 4: two tunnels, each with its own BGP session; either one can carry everything.
    { from: "hub", to: "vpngw", label: "two paths", packet: true, delay: 0.8, step: 4, until: 4 },
    {
      from: "vpngw",
      to: "router",
      label: "tunnel A + BGP",
      packet: true,
      delay: 1.6,
      via: [
        [347, 370],
        [347, 150],
      ],
      labelAt: 0.42,
      step: 4,
      until: 4,
    },
    {
      from: "vpngw",
      to: "router",
      label: "tunnel B + BGP",
      packet: true,
      delay: 2,
      via: [
        [403, 370],
        [403, 150],
      ],
      labelAt: 0.7,
      step: 4,
      until: 4,
    },
    { from: "router", to: "printsrv", label: "jobs", packet: true, delay: 2.8, step: 4 },

    // Step 5: the hub prefers the private line; the tunnels stay up, idle, as the backup path.
    { from: "hub", to: "linkgw", label: "preferred path", packet: true, delay: 0.8, step: 5 },
    { from: "linkgw", to: "meet", label: "private line", packet: true, delay: 1.6, step: 5 },
    { from: "meet", to: "router", label: "carrier circuit", packet: true, delay: 2.4, step: 5 },
    { from: "hub", to: "vpngw", label: "backup", dashed: true, step: 5 },
    {
      from: "vpngw",
      to: "router",
      label: "VPN standby",
      dashed: true,
      via: [
        [347, 370],
        [347, 150],
      ],
      step: 5,
    },
    {
      from: "vpngw",
      to: "router",
      dashed: true,
      via: [
        [403, 370],
        [403, 150],
      ],
      step: 5,
    },

    // Step 6: each side forwards lookups for the other side's names across the link.
    { from: "fdns", to: "router", label: "lookups", bidirectional: true, dashed: true, flow: true, step: 6 },
    { from: "hub", to: "resolver", label: "lookups", bidirectional: true, dashed: true, flow: true, step: 6 },
  ],
};

export default spec;
