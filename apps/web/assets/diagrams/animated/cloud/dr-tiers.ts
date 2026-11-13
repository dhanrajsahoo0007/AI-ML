import type { DiagramSpec } from "@/components/diagrams/types";

// Disaster recovery in four tiers, told as Brightpost's first regional game day (cloud/resilience/dr-strategies).
// This is the flagship spec: case studies embed it at a tier's step.
// Step 1: today. The whole shop runs in region A (London). The 03:00 backup and the change log stay in London; only
// photos and logs are copied, locked, to region B. Step 2 (the only failure step): a game day switches London off on
// paper. Region B holds no orders at all, and the restore takes 9 hours. Step 3: backup and restore done properly.
// Backups and the change log are copied to region B every 15 minutes, templates can build any region, and a DNS
// record can be pointed at region B. Step 4: pilot light. A database replica runs in region B, seconds behind; the
// servers are defined but none runs. Step 5: warm standby. A small copy of the whole stack runs in region B and takes
// test traffic. Step 6: active-active. Both regions serve shoppers and write to a multi-region database.
//
// Nodes never move and never disappear. Labels that change from tier to tier sit on edges with `until`: the
// shoppers' edge (orders, London off, orders), the templates-to-servers edge (build when needed, 1 running, 2 to 10
// running) and the two DNS edges (points to A or test traffic, then by health).
//
// Layout: three columns (x 125 | 405 | 672) and six rows (y 78 | 235 | 350 | 465 | 580 | 695).
//   Left, region A: shoppers 125,78 | load balancer | app servers | orders database | backups | photos and logs.
//   Middle, region B: game day 405,78 | load balancer | app servers | replica | backup copies | locked copies.
//   Right, global: DNS 672,78 | templates 672,215 | multi-region database 672,445.
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 and 2 (the free
// preview and the failure) use only the left and middle columns; the right column arrives with the repairs.
// The canvas stays under 800 wide so labels are readable in the 660 px article column.
//
// Edge routes: vertical edges at x 125 and 405 enter the region zones right of their tabs ("Region A" and
// "Region B" end near x 109 and 389). The game-day edge to the backups runs down the gutter between the regions
// (x 262). The DNS edge to region A runs left along y 142, between the top zones (bottom 130) and the region tabs
// (top 168); the DNS edge to region B stays right of its corner at x 535. Region A's writes reach the multi-region
// database along y 408, between region B's servers and its replica, and enter it from the left at x 540, clear of
// the "Both regions" tab; region B's writes leave right along y 350 and drop into the database at x 740.
// Text room: a label takes about 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. Nodes
// are sized for the longest name the Services toggle shows: "Application Gateway" (load balancers, w 190),
// "Automated backups" and "Cloud SQL replica" (w 182), "Traffic Manager" (DNS, w 196).
const LB = {
  aws: "aws-elb",
  gcp: { id: "gcp-cloud-load-balancing", label: "Load Balancing" },
  azure: { label: "Application Gateway" },
} as const;
const VMS = { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" } as const;
const BUCKET = { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" } as const;

const spec: DiagramSpec = {
  title: "Disaster recovery: from backups to active-active",
  width: 795,
  height: 755,
  steps: [
    { title: "Today: one region, photos and logs copied out" },
    { title: "Game day: London is off, 9 hours to recover" },
    { title: "Backup and restore: copies and code ready in B" },
    { title: "Pilot light: data live in B, servers off" },
    { title: "Warm standby: a small copy runs in B" },
    { title: "Active-active: both regions serve shoppers" },
  ],
  zones: [
    { id: "outside", title: "Shoppers", tone: "neutral", kind: "subnet", x: 10, y: 8, w: 230, h: 122 },
    { id: "drill", title: "Drill", tone: "neutral", kind: "subnet", x: 290, y: 8, w: 230, h: 122 },
    { id: "global", title: "Global", tone: "blue", x: 560, y: 20, w: 225, h: 110 },
    { id: "region-a", title: "Region A", tone: "neutral", kind: "region", x: 10, y: 180, w: 230, h: 560 },
    { id: "region-b", title: "Region B", tone: "neutral", kind: "region", x: 290, y: 180, w: 230, h: 560 },
    { id: "code", title: "Code", tone: "orange", x: 560, y: 180, w: 225, h: 110 },
    { id: "multi", title: "Both regions", tone: "violet", x: 560, y: 410, w: 225, h: 110 },
  ],
  nodes: [
    // Step 1: everything runs in London.
    {
      id: "shoppers",
      label: "Shoppers",
      sub: "about 400 orders a day",
      icon: "users",
      tone: "neutral",
      x: 125,
      y: 78,
      w: 182,
    },
    {
      id: "lbA",
      label: "Load balancer",
      sub: "3 zones, London",
      icon: "load-balancer",
      tone: "blue",
      x: 125,
      y: 235,
      w: 190,
      cloud: LB,
    },
    {
      id: "appA",
      label: "App servers",
      sub: "2 to 10",
      icon: "server",
      tone: "teal",
      x: 125,
      y: 350,
      w: 182,
      cloud: VMS,
    },
    {
      id: "dbA",
      label: "Orders database",
      sub: "primary + standby",
      icon: "database",
      tone: "violet",
      x: 125,
      y: 465,
      w: 182,
      cloud: {
        aws: { id: "aws-rds", label: "RDS primary" },
        gcp: { id: "gcp-cloud-sql", label: "Cloud SQL" },
        azure: { id: "azure-postgresql", label: "Flexible server" },
      },
    },
    {
      id: "backupA",
      label: "Backups",
      sub: "03:00 + change log",
      icon: "snapshot",
      tone: "violet",
      x: 125,
      y: 580,
      w: 182,
      cloud: {
        aws: { id: "aws-rds", label: "Automated backups" },
        gcp: { id: "gcp-cloud-sql", label: "Cloud SQL backups" },
        azure: { id: "azure-postgresql", label: "Server backups" },
      },
    },
    {
      id: "filesA",
      label: "Photos and logs",
      sub: "buckets in London",
      icon: "blob",
      tone: "violet",
      x: 125,
      y: 695,
      w: 182,
      cloud: BUCKET,
    },
    {
      id: "copiesB",
      label: "Locked copies",
      sub: "photos and logs",
      icon: "vault",
      tone: "violet",
      x: 405,
      y: 695,
      w: 182,
      cloud: BUCKET,
    },

    // Step 2: the failure. A drill pretends London is gone.
    {
      id: "gameday",
      label: "Game day",
      sub: "London switched off",
      icon: "timer",
      tone: "red",
      step: 2,
      x: 405,
      y: 78,
      w: 182,
    },

    // Step 3: backup and restore, done properly.
    {
      id: "backupB",
      label: "Backup copies",
      sub: "every 15 minutes",
      icon: "snapshot",
      tone: "violet",
      step: 3,
      x: 405,
      y: 580,
      w: 182,
      cloud: {
        aws: { id: "aws-rds", label: "Cross-Region copy" },
        gcp: { id: "gcp-cloud-sql", label: "Cloud SQL backups" },
        azure: { id: "azure-postgresql", label: "Geo-redundant copy" },
      },
    },
    {
      id: "appB",
      label: "App servers",
      sub: "same image, region B",
      icon: "server",
      tone: "teal",
      step: 3,
      x: 405,
      y: 350,
      w: 182,
      cloud: VMS,
    },
    {
      id: "dns",
      label: "DNS routing",
      sub: "health-checked, 60 s TTL",
      icon: "dns",
      tone: "blue",
      step: 3,
      x: 672,
      y: 78,
      w: 196,
      cloud: { aws: "aws-route53", gcp: "gcp-cloud-dns", azure: "azure-traffic-manager" },
    },
    {
      id: "templates",
      label: "Templates",
      sub: "region is a setting",
      icon: "file",
      tone: "orange",
      step: 3,
      x: 672,
      y: 235,
      w: 196,
    },

    // Step 4: pilot light.
    {
      id: "replica",
      label: "Database replica",
      sub: "seconds behind",
      icon: "database",
      tone: "violet",
      step: 4,
      x: 405,
      y: 465,
      w: 182,
      cloud: {
        aws: { id: "aws-rds", label: "RDS read replica" },
        gcp: { id: "gcp-cloud-sql", label: "Cloud SQL replica" },
        azure: { id: "azure-postgresql", label: "Read replica" },
      },
    },

    // Step 5: warm standby.
    {
      id: "lbB",
      label: "Load balancer",
      sub: "small, ready",
      icon: "load-balancer",
      tone: "blue",
      step: 5,
      x: 405,
      y: 235,
      w: 190,
      cloud: LB,
    },

    // Step 6: active-active.
    {
      id: "globaldb",
      label: "Multi-region DB",
      sub: "writes in both",
      icon: "database",
      tone: "violet",
      accent: true,
      step: 6,
      x: 672,
      y: 465,
      w: 196,
      cloud: { aws: "aws-dynamodb", gcp: "gcp-spanner", azure: "azure-cosmos-db" },
    },
  ],
  edges: [
    // Step 1: the shop in London; photos and logs are the only things that leave it.
    { from: "shoppers", to: "lbA", label: "orders", packet: true, until: 1 },
    { from: "lbA", to: "appA", packet: true, delay: 0.8 },
    { from: "appA", to: "dbA", label: "orders", packet: true, delay: 1.4 },
    { from: "dbA", to: "backupA", label: "03:00 + log", dashed: true, flow: true },
    { from: "filesA", to: "copiesB", label: "locked", dashed: true, flow: true },

    // Step 2: London is off. Shoppers get no answer, and region B has no orders to restore.
    { from: "shoppers", to: "lbA", label: "no answer", tone: "red", dashed: true, step: 2, until: 2 },
    { from: "gameday", to: "copiesB", label: "no orders here", tone: "red", dashed: true, step: 2, until: 2 },
    {
      from: "gameday",
      to: "backupA",
      label: "London only",
      tone: "red",
      dashed: true,
      via: [
        [262, 120],
        [262, 560],
      ],
      labelAt: 0.5,
      step: 2,
      until: 2,
    },

    // Step 3: backups reach region B, templates can build it, DNS can point at it.
    { from: "shoppers", to: "lbA", label: "orders", packet: true, step: 3 },
    { from: "backupA", to: "backupB", label: "copied", packet: true, step: 3 },
    { from: "templates", to: "appB", label: "build when needed", dashed: true, labelAt: 0.45, step: 3, until: 4 },
    {
      from: "dns",
      to: "lbA",
      label: "points to A",
      dashed: true,
      via: [
        [535, 142],
        [200, 142],
      ],
      labelAt: 0.45,
      step: 3,
      until: 5,
    },

    // Step 4: the data is live in region B; the servers are still off.
    { from: "dbA", to: "replica", label: "async copy", packet: true, step: 4 },

    // Step 5: a small copy of the whole stack runs and takes test traffic.
    { from: "lbB", to: "appB", packet: true, step: 5 },
    { from: "appB", to: "replica", dashed: true, step: 5 },
    { from: "templates", to: "appB", label: "1 running", dashed: true, labelAt: 0.45, step: 5, until: 5 },
    { from: "dns", to: "lbB", label: "test traffic", dashed: true, labelAt: 0.5, step: 5, until: 5 },

    // Step 6: both regions serve shoppers and write to one multi-region database.
    { from: "templates", to: "appB", label: "2 to 10 running", dashed: true, labelAt: 0.45, step: 6 },
    {
      from: "dns",
      to: "lbA",
      label: "by health",
      dashed: true,
      via: [
        [535, 142],
        [200, 142],
      ],
      labelAt: 0.45,
      step: 6,
    },
    { from: "dns", to: "lbB", label: "by health", dashed: true, labelAt: 0.5, step: 6 },
    {
      from: "appA",
      to: "globaldb",
      label: "writes",
      packet: true,
      via: [
        [262, 408],
        [540, 408],
        [540, 465],
      ],
      labelAt: 0.25,
      step: 6,
    },
    {
      from: "appB",
      to: "globaldb",
      label: "writes",
      packet: true,
      delay: 1.2,
      via: [[740, 350]],
      labelAt: 0.85,
      step: 6,
    },
  ],
};

export default spec;
