import type { DiagramSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, SHOP } from "@/components/diagrams/presets/patterns";

// Partitions, a consumer group and offsets (message-queues, the Architecture figure).
// Four steps: 1 checkout keys each order event by order id, so the 300 events/s spread over 6 partitions, 50/s each
// · 2 a consumer group of 3 consumers: each partition has one owner, so each consumer reads 2 partitions = 100/s
// · 3 each consumer commits the offset it has processed, per partition, to the offsets store
// · 4 consumer 2 stops heartbeating; after the session timeout the group rebalances and P2 and P3 move to consumers
// 1 and 3, which now read 150/s each (consumer 3's commit edge is left out so no line crosses the marker).
// Working: 300 ÷ 6 = 50 events/s per partition; 2 × 50 = 100/s per consumer; after the rebalance 3 × 50 = 150/s.
// Layout (880 × 480): producer at x 90, partitions in a column at x 320, consumers at x 555, the offsets store and
// the stopped-consumer marker at x 790 beside consumers 1 and 2.
// Colours (PATTERN_TONE): checkout and consumers teal (compute), partitions and offsets violet (stores), the stopped
// consumer red (failure).
// Fact check (2026-11-16, Kafka design docs): a partition is "consumed by exactly one consumer within each
// subscribing consumer group at any given time"; session.timeout.ms defaults to 45 s (Kafka 3.0+).

const PARTS = 6;
const perPart = SHOP.peakOrdersPerSecond / PARTS; // 50
const py = (i: number) => 60 + i * 72;
const cy = [96, 240, 384];

const spec: DiagramSpec = {
  title: "Partitions, a consumer group and offsets",
  width: 880,
  height: 480,
  steps: [
    { title: "Key by order id: 6 partitions" },
    { title: "A consumer group of 3" },
    { title: "Commit an offset per partition" },
    { title: "A consumer stops: rebalance" },
  ],
  zones: [
    { id: "topic", title: "Topic: orders", tone: PATTERN_TONE.store, x: 235, y: 16, w: 170, h: 446 },
    { id: "group", title: "Group: fulfilment", tone: PATTERN_TONE.compute, x: 470, y: 40, w: 170, h: 400 },
  ],
  nodes: [
    {
      id: "checkout",
      label: "Checkout",
      sub: `${SHOP.peakOrdersPerSecond} order events/s`,
      icon: "server",
      tone: PATTERN_TONE.compute,
      fill: "pastel",
      x: 90,
      y: 240,
      w: 150,
    },
    ...Array.from({ length: PARTS }, (_, i) => ({
      id: `p${i}`,
      label: `Partition ${i}`,
      sub: `${perPart} events/s`,
      icon: "partition",
      tone: PATTERN_TONE.store,
      fill: "pastel" as const,
      x: 320,
      y: py(i),
      w: 150,
    })),
    ...cy.map((y, i) => ({
      id: `c${i + 1}`,
      label: `Consumer ${i + 1}`,
      sub: `P${2 * i}, P${2 * i + 1} · ${2 * perPart}/s`,
      icon: "workers",
      tone: PATTERN_TONE.compute,
      fill: "pastel" as const,
      step: 2,
      x: 555,
      y,
      w: 150,
    })),
    {
      id: "offsets",
      label: "Offsets",
      sub: "one per partition",
      icon: "log",
      tone: PATTERN_TONE.store,
      fill: "pastel",
      step: 3,
      x: 790,
      y: 96,
      w: 170,
    },
    {
      id: "stopped",
      label: "No heartbeat",
      sub: "45 s, then rebalance",
      icon: "timer",
      tone: PATTERN_TONE.fail,
      fill: "soft",
      step: 4,
      x: 790,
      y: 240,
      w: 170,
    },
  ],
  edges: [
    ...Array.from({ length: PARTS }, (_, i) => ({
      from: "checkout",
      to: `p${i}`,
      label: i === 0 ? "key = order id" : undefined,
      packet: true,
      delay: i * 0.15,
    })),
    ...Array.from({ length: PARTS }, (_, i) => ({
      from: `p${i}`,
      to: `c${Math.floor(i / 2) + 1}`,
      packet: true,
      step: 2,
      until: i === 2 || i === 3 ? 3 : undefined,
    })),
    { from: "c1", to: "offsets", label: "commit", step: 3 },
    { from: "c2", to: "offsets", step: 3, until: 3 },
    { from: "c2", to: "stopped", tone: PATTERN_TONE.fail, dashed: true, step: 4 },
    { from: "p2", to: "c1", label: "moved", tone: PATTERN_TONE.fail, packet: true, step: 4 },
    { from: "p3", to: "c3", tone: PATTERN_TONE.fail, packet: true, step: 4 },
  ],
};

export default spec;
