import type { DiagramSpec } from "@/components/diagrams/types";

// Quotas and retries, told as Brightpost's spring sale (cloud/resilience/quotas-and-retries).
// Step 1: the sale plan. Shoppers reach the app servers through the load balancer, and the autoscaler is told to
// start 10 servers at 8:30. Step 2 (the failure step): the region's processor quota allows 32 cores, 8 of
// Brightpost's 4-core servers, so servers 9 and 10 are refused; the checkout page retries Pay 3 times with no wait,
// and the load on 8 servers roughly triples. Step 3: the quota is raised to 64 cores before the next sale and an
// alert warns at 80% of it. Step 4: the page retries once, after a growing random wait (backoff and jitter).
// Step 5: Pay carries an order key, so a repeated Pay finds the first order instead of making a second.
// Step 6: work that can wait (confirmation emails) goes through a queue; the worker backs off when the rented
// email service slows it down, and a message that fails 5 times moves to a dead-letter queue.
//
// Nodes never move. The edges that later steps replace (instant retries, the refused launch) end with `until`.
//
// Layout: three columns, rows at y 95 | 235 | 375 | 530 | 700.
//   Left (x 130): the request path: shoppers, load balancer, app servers, orders database.
//   Middle (x 400): the cloud's side: quota and autoscaler on top, the order-key table beside the database.
//   Right (x 670): added later: the quota alert, then the email path (dead-letter queue, queue, worker, email).
// shoppers 130,95 | quota 400,95 | alert 670,95 | lb 130,235 | autoscaler 400,235 | dlq 670,235 |
// servers 130,375 | queue 670,375 | db 130,530 | keys 400,530 | worker 670,530 | email 670,700.
//
// Why this order: on a phone the figure opens on the left 480 units. Steps 1 and 2 use only the left and middle
// columns. The long servers-to-queue edge runs along row y 375, which is empty in the middle column.
// Vertical edges in the left column run at x 130, right of the zone tabs. The "Outside" zone is a subnet (inline
// label, no tab). Nodes are sized for the longest name the Services toggle shows ("Cloud Load Balancing",
// "Cloud Run functions", "Subscription quota"), at 7.2 px a character after 52 px for the icon.
const spec: DiagramSpec = {
  title: "A sale-day quota, a retry storm, and safe retries",
  width: 795,
  height: 750,
  steps: [
    { title: "The sale plan: 10 servers at 8:30" },
    { title: "The quota stops at 8; instant retries triple the load" },
    { title: "Raise the quota early, alert at 80%" },
    { title: "Retry once, after a random growing wait" },
    { title: "An order key makes a repeat harmless" },
    { title: "Work that can wait goes through a queue" },
  ],
  zones: [
    { id: "shoppers-z", title: "Shoppers", tone: "neutral", x: 10, y: 40, w: 240, h: 110 },
    { id: "shop", title: "App", tone: "teal", x: 10, y: 180, w: 240, h: 245 },
    { id: "control", title: "Cloud control plane", tone: "orange", x: 290, y: 40, w: 215, h: 250 },
    { id: "data", title: "Data", tone: "violet", x: 10, y: 475, w: 495, h: 140 },
    { id: "alerts", title: "Alerts", tone: "orange", x: 560, y: 40, w: 225, h: 110 },
    { id: "mail", title: "Email path", tone: "orange", x: 560, y: 180, w: 225, h: 420 },
    { id: "outside", title: "Outside", tone: "neutral", kind: "subnet", x: 560, y: 635, w: 225, h: 105 },
  ],
  nodes: [
    // Step 1: the sale plan.
    {
      id: "shoppers",
      label: "Shoppers",
      sub: "1,900 at 9:00",
      icon: "users",
      tone: "neutral",
      x: 130,
      y: 95,
      w: 176,
    },
    {
      id: "lb",
      label: "Load balancer",
      sub: "spreads requests",
      icon: "load-balancer",
      tone: "blue",
      x: 130,
      y: 235,
      w: 200,
      cloud: { aws: "aws-elb", gcp: "gcp-cloud-load-balancing", azure: "azure-app-gateway" },
    },
    {
      id: "servers",
      label: "App servers",
      sub: "4 cores each",
      icon: "server",
      tone: "teal",
      x: 130,
      y: 375,
      w: 200,
      cloud: { aws: "aws-ec2", gcp: "gcp-compute-engine", azure: "azure-vm" },
    },
    {
      id: "db",
      label: "Orders database",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 130,
      y: 530,
      cloud: { aws: "aws-rds", gcp: "gcp-cloud-sql", azure: { id: "azure-postgresql", label: "Azure PostgreSQL" } },
    },
    {
      id: "autoscaler",
      label: "Autoscaler",
      sub: "10 servers at 8:30",
      icon: "controller",
      tone: "teal",
      x: 400,
      y: 235,
      w: 190,
      cloud: {
        aws: { label: "EC2 Auto Scaling" },
        gcp: { label: "MIG autoscaler" },
        azure: { label: "Autoscale setting" },
      },
    },

    // Step 2: the failure. The limit was always there; this is the first time anyone sees it.
    {
      id: "quota",
      label: "Regional quota",
      sub: "32 cores: 8 servers",
      icon: "meter",
      tone: "orange",
      step: 2,
      x: 400,
      y: 95,
      w: 190,
      cloud: {
        aws: { label: "Service Quotas" },
        gcp: { label: "Cloud Quotas" },
        azure: { label: "Subscription quota" },
      },
    },

    // Step 3: the quota is raised ahead of time and watched.
    {
      id: "alert",
      label: "Quota alert",
      sub: "warns at 80%",
      icon: "bell",
      tone: "orange",
      step: 3,
      x: 670,
      y: 95,
      w: 190,
      cloud: { aws: "aws-cloudwatch", gcp: "gcp-cloud-monitoring", azure: "azure-monitor" },
    },

    // Step 5: a table of order keys already seen.
    {
      id: "keys",
      label: "Order keys",
      sub: "one order per key",
      icon: "hash",
      tone: "violet",
      step: 5,
      x: 400,
      y: 530,
      w: 190,
    },

    // Step 6: the email path.
    {
      id: "dlq",
      label: "Dead-letter queue",
      sub: "after 5 tries",
      icon: "queue",
      tone: "orange",
      step: 6,
      x: 670,
      y: 235,
      w: 190,
      cloud: {
        aws: { id: "aws-sqs", label: "SQS dead-letter" },
        gcp: { id: "gcp-pubsub", label: "Dead-letter topic" },
        azure: { id: "azure-service-bus", label: "Dead-letter queue" },
      },
    },
    {
      id: "queue",
      label: "Email queue",
      sub: "one message per order",
      icon: "queue",
      tone: "orange",
      step: 6,
      x: 670,
      y: 375,
      w: 190,
      cloud: { aws: "aws-sqs", gcp: "gcp-pubsub", azure: "azure-service-bus" },
    },
    {
      id: "worker",
      label: "Email worker",
      sub: "sends confirmations",
      icon: "function",
      tone: "teal",
      step: 6,
      x: 670,
      y: 530,
      w: 190,
      cloud: { aws: "aws-lambda", gcp: "gcp-cloud-run-functions", azure: "azure-functions" },
    },
    {
      id: "email",
      label: "Email service",
      sub: "rented, rate-limited",
      icon: "api",
      tone: "neutral",
      step: 6,
      x: 670,
      y: 700,
      w: 190,
    },
  ],
  edges: [
    // Step 1: the request path and the scaling plan.
    { from: "shoppers", to: "lb", label: "browse, Pay", packet: true, until: 1, labelAt: 0.36 },
    { from: "lb", to: "servers", label: "spread", packet: true, delay: 0.6 },
    { from: "servers", to: "db", label: "write order", packet: true, delay: 1.2 },
    { from: "autoscaler", to: "servers", label: "start 10", dashed: true, labelAt: 0.62 },

    // Step 2: the launch of servers 9 and 10 is refused, and Pay is retried with no wait.
    {
      from: "autoscaler",
      to: "quota",
      label: "servers 9, 10: refused",
      tone: "red",
      dashed: true,
      step: 2,
      until: 2,
    },
    {
      from: "shoppers",
      to: "lb",
      label: "Pay ×4, no wait",
      tone: "red",
      packet: true,
      step: 2,
      until: 3,
      labelAt: 0.36,
    },

    // Step 3: the quota was raised to 64 cores, and an alert watches usage.
    { from: "autoscaler", to: "quota", label: "10 of 16: OK", tone: "green", step: 3 },
    { from: "quota", to: "alert", label: "at 80%", dashed: true, step: 3 },

    // Step 4: one retry, after a wait that grows and has a random part.
    { from: "shoppers", to: "lb", label: "retry once: 1–2 s, random", packet: true, step: 4, until: 4, labelAt: 0.36 },

    // Step 5: the same order key travels with every try.
    { from: "shoppers", to: "lb", label: "Pay + order key", packet: true, step: 5, labelAt: 0.36 },
    { from: "servers", to: "keys", label: "key seen? reuse", dashed: true, step: 5 },

    // Step 6: emails leave the request path and drain at the email service's pace.
    { from: "servers", to: "queue", label: "email later", flow: true, dashed: true, step: 6 },
    { from: "queue", to: "worker", label: "pull 10", packet: true, step: 6 },
    { from: "worker", to: "email", label: "slowed? back off", packet: true, delay: 0.8, step: 6 },
    { from: "queue", to: "dlq", label: "after 5 tries", dashed: true, step: 6 },
  ],
};

export default spec;
