import type { DiagramSpec } from "@/components/diagrams/types";

// Inside one stream: partitions, consumer groups and their offsets (cloud/data/streaming-and-messaging-services).
// Step 1: Brightpost's stock stream has 3 partitions; the stock group has one worker per partition, and each
// worker saves its offset (its place in the partition) in an offset store.
// Step 2: a fourth worker joins. The group rebalances, and with 3 partitions the fourth gets none: it sits idle.
// Step 3: a second group, analytics, reads the same 3 partitions at its own, much earlier offsets.
// Ids other embeds may highlight: p0, p1, p2, w0, w1, w2, w3, store, analytics.
//
// Layout: the stream band in the middle (y 130-254), the stock group under it (y 276-400) and the analytics
// group above it (y 12-108), so every edge is short and vertical or nearly so. The left ~480 units hold steps 1
// and 3; the right side holds the offset store (top) and the idle fourth worker.
//   analytics 240,64 | offset store 630,64 | partitions 88/240/392,196 | workers 88/240/392,342 | worker 3 560,342
// The offset labels sit on the vertical edges, inside the stream band, clear of the group's tab. The two edges to
// the offset store run up the empty space right of partition 2. Node tops sit at least 26 units under their zone's top.
const spec: DiagramSpec = {
  title: "Partitions, consumer groups and offsets",
  width: 795,
  height: 412,
  steps: [
    { title: "One worker per partition, each with its offset" },
    { title: "A fourth worker joins and waits" },
    { title: "A second group reads at its own offsets" },
  ],
  zones: [
    { id: "anz", title: "Analytics group", tone: "teal", x: 110, y: 12, w: 260, h: 96 },
    { id: "streamz", title: "Stock stream", tone: "orange", x: 10, y: 130, w: 465, h: 124 },
    { id: "groupz", title: "Stock group", tone: "teal", x: 10, y: 276, w: 645, h: 124 },
  ],
  nodes: [
    {
      id: "p0",
      label: "Partition 0",
      sub: "newest 9,420",
      icon: "partition",
      tone: "orange",
      x: 88,
      y: 196,
      w: 148,
      h: 50,
    },
    {
      id: "p1",
      label: "Partition 1",
      sub: "newest 9,405",
      icon: "partition",
      tone: "orange",
      x: 240,
      y: 196,
      w: 148,
      h: 50,
    },
    {
      id: "p2",
      label: "Partition 2",
      sub: "newest 9,440",
      icon: "partition",
      tone: "orange",
      x: 392,
      y: 196,
      w: 148,
      h: 50,
    },
    {
      id: "w0",
      label: "Worker 0",
      sub: "owns partition 0",
      icon: "workers",
      tone: "teal",
      x: 88,
      y: 342,
      w: 148,
      h: 50,
    },
    {
      id: "w1",
      label: "Worker 1",
      sub: "owns partition 1",
      icon: "workers",
      tone: "teal",
      x: 240,
      y: 342,
      w: 148,
      h: 50,
    },
    {
      id: "w2",
      label: "Worker 2",
      sub: "owns partition 2",
      icon: "workers",
      tone: "teal",
      x: 392,
      y: 342,
      w: 148,
      h: 50,
    },
    {
      id: "store",
      label: "Offset store",
      sub: "1 place per partition",
      icon: "history",
      tone: "violet",
      x: 630,
      y: 64,
      w: 176,
      h: 50,
    },

    // Step 2
    {
      id: "w3",
      label: "Worker 3",
      sub: "no partition: idle",
      icon: "workers",
      tone: "neutral",
      step: 2,
      x: 560,
      y: 342,
      w: 150,
      h: 50,
    },

    // Step 3
    {
      id: "analytics",
      label: "Analytics worker",
      sub: "reads all 3 partitions",
      icon: "chart",
      tone: "teal",
      step: 3,
      x: 240,
      y: 64,
      w: 200,
      h: 50,
    },
  ],
  edges: [
    // Step 1: each partition goes to exactly one worker of the group; the labels are that worker's offset.
    { from: "p0", to: "w0", label: "at 9,412", packet: true, labelAt: 0.2 },
    { from: "p1", to: "w1", label: "at 9,398", packet: true, delay: 0.4, labelAt: 0.2 },
    { from: "p2", to: "w2", label: "at 9,431", packet: true, delay: 0.8, labelAt: 0.2 },
    { from: "w2", to: "store", label: "save offset", dashed: true, labelAt: 0.55 },

    // Step 2: the new worker joins; the rebalance leaves it nothing to read.
    { from: "w3", to: "store", label: "gets none", dashed: true, tone: "orange", labelAt: 0.45, step: 2 },

    // Step 3: a second group keeps its own place in every partition.
    { from: "p0", to: "analytics", packet: true, delay: 1.2, step: 3 },
    { from: "p1", to: "analytics", label: "at 2,050", packet: true, delay: 1.2, step: 3 },
    { from: "p2", to: "analytics", packet: true, delay: 1.2, step: 3 },
  ],
};

export default spec;
