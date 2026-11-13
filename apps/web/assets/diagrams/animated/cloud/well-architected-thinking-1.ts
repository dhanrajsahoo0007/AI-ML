import type { DiagramSpec } from "@/components/diagrams/types";

// A well-architected review of Brightpost's shop as it stands today (cloud/fundamentals/well-architected-thinking).
// Step 1: the design: customers, load balancer, app servers across three zones, the orders database with its
// standby and nightly backup, the 01:00 export job, the orders bucket, the printing partner that downloads each
// night's file at 06:00, and the image-resize worker. Steps 2 to 7 ask one pillar's question each. Every one of
// them adds a review card next to the part it is about, with a red dashed edge whose label is the weakness found.
// Step 2 (the failure step): the export job crashed three nights running and nothing told anyone. Step 3:
// security, the partner can read all 730 files. Step 4: reliability, nobody has ever restored a backup. Step 5:
// performance, a new server takes about 4 minutes to start when 2,000 shoppers arrive at 9:00. Step 6: cost, the
// database is sized for the sale day all year. Step 7: sustainability, the resize worker remakes every photo every
// night. Step 8: the fixes. Each weakness edge ends at step 7 (`until: 7`) and a green twin with the fix takes its
// place; an on-call alert is the one new node.
//
// Nodes never move between steps. A card stays, faded, after its step: it is the question the team keeps asking.
//
// Layout: three columns, five rows.
//   Left (x 130): customers, operations card, export job, orders bucket, printing partner.
//   Middle (x 390): load balancer, app servers, orders database, on-call alert, security card.
//   Right (x 660): performance, cost, reliability and sustainability cards, then the resize worker.
// Rows (centres): 95 | 240 | 385 | 530 | 675.
// customers 130,95 | lb 390,95 | perf 660,95 | ops 130,240 | app 390,240 | cost 660,240 | export 130,385 |
// db 390,385 | rel 660,385 | bucket 130,530 | oncall 390,530 | sus 660,530 | partner 130,675 | sec 390,675 |
// resize 660,675.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. The design (step 1),
// the failure (step 2) and the security finding (step 3) sit in the left and middle columns, so the free preview
// and the failure are visible without scrolling. The canvas stays under 800 wide so labels are readable in the
// 660 px article column.
//
// Zone tabs sit on the top-left corner of a zone. The vertical edges at x 130 enter the Export and Partner zones
// right of their short tabs, and the edge at x 660 enters the Photos zone right of its tab. The two diagonal edges
// from the right-hand cards run through the gutter between rows, clear of the app servers and the load balancer.
// Edge labels in the narrow horizontal gaps (about 90 units) are kept to about 13 characters, and labels on
// vertical edges that enter a tabbed zone sit at labelAt 0.3, above the tab.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon.
// Nodes are sized for the longest name the Services toggle puts in them ("Cloud Load Balancing",
// "Application Gateway", "Cloud Run functions", "Cloud Monitoring", "Azure PostgreSQL").
const functions = { aws: "aws-lambda", gcp: "gcp-cloud-run-functions", azure: "azure-functions" } as const;

