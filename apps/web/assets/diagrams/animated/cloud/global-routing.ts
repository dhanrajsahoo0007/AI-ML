import type { DiagramSpec } from "@/components/diagrams/types";

// Multi-region, told as Brightpost's trial of a second region near Sydney (cloud/resilience/multi-region).
// Step 1: one region; Sydney shoppers cross the world to London, about 250 ms per round trip. Step 2: a second stack
// near Sydney with its own database copy, and DNS that answers each shopper with the nearest healthy region. Step 3:
// the trial lets both databases take writes and copy each other about 1 s behind. Step 4 (the failure step): the last
// copy of a poster sells twice, once in each region, 0.4 s apart. Step 5: the fix: one writer in London, so Sydney
// sends order writes there and reads its local copy. Step 6: a global front door on one anycast address replaces
// DNS steering, with health checks that move shoppers in seconds. Step 7: what both regions share: one identity
// service, and secrets copied into each region.
//
// Nodes never move between steps. Edges that a later step replaces end with `until` (Sydney's direct path to London,
// the writes into the Sydney copy, the two-way copy, DNS steering and the direct shopper paths).
//
// Layout: the two regions are side by side, London left (x 130) and Sydney middle (x 390), so steps 1 to 6 sit in
// the left 480 units that a phone shows first. Rows (centres): shoppers 80 | DNS glyph 80 between them | front door
// 212 | apps 330 | databases 465 | the double sale 610. The right column (x 677) holds the shared services of
// step 7.
// uk 130,80 | dns 260,80 | syd 390,80 | fd 260,212 | lapp 130,330 | sapp 390,330 | ldb 130,465 | sdb 390,465 |
// sold 260,610 | identity 677,215 | secrets 677,330.
//
// The region zones use the subnet kind (an inline label, no tab), because edges enter them through the top. Their
// labels end near x 82 and x 317; the diagonal edges into the apps cross the zone tops right of them. The front
// door's labels sit at labelAt 0.35, above the zone tops. The shared zone has a tab; its edges leave through its side.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. Nodes
// are sized for the longest name the Services toggle shows ("Cloud Load Balancing", "Virtual Machines",
// "Azure PostgreSQL").
const spec: DiagramSpec = {
  title: "Two regions: routing shoppers and placing the writes",
  width: 795,
  height: 670,
  steps: [
    { title: "One region: Sydney waits" },
    { title: "A second stack; DNS picks the nearest" },
    { title: "Trial: a writer in each region" },
    { title: "The last poster sells twice" },
    { title: "One writer, local reads" },
    { title: "One global address, health-checked" },
    { title: "What both regions share" },
  ],
  zones: [
    { id: "london", title: "London", tone: "teal", kind: "subnet", x: 20, y: 268, w: 225, h: 256 },
    { id: "sydney", title: "Sydney", tone: "teal", kind: "subnet", x: 255, y: 268, w: 245, h: 256 },
    { id: "stock", title: "Stock", tone: "neutral", kind: "subnet", x: 140, y: 548, w: 240, h: 110 },
    { id: "shared", title: "Across regions", tone: "red", x: 570, y: 160, w: 215, h: 235 },
  ],
  nodes: [
    // Step 1
    {
      id: "uk",
      label: "UK shoppers",
      sub: "most of 400 a day",
      icon: "users",
      tone: "neutral",
      x: 130,
      y: 80,
      w: 160,
    },
    {
      id: "syd",
      label: "Sydney shoppers",
      sub: "30 orders a day",
      icon: "users",
      tone: "neutral",
      x: 390,
      y: 80,
      w: 170,
    },
    {
      id: "lapp",
      label: "Shop app",
      sub: "London servers",
      icon: "server",
      tone: "teal",
      x: 130,
      y: 330,
      w: 176,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "ldb",
      label: "Orders database",
      sub: "PostgreSQL, London",
      icon: "database",
      tone: "violet",
      x: 130,
      y: 465,
      w: 176,
      cloud: {
        aws: { id: "aws-rds", label: "RDS PostgreSQL" },
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure PostgreSQL" },
      },
    },

    // Step 2
    {
      id: "dns",
      label: "DNS routing",
      sub: "nearest healthy",
      icon: "dns",
      tone: "blue",
      variant: "glyph",
      step: 2,
      x: 260,
      y: 80,
      cloud: { aws: "aws-route53", gcp: "gcp-cloud-dns", azure: "azure-traffic-manager" },
    },
    {
      id: "sapp",
      label: "Shop app",
      sub: "Sydney servers",
      icon: "server",
      tone: "teal",
      step: 2,
      x: 390,
      y: 330,
      w: 176,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "sdb",
      label: "Orders copy",
      sub: "PostgreSQL, Sydney",
      icon: "database",
      tone: "violet",
      step: 2,
      x: 390,
      y: 465,
      w: 176,
      cloud: {
        aws: { id: "aws-rds", label: "RDS PostgreSQL" },
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure PostgreSQL" },
      },
    },

    // Step 4: the failure
    {
      id: "sold",
      label: "Last poster",
      sub: "sold twice, 0.4 s apart",
      icon: "bag",
      tone: "red",
      step: 4,
      x: 260,
      y: 610,
      w: 190,
    },

    // Step 6
    {
      id: "fd",
      label: "Global front door",
      sub: "one anycast address",
      icon: "globe",
      tone: "blue",
      step: 6,
      x: 260,
      y: 212,
      w: 200,
      cloud: {
        aws: "aws-global-accelerator",
        gcp: "gcp-cloud-load-balancing",
        azure: "azure-front-door",
      },
    },

    // Step 7
    {
      id: "identity",
      label: "Identity",
      sub: "one for both regions",
      icon: "key",
      tone: "red",
      step: 7,
      x: 677,
      y: 215,
      w: 190,
      cloud: { aws: "aws-iam", gcp: "gcp-iam", azure: "azure-entra-id" },
    },
    {
      id: "secrets",
      label: "Secrets",
      sub: "a copy in each region",
      icon: "lock",
      tone: "red",
      step: 7,
      x: 677,
      y: 330,
      w: 190,
      cloud: { aws: "aws-secrets-manager", gcp: "gcp-secret-manager", azure: "azure-key-vault" },
    },
  ],
  edges: [
    // Step 1: every shopper reaches London; from Sydney each round trip crosses the world.
    { from: "uk", to: "lapp", label: "HTTPS", packet: true, labelAt: 0.35, until: 5 },
    { from: "syd", to: "lapp", label: "250 ms each trip", packet: true, until: 1 },
    { from: "lapp", to: "ldb", label: "orders", packet: true, delay: 1.2 },

    // Step 2: DNS answers each shopper with the nearest healthy region; Sydney gets its own stack.
    { from: "syd", to: "sapp", label: "nearby", packet: true, labelAt: 0.35, step: 2, until: 5 },
    { from: "dns", to: "lapp", label: "health check", dashed: true, flow: true, step: 2, until: 5 },
    { from: "dns", to: "sapp", label: "health check", dashed: true, flow: true, step: 2, until: 5 },
    { from: "sapp", to: "sdb", label: "orders", packet: true, delay: 1.2, step: 2, until: 4 },

    // Step 3: the trial: both copies take writes and send them to each other.
    {
      from: "ldb",
      to: "sdb",
      label: "both ways",
      dashed: true,
      flow: true,
      bidirectional: true,
      step: 3,
      until: 4,
    },

    // Step 4: one poster left; each region sells it before it hears about the other sale.
    { from: "ldb", to: "sold", label: "UK sale", tone: "red", packet: true, step: 4 },
    { from: "sdb", to: "sold", label: "Sydney sale", tone: "red", packet: true, delay: 0.4, step: 4 },

    // Step 5: one writer. Sydney sends order writes to London and reads its own copy.
    { from: "sapp", to: "ldb", label: "orders, 250 ms", packet: true, step: 5 },
    { from: "sapp", to: "sdb", label: "reads", packet: true, delay: 1.2, step: 5 },
    { from: "ldb", to: "sdb", label: "copy ~1 s", dashed: true, flow: true, step: 5 },

    // Step 6: one anycast address in front of both regions; it checks health itself and moves shoppers in seconds.
    { from: "dns", to: "fd", label: "one IP", dashed: true, step: 6 },
    { from: "uk", to: "fd", label: "HTTPS", packet: true, labelAt: 0.3, step: 6 },
    { from: "syd", to: "fd", label: "HTTPS", packet: true, labelAt: 0.3, step: 6 },
    { from: "fd", to: "lapp", label: "healthy", packet: true, delay: 1.2, labelAt: 0.35, step: 6 },
    { from: "fd", to: "sapp", label: "healthy", packet: true, delay: 1.2, labelAt: 0.35, step: 6 },

    // Step 7: Sydney must run alone: the same sign-in, and its own copy of every secret.
    { from: "identity", to: "sapp", label: "same sign-in", dashed: true, labelAt: 0.35, step: 7 },
    { from: "secrets", to: "sapp", label: "own copy", dashed: true, flow: true, step: 7 },
  ],
};

export default spec;
