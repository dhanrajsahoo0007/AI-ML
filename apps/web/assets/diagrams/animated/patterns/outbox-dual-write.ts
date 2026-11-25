import type { SequenceSpec } from "@/components/diagrams/types";
import { ORDER, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The dual-write problem (outbox-and-cdc, first figure). Brightpost's order service saves an order and tells the rest
// of the shop about it with two separate writes, one to its database and one to the message broker. Nothing makes the
// pair atomic, so either order of the two writes loses something when the process dies in between.
//
// Two steps: 1 save first, publish second: the commit succeeds, the process dies before the publish, the order exists
// and nobody is told (no email, the search index and cache never hear of it) · 2 publish first, save second: the email
// service sends a confirmation, then the insert rolls back (the stock check fails), so a customer is told about an
// order that does not exist. Rows never move between steps; step 2's rows sit under step 1's.
//
// Layout: four lanes (sequence lanes are equal columns); notes hang beside the lane that is left in the wrong state.
// Colours (PATTERN_TONE): the order and email services teal (compute), the database violet (store), the broker neutral
// (infra); the lost or wrong message uses the red timeout arrow, the only red.
// Fact check: microservices.io "Transactional outbox" names exactly this problem: a service must update its database
// and send a message, and cannot use a distributed transaction across the two (checked 2026-11-16).

const order = `order ${ORDER.orderId}`;

const spec: SequenceSpec = {
  kind: "sequence",
  title: "Two writes, no transaction: the dual-write problem",
  lanes: [
    { id: "svc", label: "Order service", icon: "server", tone: PATTERN_TONE.compute },
    { id: "db", label: "Database", icon: "database", tone: PATTERN_TONE.store },
    { id: "broker", label: "Broker", icon: "topic", tone: PATTERN_TONE.infra },
    { id: "email", label: "Email service", icon: "bell", tone: PATTERN_TONE.compute },
  ],
  messages: [
    // Step 1: save, then publish; the process dies in between.
    { from: "svc", to: "db", label: `INSERT ${order}`, step: 1 },
    { from: "db", to: "svc", label: "COMMIT ok", kind: "return", step: 1 },
    { from: "svc", to: "broker", label: "OrderPlaced (process dies)", kind: "timeout", step: 1, duration: 1.6 },

    // Step 2: publish, then save; the save rolls back after the email has gone.
    { from: "svc", to: "broker", label: "OrderPlaced", kind: "async", step: 2 },
    { from: "broker", to: "email", label: `deliver ${order}`, kind: "async", step: 2 },
    { from: "svc", to: "db", label: `INSERT ${order}`, step: 2, delay: 0.3 },
    { from: "db", to: "svc", label: "ROLLBACK (out of stock)", kind: "timeout", step: 2, duration: 1.6 },
  ],
  notes: [
    { lane: "db", text: "order saved, nobody told", step: 1, at: 2.5 },
    { lane: "email", text: "confirms a lost order", step: 2, at: 6.5 },
  ],
  steps: [{ title: "Save, then publish: the publish is lost" }, { title: "Publish, then save: the save is lost" }],
};

export default spec;
