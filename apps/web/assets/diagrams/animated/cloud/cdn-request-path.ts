import type { DiagramSpec } from "@/components/diagrams/types";

// The managed edge in front of a bucket and an app, told as Brightpost's sale-day scraper
// (cloud/networking/cdn-edge-and-waf).
// Step 1: one edge cache in front of two origins. Photos come from the private photos bucket, which only the edge's
// own identity may read; pages and checkout pass through to the load balancer and the app servers.
// Step 2 (the failure step): a competitor's scraper sends 900 product-page requests a second from 400 addresses.
// Product pages are not cached, so every request reaches the app servers, and all 10 are busy.
// Step 3: the always-on flood absorber at the edge drops a burst of junk packets. The scraper's page requests are
// valid, so they still pass.
// Step 4: a web firewall attached to the edge, with managed rules and a rate rule, blocks the scraper's addresses.
// Step 5: the scraper tries the load balancer's own address; an origin lock lets in only traffic from the edge.
//
// Nodes never move between steps. The flood is told by edges: the scraper's path through the edge and the twin
// "10 of 10 busy" edge end at step 3 (`until: 3`), when the firewall replaces them. The normal edge from the load
// balancer to the servers carries no label, so the twin drawn on top of it never puts two pills in one place.
//
// Layout: three rows that read top to bottom, the way a request travels.
//   Internet (y 10-140): customers 130,62 | scraper 390,75.
//   Edge (y 170-300): edge cache 130,235 | web firewall 390,235 | flood absorber 660,235.
//   Origin (y 345-635): photos bucket 130,420 | load balancer 390,420 | app servers 390,590 | origin lock 660,590.
// The bucket sits under the edge cache so the photo path is one vertical line; the load balancer and the servers
// share the middle column. The scraper's attempt to go around the edge runs down the gutter between the firewall and
// the flood absorber (x 520) and enters the load balancer from the right, so it crosses no other edge.
// The scraper's edge to the flood absorber runs along the top row (y 75) so its pill stays clear of that gutter.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left ~460 units. Steps 1 and 2 use only
// the left and middle columns. Canvas 790 wide.
// Zone tabs: "Edge" and "Origin" are short, so their tabs end before x 110 and the vertical edges at x 130 clear them.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Sized for the longest
// name the Services toggle shows: "Application Gateway" (load balancer, w 200), "Virtual Machines" (servers),
// "DDoS infrastructure" (flood absorber, w 196), "Private Link origin" (origin lock, w 196).
const spec: DiagramSpec = {
  title: "A managed edge in front of a bucket and an app",
  width: 790,
  height: 650,
  steps: [
    { title: "One edge in front of a bucket and an app" },
    { title: "Sale day: a scraper floods the product pages" },
    { title: "The edge drops junk packets on its own" },
    { title: "A web firewall with a rate rule" },
    { title: "Lock the origin to the edge" },
  ],
  zones: [
    { id: "internet", title: "Internet", tone: "neutral", kind: "subnet", x: 15, y: 10, w: 760, h: 130 },
    { id: "edge", title: "Edge", tone: "blue", x: 15, y: 170, w: 760, h: 130 },
    { id: "origin", title: "Origin", tone: "neutral", x: 15, y: 345, w: 760, h: 290 },
  ],
  nodes: [
    // Step 1
    {
      id: "customers",
      label: "Customers",
      sub: "UK and Australia",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      x: 130,
      y: 62,
    },
    {
      id: "cdn",
      label: "Edge cache",
      sub: "routes by path",
      icon: "cdn",
      tone: "blue",
      accent: true,
      x: 130,
      y: 235,
      w: 176,
      cloud: { aws: "aws-cloudfront", gcp: "gcp-cloud-cdn", azure: "azure-front-door" },
    },
    {
      id: "bucket",
      label: "Photos bucket",
      sub: "private",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      x: 130,
      y: 420,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "public address",
      icon: "load-balancer",
      tone: "blue",
      x: 390,
      y: 420,
      w: 200,
      cloud: {
        aws: "aws-elb",
        gcp: { id: "gcp-cloud-load-balancing", label: "Backend service" },
        azure: "azure-app-gateway",
      },
    },
    {
      id: "servers",
      label: "App servers",
      sub: "2, up to 10",
      icon: "server",
      tone: "teal",
      x: 390,
      y: 590,
      w: 200,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },

    // Step 2: the failure
    {
      id: "bots",
      label: "Scraper bots",
      sub: "400 addresses",
      icon: "robot",
      tone: "red",
      step: 2,
      x: 390,
      y: 75,
      w: 176,
    },

    // Step 3
    {
      id: "ddos",
      label: "Flood absorber",
      sub: "always on",
      icon: "shield",
      tone: "red",
      step: 3,
      x: 660,
      y: 235,
      w: 196,
      cloud: {
        aws: { id: "aws-shield", label: "Shield Standard" },
        gcp: { id: "gcp-cloud-armor", label: "Armor Standard" },
        azure: { label: "DDoS infrastructure" },
      },
    },

    // Step 4
    {
      id: "waf",
      label: "Web firewall",
      sub: "managed + rate rules",
      icon: "firewall",
      tone: "red",
      step: 4,
      x: 390,
      y: 235,
      w: 176,
      cloud: { aws: "aws-waf", gcp: "gcp-cloud-armor", azure: "azure-waf" },
    },

    // Step 5
    {
      id: "lock",
      label: "Origin lock",
      sub: "edge traffic only",
      icon: "lock",
      tone: "red",
      step: 5,
      x: 660,
      y: 590,
      w: 196,
      cloud: {
        aws: { label: "VPC origin" },
        gcp: { label: "LB-only firewall" },
        azure: { label: "Private Link origin" },
      },
    },
  ],
  edges: [
    // Step 1: customers reach the edge. Photos come from the bucket only on a miss; pages and checkout always pass.
    { from: "customers", to: "cdn", label: "HTTPS", packet: true, labelAt: 0.37 },
    { from: "cdn", to: "bucket", label: "photos, on a miss", dashed: true, packet: true, delay: 1, labelAt: 0.4 },
    { from: "cdn", to: "lb", label: "pages, checkout", packet: true, delay: 1.4, labelAt: 0.45 },
    { from: "lb", to: "servers", packet: true, delay: 2.4 },

    // Step 2: the scraper's requests are valid page views. Nothing at the edge stops them, and nothing caches them.
    { from: "bots", to: "cdn", label: "900 a second", tone: "red", packet: true, step: 2, until: 3 },
    {
      from: "lb",
      to: "servers",
      label: "10 of 10 busy",
      tone: "red",
      packet: true,
      delay: 1,
      labelAt: 0.5,
      step: 2,
      until: 3,
    },

    // Step 3: a burst of junk packets is dropped at the edge, with no rule written by Brightpost.
    {
      from: "bots",
      to: "ddos",
      label: "junk packets: dropped",
      tone: "red",
      dashed: true,
      via: [[660, 75]],
      labelAt: 0.3,
      step: 3,
    },

    // Step 4: the firewall is attached to the edge and checks every request; the rate rule blocks the scraper.
    { from: "waf", to: "cdn", label: "inspects", dashed: true, step: 4 },
    { from: "bots", to: "waf", label: "300+ in 5 min: blocked", tone: "red", dashed: true, step: 4 },

    // Step 5: the scraper goes around the edge to the load balancer's own address; the origin lock refuses it.
    {
      from: "bots",
      to: "lb",
      label: "direct: refused",
      tone: "red",
      dashed: true,
      via: [
        [520, 140],
        [520, 420],
      ],
      labelAt: 0.67,
      step: 5,
    },
    { from: "lock", to: "lb", label: "edge only", dashed: true, step: 5 },
  ],
};

export default spec;
