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
//   Left (x 130), "the DNS service": resolver 130,95 (in Internet) | public zone 130,260 | health check 130,410 |
//   private zone 130,560 (all three in the Managed DNS zone, x 10-250).
//   Middle (x 420), "the networks": customer 420,95 (in Internet) | load balancer 420,260 | app server 420,410 |
//   database 420,560 (Shop network, x 300-536) | export job 420,730 (Jobs network, x 300-536).
//   Right (x 665): the back-soon page 665,95 (Storage), used only in step 5.
// Vertical edges in the middle column run at x 420, right of the "Shop network" and "Jobs network" tabs (they end
// near x 404). The resolver's edge to the public zone runs at x 130, right of the "Managed DNS" tab.
// The app server's lookup and the export job's lookup are diagonals into the private zone; both pass below the
// health check box. The health check's probe is a diagonal up to the load balancer, above the app server's lookup.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 to 4, the free
// preview and the failure included, happen in the left and middle columns; only step 5 adds the right column.
// The canvas stays under 800 wide so labels are readable in the 660 px article column.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Sized for the longest
// name the Services toggle shows: "Cloud Load Balancing" (load balancer, w 200), "Private hosted zone" (w 196),
// "Public hosted zone" (w 190), "Virtual Machines" (servers, w 176), "Traffic Manager" (health check, w 190).
const server = { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" } as const;

const spec: DiagramSpec = {
  title: "Public zones, private zones and a health-checked answer",
  width: 795,
  height: 805,
  steps: [
    { title: "A public zone answers the internet" },
    { title: "A private zone answers inside the network" },
    { title: "A network the zone is not linked to" },
    { title: "Link the zone to every network that needs it" },
    { title: "A health check picks the answer" },
  ],
  zones: [
    { id: "internet", title: "Internet", tone: "neutral", x: 10, y: 40, w: 526, h: 130 },
    { id: "storage", title: "Storage", tone: "violet", x: 560, y: 40, w: 225, h: 130 },
    { id: "dns", title: "Managed DNS", tone: "blue", x: 10, y: 200, w: 240, h: 440 },
    { id: "shop", title: "Shop network", tone: "blue", kind: "vpc", x: 300, y: 200, w: 236, h: 440 },
    { id: "jobs", title: "Jobs network", tone: "blue", kind: "vpc", x: 300, y: 670, w: 236, h: 120 },
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
      x: 420,
      y: 95,
    },
    {
      id: "resolver",
      label: "Resolver",
      sub: "customer's provider",
      icon: "search",
      tone: "neutral",
      x: 130,
      y: 95,
      w: 184,
    },
    {
      id: "public-zone",
      label: "Public zone",
      sub: "brightpost.example",
      icon: "dns",
      tone: "blue",
      x: 130,
      y: 260,
      w: 190,
      cloud: {
        aws: { id: "aws-route53", label: "Public hosted zone" },
        gcp: { id: "gcp-cloud-dns", label: "Public zone" },
        azure: { id: "azure-dns", label: "Azure DNS zone" },
      },
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "public address",
      icon: "load-balancer",
      tone: "blue",
      x: 420,
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
      x: 420,
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
      x: 130,
      y: 560,
      w: 196,
      cloud: {
        aws: { id: "aws-route53", label: "Private hosted zone" },
        gcp: { id: "gcp-cloud-dns", label: "Private zone" },
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
      x: 420,
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
      x: 420,
      y: 730,
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
      x: 130,
      y: 410,
      w: 190,
      cloud: {
        aws: { id: "aws-route53", label: "Health check" },
        gcp: { label: "Health check" },
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
      x: 665,
      y: 95,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },
  ],
  edges: [
    // Step 1: one public lookup, then the connection to the address it returned.
    { from: "customer", to: "resolver", label: "look up www", packet: true },
    { from: "public-zone", to: "resolver", label: "LB address, TTL 300 s", packet: true, delay: 1.2, until: 4 },
    { from: "customer", to: "lb", label: "HTTPS", packet: true, delay: 2.4 },
    { from: "lb", to: "app", packet: true, delay: 3.2 },

    // Step 2: the app server's network can see the private zone, so the database's name has an answer.
    { from: "app", to: "private-zone", label: "db.brightpost.internal?", packet: true, labelAt: 0.45, step: 2 },
    { from: "app", to: "db", label: "SQL to 10.0.21.5", packet: true, delay: 1.2, step: 2 },

    // Step 3: the jobs network is not linked to the zone, so the same question has no answer.
    {
      from: "job",
      to: "private-zone",
      label: "not linked: no such name",
      tone: "red",
      dashed: true,
      labelAt: 0.5,
      step: 3,
      until: 3,
    },

    // Step 4: the zone is linked to the jobs network as well; the job reaches the database over the peering.
    { from: "private-zone", to: "job", label: "linked: 10.0.21.5", packet: true, labelAt: 0.5, step: 4 },
    { from: "job", to: "db", label: "over peering", packet: true, delay: 1.2, step: 4 },

    // Step 5: the health check decides which answer the public zone gives, and the TTL drops to 60 seconds.
    { from: "health", to: "lb", label: "probe", dashed: true, flow: true, labelAt: 0.4, step: 5 },
    { from: "health", to: "public-zone", label: "up or down", dashed: true, step: 5 },
    { from: "public-zone", to: "resolver", label: "LB or back-soon, TTL 60 s", packet: true, step: 5 },
    { from: "customer", to: "sorry", label: "only if LB is down", dashed: true, step: 5 },
  ],
};

export default spec;
