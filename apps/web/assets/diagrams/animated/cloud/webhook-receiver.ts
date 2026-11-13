import type { DiagramSpec } from "@/components/diagrams/types";

// Webhooks in both directions, told as Brightpost's double-payment morning (cloud/networking/webhooks-on-the-cloud).
// Step 1: the payment provider POSTs "payment succeeded" straight to the shop's payment handler, which marks the
// order paid and sends a print job to the printing partner while the provider waits. Step 2 (the failure step): on
// a sale morning the handler takes about 14 s, the provider gives up at 10 s and sends the same event again, so 40
// orders are marked paid twice and 2 parcels are printed twice. Step 3: a public webhook endpoint checks the
// signature with a secret from the secret store. Step 4: the endpoint adds the event to a queue and replies at once;
// the handler reads from the queue. Step 5: the handler records each event id in a processed-events table, in the
// same commit as the order change, and skips an id it has seen. Step 6: an event that fails 5 times moves to a
// dead-letter queue and is replayed after the fix. Step 7: the other direction: an outbox row written with the
// "shipped" change feeds a delivery worker that sends signed POSTs to the ~300 gift shops.
//
// Nodes never move. The handler is the same node in every step: the same code, first called inline, later fed by
// the queue. Edges that a later step replaces end with `until`.
//
// Layout: three columns (x 112 | 380 | 680) and four rows (y 95 | 255 | 415 | 575).
//   Left, "outside and secrets": provider, secret store, printing partner, gift shops.
//   Middle, "Brightpost's path": webhook endpoint, payment handler, orders database, delivery worker.
//   Right, "added later": queue, dead-letter queue, processed events, outbox.
// provider 112,95 | endpoint 380,95 | queue 680,95 | secret 112,255 | handler 380,255 | dlq 680,255 |
// partner 112,415 | db 380,415 | seen 680,415 | shops 112,575 | delivery 380,575 | outbox 680,575.
//
// Why this order: on a phone the figure opens on the left 480 units. Steps 1 and 2 use only provider, handler,
// database and printing partner, all in the left and middle columns; the middle boxes end at x 472.
// Gaps between boxes are 92 (left-middle) and 124 (middle-right) units, room for a pill of about 11 and 15
// characters. Zone tabs are short ("Edge", "Workers", "Data") and the middle zones start at x 270, so the vertical
// edges at x 380 enter right of the tabs.
// Text room: up to 7.2 px per label character and 5.5 px per sub character after 52 px for the icon. Nodes are
// sized for the longest name the Services toggle shows ("Cloud Run worker", "Function (queue)", "Dead-letter topic").
const spec: DiagramSpec = {
  title: "A webhook receiver that answers fast and never pays twice",
  width: 795,
  height: 650,
  steps: [
    { title: "The provider calls the shop, which works inline" },
    { title: "Slow reply, a resend, a double payment" },
    { title: "A public endpoint checks the signature" },
    { title: "Reply in milliseconds, work from a queue" },
    { title: "Skip an event id already seen" },
    { title: "Park failures, replay after the fix" },
    { title: "Sending: an outbox and a delivery worker" },
  ],
  zones: [
    { id: "outside", title: "Provider", tone: "neutral", x: 12, y: 40, w: 200, h: 100 },
    { id: "security", title: "Security", tone: "red", x: 12, y: 200, w: 200, h: 100 },
    { id: "partners", title: "Partners", tone: "neutral", x: 12, y: 360, w: 200, h: 260 },
    { id: "edge", title: "Edge", tone: "blue", x: 270, y: 40, w: 210, h: 100 },
    { id: "workers", title: "Workers", tone: "teal", x: 270, y: 200, w: 210, h: 100 },
    { id: "messaging", title: "Messaging", tone: "orange", x: 580, y: 40, w: 200, h: 260 },
    { id: "data", title: "Data", tone: "violet", x: 270, y: 360, w: 510, h: 100 },
    { id: "sending", title: "Sending", tone: "orange", x: 270, y: 520, w: 510, h: 100 },
  ],
  nodes: [
    // Step 1
    {
      id: "provider",
      label: "Payment provider",
      sub: "waits 10 s for a reply",
      icon: "card",
      tone: "neutral",
      x: 112,
      y: 95,
      w: 176,
    },
    {
      id: "handler",
      label: "Payment handler",
      sub: "marks orders paid",
      icon: "workers",
      tone: "teal",
      x: 380,
      y: 255,
      w: 176,
      cloud: {
        aws: { id: "aws-lambda", label: "Lambda" },
        gcp: { id: "gcp-cloud-run", label: "Cloud Run worker" },
        azure: { id: "azure-functions", label: "Function (queue)" },
      },
    },
    {
      id: "db",
      label: "Orders database",
      sub: "PostgreSQL",
      icon: "database",
      tone: "violet",
      x: 380,
      y: 415,
      w: 176,
      cloud: {
        aws: { id: "aws-rds", label: "RDS PostgreSQL" },
        gcp: { id: "gcp-cloud-sql", label: "Cloud SQL" },
        azure: { id: "azure-postgresql", label: "Azure PostgreSQL" },
      },
    },
    {
      id: "partner",
      label: "Printing partner",
      sub: "prints and posts",
      icon: "building",
      tone: "neutral",
      x: 112,
      y: 415,
      w: 176,
    },

    // Step 3
    {
      id: "endpoint",
      label: "Webhook endpoint",
      sub: "checks signature",
      icon: "webhook",
      tone: "blue",
      step: 3,
      x: 380,
      y: 95,
      w: 184,
      cloud: {
        aws: { id: "aws-api-gateway", label: "API Gateway" },
        gcp: { id: "gcp-cloud-run", label: "Cloud Run (HTTP)" },
        azure: { id: "azure-functions", label: "Function (HTTP)" },
      },
    },
    {
      id: "secret",
      label: "Secret store",
      sub: "signing secret",
      icon: "vault",
      tone: "red",
      step: 3,
      x: 112,
      y: 255,
      w: 176,
      cloud: {
        aws: { id: "aws-secrets-manager", label: "Secrets Manager" },
        gcp: { id: "gcp-secret-manager", label: "Secret Manager" },
        azure: { id: "azure-key-vault", label: "Key Vault" },
      },
    },

    // Step 4
    {
      id: "queue",
      label: "Event queue",
      sub: "holds each event",
      icon: "queue",
      tone: "orange",
      step: 4,
      x: 680,
      y: 95,
      w: 176,
      cloud: {
        aws: { id: "aws-sqs", label: "SQS queue" },
        gcp: { id: "gcp-pubsub", label: "Pub/Sub" },
        azure: { id: "azure-service-bus", label: "Service Bus" },
      },
    },

    // Step 5
    {
      id: "seen",
      label: "Processed events",
      sub: "event id, unique",
      icon: "ledger",
      tone: "violet",
      step: 5,
      x: 680,
      y: 415,
      w: 176,
    },

    // Step 6
    {
      id: "dlq",
      label: "Dead-letter queue",
      sub: "failed 5 times",
      icon: "queue",
      tone: "red",
      step: 6,
      x: 680,
      y: 255,
      w: 180,
      cloud: {
        aws: { id: "aws-sqs", label: "SQS dead-letter" },
        gcp: { id: "gcp-pubsub", label: "Dead-letter topic" },
        azure: { id: "azure-service-bus", label: "Service Bus DLQ" },
      },
    },

    // Step 7: the other direction
    {
      id: "outbox",
      label: "Outbox",
      sub: "notices to send",
      icon: "log",
      tone: "violet",
      step: 7,
      x: 680,
      y: 575,
      w: 176,
    },
    {
      id: "delivery",
      label: "Delivery worker",
      sub: "retries with backoff",
      icon: "workers",
      tone: "teal",
      step: 7,
      x: 380,
      y: 575,
      w: 176,
      cloud: {
        aws: { id: "aws-eventbridge", label: "API destinations" },
        gcp: { id: "gcp-cloud-tasks", label: "Cloud Tasks" },
        azure: { id: "azure-event-grid", label: "Event Grid" },
      },
    },
    {
      id: "shops",
      label: "Gift shops",
      sub: "about 300 URLs",
      icon: "bag",
      tone: "neutral",
      step: 7,
      x: 112,
      y: 575,
      w: 176,
    },
  ],
  edges: [
    // Step 1: the provider holds the connection open while the handler does all the work.
    { from: "provider", to: "handler", label: "POST, waits", packet: true, until: 1 },
    { from: "handler", to: "db", label: "mark paid", packet: true, delay: 1.2, until: 1 },
    { from: "handler", to: "partner", label: "print job", packet: true, delay: 2, until: 1 },

    // Step 2: the reply comes too late, the provider sends the event again, and the work runs twice.
    { from: "provider", to: "handler", label: "no reply: resent", tone: "red", packet: true, step: 2, until: 2 },
    { from: "handler", to: "db", label: "paid twice", tone: "red", packet: true, delay: 1.2, step: 2, until: 2 },
    { from: "handler", to: "partner", label: "printed twice", tone: "red", packet: true, delay: 2, step: 2, until: 2 },

    // Step 3: a public endpoint checks the signature first. Still inline behind it, for one step.
    { from: "provider", to: "endpoint", label: "signed POST", packet: true, step: 3 },
    { from: "endpoint", to: "secret", label: "reads secret", dashed: true, step: 3 },
    { from: "endpoint", to: "handler", label: "verified", packet: true, delay: 1.2, step: 3, until: 3 },
    { from: "handler", to: "db", label: "mark paid", packet: true, delay: 2.2, step: 3 },
    { from: "handler", to: "partner", label: "print job", packet: true, delay: 3, step: 3 },

    // Step 4: the endpoint adds the event to the queue and replies; the handler reads from the queue.
    { from: "endpoint", to: "queue", label: "add, reply 200", packet: true, delay: 1, step: 4 },
    { from: "queue", to: "handler", label: "deliver", packet: true, delay: 2, step: 4 },

    // Step 5: one check by event id, in the same commit as the order change.
    { from: "handler", to: "seen", label: "new event id?", packet: true, delay: 1.5, step: 5 },
    { from: "db", to: "seen", label: "same commit", dashed: true, step: 5 },

    // Step 6: after 5 failed tries an event is parked; after the fix it goes back on the queue.
    { from: "queue", to: "dlq", label: "5 failures", tone: "red", dashed: true, via: [[640, 175]], step: 6 },
    { from: "dlq", to: "queue", label: "replay", dashed: true, flow: true, via: [[720, 175]], step: 6 },

    // Step 7: the other direction. The outbox row is written with the "shipped" change; the worker sends it.
    { from: "db", to: "outbox", label: "same transaction", dashed: true, step: 7 },
    { from: "outbox", to: "delivery", label: "unsent rows", packet: true, step: 7 },
    { from: "delivery", to: "shops", label: "signed POST", packet: true, delay: 1.2, step: 7 },
  ],
};

export default spec;
