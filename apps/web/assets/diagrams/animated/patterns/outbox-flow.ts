import type { DiagramSpec } from "@/components/diagrams/types";
import { ORDER, PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The transactional outbox with a log-tailing relay, built one part at a time (outbox-and-cdc, the Architecture
// figure). Brightpost's order service saves order 4471; the rest of the shop (search, the product cache, email) hears
// about it through the broker without a second write that can fail on its own.
//
// Six steps: 1 the order service writes the order row (the "before": nothing else hears about it) · 2 an outbox row in
// the same transaction · 3 a relay tails the database's write-ahead log and picks out outbox inserts · 4 the relay
// publishes to the broker, keyed by the order id so one order's events stay in order · 5 three consumers update search,
// the cache and email · 6 a redelivered event is dropped because the email consumer records the event ids it has
// handled. Nodes never move.
//
// Layout (880 × 500): shopper and order service in a column at x 90; the database zone (x 185–385) holds the orders
// table, the outbox table and the write-ahead log at x 285; the relay (accent) and broker at x 490, relay under the
// broker so the log feeds it sideways; consumers in a column at x 780 with the processed-ids store under email.
// Colours (PATTERN_TONE, four tones plus neutral): shopper orange (traffic), services and consumers teal (compute),
// tables, log and the processed-ids store violet (store), the outbox row and the relay green (the pattern), broker
// neutral (infra).
// Fact check (2026-11-16): Debezium's outbox event router reads outbox inserts from the log, routes by the
// `aggregatetype` column and uses `aggregateid` as the message key "for maintaining correct order in Kafka
// partitions"; microservices.io names the relay "Transaction log tailing" and says it may publish a message more than
// once, so consumers must be idempotent.

const X = { left: 90, db: 285, mid: 490, right: 780 } as const;

const spec: DiagramSpec = {
  title: "Transactional outbox with a log-tailing relay",
  width: 880,
  height: 500,
  steps: [
    { title: "The order service saves the order" },
    { title: "Add an outbox row in the same transaction" },
    { title: "A relay tails the write-ahead log" },
    { title: "Publish to the broker, keyed by order id" },
    { title: "Consumers update search, cache and email" },
    { title: "A redelivery is dropped by the consumer" },
  ],
  zones: [
    { id: "dbzone", title: "Orders database", tone: PATTERN_TONE.store, x: 185, y: 40, w: 200, h: 440 },
    { id: "consumers", title: "Consumers", tone: PATTERN_TONE.compute, x: 690, y: 40, w: 180, h: 440 },
  ],
  nodes: [
    {
      id: "shopper",
      label: "Shopper",
      sub: "checkout",
      icon: "phone",
      tone: PATTERN_TONE.traffic,
      fill: "pastel",
      x: X.left,
      y: 110,
      w: 140,
    },
    {
      id: "svc",
      label: "Order service",
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: X.left,
      y: 250,
      w: 150,
    },
    {
      id: "orders",
      label: "orders",
      sub: `row ${ORDER.orderId}`,
      icon: "database",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      x: X.db,
      y: 110,
      w: 170,
    },

    {
      id: "outbox",
      label: "outbox",
      sub: "same transaction",
      icon: "log",
      tone: PATTERN_TONE.pattern,
      fill: "pastel",
      step: 2,
      x: X.db,
      y: 250,
      w: 170,
    },

    {
      id: "wal",
      label: "Write-ahead log",
      sub: "every commit",
      icon: "disk",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 3,
      x: X.db,
      y: 405,
      w: 170,
    },
    {
      id: "relay",
      label: "Relay",
      sub: "reads outbox inserts",
      icon: "pipeline",
      tone: PATTERN_TONE.pattern,
      accent: true,
      step: 3,
      x: X.mid,
      y: 405,
      w: 176,
    },

    {
      id: "broker",
      label: "Broker",
      sub: "topic orders",
      icon: "topic",
      tone: PATTERN_TONE.infra,
      fill: "pastel",
      step: 4,
      x: X.mid,
      y: 250,
      w: 150,
    },

    {
      id: "search",
      label: "Search index",
      icon: "search",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 5,
      x: X.right,
      y: 110,
      w: 160,
    },
    {
      id: "cache",
      label: "Product cache",
      icon: "cache",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 5,
      x: X.right,
      y: 220,
      w: 160,
    },
    {
      id: "email",
      label: "Email sender",
      icon: "bell",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      step: 5,
      x: X.right,
      y: 330,
      w: 160,
    },

    {
      id: "seen",
      label: "Processed ids",
      sub: "event ids handled",
      icon: "key",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 6,
      x: X.right,
      y: 430,
      w: 160,
    },
  ],
  edges: [
    { from: "shopper", to: "svc", label: "POST /orders", packet: true },
    { from: "svc", to: "orders", label: "INSERT", packet: true, delay: 0.6, labelAt: 0.35 },

    { from: "svc", to: "outbox", packet: true, delay: 0.6, step: 2 },

    { from: "outbox", to: "wal", label: "commit", dashed: true, step: 3 },
    { from: "wal", to: "relay", flow: true, packet: true, delay: 1.2, step: 3 },

    { from: "relay", to: "broker", label: `key ${ORDER.orderId}`, packet: true, delay: 1.6, step: 4 },

    { from: "broker", to: "search", packet: true, delay: 2, step: 5 },
    { from: "broker", to: "cache", packet: true, delay: 2.1, step: 5 },
    { from: "broker", to: "email", label: "at least once", packet: true, delay: 2.2, step: 5 },

    { from: "email", to: "seen", label: "seen this id?", bidirectional: true, step: 6 },
  ],
};

export default spec;
