import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// A Kafka-style distributed message queue, built one requirement at a time (distributed-message-queue, the hero).
// Eight steps: 1 one broker appends every message to one file and consumers read by offset (the direct producer edge
// is replaced in step 2) · 2 partitions: the producer's partitioner hashes the key to pick a partition, so order holds
// per key · 3 consumer groups: a group coordinator gives each partition one owner per group and stores each group's
// offsets in an internal log · 4 replication: follower replicas pull from the leader; the in-sync set is the
// followers that keep up · 5 acknowledgement: the producer sends with acks=all and the topic requires 2 in-sync
// copies (the step-2 append edge is replaced by the acks=all edge) · 6 a Raft controller quorum keeps the metadata
// log (leaders, in-sync sets) and clients find leaders through a bootstrap address · 7 the log cleaner deletes old
// segments and compacts keyed topics · 8 the transaction coordinator gives producers ids and commits writes across
// partitions, writing its state to the internal log and commit markers to the partitions.
// Working (round numbers chosen to size the system): 1,000,000 messages/s × 1 kB = 1 GB/s average, 2 GB/s at peak;
// 1 GB/s × 86,400 s = 86.4 TB a day; × 7 days = 605 TB; × 3 copies = 1.8 PB; at 50 TB usable a broker,
// 1.8 PB ÷ 50 TB = 36 brokers, 12 in each of 3 zones.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts, zones renamed for this system. Clients column x 105:
// producers 200, consumer groups 480. Edge ("Client library") x 297: partitioner 200, bootstrap 620. Core: the
// partition leader (accent) at 575, 175. Services ("Coordinators") x 575: transaction coordinator 420, group
// coordinator 560. Async ("Replication and upkeep") x 879: log cleaner 120, follower replicas 250, controller quorum
// 400. Storage x 1098 (glyphs): segment files 160, metadata log 360, internal logs 560.
// Every long edge was checked against the boxes it passes. One crossing is left on purpose: producers to the
// transaction coordinator crosses consumers to the leader, in the gap between Edge and Core.
// Colours: the six zone tones; the leader is the one accent node.

const spec: DiagramSpec = {
  title: "Distributed message queue high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "One broker, one log", covers: "F1, F2" },
    { title: "Partitions keyed for order", covers: "F3, N1" },
    { title: "Consumer groups and offsets", covers: "F2" },
    { title: "Replicas and the in-sync set", covers: "F4, N4" },
    { title: "Acks and minimum in-sync copies", covers: "F4, N2, N5" },
    { title: "A controller quorum for metadata", covers: "F7, N5" },
    { title: "Retention and compaction", covers: "F5, N6" },
    { title: "Producer ids and transactions", covers: "F6" },
  ],
  zones: zoneFrame({
    edge: "Client library",
    core: "Partition leaders",
    services: "Coordinators",
    async: "Replication and upkeep",
  }),
  nodes: [
    {
      id: "producers",
      label: "Producers",
      sub: "services, apps",
      icon: "server",
      fill: "pastel",
      x: 105,
      y: 200,
      w: 140,
    },
    {
      id: "consumers",
      label: "Consumers",
      sub: "billing, analytics",
      icon: "workers",
      fill: "pastel",
      x: 105,
      y: 480,
      w: 150,
    },
    {
      id: "partitioner",
      label: "Partitioner",
      sub: "hash(key) mod N",
      icon: "hash",
      tone: "blue",
      fill: "pastel",
      step: 2,
      x: 297,
      y: 200,
      w: 150,
    },
    {
      id: "bootstrap",
      label: "Bootstrap",
      sub: "find the leaders",
      icon: "dns",
      tone: "blue",
      fill: "pastel",
      step: 6,
      x: 297,
      y: 620,
      w: 150,
    },
    {
      id: "leader",
      label: "Partition leader",
      sub: "append, serve fetches",
      icon: "log",
      tone: "green",
      accent: true,
      x: 575,
      y: 175,
      w: 200,
    },
    {
      id: "txn",
      label: "Transaction coord.",
      sub: "producer ids, commits",
      icon: "ledger",
      tone: "teal",
      fill: "pastel",
      step: 8,
      x: 575,
      y: 420,
      w: 200,
    },
    {
      id: "group",
      label: "Group coordinator",
      sub: "owners, offsets",
      icon: "users",
      tone: "teal",
      fill: "pastel",
      step: 3,
      x: 575,
      y: 560,
      w: 200,
    },
    {
      id: "cleaner",
      label: "Log cleaner",
      sub: "delete, compact",
      icon: "timer",
      tone: "orange",
      fill: "pastel",
      step: 7,
      x: 879,
      y: 120,
      w: 190,
    },
    {
      id: "followers",
      label: "Follower replicas",
      sub: "pull from leader",
      icon: "server",
      tone: "orange",
      fill: "pastel",
      step: 4,
      x: 879,
      y: 250,
      w: 190,
    },
    {
      id: "controller",
      label: "Controller quorum",
      sub: "Raft: leaders, ISR",
      icon: "coordinator",
      tone: "orange",
      fill: "pastel",
      step: 6,
      x: 879,
      y: 400,
      w: 190,
    },
    {
      id: "segments",
      label: "Segment files",
      sub: "per partition",
      icon: "log",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 160,
    },
    {
      id: "metadata",
      label: "Metadata log",
      sub: "topics, leaders",
      icon: "file",
      tone: "violet",
      variant: "glyph",
      step: 6,
      x: 1098,
      y: 360,
    },
    {
      id: "internal",
      label: "Internal logs",
      sub: "offsets, txn state",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 3,
      x: 1098,
      y: 560,
    },
  ],
  edges: [
    { from: "producers", to: "leader", label: "append", flow: true, packet: true, until: 1 },
    { from: "leader", to: "segments", label: "append to file", flow: true, packet: true, delay: 0.4 },
    { from: "consumers", to: "leader", label: "fetch from offset", flow: true, packet: true, delay: 0.8, labelAt: 0.2 },

    { from: "producers", to: "partitioner", label: "key", flow: true, packet: true, step: 2 },
    { from: "partitioner", to: "leader", label: "batch", flow: true, packet: true, delay: 0.2, step: 2, until: 4 },

    { from: "consumers", to: "group", label: "join, commit", step: 3 },
    { from: "group", to: "internal", label: "offsets", dashed: true, step: 3 },

    { from: "followers", to: "leader", label: "fetch", step: 4 },
    { from: "followers", to: "segments", label: "copy", dashed: true, step: 4 },

    { from: "partitioner", to: "leader", label: "acks=all", flow: true, packet: true, delay: 0.2, step: 5 },

    { from: "controller", to: "leader", label: "leaders, ISR", step: 6 },
    { from: "controller", to: "metadata", label: "Raft", dashed: true, step: 6 },
    { from: "consumers", to: "bootstrap", label: "metadata", dashed: true, step: 6 },

    { from: "cleaner", to: "segments", label: "delete", dashed: true, step: 7 },

    { from: "producers", to: "txn", label: "begin, commit", step: 8, labelAt: 0.4 },
    { from: "txn", to: "leader", label: "markers", step: 8 },
    { from: "txn", to: "internal", label: "txn state", dashed: true, step: 8 },
  ],
};

export default spec;
