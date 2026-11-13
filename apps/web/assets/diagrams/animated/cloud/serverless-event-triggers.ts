import type { DiagramSpec } from "@/components/diagrams/types";

// One function as glue between events, told as the story of Brightpost's resize function
// (cloud/compute/serverless-functions). Step 1: a photo lands in the uploads bucket, the storage event starts the
// function, it writes a thumbnail and saves the thumbnail's address in the shop database. Step 2 (the failure step):
// a bulk upload of 1,500 sale photos starts about 300 copies, each opens its own database connection, and the shop's
// app servers are refused. Step 3: a cap of 20 copies and a connection pool in front of the database. Step 4: a queue
// between the bucket and the function takes the burst; events that fail 5 times go to a dead-letter queue. Step 5: a
// schedule is a trigger too (a 04:00 sweep). Step 6: an HTTP trigger, where the caller waits for the reply.
//
// Nodes never move between steps. The direct bucket-to-function edge ends at step 3 (`until: 3`), when the queue
// takes its place; the direct function-to-database edges end at step 2, when the pool takes their place.
//
// Layout: three columns. Left (x 130): staff, photo storage, shop servers. Middle (x 390): the queue, the function,
// the pool and the database, top to bottom. Right (x 672): the dead-letter queue and the two later triggers.
// Rows (centres): 95 | 245 | 400 | 560.
// bulk 130,95 | queue 390,95 | dlq 672,95 | uploads 130,245 | fn 390,245 | clock 672,245 |
// thumbs 130,400 | pool 390,400 | gateway 672,400 | shop 130,560 | db 390,560 | admin 672,560.
//
// Why this order: on a phone the figure opens on the left 480 units. Steps 1 to 4 happen in the left and middle
// columns, so the free preview and the failure show without scrolling; only the dead-letter queue and steps 5 and 6
// need the right column. Diagonal edges run through the gaps between zones (rows 140-190 and 300-345).
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. Nodes
// are sized for the longest name the Services toggle puts in them ("Azure Virtual Machines", "EventBridge
// Scheduler", "Dead-letter subqueue", "Cloud Run functions").
const spec: DiagramSpec = {
  title: "A function between events: from a direct trigger to a capped, queued design",
  width: 795,
  height: 665,
  steps: [
    { title: "A photo lands, the function runs" },
    { title: "1,500 photos, 300 copies, no connections left" },
    { title: "Cap the copies, share the connections" },
    { title: "A queue takes the burst" },
    { title: "A clock is a trigger too" },
    { title: "An HTTP call: someone waits" },
  ],
  zones: [
    { id: "staff", title: "Staff", tone: "neutral", x: 10, y: 40, w: 240, h: 100 },
    { id: "messaging", title: "Messaging", tone: "orange", x: 285, y: 40, w: 500, h: 105 },
    { id: "storage", title: "Photo storage", tone: "violet", x: 10, y: 190, w: 240, h: 290 },
    { id: "functions", title: "Functions", tone: "teal", x: 285, y: 190, w: 210, h: 110 },
    { id: "schedule", title: "Schedule", tone: "orange", x: 560, y: 190, w: 225, h: 110 },
    { id: "data", title: "Database", tone: "violet", x: 285, y: 345, w: 210, h: 300 },
    { id: "front", title: "Front door", tone: "blue", x: 560, y: 345, w: 225, h: 110 },
    { id: "shopzone", title: "Shop", tone: "teal", x: 10, y: 505, w: 240, h: 110 },
    { id: "staff2", title: "Staff", tone: "neutral", x: 560, y: 505, w: 225, h: 110 },
  ],
  nodes: [
    // Step 1
    {
      id: "uploads",
      label: "Uploads bucket",
      sub: "new photos",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      x: 130,
      y: 245,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },
    {
      id: "fn",
      label: "Resize function",
      sub: "about 2 s per photo",
      icon: "function",
      tone: "teal",
      accent: true,
      x: 390,
      y: 245,
      w: 192,
      cloud: { aws: "aws-lambda", gcp: "gcp-cloud-run-functions", azure: "azure-functions" },
    },
    {
      id: "thumbs",
      label: "Thumbnails bucket",
      sub: "one per photo",
      icon: "media",
      tone: "violet",
      variant: "glyph",
      x: 130,
      y: 400,
      cloud: { aws: "aws-s3", gcp: "gcp-cloud-storage", azure: "azure-blob" },
    },
    {
      id: "shop",
      label: "Shop app servers",
      sub: "6 running at 8:50",
      icon: "server",
      tone: "teal",
      x: 130,
      y: 560,
      w: 212,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "db",
      label: "Shop database",
      sub: "200 connections at most",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 390,
      y: 560,
      cloud: {
        aws: "aws-rds",
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure DB for PostgreSQL" },
      },
    },

    // Step 2: the failure
    {
      id: "bulk",
      label: "Bulk upload",
      sub: "1,500 sale photos",
      icon: "media",
      tone: "neutral",
      step: 2,
      x: 130,
      y: 95,
      w: 176,
    },

    // Step 3
    {
      id: "pool",
      label: "Connection pool",
      sub: "20 shared connections",
      icon: "proxy",
      tone: "violet",
      step: 3,
      x: 390,
      y: 400,
      w: 192,
      cloud: {
        aws: { id: "aws-rds", label: "RDS Proxy" },
        gcp: { label: "PgBouncer pool" },
        azure: { id: "azure-postgresql", label: "Built-in PgBouncer" },
      },
    },

    // Step 4
    {
      id: "queue",
      label: "Photo queue",
      sub: "one message per photo",
      icon: "queue",
      tone: "orange",
      step: 4,
      x: 390,
      y: 95,
      w: 182,
      cloud: { aws: "aws-sqs", gcp: "gcp-pubsub", azure: "azure-service-bus" },
    },
    {
      id: "dlq",
      label: "Dead-letter queue",
      sub: "photos that keep failing",
      icon: "queue",
      tone: "orange",
      step: 4,
      x: 672,
      y: 95,
      w: 200,
      cloud: {
        aws: { id: "aws-sqs", label: "SQS dead-letter" },
        gcp: { id: "gcp-pubsub", label: "Dead-letter topic" },
        azure: { id: "azure-service-bus", label: "Dead-letter subqueue" },
      },
    },

    // Step 5
    {
      id: "clock",
      label: "Scheduler",
      sub: "every night at 04:00",
      icon: "clock",
      tone: "orange",
      step: 5,
      x: 672,
      y: 245,
      w: 206,
      cloud: {
        aws: { id: "aws-eventbridge", label: "EventBridge Scheduler" },
        gcp: { label: "Cloud Scheduler" },
        azure: { id: "azure-functions", label: "Timer trigger" },
      },
    },

    // Step 6
    {
      id: "gateway",
      label: "HTTPS endpoint",
      sub: "the caller waits",
      icon: "api",
      tone: "blue",
      step: 6,
      x: 672,
      y: 400,
      w: 196,
      cloud: {
        aws: { id: "aws-lambda", label: "Function URL" },
        gcp: { id: "gcp-cloud-run-functions", label: "Function URL" },
        azure: { id: "azure-functions", label: "HTTP trigger" },
      },
    },
    {
      id: "admin",
      label: "Admin page",
      sub: "support agent",
      icon: "browser",
      tone: "neutral",
      step: 6,
      x: 672,
      y: 560,
      w: 176,
    },
  ],
  edges: [
    // Step 1: a storage event starts one copy per photo. The copy writes a thumbnail and saves its address.
    { from: "uploads", to: "fn", label: "new photo", packet: true, until: 3 },
    { from: "fn", to: "thumbs", label: "thumbnail", packet: true, delay: 1.2 },
    { from: "fn", to: "db", label: "save address", packet: true, delay: 1.2, until: 1 },
    { from: "shop", to: "db", label: "orders", packet: true, until: 1 },

    // Step 2: 1,500 photos in two minutes; each busy copy opens its own connection and the shop is refused.
    { from: "bulk", to: "uploads", label: "1,500 photos", packet: true, step: 2 },
    { from: "fn", to: "db", label: "300 connections", tone: "red", packet: true, step: 2, until: 2 },
    { from: "shop", to: "db", label: "refused", tone: "red", dashed: true, step: 2, until: 2 },

    // Step 3: at most 20 copies, and a pool that shares 20 connections among them.
    { from: "fn", to: "pool", label: "20 copies at most", packet: true, step: 3 },
    { from: "pool", to: "db", label: "20 connections", packet: true, delay: 1.2, step: 3 },
    { from: "shop", to: "db", label: "orders", packet: true, step: 3 },

    // Step 4: the bucket's event goes to a queue; the function takes 20 at a time; repeated failures are parked.
    { from: "uploads", to: "queue", label: "message", packet: true, step: 4 },
    { from: "queue", to: "fn", label: "20 at a time", packet: true, delay: 1.2, step: 4 },
    { from: "queue", to: "dlq", label: "5 failures", tone: "orange", dashed: true, step: 4 },

    // Step 5: a schedule starts the function with no event from outside.
    { from: "clock", to: "fn", label: "04:00", packet: true, step: 5 },

    // Step 6: an HTTP call; the caller holds the connection open until the function replies.
    { from: "admin", to: "gateway", label: "redo one photo", packet: true, step: 6 },
    { from: "gateway", to: "fn", label: "waits for reply", packet: true, delay: 1.2, bidirectional: true, step: 6 },
  ],
};

export default spec;
