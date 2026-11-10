import type { DiagramSpec } from "@/components/diagrams/types";

// The machinery behind one webhook, on both sides of the internet.
// Step 1 (happy path): the payment and its event are saved in one commit (outbox table), a relay publishes the
// event to a delivery queue, a sender signs it and POSTs it, and the shop stores it in an inbox table keyed by
// event id before a worker marks the order paid.
// Step 2 (failure path): a POST with no 2xx goes to a retry timer, which puts the job back on the queue after a
// growing wait; after 3 days of failures the job moves to dead letters for a human to replay.
//
// Layout (centres): payments 110,120 | eventlog 110,250 | queue 305,120 (w 140) | senders 480,120 |
// retry 480,250 (w 124) | dlq 480,380 (w 126) | endpoint 710,120 (w 132) | inbox 710,250 (w 124) |
// worker 710,380 (w 126). Horizontal gaps at least 47 px, vertical gaps 72 px.
const spec: DiagramSpec = {
  title: "Webhook delivery, end to end",
  width: 860,
  height: 470,
  steps: [{ title: "Save, queue, sign, POST, store" }, { title: "Retries and dead letters" }],
  zones: [
    { id: "provider", title: "Provider", tone: "teal", x: 20, y: 50, w: 180, h: 400 },
    { id: "delivery", title: "Delivery", tone: "orange", x: 215, y: 50, w: 350, h: 400 },
    { id: "shop", title: "Your shop", tone: "green", x: 590, y: 50, w: 240, h: 400 },
  ],
  nodes: [
    { id: "payments", label: "Payments", sub: "card approved", icon: "card", tone: "teal", x: 110, y: 120 },
    { id: "eventlog", label: "Event log", sub: "outbox table", icon: "log", tone: "violet", x: 110, y: 250 },
    {
      id: "queue",
      label: "Delivery queue",
      sub: "one job per POST",
      icon: "queue",
      tone: "orange",
      x: 305,
      y: 120,
      w: 140,
    },
    { id: "senders", label: "Senders", sub: "sign and POST", icon: "workers", tone: "orange", x: 480, y: 120 },
    {
      id: "retry",
      label: "Retry timer",
      sub: "waits grow 4x",
      icon: "timer",
      tone: "orange",
      x: 480,
      y: 250,
      w: 124,
      step: 2,
    },
    {
      id: "dlq",
      label: "Dead letters",
      sub: "after 3 days",
      icon: "queue",
      tone: "red",
      x: 480,
      y: 380,
      w: 126,
      step: 2,
    },
    {
      id: "endpoint",
      label: "Endpoint",
      sub: "POST /hooks",
      icon: "api",
      tone: "green",
      accent: true,
      x: 710,
      y: 120,
      w: 132,
    },
    {
      id: "inbox",
      label: "Inbox table",
      sub: "unique event id",
      icon: "database",
      tone: "violet",
      x: 710,
      y: 250,
      w: 124,
    },
    {
      id: "worker",
      label: "Order worker",
      sub: "marks it paid",
      icon: "workers",
      tone: "teal",
      x: 710,
      y: 380,
      w: 126,
    },
  ],
  edges: [
    // Step 1: the main path, one packet after another.
    { from: "payments", to: "eventlog", label: "same commit", flow: true, packet: true },
    { from: "eventlog", to: "queue", label: "publish", flow: true, packet: true, delay: 0.8 },
    { from: "queue", to: "senders", label: "job", flow: true, packet: true, delay: 1.6 },
    { from: "senders", to: "endpoint", label: "signed POST", flow: true, packet: true, delay: 2.4 },
    { from: "endpoint", to: "inbox", label: "save by id", flow: true, packet: true, delay: 3.2 },
    { from: "inbox", to: "worker", label: "later", dashed: true, packet: true, delay: 4 },

    // Step 2: what happens when the POST gets no 2xx answer.
    { from: "senders", to: "retry", label: "no 2xx", tone: "red", dashed: true },
    { from: "retry", to: "queue", label: "after the wait", tone: "orange", dashed: true, flow: true },
    { from: "retry", to: "dlq", label: "gave up", tone: "red", dashed: true },
  ],
};

export default spec;
