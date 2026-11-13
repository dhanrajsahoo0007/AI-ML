import type { DiagramSpec } from "@/components/diagrams/types";

// Calls between Brightpost's own services (cloud/networking/service-to-service).
// Step 1: the order service finds the print service by a private DNS name, which answers with the internal
// balancer's address; JSON calls open a new connection each, so a layer 4 balancer spreads them evenly. Step 2:
// the order service moves to gRPC, and each order server keeps one long-lived HTTP/2 connection with many calls on
// it; today the two connections happen to land one on each print server. Step 3 (the only failure step): after a
// restart at 8:50 both connections land on print server A, which runs at 100% while B sits idle, and the callers'
// retries multiply the load. Step 4: a layer 7 balancer picks a server for every call, and each call carries a
// deadline and at most one retry. Step 5: each service has its own identity; the order service shows a
// short-lived credential on every call and the print service checks it.
//
// Nodes never move. Edges that a later step replaces are twins with `until`: the order-to-balancer and
// balancer-to-print edges exist once per step from 1 to 4; only the step 4 set stays in the full view.
//
// Layout: three columns (left x 125, middle x 400, right x 667) and three rows.
//   Row 1 (y 115), Order service zone: order server A 125 | order server B 400.
//   Row 2 (y 280): private DNS 125 | internal balancer 400 | service identity 667 (step 5).
//   Row 3 (y 445), Print service zone: print server A 125 | print server B 400.
// Edge routes: order A drops straight down x 125 to the DNS (the name sits on that vertical edge) and reaches the
// balancer on a diagonal that enters its top; order B drops straight down x 400. The balancer reaches print B
// straight down x 400 and print A on a diagonal whose pill sits between the DNS box and the print zone's tab. The
// identity node reaches order B and print B on diagonals that pass right of the balancer.
//
// Why this order: on a phone the figure opens on the left ~460 units, so steps 1 to 4, the free preview and the
// failure use only the left and middle columns. The canvas stays under 800 wide.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Sized for the longest
// name the Services toggle shows: "Cloud DNS private zone" (dns, w 212), "Network, then App LB" (balancer, w 212),
// "Virtual Machines" (servers, w 176), "Managed identity" (identity, w 190).
const server = { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" } as const;

const spec: DiagramSpec = {
  title: "Service-to-service calls: a private name, one HTTP/2 connection, per-call balancing and service identity",
  width: 795,
  height: 540,
  steps: [
    { title: "Find the print service by name" },
    { title: "gRPC: one connection, many calls" },
    { title: "Both connections land on print server A" },
    { title: "Layer 7: balance every call" },
    { title: "Each service proves who it is" },
  ],
  zones: [
    { id: "region", title: "London region", tone: "neutral", kind: "region", x: 10, y: 20, w: 775, h: 505 },
    { id: "orders", title: "Order service", tone: "teal", x: 25, y: 55, w: 525, h: 115 },
    { id: "printing", title: "Print service", tone: "teal", x: 25, y: 385, w: 525, h: 120 },
  ],
  nodes: [
    // Step 1
    {
      id: "order-a",
      label: "Order server A",
      sub: "calls BookPrint",
      icon: "server",
      tone: "teal",
      x: 125,
      y: 115,
      w: 176,
      cloud: server,
    },
    {
      id: "order-b",
      label: "Order server B",
      sub: "calls BookPrint",
      icon: "server",
      tone: "teal",
      x: 400,
      y: 115,
      w: 176,
      cloud: server,
    },
    {
      id: "dns",
      label: "Private DNS",
      sub: "brightpost.internal",
      icon: "dns",
      tone: "blue",
      x: 125,
      y: 280,
      w: 212,
      cloud: {
        aws: { id: "aws-route53", label: "Route 53 private zone" },
        gcp: { id: "gcp-cloud-dns", label: "Cloud DNS private zone" },
        azure: { id: "azure-dns", label: "Private DNS zone" },
      },
    },
    {
      id: "ilb",
      label: "Internal balancer",
      sub: "private address",
      icon: "load-balancer",
      tone: "blue",
      x: 400,
      y: 280,
      w: 212,
      h: 54,
      cloud: {
        aws: { id: "aws-elb", label: "NLB, then ALB" },
        gcp: { id: "gcp-cloud-load-balancing", label: "Network, then App LB" },
        azure: { id: "azure-load-balancer", label: "LB, then a proxy" },
      },
    },
    {
      id: "print-a",
      label: "Print server A",
      sub: "prepares print files",
      icon: "server",
      tone: "teal",
      x: 125,
      y: 445,
      w: 176,
      cloud: server,
    },
    {
      id: "print-b",
      label: "Print server B",
      sub: "prepares print files",
      icon: "server",
      tone: "teal",
      x: 400,
      y: 445,
      w: 176,
      cloud: server,
    },

    // Step 5
    {
      id: "identity",
      label: "Service identity",
      sub: "one per service",
      icon: "key",
      tone: "red",
      step: 5,
      x: 667,
      y: 280,
      w: 190,
      cloud: {
        aws: { id: "aws-iam", label: "IAM role" },
        gcp: { id: "gcp-iam", label: "Service account" },
        azure: { id: "azure-entra-id", label: "Managed identity" },
      },
    },
  ],
  edges: [
    // Always: the name answers with the balancer's private address.
    { from: "order-a", to: "dns", label: "print.brightpost.internal", dashed: true },
    { from: "dns", to: "ilb", dashed: true },

    // Step 1: JSON calls, a new connection for each, so the layer 4 balancer spreads them.
    { from: "order-a", to: "ilb", packet: true, until: 1 },
    { from: "order-b", to: "ilb", label: "JSON, new connection per call", packet: true, delay: 0.4, until: 1 },
    { from: "ilb", to: "print-a", packet: true, delay: 1.2, until: 1 },
    { from: "ilb", to: "print-b", label: "spread evenly", packet: true, delay: 1.6, until: 1 },

    // Step 2: gRPC keeps one HTTP/2 connection per order server; the balancer chose once, when it opened.
    { from: "order-a", to: "ilb", flow: true, step: 2, until: 2 },
    { from: "order-b", to: "ilb", label: "1 HTTP/2 connection each", flow: true, step: 2, until: 2 },
    { from: "ilb", to: "print-a", label: "connection 1", flow: true, step: 2, until: 2 },
    { from: "ilb", to: "print-b", label: "connection 2", flow: true, step: 2, until: 2 },

    // Step 3: both connections on print server A; the callers wait and retry.
    { from: "order-a", to: "ilb", tone: "red", packet: true, duration: 1.2, step: 3, until: 3 },
    {
      from: "order-b",
      to: "ilb",
      label: "calls wait 9 s, retry ×3",
      tone: "red",
      packet: true,
      duration: 1.2,
      step: 3,
      until: 3,
    },
    {
      from: "ilb",
      to: "print-a",
      label: "both connections",
      tone: "red",
      packet: true,
      duration: 1.2,
      step: 3,
      until: 3,
    },
    { from: "ilb", to: "print-b", label: "idle, 3%", tone: "neutral", dashed: true, step: 3, until: 3 },

    // Step 4: a layer 7 balancer picks a server for every call; each call has a deadline.
    { from: "order-a", to: "ilb", packet: true, step: 4 },
    { from: "order-b", to: "ilb", label: "deadline, 1 retry", packet: true, delay: 0.4, step: 4 },
    { from: "ilb", to: "print-a", label: "each call", packet: true, delay: 1.2, step: 4 },
    { from: "ilb", to: "print-b", label: "each call", packet: true, delay: 1.6, step: 4 },

    // Step 5: the caller shows a short-lived credential; the print service checks it.
    { from: "identity", to: "order-b", label: "short-lived credential", dashed: true, step: 5 },
    { from: "identity", to: "print-b", label: "keys to verify", dashed: true, step: 5 },
  ],
};

export default spec;
