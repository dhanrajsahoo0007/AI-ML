import type { DiagramSpec } from "@/components/diagrams/types";

// Queue, topic and stream, told as Brightpost's order events (cloud/start-here/queues-vs-streams).
// Step 1: the shop puts one message per order on an email queue; two workers share the messages, one each.
// Step 2 (the failure step): worker A crashes before it confirms order 1042; the queue hands 1042 to worker B,
// which sends the same email a second time. Step 3: every worker checks a sent-email table before it sends, so the
// second email is blocked. Step 4: a message that fails 5 times goes to a dead-letter queue. Step 5: the shop
// publishes "order placed" once to a topic, which copies it to the email queue and to the stock worker. Step 6: the
// shop also appends every order event to a stream, which two readers read at their own places, one from the start.
// Other pages embed single steps and highlight nodes by id, so the ids are part of the contract: shop, topic,
// stock, queue, dlq, workerA, workerB, dup, sent, stream, analytics, report.
//
// Nodes never move and never disappear. The shop's direct edge to the queue ends at step 4 (`until: 4`), because
// from step 5 the topic feeds the queue. It runs straight down through the place where the topic appears later.
// The failure edges of step 2 end there too (`until: 2`); the red "2nd email" node stays, and step 3 blocks it.
//
// Layout: two halves. The left half (x 10-475) holds everything of steps 1 to 4, so on a phone, where the figure
// scrolls sideways and opens on the left ~460 units, the free preview, the failure and both fixes show without
// scrolling. The right half (x 490-785) holds the topic's second subscriber and the stream.
//   Top: shop 240,66 in its own zone.
//   Topic band (y 122-262, full width): topic 240,180 | stock worker 560,180.
//   Queue zone (x 10-475): email queue 240,340 | dead-letter queue (glyph) 405,340 | worker A 100,480 |
//   worker B 380,480 | sent-email table (glyph) 215,590 | 2nd email 380,595.
//   Stream zone (x 490-785): stream 637,340 | analytics 565,500 | new report 712,500.
// The shop's edge to the stream runs along the top (y 66) and down the right margin (x 772), so it crosses no node
// and no other edge; its label sits on the top run. Vertical edges enter each zone right of its tab.
// Text room: a label takes up to 7.2 px per character and a sub line about 5.5 px, after 52 px for the icon. The
// queue, topic and stream are sized for the longest name the Services toggle puts in them ("Service Bus queue",
// "Service Bus topic", "Pub/Sub + replay").
const spec: DiagramSpec = {
  title: "Queue, topic and stream for Brightpost's order events",
  width: 795,
  height: 680,
  steps: [
    { title: "A queue: each order to one worker" },
    { title: "A worker crashes before it confirms" },
    { title: "Check before you send" },
    { title: "A message that keeps failing goes aside" },
    { title: "A topic: every subscriber gets a copy" },
    { title: "A stream: one log, many readers, replay" },
  ],
  zones: [
    { id: "shopz", title: "Shop", tone: "teal", x: 140, y: 12, w: 200, h: 96 },
    { id: "topicz", title: "Topic", tone: "orange", x: 10, y: 122, w: 775, h: 140 },
    { id: "queuez", title: "Queue", tone: "orange", x: 10, y: 278, w: 465, h: 390 },
    { id: "streamz", title: "Stream", tone: "orange", x: 490, y: 278, w: 295, h: 390 },
  ],
  nodes: [
    // Step 1
    {
      id: "shop",
      label: "Shop app",
      sub: "takes orders",
      icon: "server",
      tone: "teal",
      x: 240,
      y: 66,
      w: 150,
      h: 50,
    },
    {
      id: "queue",
      label: "Email queue",
      sub: "1 message per order",
      icon: "queue",
      tone: "orange",
      x: 240,
      y: 340,
      w: 180,
      cloud: {
        aws: { id: "aws-sqs", label: "SQS queue" },
        gcp: { id: "gcp-pubsub", label: "Pull subscription" },
        azure: { id: "azure-service-bus", label: "Service Bus queue" },
      },
    },
    {
      id: "workerA",
      label: "Worker A",
      sub: "sends the email",
      icon: "workers",
      tone: "teal",
      x: 100,
      y: 480,
      w: 150,
    },
    {
      id: "workerB",
      label: "Worker B",
      sub: "sends the email",
      icon: "workers",
      tone: "teal",
      x: 380,
      y: 480,
      w: 150,
    },

    // Step 2: the failure
    {
      id: "dup",
      label: "2nd email",
      sub: "same order, again",
      icon: "bell",
      tone: "red",
      step: 2,
      x: 380,
      y: 595,
      w: 150,
      h: 50,
    },

    // Step 3
    {
      id: "sent",
      label: "Sent-email table",
      sub: "order ids done",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 3,
      x: 215,
      y: 588,
      cloud: {
        aws: { id: "aws-rds", label: "RDS for PostgreSQL" },
        gcp: "gcp-cloud-sql",
        azure: { id: "azure-postgresql", label: "Azure Postgres" },
      },
    },

    // Step 4
    {
      id: "dlq",
      label: "Dead-letter queue",
      icon: "queue",
      tone: "orange",
      variant: "glyph",
      step: 4,
      x: 405,
      y: 340,
      cloud: {
        aws: { id: "aws-sqs", label: "SQS dead-letter queue" },
        gcp: { id: "gcp-pubsub", label: "Dead-letter topic" },
        azure: { id: "azure-service-bus", label: "Dead-letter queue" },
      },
    },

    // Step 5
    {
      id: "topic",
      label: "Order topic",
      sub: "copies to everyone",
      icon: "topic",
      tone: "orange",
      step: 5,
      x: 240,
      y: 180,
      w: 180,
      cloud: {
        aws: { id: "aws-sns", label: "SNS topic" },
        gcp: { id: "gcp-pubsub", label: "Pub/Sub topic" },
        azure: { id: "azure-service-bus", label: "Service Bus topic" },
      },
    },
    {
      id: "stock",
      label: "Stock worker",
      sub: "counts posters left",
      icon: "workers",
      tone: "teal",
      step: 5,
      x: 560,
      y: 180,
      w: 160,
    },

    // Step 6
    {
      id: "stream",
      label: "Order stream",
      sub: "3 partitions, 7 days",
      icon: "log",
      tone: "orange",
      step: 6,
      x: 637,
      y: 340,
      w: 180,
      cloud: {
        aws: { id: "aws-kinesis", label: "Kinesis stream" },
        gcp: { id: "gcp-pubsub", label: "Pub/Sub + replay" },
        azure: "azure-event-hubs",
      },
    },
    {
      id: "analytics",
      label: "Analytics",
      sub: "reads at #4,180",
      icon: "chart",
      tone: "teal",
      step: 6,
      x: 565,
      y: 500,
      w: 140,
    },
    {
      id: "report",
      label: "New report",
      sub: "replays from #1",
      icon: "history",
      tone: "teal",
      step: 6,
      x: 712,
      y: 500,
      w: 136,
    },
  ],
  edges: [
    // Step 1: one message per order; each message goes to one worker.
    { from: "shop", to: "queue", label: "1 message per order", packet: true, until: 4 },
    { from: "queue", to: "workerA", label: "order 1042", packet: true, delay: 1.2 },
    { from: "queue", to: "workerB", label: "order 1043", packet: true, delay: 1.8 },

    // Step 2: worker A sent the email but crashed before it confirmed; after the lock runs out, 1042 goes to B.
    {
      from: "workerA",
      to: "queue",
      label: "crashed, no ack",
      tone: "red",
      dashed: true,
      labelAt: 0.3,
      step: 2,
      until: 2,
    },
    {
      from: "queue",
      to: "workerB",
      label: "1042 again",
      tone: "red",
      packet: true,
      delay: 1.2,
      labelAt: 0.72,
      step: 2,
      until: 2,
    },
    { from: "workerB", to: "dup", label: "sends it", tone: "red", packet: true, delay: 2.4, step: 2, until: 2 },

    // Step 3: each worker checks the table first and writes the order id when the email is sent.
    { from: "workerA", to: "sent", label: "check, mark", dashed: true, step: 3 },
    { from: "workerB", to: "sent", label: "1042 done", packet: true, step: 3 },
    { from: "workerB", to: "dup", label: "skipped", tone: "red", dashed: true, step: 3 },

    // Step 4: after 5 failed tries a message is moved aside instead of coming back for ever.
    { from: "queue", to: "dlq", tone: "orange", dashed: true, flow: true, step: 4 },

    // Step 5: the shop publishes once; the topic copies the event to each subscriber.
    { from: "shop", to: "topic", label: "order placed", packet: true, step: 5 },
    { from: "topic", to: "queue", label: "copy", packet: true, delay: 1.2, step: 5 },
    { from: "topic", to: "stock", label: "copy", packet: true, delay: 1.2, step: 5 },

    // Step 6: the stream keeps every event in order; each reader keeps its own place.
    {
      from: "shop",
      to: "stream",
      label: "every order event",
      packet: true,
      via: [
        [772, 66],
        [772, 340],
      ],
      labelAt: 0.25,
      step: 6,
    },
    { from: "stream", to: "analytics", label: "group 1", packet: true, delay: 1.5 },
    { from: "stream", to: "report", label: "group 2", packet: true, delay: 2 },
  ],
};

export default spec;
