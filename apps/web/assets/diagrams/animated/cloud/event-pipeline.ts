import type { DiagramSpec } from "@/components/diagrams/types";

// Brightpost's stock-event pipeline (cloud/data/streaming-and-messaging-services).
// Step 1: the shop puts every basket change and order on a stock stream of 3 partitions, keyed by product id; one
// worker per partition updates the stock counts that the product page shows.
// Step 2 (the failure step): on sale day every hero-poster event hashes to partition 2. Its worker falls 6 hours
// behind, so the page shows the wrong stock and 380 extra orders are taken. The red "Wrong stock count" node stays.
// Step 3: a lag alarm watches every partition. Step 4: the key becomes product id + a slot 0-5 and the workers
// batch, so the hot product spreads over all three partitions (the step 1 key edges end with `until: 3`).
// Step 5: an event bus routes "order cancelled" to a refund workflow. Step 6: the workflow refunds the payment
// with retries and waits for the support agent on large orders.
// Other pages embed single steps and highlight nodes by id, so the ids are part of the contract: shop, p0, p1, p2,
// w0, w1, w2, counts, page, wrong, lag, bus, workflow, agent, payments.
//
// Layout: two halves. The left half (x 10-475) holds everything of steps 1 and 2 in four bands (shop, stream,
// workers, data, shoppers), so on a phone, where the figure opens on the left ~480 units, the free preview and the
// failure show without scrolling. The right half (x 490-785) holds the lag alarm (beside the stream), the event bus
// (beside the workers) and the refund workflow with its two helpers.
//   Shop 240,64 | partitions 88/240/392,194 | workers 88/240/392,336 | stock counts (glyph) 240,462 |
//   product page 100,620 | wrong stock count 360,620 | lag alarm 650,194 | event bus 640,336 | workflow 640,470 |
//   support agent 568,620 | payment API 714,620.
// The shop's edge to the bus runs along the top (y 64) and down the right margin (x 775), so it crosses no node.
// Node tops sit at least 26 units under their zone's top so the NEW ring clears the zone tab.
// Text room: 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. The boxes fit the
// longest names the Services toggle puts in them ("CloudWatch alarm", "EventBridge bus", "Event Grid topic").
const spec: DiagramSpec = {
  title: "Brightpost's stock events: a stream, a hot key, a bus and a workflow",
  width: 795,
  height: 690,
  steps: [
    { title: "A stock stream in 3 partitions, keyed by product" },
    { title: "One hot product, one partition 6 hours behind" },
    { title: "Alarm on lag, per partition" },
    { title: "Spread the hot key and batch the work" },
    { title: "An event bus routes by rule" },
    { title: "A workflow runs each refund" },
  ],
  zones: [
    { id: "shopz", title: "Shop", tone: "teal", x: 140, y: 12, w: 200, h: 96 },
    { id: "streamz", title: "Stock stream", tone: "orange", x: 10, y: 124, w: 465, h: 128 },
    { id: "groupz", title: "Group", tone: "teal", x: 10, y: 268, w: 465, h: 124 },
    { id: "dataz", title: "Data", tone: "violet", x: 10, y: 408, w: 465, h: 134 },
    { id: "shopperz", title: "Shoppers", tone: "neutral", x: 10, y: 558, w: 465, h: 120 },
    { id: "monz", title: "Monitoring", tone: "orange", x: 490, y: 124, w: 295, h: 128 },
    { id: "busz", title: "Event bus", tone: "orange", x: 490, y: 268, w: 295, h: 124 },
    { id: "refundz", title: "Refunds", tone: "neutral", x: 490, y: 408, w: 295, h: 270 },
  ],
  nodes: [
    // Step 1
    {
      id: "shop",
      label: "Shop app",
      sub: "basket and orders",
      icon: "server",
      tone: "teal",
      x: 240,
      y: 64,
      w: 170,
      h: 50,
    },
    {
      id: "p0",
      label: "Partition 0",
      sub: "1/3 of products",
      icon: "partition",
      tone: "orange",
      x: 88,
      y: 194,
      w: 148,
      h: 50,
      cloud: {
        aws: { id: "aws-kinesis", label: "Shard 0" },
        gcp: { id: "gcp-managed-kafka", label: "Partition 0" },
        azure: { id: "azure-event-hubs", label: "Partition 0" },
      },
    },
    {
      id: "p1",
      label: "Partition 1",
      sub: "1/3 of products",
      icon: "partition",
      tone: "orange",
      x: 240,
      y: 194,
      w: 148,
      h: 50,
      cloud: {
        aws: { id: "aws-kinesis", label: "Shard 1" },
        gcp: { id: "gcp-managed-kafka", label: "Partition 1" },
        azure: { id: "azure-event-hubs", label: "Partition 1" },
      },
    },
    {
      id: "p2",
      label: "Partition 2",
      sub: "1/3 of products",
      icon: "partition",
      tone: "orange",
      x: 392,
      y: 194,
      w: 148,
      h: 50,
      cloud: {
        aws: { id: "aws-kinesis", label: "Shard 2" },
        gcp: { id: "gcp-managed-kafka", label: "Partition 2" },
        azure: { id: "azure-event-hubs", label: "Partition 2" },
      },
    },
    {
      id: "w0",
      label: "Worker 0",
      sub: "partition 0 only",
      icon: "workers",
      tone: "teal",
      x: 88,
      y: 336,
      w: 148,
      h: 50,
    },
    {
      id: "w1",
      label: "Worker 1",
      sub: "partition 1 only",
      icon: "workers",
      tone: "teal",
      x: 240,
      y: 336,
      w: 148,
      h: 50,
    },
    {
      id: "w2",
      label: "Worker 2",
      sub: "partition 2 only",
      icon: "workers",
      tone: "teal",
      x: 392,
      y: 336,
      w: 148,
      h: 50,
    },
    {
      id: "counts",
      label: "Stock counts",
      sub: "orders database",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      x: 240,
      y: 462,
      cloud: {
        aws: { id: "aws-rds", label: "RDS for PostgreSQL" },
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure Postgres" },
      },
    },
    {
      id: "page",
      label: "Product page",
      sub: "shows 'only N left'",
      icon: "browser",
      tone: "neutral",
      x: 100,
      y: 620,
      w: 160,
      h: 50,
    },

    // Step 2: the failure
    {
      id: "wrong",
      label: "Wrong stock count",
      sub: "380 extra orders",
      icon: "bell",
      tone: "red",
      step: 2,
      x: 360,
      y: 620,
      w: 190,
      h: 50,
    },

    // Step 3
    {
      id: "lag",
      label: "Lag alarm",
      sub: "fires at 5 minutes",
      icon: "meter",
      tone: "orange",
      step: 3,
      x: 650,
      y: 194,
      w: 170,
      h: 50,
      cloud: {
        aws: { id: "aws-cloudwatch", label: "CloudWatch alarm" },
        gcp: { id: "gcp-cloud-monitoring", label: "Cloud Monitoring" },
        azure: { id: "azure-monitor", label: "Monitor alert" },
      },
    },

    // Step 5
    {
      id: "bus",
      label: "Event bus",
      sub: "routes by rules",
      icon: "topic",
      tone: "orange",
      step: 5,
      x: 640,
      y: 336,
      w: 190,
      h: 50,
      cloud: {
        aws: { id: "aws-eventbridge", label: "EventBridge bus" },
        gcp: { id: "gcp-eventarc", label: "Eventarc" },
        azure: { id: "azure-event-grid", label: "Event Grid topic" },
      },
    },
    {
      id: "workflow",
      label: "Refund workflow",
      sub: "refund, cancel, email",
      icon: "pipeline",
      tone: "teal",
      step: 5,
      x: 640,
      y: 470,
      w: 190,
      h: 50,
      cloud: {
        aws: { id: "aws-step-functions", label: "Step Functions" },
        gcp: { id: "gcp-workflows", label: "Workflows" },
        azure: { id: "azure-logic-apps", label: "Logic Apps" },
      },
    },

    // Step 6
    {
      id: "agent",
      label: "Support agent",
      sub: "big orders",
      icon: "users",
      tone: "neutral",
      step: 6,
      x: 568,
      y: 620,
      w: 146,
      h: 50,
    },
    {
      id: "payments",
      label: "Payment API",
      sub: "provider",
      icon: "card",
      tone: "neutral",
      step: 6,
      x: 714,
      y: 620,
      w: 142,
      h: 50,
    },
  ],
  edges: [
    // Step 1: the key is the product id; one worker per partition; one database write per event.
    { from: "shop", to: "p0", packet: true, until: 3 },
    { from: "shop", to: "p1", label: "by product id", packet: true, labelAt: 0.85, until: 3 },
    { from: "shop", to: "p2", packet: true, until: 1 },
    { from: "p0", to: "w0", packet: true, delay: 1.2 },
    { from: "p1", to: "w1", packet: true, delay: 1.2 },
    { from: "p2", to: "w2", packet: true, delay: 1.2 },
    { from: "w0", to: "counts", packet: true, delay: 2.4 },
    { from: "w1", to: "counts", label: "1 write per event", packet: true, delay: 2.4, until: 3 },
    { from: "w2", to: "counts", packet: true, delay: 2.4 },
    { from: "counts", to: "page", packet: true, delay: 3.6 },

    // Step 2: every hero-poster event hashes to partition 2, and its one worker falls behind.
    {
      from: "shop",
      to: "p2",
      label: "hero poster 200/min",
      tone: "red",
      packet: true,
      labelAt: 0.42,
      step: 2,
      until: 3,
    },
    { from: "w2", to: "wrong", label: "6 hours behind", tone: "red", dashed: true, labelAt: 0.45, step: 2 },

    // Step 3: lag is measured per partition; the alarm watches the worst one.
    { from: "p2", to: "lag", label: "reports lag", dashed: true, flow: true, step: 3 },

    // Step 4: product id + slot spreads the hot product over all partitions; workers sum batches of 500.
    { from: "shop", to: "p0", packet: true, step: 4 },
    { from: "shop", to: "p1", label: "product id + slot", packet: true, labelAt: 0.85, step: 4 },
    { from: "shop", to: "p2", packet: true, step: 4 },
    { from: "w1", to: "counts", label: "1 write per 500", packet: true, delay: 2.4, step: 4 },

    // Step 5: the shop sends business events to a bus; a rule sends cancellations to the refund workflow.
    {
      from: "shop",
      to: "bus",
      label: "order events",
      packet: true,
      via: [
        [775, 64],
        [775, 336],
      ],
      labelAt: 0.2,
      step: 5,
    },
    { from: "bus", to: "workflow", label: "rule: cancelled", packet: true, delay: 1.2, labelAt: 0.25, step: 5 },

    // Step 6: the workflow retries the refund and waits for a person on big orders.
    { from: "workflow", to: "agent", label: "approve?", dashed: true, labelAt: 0.4, step: 6 },
    { from: "workflow", to: "payments", label: "refund, retries", packet: true, labelAt: 0.65, step: 6 },
  ],
};

export default spec;
