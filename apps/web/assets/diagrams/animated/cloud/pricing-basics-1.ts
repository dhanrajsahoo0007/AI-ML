import type { DiagramSpec } from "@/components/diagrams/types";

// How a cloud bill is built, told as one month of Brightpost's bill (cloud/fundamentals/pricing-basics).
// Step 1: customers send orders to two app servers, billed for every hour they run. Step 2: a database and the
// buckets join, billed for what they hold and for each request. Step 3: a CDN sends product photos to customers,
// billed per GB that leaves. Step 4: every request writes a log line, billed per GB written and kept. Step 5 (the
// failure step): a copy of the shop built for a load test is never switched off; it runs 4 servers for 720 hours
// and writes debug logs, and the bill doubles. Step 6: tags, cost reports, a budget alert and a switch-off
// schedule. Step 7: a commitment covers the steady base, and the resize worker moves to spot capacity.
//
// Nodes never move between steps. The test copy's debug logs end at step 5 (`until: 5`), because the fix in
// step 6 turns them off; the node itself stays, faded, as the thing the fixes act on.
//
// Layout: three columns.
//   Left (x 130): CDN, buckets, budget alert, cost reports.
//   Middle (x 390): customers, app servers, database, test copy (the request path runs down this column).
//   Right (x 660): resize worker on spot, commitment, logs, switch-off schedule.
// Rows (centres): 95 | 255 | 430 | 600.
// cdn 130,95 | customers 390,95 | spot 660,95 | buckets 130,255 | servers 390,255 | commit 660,255 |
// alert 130,430 | db 390,430 | logs 660,430 | reports 130,600 | test 390,600 | schedule 660,600.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 to 3 and the
// failure (step 5) happen in the left and middle columns; only the logs (step 4) and the fixes need the right one.
// The canvas stays under 800 wide so labels are readable in the 660 px article column.
//
// Zone tabs sit on the top-left corner of a zone. Vertical edges at x 130 and x 390 enter zones right of their
// tabs. The edge from the servers to the logs runs down the gutter at x 530 and enters the Operations zone from
// the side, below its tab. The test environment uses the subnet kind (inline label, no tab), because the copy
// edge enters it through the top at x 390.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon.
// Nodes are sized for the longest name the Services toggle puts in them ("Virtual Machines", "Azure PostgreSQL",
// "CloudWatch Logs", "Cost Management", "Billing budgets", "Spot Instances"), not only for the generic label.
const spec: DiagramSpec = {
  title: "Brightpost's cloud bill, built meter by meter",
  width: 795,
  height: 670,
  steps: [
    { title: "Servers: billed for time" },
    { title: "Storage: billed for what you keep" },
    { title: "Data leaving: billed per GB" },
    { title: "Logs: a managed-service meter" },
    { title: "A forgotten test copy doubles the bill" },
    { title: "Tags, a budget alert and a switch-off schedule" },
    { title: "Commit to the base, spot for the batch" },
  ],
  zones: [
    { id: "edge", title: "Edge", tone: "blue", x: 10, y: 40, w: 240, h: 100 },
    { id: "clients", title: "Customers", tone: "neutral", x: 295, y: 40, w: 190, h: 100 },
    { id: "buying", title: "Buying compute", tone: "teal", x: 555, y: 40, w: 230, h: 260 },
    { id: "storage", title: "Storage", tone: "violet", x: 10, y: 200, w: 240, h: 100 },
    { id: "shop", title: "Shop", tone: "teal", x: 295, y: 200, w: 190, h: 100 },
    { id: "billing", title: "Billing", tone: "orange", x: 10, y: 375, w: 240, h: 275 },
    { id: "data", title: "Database", tone: "violet", x: 295, y: 375, w: 190, h: 100 },
    { id: "ops", title: "Operations", tone: "orange", x: 555, y: 375, w: 230, h: 275 },
    { id: "test", title: "Test environment", tone: "neutral", kind: "subnet", x: 295, y: 545, w: 190, h: 105 },
  ],
  nodes: [
    // Step 1: time
    {
      id: "customers",
      label: "Customers",
      sub: "400 orders a day",
      icon: "users",
      tone: "neutral",
      x: 390,
      y: 95,
      w: 176,
    },
    {
      id: "servers",
      label: "App servers",
      sub: "2 servers, per hour",
      icon: "server",
      tone: "teal",
      x: 390,
      y: 255,
      w: 176,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },

    // Step 2: storage held and requests
    {
      id: "buckets",
      label: "Buckets",
      sub: "GB held + requests",
      icon: "blob",
      tone: "violet",
      step: 2,
      x: 130,
      y: 255,
      w: 176,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },
    {
      id: "db",
      label: "Database",
      sub: "hours + GB held",
      icon: "database",
      tone: "violet",
      step: 2,
      x: 390,
      y: 430,
      w: 176,
      cloud: {
        aws: "aws-rds",
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure PostgreSQL" },
      },
    },

    // Step 3: data leaving
    {
      id: "cdn",
      label: "CDN",
      sub: "billed per GB out",
      icon: "cdn",
      tone: "blue",
      step: 3,
      x: 130,
      y: 95,
      w: 176,
      cloud: { aws: "aws-cloudfront", gcp: "gcp-cloud-cdn", azure: "azure-front-door" },
    },

    // Step 4: a managed-service meter
    {
      id: "logs",
      label: "Logs",
      sub: "GB written + kept",
      icon: "log",
      tone: "orange",
      step: 4,
      x: 660,
      y: 430,
      w: 176,
      cloud: {
        aws: { id: "aws-cloudwatch", label: "CloudWatch Logs" },
        gcp: "gcp-cloud-logging",
        azure: "azure-monitor",
      },
    },

    // Step 5: the failure
    {
      id: "test",
      label: "Test copy",
      sub: "4 servers, 720 hours",
      icon: "server",
      tone: "red",
      step: 5,
      x: 390,
      y: 600,
      w: 176,
    },

    // Step 6: see the bill, get warned, switch off
    {
      id: "reports",
      label: "Cost reports",
      sub: "spend by tag",
      icon: "chart",
      tone: "orange",
      step: 6,
      x: 130,
      y: 600,
      w: 176,
      cloud: {
        aws: "aws-cost-explorer",
        gcp: { id: "gcp-cloud-billing", label: "Billing reports" },
        azure: "azure-cost-management",
      },
    },
    {
      id: "alert",
      label: "Budget alert",
      sub: "warns on day 3",
      icon: "bell",
      tone: "orange",
      step: 6,
      x: 130,
      y: 430,
      w: 176,
      cloud: {
        aws: "aws-budgets",
        gcp: { id: "gcp-cloud-billing", label: "Billing budgets" },
        azure: { id: "azure-cost-management", label: "Budgets" },
      },
    },
    {
      id: "schedule",
      label: "Switch-off schedule",
      sub: "test off at night",
      icon: "clock",
      tone: "orange",
      step: 6,
      x: 660,
      y: 600,
      w: 176,
    },

    // Step 7: buy the steady base and the batch job differently
    {
      id: "commit",
      label: "Commitment",
      sub: "1 year, steady base",
      icon: "coin",
      tone: "teal",
      step: 7,
      x: 660,
      y: 255,
      w: 176,
      cloud: {
        aws: { label: "Savings Plans" },
        gcp: { label: "Committed use" },
        azure: { label: "Reservations" },
      },
    },
    {
      id: "spot",
      label: "Resize worker",
      sub: "on spot capacity",
      icon: "workers",
      tone: "teal",
      step: 7,
      x: 660,
      y: 95,
      w: 176,
      cloud: {
        aws: { id: "aws-ec2", label: "Spot Instances" },
        gcp: { id: "gcp-compute-engine", label: "Spot VMs" },
        azure: { id: "azure-vm", label: "Spot VMs" },
      },
    },
  ],
  edges: [
    // Step 1: orders reach the servers, which bill for every hour they run.
    { from: "customers", to: "servers", label: "orders", packet: true },

    // Step 2: the servers store photos and exports, and read and write orders.
    { from: "servers", to: "buckets", label: "files", packet: true, delay: 1 },
    { from: "servers", to: "db", label: "orders", packet: true, delay: 1 },

    // Step 3: photos leave the cloud through the CDN; the CDN fetches its copies from the buckets.
    { from: "cdn", to: "customers", label: "GB out", packet: true },
    { from: "buckets", to: "cdn", label: "copies", dashed: true },

    // Step 4: every request writes a log line. The edge runs down the gutter at x 530.
    {
      from: "servers",
      to: "logs",
      label: "every request",
      dashed: true,
      flow: true,
      via: [
        [530, 300],
        [530, 430],
      ],
      labelAt: 0.55,
    },

    // Step 5: the copy is made for one load test and never switched off; it logs every call in full.
    { from: "db", to: "test", label: "copied for a test", dashed: true },
    { from: "test", to: "logs", label: "debug logs", tone: "red", flow: true, until: 5 },

    // Step 6: tags make the copy visible, the budget warns, the schedule switches it off.
    { from: "test", to: "reports", label: "tag: test", dashed: true },
    { from: "reports", to: "alert", label: "spend so far", packet: true },
    { from: "schedule", to: "test", label: "off nights", tone: "green", dashed: true },

    // Step 7: a commitment covers the two servers that run all year; the resize worker runs on spot.
    { from: "commit", to: "servers", label: "covers 2", dashed: true },
    { from: "servers", to: "spot", label: "resize jobs", packet: true, labelAt: 0.6 },
  ],
};

export default spec;
