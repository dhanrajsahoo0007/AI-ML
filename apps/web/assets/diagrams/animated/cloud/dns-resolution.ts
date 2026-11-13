import type { DiagramSpec } from "@/components/diagrams/types";

// DNS on the cloud, told as the story of Brightpost's export job that could not find the database
// (cloud/networking/dns).
// Step 1: a customer's phone asks its resolver for www.brightpost.example; the resolver asks Brightpost's public zone,
// which answers with the load balancer's address and a 300-second TTL; the phone connects to the load balancer.
// Step 2: inside the shop network the app server looks up db.brightpost.internal in a private zone linked to that
// network and connects to the database at 10.0.21.5. Step 3 (the only failure step): the export job moves to a new
// jobs network; the private zone is not linked to it, so the same lookup gets "no such name". Step 4: the zone is
// linked to the jobs network too; the job gets 10.0.21.5 and reaches the database over the peering. Step 5: a health
// check probes the load balancer every 30 s; the public zone answers with the load balancer while it is healthy and
// with a back-soon page in a bucket when it is not, now with a 60-second TTL.
//
// Nodes never move. Answers that a later step replaces are twin edges: the 300-second answer ends at step 4
// (`until: 4`) and the failover answer starts at step 5; the refused lookup ends at step 3 and the linked lookup
// takes the same line from step 4.
//
// Layout: three columns.
//   Left (x 160), "the DNS service": resolver 160,95 (in Internet) | public zone 160,260 | health check 160,410 |
//   private zone 160,560 (all three in the Managed DNS zone, x 10-300).
//   Middle (x 465), "the networks": customer 465,95 (in Internet) | load balancer 465,260 | app server 465,410 |
//   database 465,560 (Shop network, x 320-580) | export job 465,750 (Jobs network, x 320-580).
//   Right (x 692): the back-soon page 692,95 (Storage), used only in step 5.
// Zone tabs are about 120 units wide and start 13 units in, so the "Managed DNS" tab ends near x 142 and the
// "Shop network" and "Jobs network" tabs near x 448. Vertical edges run at x 160 and x 465, right of those tabs, and
// their labels sit away from the tabs (`labelAt`). The app server's lookup is a diagonal into the private zone, below
// the health check box. The export job's lookup runs down from the private zone at x 160 and right along y 750 into
// the job's left side, under the "Jobs network" tab, with its label left of the jobs zone. The health check's probe is a diagonal up to the load
// balancer, above the app server's lookup.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 to 4, the free
// preview and the failure included, happen in the left and middle columns; only step 5 adds the right column.
// The canvas stays under 800 wide so labels are readable in the 660 px article column.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Sized for the longest
// name the Services toggle shows: "Cloud Load Balancing" (load balancer, w 200), "Private hosted zone" (w 196),
// "Public hosted zone" (w 190), "Virtual Machines" (servers, w 176), "Route 53 health check" (health check, w 204).
const server = { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" } as const;

const spec: DiagramSpec = {
  title: "Public zones, private zones and a health-checked answer",
  width: 795,
  height: 825,
  steps: [
    { title: "A public zone answers the internet" },
    { title: "A private zone answers inside the network" },
    { title: "A network the zone is not linked to" },
    { title: "Link the zone to every network that needs it" },
    { title: "A health check picks the answer" },
  ],
  zones: [
    { id: "internet", title: "Internet", tone: "neutral", x: 10, y: 40, w: 570, h: 130 },
    { id: "storage", title: "Storage", tone: "violet", x: 600, y: 40, w: 185, h: 130 },
    { id: "dns", title: "Managed DNS", tone: "blue", x: 10, y: 200, w: 290, h: 440 },
    { id: "shop", title: "Shop network", tone: "blue", kind: "vpc", x: 320, y: 200, w: 260, h: 440 },
    { id: "jobs", title: "Jobs network", tone: "blue", kind: "vpc", x: 320, y: 690, w: 260, h: 120 },
  ],
  nodes: [
    // Step 1
    {
      id: "customer",
      label: "Customer",
      sub: "opens the shop",
      icon: "phone",
      tone: "neutral",
      variant: "glyph",
      x: 465,
      y: 95,
    },
    {
      id: "resolver",
      label: "Resolver",
      sub: "customer's provider",
      icon: "search",
      tone: "neutral",
      x: 160,
      y: 95,
      w: 184,
    },
    {
      id: "public-zone",
      label: "Public zone",
      sub: "brightpost.example",
      icon: "dns",
      tone: "blue",
      x: 160,
      y: 260,
      w: 190,
      cloud: {
        aws: { id: "aws-route53", label: "Public hosted zone" },
        gcp: "gcp-cloud-dns",
        azure: { id: "azure-dns", label: "Azure DNS zone" },
      },
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "public address",
      icon: "load-balancer",
      tone: "blue",
      x: 465,
      y: 260,
      w: 200,
      cloud: { aws: "aws-elb", gcp: "gcp-cloud-load-balancing", azure: "azure-app-gateway" },
    },
    {
      id: "app",
      label: "App server",
      sub: "shop network",
      icon: "server",
      tone: "teal",
      x: 465,
      y: 410,
      w: 176,
      cloud: server,
    },

    // Step 2
    {
      id: "private-zone",
      label: "Private zone",
      sub: "brightpost.internal",
      icon: "dns",
      tone: "blue",
      step: 2,
      x: 160,
      y: 560,
      w: 196,
      cloud: {
        aws: { id: "aws-route53", label: "Private hosted zone" },
        gcp: "gcp-cloud-dns",
        azure: { label: "Private DNS zone" },
      },
    },
    {
      id: "db",
      label: "Orders database",
      sub: "10.0.21.5",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 2,
      x: 465,
      y: 560,
      cloud: {
        aws: "aws-rds",
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure Postgres" },
      },
    },

    // Step 3: the failure
    {
      id: "job",
      label: "Export job",
      sub: "nightly, 03:30",
      icon: "server",
      tone: "teal",
      step: 3,
      x: 465,
      y: 750,
      w: 176,
      cloud: server,
    },

    // Step 5
    {
      id: "health",
      label: "Health check",
      sub: "every 30 s",
      icon: "presence",
      tone: "blue",
      step: 5,
      x: 160,
      y: 410,
      w: 204,
      cloud: {
        aws: { id: "aws-route53", label: "Route 53 health check" },
        gcp: { label: "Cloud health check" },
        azure: "azure-traffic-manager",
      },
    },
    {
      id: "sorry",
      label: "Back-soon page",
      sub: "in a bucket",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      step: 5,
      x: 692,
      y: 95,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },
  ],
  edges: [
    // Step 1: one public lookup, then the connection to the address it returned.
    { from: "customer", to: "resolver", label: "look up www", packet: true },
    {
      from: "public-zone",
      to: "resolver",
      label: "LB address, TTL 300 s",
      packet: true,
      delay: 1.2,
      labelAt: 0.7,
      until: 4,
    },
    { from: "customer", to: "lb", label: "HTTPS", packet: true, delay: 2.4, labelAt: 0.85 },
    { from: "lb", to: "app", packet: true, delay: 3.2 },

    // Step 2: the app server's network can see the private zone, so the database's name has an answer.
    { from: "app", to: "private-zone", label: "db.brightpost.internal?", packet: true, labelAt: 0.55, step: 2 },
    { from: "app", to: "db", label: "SQL to 10.0.21.5", packet: true, delay: 1.2, step: 2 },

    // Step 3: the jobs network is not linked to the zone, so the same question has no answer.
    {
      from: "job",
      to: "private-zone",
      label: "not linked: no such name",
      tone: "red",
      dashed: true,
      via: [[160, 750]],
      labelAt: 0.4,
      step: 3,
      until: 3,
    },

    // Step 4: the zone is linked to the jobs network as well; the job reaches the database over the peering.
    {
      from: "private-zone",
      to: "job",
      label: "linked: 10.0.21.5",
      packet: true,
      via: [[160, 750]],
      labelAt: 0.6,
      step: 4,
    },
    { from: "job", to: "db", label: "over peering", packet: true, delay: 1.2, labelAt: 0.75, step: 4 },

    // Step 5: the health check decides which answer the public zone gives, and the TTL drops to 60 seconds.
    { from: "health", to: "lb", label: "probe", dashed: true, flow: true, labelAt: 0.4, step: 5 },
    { from: "health", to: "public-zone", label: "up or down", dashed: true, step: 5 },
    { from: "public-zone", to: "resolver", label: "LB or back-soon, TTL 60 s", packet: true, labelAt: 0.7, step: 5 },
    { from: "customer", to: "sorry", label: "only if LB is down", dashed: true, step: 5 },
  ],
};

export default spec;
