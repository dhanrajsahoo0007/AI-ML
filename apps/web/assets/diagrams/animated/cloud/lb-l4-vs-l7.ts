import type { DiagramSpec } from "@/components/diagrams/types";

// Managed load balancers, told as Brightpost's sale-day deploy (cloud/networking/load-balancing).
// Step 1: shoppers reach one public layer 7 balancer, which shares them between two app servers (A and B stand for
// the sale day's 10). Step 2 (the only failure step): a deploy script stops server A at once; requests in flight are
// cut and, until three health checks fail, the balancer keeps sending new ones. Step 3: the script deregisters the
// server first, the balancer drains it (no new requests, open ones finish, 60 s at most), then the script stops it.
// Step 4: the balancer ends TLS with a certificate the cloud renews, and sends /blog/* to the blog server. Step 5:
// both app servers call the print service through an internal layer 4 balancer with a private address only.
// Step 6 (an option Brightpost has not built): a global front door with one anycast address takes UK and Sydney
// shoppers at a nearby edge site and carries them to the London balancer over the provider's network.
//
// Nodes never move between steps. Edges that a later step replaces are twins: the balancer-to-server-A edge is
// plain in step 1 (`until: 1`), red in step 2, draining in step 3 and plain again from step 4; the shoppers' direct
// edge to the balancer ends at step 5 because step 6 sends them through the front door.
//
// Layout: three columns (left x 110, middle x 380, right x 667) and four rows.
//   Row 1, outside the region (y 95-100): UK shoppers 127 | front door 380 (Provider edge zone) | Sydney shoppers 667.
//   Row 2 (y 280): deploy script 110 | load balancer 380 | certificate 667.
//   Row 3 (y 430): app server A 110 | app server B 380 | blog server 667.
//   Row 4 (y 570), in the Private band: internal balancer 380 | print service 667.
// Edge routes: in steps 1-5 the shoppers' edge runs right along y 100 and down x 380 into the balancer, the path
// the front door is later inserted into. The deploy script reaches server A straight down x 110 and the balancer
// straight right along y 280 (a 95-unit gap, room for the "deregister" pill). Server A reaches the internal balancer
// down x 110 and right along y 570, so it enters the Private band below its inline label. The balancer reaches server A on a diagonal that passes under the
// deploy script, server B straight down x 380, and the blog server on a diagonal that passes under the certificate.
// The front door drops into the balancer down x 380, through the gap between the edge zone and the region tab.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left ~460 units. Steps 1 to 3 (the free
// preview, the failure and its fix) use only the left and middle columns. The canvas stays under 800 wide so labels
// are readable in the 660 px article column.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Sized for the longest
// name the Services toggle shows: "Application Gateway" (lb, w 200), "Global Accelerator" (front door, w 190),
// "Certificate Manager" (certificate, w 192), "Virtual Machines" (servers, w 170).
const server = { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" } as const;

const spec: DiagramSpec = {
  title: "Managed load balancers: layer 7 at the front, draining on deploy, layer 4 inside, global at the edge",
  width: 795,
  height: 665,
  steps: [
    { title: "One address in front of the servers" },
    { title: "A deploy stops server A mid-request" },
    { title: "Deregister, drain, then stop" },
    { title: "Layer 7: end TLS, route by path" },
    { title: "An internal balancer between tiers" },
    { title: "One global address (an option for later)" },
  ],
  zones: [
    { id: "uk", title: "UK", tone: "neutral", x: 10, y: 40, w: 235, h: 135 },
    { id: "edge", title: "Provider edge", tone: "blue", x: 272, y: 40, w: 216, h: 110 },
    { id: "australia", title: "Australia", tone: "neutral", x: 550, y: 40, w: 235, h: 135 },
    { id: "region", title: "London region", tone: "neutral", kind: "region", x: 10, y: 205, w: 775, h: 445 },
    { id: "private", title: "Private", tone: "blue", kind: "subnet", x: 250, y: 505, w: 525, h: 125 },
  ],
  nodes: [
    // Step 1
    {
      id: "shoppers",
      label: "Shoppers",
      sub: "most customers",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      x: 127,
      y: 100,
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "public, layer 7",
      icon: "load-balancer",
      tone: "blue",
      x: 380,
      y: 280,
      w: 200,
      h: 54,
      cloud: {
        aws: { id: "aws-elb", label: "Application LB" },
        gcp: { id: "gcp-cloud-load-balancing", label: "External App LB" },
        azure: "azure-app-gateway",
      },
    },
    {
      id: "app-a",
      label: "App server A",
      sub: "port 8080",
      icon: "server",
      tone: "teal",
      x: 110,
      y: 430,
      w: 170,
      cloud: server,
    },
    {
      id: "app-b",
      label: "App server B",
      sub: "port 8080",
      icon: "server",
      tone: "teal",
      x: 380,
      y: 430,
      w: 170,
      cloud: server,
    },

    // Step 2: the failure
    {
      id: "deploy",
      label: "Deploy script",
      sub: "replaces servers",
      icon: "pipeline",
      tone: "orange",
      step: 2,
      x: 110,
      y: 280,
      w: 150,
    },

    // Step 4
    {
      id: "cert",
      label: "Certificate",
      sub: "renewed by the cloud",
      icon: "certificate",
      tone: "red",
      step: 4,
      x: 667,
      y: 280,
      w: 192,
      cloud: {
        aws: { label: "ACM certificate" },
        gcp: { label: "Certificate Manager" },
        azure: { id: "azure-key-vault", label: "Key Vault cert" },
      },
    },
    {
      id: "blog",
      label: "Blog server",
      sub: "/blog pages",
      icon: "server",
      tone: "teal",
      step: 4,
      x: 667,
      y: 430,
      w: 170,
      cloud: server,
    },

    // Step 5
    {
      id: "ilb",
      label: "Internal balancer",
      sub: "private, layer 4",
      icon: "load-balancer",
      tone: "blue",
      step: 5,
      x: 380,
      y: 570,
      w: 190,
      h: 54,
      cloud: {
        aws: { id: "aws-elb", label: "Internal NLB" },
        gcp: { id: "gcp-cloud-load-balancing", label: "Internal NLB" },
        azure: { id: "azure-load-balancer", label: "Internal LB" },
      },
    },
    {
      id: "print",
      label: "Print service",
      sub: "2 servers, private",
      icon: "server",
      tone: "teal",
      step: 5,
      x: 667,
      y: 570,
      w: 180,
      cloud: server,
    },

    // Step 6: the option for later
    {
      id: "frontdoor",
      label: "Global front door",
      sub: "one anycast address",
      icon: "globe",
      tone: "blue",
      step: 6,
      x: 380,
      y: 95,
      w: 196,
      h: 54,
      cloud: {
        aws: "aws-global-accelerator",
        gcp: { id: "gcp-cloud-load-balancing", label: "Anycast frontend" },
        azure: "azure-front-door",
      },
    },
    {
      id: "sydney",
      label: "Shoppers",
      sub: "30 orders a day",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      step: 6,
      x: 667,
      y: 100,
    },
  ],
  edges: [
    // Step 1: one public address; the balancer shares shoppers between the servers.
    { from: "shoppers", to: "lb", label: "HTTPS", packet: true, via: [[380, 100]], labelAt: 0.3, until: 5 },
    { from: "lb", to: "app-a", packet: true, delay: 1, until: 1 },
    { from: "lb", to: "app-b", packet: true, delay: 1.3 },

    // Step 2: the script stops server A at once; the balancer keeps sending until three health checks fail.
    { from: "deploy", to: "app-a", label: "stop now", tone: "red", step: 2, until: 2 },
    {
      from: "lb",
      to: "app-a",
      label: "still sending",
      tone: "red",
      dashed: true,
      packet: true,
      delay: 1,
      step: 2,
      until: 2,
    },

    // Step 3: deregister first; the balancer sends server A nothing new and lets open requests finish.
    { from: "deploy", to: "lb", label: "deregister", dashed: true, flow: true, step: 3 },
    { from: "lb", to: "app-a", label: "draining, 60 s max", dashed: true, tone: "orange", step: 3, until: 3 },
    { from: "deploy", to: "app-a", label: "then stop", dashed: true, step: 3 },

    // Step 4: server A is back in service. TLS ends at the balancer; /blog/* goes to its own server.
    { from: "lb", to: "app-a", packet: true, delay: 1, step: 4 },
    { from: "cert", to: "lb", label: "TLS cert", dashed: true, step: 4 },
    { from: "lb", to: "blog", label: "/blog/*", packet: true, delay: 1.6, step: 4 },

    // Step 5: both app servers reach the print service through one private address.
    { from: "app-a", to: "ilb", packet: true, delay: 0.4, via: [[110, 570]], step: 5 },
    { from: "app-b", to: "ilb", label: "print job", packet: true, step: 5 },
    { from: "ilb", to: "print", label: "TCP", packet: true, delay: 1.2, step: 5 },

    // Step 6: both groups of shoppers use the same address; each enters at the nearest edge site.
    { from: "shoppers", to: "frontdoor", label: "anycast IP", packet: true, step: 6 },
    { from: "sydney", to: "frontdoor", label: "same address", packet: true, step: 6 },
    { from: "frontdoor", to: "lb", label: "provider network", packet: true, delay: 1.2, step: 6 },
  ],
};

export default spec;
