import type { DiagramSpec } from "@/components/diagrams/types";

// Private endpoints, told as Brightpost's private connection to its payment provider that nobody used
// (cloud/networking/private-endpoints). Step 1: the app server looks up the payment API's name, gets its public
// address, and calls it through the NAT gateway and the internet. Step 2 (the only failure step): Brightpost creates
// a private endpoint, 10.0.31.10, in its own network, and the provider removes Brightpost's public addresses from its
// allow-list. The name still resolves to the public address, so every card check still leaves through the NAT and
// is refused; the endpoint carries 0 bytes. Step 3: a private DNS zone answers the same name with the endpoint's
// address; card checks take the private path. Step 4: the producer side: behind the endpoint, the provider publishes
// its payment API through a service in front of an internal load balancer. Its network uses 10.0.0.0/16 too, and it
// does not matter. Step 5: the cloud's own storage through an endpoint with a policy: Brightpost's buckets are
// allowed, a bucket in another account is refused.
//
// Nodes never move between steps. Edges that a later step replaces are twins: the lookup with the public answer ends
// at step 2 and its private twin starts at step 3; the endpoint-to-API edge of steps 2-3 runs along the same line as
// the endpoint-to-published-service and published-service-to-API edges of step 4, so step 4 reveals what was behind
// the endpoint without moving anything. The public card-check edge ends at step 1 and its refused twin at step 2.
//
// Layout: the shop network fills the left and middle columns (x 10-520). Rows inside it: DNS (y 100), the app subnet
// (y 240), then the public subnet with the NAT (left) and the endpoint subnet (middle) at y 395. Leaving the network
// goes DOWN, so no edge crosses the network's title tab, which sits on its top-left corner: the NAT's path runs down
// the left column (x 140) into the Internet band (y 540) and on into the payment provider's zone (y 720); the private
// path runs down the middle column (x 390) and turns left into the payment API. The provider's zone is titled
// "Payments" so its tab ends at x 120, left of the x 140 edge. The right column, outside the network, holds the
// cloud's storage service (step 5 only).
//   resolver 140,100 | privzone 400,100 | server 140,240 | endpointSto 390,240 | nat 140,395 | endpointPay 390,395 |
//   internet 140,540 | payment 140,720 | published 390,720 | storage 672,240 | other 672,395.
// The server reaches the payment endpoint through one bend at (390,317), in the corridor between the subnet rows,
// so the line passes under the storage endpoint and enters the endpoint subnet right of its label.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left ~480 units. Steps 1 to 4 happen in
// the left and middle columns, so the free preview and the failure are visible without scrolling. Canvas 795 wide.
//
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Sized for the longest
// name the Services toggle shows: "Route 53 Resolver" (resolver, w 180), "Private hosted zone" (privzone, w 196),
// "Interface endpoint" (endpointPay, w 192), "Private Google Access" (endpointSto, w 210), "Private Link service"
// (published, w 200), "Azure Blob Storage" (storage, w 190), "Compute Engine" (server and NAT, w 168).
const servers = { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: { id: "azure-vm", label: "Azure VM" } };
const nat = { aws: { label: "NAT gateway" }, gcp: { label: "Cloud NAT" }, azure: { label: "NAT Gateway" } };
const buckets = { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" } as const;

const spec: DiagramSpec = {
  title: "From a payment call over the internet to a private endpoint, a private DNS zone and an endpoint policy",
  width: 795,
  height: 805,
  steps: [
    { title: "The public path: a public address, NAT and the internet" },
    { title: "An endpoint nobody uses" },
    { title: "A private DNS zone points the name at the endpoint" },
    { title: "The producer side: a published service" },
    { title: "The cloud's own storage, with an endpoint policy" },
  ],
  zones: [
    { id: "network", title: "Shop network · 10.0.0.0/16", tone: "blue", kind: "vpc", x: 10, y: 40, w: 510, h: 430 },
    { id: "app", title: "App subnet", tone: "teal", kind: "subnet", x: 20, y: 170, w: 490, h: 135 },
    { id: "public", title: "Public", tone: "blue", kind: "subnet", x: 20, y: 330, w: 225, h: 120 },
    { id: "endpoints", title: "Endpoints", tone: "blue", kind: "subnet", x: 265, y: 330, w: 245, h: 120 },
    { id: "storage-zone", title: "Cloud storage", tone: "violet", x: 545, y: 170, w: 240, h: 290 },
    { id: "internet-zone", title: "Internet", tone: "neutral", kind: "subnet", x: 10, y: 485, w: 235, h: 100 },
    { id: "payments", title: "Payments", tone: "neutral", x: 10, y: 640, w: 510, h: 150 },
  ],
  nodes: [
    // Step 1
    {
      id: "resolver",
      label: "DNS resolver",
      sub: "every lookup",
      icon: "dns",
      tone: "blue",
      x: 140,
      y: 100,
      w: 180,
      cloud: {
        aws: { id: "aws-route53", label: "Route 53 Resolver" },
        gcp: "gcp-cloud-dns",
        azure: "azure-dns",
      },
    },
    {
      id: "server",
      label: "App server",
      sub: "checkout",
      icon: "server",
      tone: "teal",
      x: 140,
      y: 240,
      w: 168,
      cloud: servers,
    },
    {
      id: "nat",
      label: "NAT gateway",
      sub: "public address",
      icon: "nat",
      tone: "blue",
      x: 140,
      y: 395,
      w: 168,
      cloud: nat,
    },
    {
      id: "internet",
      label: "Internet",
      sub: "public addresses",
      icon: "globe",
      tone: "neutral",
      x: 140,
      y: 540,
      w: 168,
      h: 50,
    },
    {
      id: "payment",
      label: "Payment API",
      sub: "10.0.0.0/16 too",
      icon: "card",
      tone: "neutral",
      x: 140,
      y: 720,
      w: 168,
    },

    // Step 2: the failure
    {
      id: "endpointPay",
      label: "Payment endpoint",
      sub: "10.0.31.10",
      icon: "link",
      tone: "blue",
      step: 2,
      x: 390,
      y: 395,
      w: 192,
      cloud: {
        aws: { id: "aws-privatelink", label: "Interface endpoint" },
        gcp: { id: "gcp-psc", label: "PSC endpoint" },
        azure: { id: "azure-private-link", label: "Private endpoint" },
      },
    },

    // Step 3
    {
      id: "privzone",
      label: "Private DNS zone",
      sub: "api name → 10.0.31.10",
      icon: "registry",
      tone: "blue",
      step: 3,
      x: 400,
      y: 100,
      w: 196,
      cloud: {
        aws: { id: "aws-route53", label: "Private hosted zone" },
        gcp: { id: "gcp-cloud-dns", label: "Private zone" },
        azure: { id: "azure-dns", label: "Private DNS zone" },
      },
    },

    // Step 4
    {
      id: "published",
      label: "Published service",
      sub: "internal LB in front",
      icon: "load-balancer",
      tone: "blue",
      step: 4,
      x: 390,
      y: 720,
      w: 200,
      cloud: {
        aws: { id: "aws-privatelink", label: "Endpoint service" },
        gcp: { id: "gcp-psc", label: "Service attachment" },
        azure: { id: "azure-private-link", label: "Private Link service" },
      },
    },

    // Step 5
    {
      id: "endpointSto",
      label: "Storage endpoint",
      sub: "policy: our buckets",
      icon: "link",
      tone: "blue",
      step: 5,
      x: 390,
      y: 240,
      w: 210,
      cloud: {
        aws: { label: "Gateway endpoint" },
        gcp: { label: "Private Google Access" },
        azure: { id: "azure-private-link", label: "Private endpoint" },
      },
    },
    {
      id: "storage",
      label: "Our buckets",
      sub: "orders, photos",
      icon: "blob",
      tone: "violet",
      step: 5,
      x: 672,
      y: 240,
      w: 190,
      cloud: buckets,
    },
    {
      id: "other",
      label: "Other bucket",
      sub: "another account",
      icon: "blob",
      tone: "neutral",
      step: 5,
      x: 672,
      y: 395,
      w: 190,
      cloud: buckets,
    },
  ],
  edges: [
    // Step 1: the name resolves to the public address, so the card check leaves through the NAT and the internet.
    { from: "server", to: "resolver", label: "answer: public IP", dashed: true, labelAt: 0.7, until: 2 },
    { from: "server", to: "nat", label: "outbound", packet: true },
    { from: "nat", to: "internet", packet: true, delay: 1.2 },
    { from: "internet", to: "payment", label: "card check", packet: true, delay: 2.4, labelAt: 0.3, until: 1 },

    // Step 2: the endpoint exists but nothing is sent to it; the provider has removed the public addresses.
    {
      from: "endpointPay",
      to: "payment",
      label: "idle: 0 bytes",
      dashed: true,
      via: [[390, 720]],
      labelAt: 0.25,
      step: 2,
      until: 2,
    },
    {
      from: "internet",
      to: "payment",
      label: "refused: not listed",
      tone: "red",
      dashed: true,
      labelAt: 0.3,
      step: 2,
      until: 2,
    },

    // Step 3: the private zone answers the same name with the endpoint's address; card checks go private.
    { from: "resolver", to: "privzone", label: "checks", dashed: true, step: 3 },
    { from: "server", to: "resolver", label: "answer: 10.0.31.10", dashed: true, labelAt: 0.7, step: 3 },
    { from: "server", to: "endpointPay", packet: true, via: [[390, 317]], step: 3 },
    {
      from: "endpointPay",
      to: "payment",
      label: "private path",
      packet: true,
      delay: 1.2,
      via: [[390, 720]],
      labelAt: 0.25,
      step: 3,
      until: 3,
    },

    // Step 4: behind the endpoint, the provider's published service and its internal load balancer.
    {
      from: "endpointPay",
      to: "published",
      label: "provider's network",
      packet: true,
      delay: 1.2,
      labelAt: 0.45,
      step: 4,
    },
    { from: "published", to: "payment", packet: true, delay: 2.4, step: 4 },

    // Step 5: storage through an endpoint whose policy names Brightpost's buckets; any other bucket is refused.
    { from: "server", to: "endpointSto", label: "files", packet: true, step: 5 },
    { from: "endpointSto", to: "storage", label: "our buckets", packet: true, delay: 1.2, step: 5 },
    { from: "endpointSto", to: "other", label: "refused: not ours", tone: "red", dashed: true, step: 5 },
  ],
};

export default spec;