const spec: DiagramSpec = {
  title: "A six-question review of Brightpost's shop",
  width: 795,
  height: 735,
  steps: [
    { title: "The shop as it stands" },
    { title: "Operations: would anyone know?" },
    { title: "Security: who can read the data?" },
    { title: "Reliability: can we get it back?" },
    { title: "Performance: does it keep up at 9:00?" },
    { title: "Cost: what are we paying for?" },
    { title: "Sustainability: what work can we drop?" },
    { title: "The fixes, one per question" },
  ],
  zones: [
    { id: "internet", title: "Internet", tone: "neutral", x: 10, y: 40, w: 240, h: 100 },
    { id: "shop", title: "Shop", tone: "teal", x: 280, y: 40, w: 220, h: 390 },
    { id: "export-zone", title: "Export", tone: "violet", x: 10, y: 330, w: 240, h: 245 },
    { id: "partner-zone", title: "Partner", tone: "neutral", x: 10, y: 620, w: 240, h: 100 },
    { id: "photos", title: "Photos", tone: "violet", x: 555, y: 620, w: 230, h: 100 },
  ],
  nodes: [
    // Step 1: the design as it stands today.
    {
      id: "customers",
      label: "Customers",
      sub: "400 orders a day",
      icon: "users",
      tone: "neutral",
      x: 130,
      y: 95,
      w: 176,
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "checks health",
      icon: "load-balancer",
      tone: "blue",
      x: 390,
      y: 95,
      w: 200,
      cloud: { aws: "aws-elb", gcp: "gcp-cloud-load-balancing", azure: "azure-app-gateway" },
    },
    {
      id: "app",
      label: "App servers",
      sub: "2 to 10, in 3 zones",
      icon: "server",
      tone: "teal",
      x: 390,
      y: 240,
      w: 200,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "db",
      label: "Orders database",
      sub: "standby + 03:00 backup",
      icon: "database",
      tone: "violet",
      x: 390,
      y: 385,
      w: 200,
      cloud: {
        aws: "aws-rds",
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure PostgreSQL" },
      },
    },
    {
      id: "export",
      label: "Export job",
      sub: "01:00 every night",
      icon: "function",
      tone: "teal",
      x: 130,
      y: 385,
      w: 196,
      cloud: functions,
    },
    {
      id: "bucket",
      label: "Orders bucket",
      sub: "730 export files",
      icon: "blob",
      tone: "violet",
      x: 130,
      y: 530,
      w: 176,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },
    {
      id: "partner",
      label: "Print partner",
      sub: "fetches at 06:00",
      icon: "building",
      tone: "neutral",
      x: 130,
      y: 675,
      w: 160,
    },
    {
      id: "resize",
      label: "Resize worker",
      sub: "every photo, nightly",
      icon: "media",
      tone: "teal",
      x: 660,
      y: 675,
      w: 196,
      cloud: functions,
    },

    // Steps 2 to 7: one review card per pillar, next to the part its question is about.
    {
      id: "ops",
      label: "Operations",
      sub: "would anyone know?",
      icon: "siren",
      tone: "red",
      step: 2,
      x: 130,
      y: 240,
      w: 176,
    },
    {
      id: "sec",
      label: "Security",
      sub: "who can read it?",
      icon: "lock",
      tone: "orange",
      step: 3,
      x: 390,
      y: 675,
      w: 160,
    },
    {
      id: "rel",
      label: "Reliability",
      sub: "can we get it back?",
      icon: "history",
      tone: "orange",
      step: 4,
      x: 660,
      y: 385,
      w: 176,
    },
    {
      id: "perf",
      label: "Performance",
      sub: "keeps up at 9:00?",
      icon: "gauge",
      tone: "orange",
      step: 5,
      x: 660,
      y: 95,
      w: 176,
    },
    {
      id: "cost",
      label: "Cost",
      sub: "paying for idle?",
      icon: "coin",
      tone: "orange",
      step: 6,
      x: 660,
      y: 240,
      w: 176,
    },
    {
      id: "sus",
      label: "Sustainability",
      sub: "work we can drop?",
      icon: "tree-deciduous",
      tone: "orange",
      step: 7,
      x: 660,
      y: 530,
      w: 176,
    },

    // Step 8: the one new part among the fixes.
    {
      id: "oncall",
      label: "On-call alert",
      sub: "no file by 02:00",
      icon: "bell",
      tone: "orange",
      step: 8,
      x: 390,
      y: 530,
      w: 196,
      cloud: {
        aws: { id: "aws-cloudwatch", label: "CloudWatch alarm" },
        gcp: "gcp-cloud-monitoring",
        azure: "azure-monitor",
      },
    },
  ],
  edges: [
    // Step 1: orders come in, are stored, and leave once a night as a file for the printing partner.
    { from: "customers", to: "lb", label: "orders", packet: true },
    { from: "lb", to: "app", packet: true, delay: 0.6 },
    { from: "app", to: "db", label: "save order", packet: true, delay: 1.2 },
    { from: "db", to: "export", label: "reads", dashed: true },
    { from: "export", to: "bucket", label: "one file a night", packet: true, delay: 0.6, labelAt: 0.3 },
    { from: "bucket", to: "partner", label: "06:00 download", packet: true, delay: 1.2, labelAt: 0.3 },

    // Steps 2 to 7: each card points at the weakness its question found. The fix replaces it in step 8.
    {
      from: "ops",
      to: "export",
      label: "crashed 3 nights, no alert",
      tone: "red",
      dashed: true,
      labelAt: 0.3,
      until: 7,
    },
    // The failure itself: the bucket gets no file. Drawn over the normal edge with its label lower down.
    {
      from: "export",
      to: "bucket",
      label: "no file, 3 nights",
      tone: "red",
      dashed: true,
      labelAt: 0.72,
      step: 2,
      until: 2,
    },
    { from: "sec", to: "partner", label: "reads all 730", tone: "red", dashed: true, until: 7 },
    { from: "rel", to: "db", label: "never restored", tone: "red", dashed: true, until: 7 },
    { from: "perf", to: "app", label: "new server: 4 min", tone: "red", dashed: true, until: 7 },
    { from: "cost", to: "db", label: "10% busy all year", tone: "red", dashed: true, until: 7 },
    { from: "sus", to: "resize", label: "redoes 3,600 a night", tone: "red", dashed: true, labelAt: 0.3, until: 7 },

    // Step 8: the fixes, one per card, and the alert that would have caught the failure on the first night.
    { from: "ops", to: "export", label: "tested on each deploy", tone: "green", dashed: true, labelAt: 0.3, step: 8 },
    { from: "bucket", to: "oncall", label: "checks", packet: true, step: 8 },
    { from: "sec", to: "partner", label: "1 file, 24 h", tone: "green", dashed: true, step: 8 },
    { from: "rel", to: "db", label: "drill: 50 min", tone: "green", dashed: true, step: 8 },
    { from: "perf", to: "app", label: "10 servers at 8:30", tone: "green", dashed: true, step: 8 },
    { from: "cost", to: "db", label: "one size down", tone: "green", dashed: true, step: 8 },
    { from: "sus", to: "resize", label: "new photos only", tone: "green", dashed: true, labelAt: 0.3, step: 8 },
  ],
};

export default spec;
