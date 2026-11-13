import type { DiagramSpec } from "@/components/diagrams/types";

// The levers that change a cloud bill, told as the story of Brightpost's oversized commitment
// (cloud/operations/cloud-cost-models).
// Step 1: everything runs on demand: customers send orders to 2 app servers, which query the database.
// Step 2: a usage history counts the servers running each hour; the floor is 2, the peak 10.
// Step 3 (the only failure step): a 3-year commitment sized on the sale week covers 4 machines; the fleet uses 2.4
// in an average hour, and the resize worker, now a serverless function, is not covered at all.
// Step 4: the rule Brightpost now follows: commit to the 2 always-on servers, and let extra servers on busy days
// run on demand.
// Step 5: the nightly order export runs on spot capacity and is retried if the machine is taken back.
// Step 6: a lifecycle rule moves export files to a colder storage class after 90 days.
//
// Nodes never move between steps. The oversized commitment is not a node of its own: the commitment node stays, and
// what it covers lives in the label of its edge to the servers. The step-3 edge ("4 bought, 2.4 used") ends at
// step 3 (`until: 3`); the step-4 edge ("covers the 2 always on") replaces it on the same line.
//
// Layout: three columns.
//   Left (x 130): customers, usage history, commitment, resize function. The billing pieces and the failure.
//   Middle (x 395): app servers, database, nightly export.
//   Right (x 665): extra servers, orders bucket, cold class.
// Rows (centres): 95 | 265 | 425 | 585.
// customers 130,95 | servers 395,95 | extra 665,95 | usage 130,265 | db 395,265 | commit 130,425 | export 395,425 |
// bucket 665,425 | function 130,585 | cold 665,585.
//
// Why this order: on a phone the figure scrolls sideways and opens on the left 480 units. Steps 1 to 3 (the free
// preview and the failure) use only the left and middle columns; the right column arrives with step 4.
// The canvas stays under 800 wide so labels are readable in the 660 px article column.
//
// The commitment's edge to the servers runs diagonally between the usage node and the database; its pill sits at
// labelAt 0.25, in the gap between the usage node and the commitment, clear of both. Zone tabs sit on a zone's
// top-left corner; the shop zone is the vpc kind and every edge enters it from the side.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon.
// Nodes are sized for the longest name the Services toggle puts in them ("Managed instance group" w 214,
// "Cloud Run functions" w 192, "Reserved Instances" w 190, "Virtual Machines", "Azure PostgreSQL").
const bucket = { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" } as const;

const spec: DiagramSpec = {
  title: "Rightsize, commit to the floor, spot for jobs that can stop, tier the storage",
  width: 795,
  height: 680,
  steps: [
    { title: "Everything on demand" },
    { title: "Measure the floor and the peak" },
    { title: "A commitment sized on the sale week" },
    { title: "Commit to the floor, on demand above it" },
    { title: "Spot capacity for the nightly export" },
    { title: "Old exports move to a colder class" },
  ],
  zones: [
    { id: "people", title: "Customers", tone: "neutral", x: 10, y: 40, w: 240, h: 140 },
    { id: "billing", title: "Billing", tone: "orange", x: 10, y: 205, w: 240, h: 285 },
    { id: "serverless", title: "Serverless", tone: "teal", x: 10, y: 515, w: 240, h: 150 },
    { id: "shop", title: "Shop account", tone: "blue", kind: "vpc", x: 285, y: 40, w: 500, h: 625 },
  ],
  nodes: [
    // Step 1: the shop, all on demand.
    {
      id: "customers",
      label: "Customers",
      sub: "400 orders a day",
      icon: "users",
      tone: "neutral",
      variant: "glyph",
      x: 130,
      y: 95,
    },
    {
      id: "servers",
      label: "App servers",
      sub: "2 always on",
      icon: "server",
      tone: "teal",
      x: 395,
      y: 95,
      w: 172,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "db",
      label: "Database",
      sub: "runs every hour",
      icon: "database",
      tone: "violet",
      x: 395,
      y: 265,
      w: 172,
      cloud: {
        aws: "aws-rds",
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure PostgreSQL" },
      },
    },

    // Step 2: measure before buying.
    {
      id: "usage",
      label: "Usage history",
      sub: "floor 2, peak 10",
      icon: "chart",
      tone: "orange",
      step: 2,
      x: 130,
      y: 265,
      w: 176,
      cloud: {
        aws: "aws-cost-explorer",
        gcp: { id: "gcp-cloud-billing", label: "Billing reports" },
        azure: "azure-cost-management",
      },
    },

    // Step 3: the failure. A commitment sized on the peak, and a worker it cannot cover.
    {
      id: "commit",
      label: "Commitment",
      sub: "paid used or not",
      icon: "coin",
      tone: "orange",
      step: 3,
      x: 130,
      y: 425,
      w: 190,
      cloud: {
        aws: { label: "Reserved Instances" },
        gcp: { label: "Committed use" },
        azure: { label: "Reservations" },
      },
    },
    {
      id: "function",
      label: "Resize function",
      sub: "billed per request",
      icon: "function",
      tone: "teal",
      step: 3,
      x: 130,
      y: 585,
      w: 192,
      cloud: { aws: "aws-lambda", gcp: "gcp-cloud-run-functions", azure: "azure-functions" },
    },

    // Step 4: on demand above the floor.
    {
      id: "extra",
      label: "Extra servers",
      sub: "busy days only",
      icon: "server",
      tone: "teal",
      step: 4,
      x: 665,
      y: 95,
      w: 214,
      cloud: {
        aws: { id: "aws-ec2", label: "Auto Scaling group" },
        gcp: { id: "gcp-compute-engine", label: "Managed instance group" },
        azure: { id: "azure-vm", label: "VM Scale Sets" },
      },
    },

    // Step 5: spot capacity for work that can stop.
    {
      id: "export",
      label: "Nightly export",
      sub: "spot, retried if taken",
      icon: "workers",
      tone: "teal",
      step: 5,
      x: 395,
      y: 425,
      w: 182,
      cloud: {
        aws: { id: "aws-ec2", label: "Spot Instances" },
        gcp: { id: "gcp-compute-engine", label: "Spot VMs" },
        azure: { id: "azure-vm", label: "Spot VMs" },
      },
    },
    {
      id: "bucket",
      label: "Orders bucket",
      sub: "730 export files",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      step: 5,
      x: 665,
      y: 425,
      cloud: bucket,
    },

    // Step 6: old exports move to a colder storage class.
    {
      id: "cold",
      label: "Cold class",
      sub: "exports over 90 days",
      icon: "blob",
      tone: "blue",
      variant: "glyph",
      step: 6,
      x: 665,
      y: 585,
      cloud: {
        aws: { id: "aws-s3", label: "Glacier Instant Retrieval" },
        gcp: { id: "gcp-cloud-storage", label: "Coldline" },
        azure: { id: "azure-blob", label: "Cold tier" },
      },
    },
  ],
  edges: [
    // Step 1: orders reach the servers, which query the database. Every hour is billed at the full rate.
    { from: "customers", to: "servers", label: "orders", packet: true },
    { from: "servers", to: "db", label: "SQL", packet: true, delay: 1.2 },

    // Step 2: the usage history counts the servers running each hour.
    { from: "servers", to: "usage", label: "servers per hour", dashed: true, flow: true, step: 2 },

    // Step 3: the commitment covers 4 machines but the fleet uses 2.4 on average; the function is not covered.
    {
      from: "commit",
      to: "servers",
      label: "4 bought, 2.4 used",
      tone: "red",
      packet: true,
      labelAt: 0.25,
      step: 3,
      until: 3,
    },
    { from: "commit", to: "function", label: "not covered", tone: "red", dashed: true, step: 3, until: 3 },

    // Step 4: commit to the 2 servers that never switch off; extra servers on busy days stay on demand.
    { from: "commit", to: "servers", label: "covers the 2 always on", tone: "green", labelAt: 0.25, step: 4 },
    { from: "servers", to: "extra", label: "on demand", dashed: true, step: 4 },

    // Step 5: the nightly export reads the orders and writes one file a night, on spot capacity.
    { from: "db", to: "export", label: "orders", packet: true, step: 5 },
    { from: "export", to: "bucket", label: "1 file a night", packet: true, delay: 1.2, step: 5 },

    // Step 6: a lifecycle rule moves each export to the cold class after 90 days.
    { from: "bucket", to: "cold", label: "after 90 days", tone: "orange", flow: true, step: 6 },
  ],
};

export default spec;
