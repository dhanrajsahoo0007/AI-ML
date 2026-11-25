import type { DiagramSpec } from "@/components/diagrams/types";
import { zoneFrame } from "@/components/diagrams/presets/case-study";

// A leaderless, Dynamo-style key-value store, built one requirement at a time (key-value-store case study, the hero).
// Seven steps: 1 one node: every put is appended to a commit log, then applied to a memtable (a sorted map in
// memory) that is flushed to sorted files when full · 2 partition: a load balancer sends a request to any node; that
// node (the coordinator) finds the key's owners on a hash ring with virtual nodes (the step-1 direct call goes away)
// · 3 replicate each key to N = 3 nodes (A, B, C, the preference list), with W = 2 acks for a write and R = 2 answers
// for a read; every replica runs the same storage engine · 4 a node is down: B times out (red, this step only), the
// write goes to the next healthy node D with a hint for B, and D hands it back when B returns · 5 conflicts: every
// value carries a version, and a read returns the value with its version context · 6 membership: gossip with a
// failure detector tells every coordinator who is up · 7 repair and snapshots: replicas compare Merkle trees per key
// range; snapshots hard-link the immutable sorted files.
// Working (round numbers chosen to size the system): 100 TB of unique data × 3 copies = 300 TB; at 2 TB per node,
// 300 ÷ 2 = 150 nodes. Peak 1,000,000 ops/s, half reads, half writes: 500,000 × 3 replica writes + 500,000 × 2
// replica reads = 2,500,000 replica ops/s ÷ 150 = about 16,700 per node. W + R = 2 + 2 = 4 > N = 3, so every read
// quorum overlaps every write quorum in at least 4 − 3 = 1 node.
// Layout (1200 × 740): zoneFrame() from presets/case-study.ts with renamed zones. Clients: the application (105,
// 175). Edge column x 297: load balancer 175, partition map (glyph) 430. Core: the coordinator (accent) at 575, 175.
// Replica nodes in a 2 × 2 grid: A (490, 400), B (660, 400), C (490, 560), D (660, 560), w 130; the coordinator's
// edges to C and D run down the 40 px gap between A and B (via x 575) so they cross no box. Async column x 879:
// gossip 130, anti-entropy 260, snapshots 470. Storage column x 1098: commit log 130, memtable 400, sorted files 570.
// The replica-to-engine edge runs level at y 400 between anti-entropy and snapshots; the coordinator's lookup of the
// partition map runs down the gap between the routing and coordinator zones (via x 393).
// The step-1 edges from the coordinator to the log and the memtable end at step 2, before gossip (step 6) sits on
// their line. Every long edge was checked against the boxes it passes.
// Colours: zone tones from ZONE; red only for the timed-out write to B in step 4.

const spec: DiagramSpec = {
  title: "Key-value store high-level architecture",
  width: 1200,
  height: 740,
  steps: [
    { title: "One node: a log and a sorted map", covers: "F1" },
    { title: "Partition on a hash ring", covers: "F2, N6" },
    { title: "Three copies, quorum reads and writes", covers: "F3, F4" },
    { title: "A node is down: hint and hand back", covers: "F3, N1" },
    { title: "Versions on every value", covers: "F4" },
    { title: "Gossip: who is up", covers: "F5" },
    { title: "Repair and snapshots", covers: "F3, N5" },
  ],
  zones: zoneFrame({
    edge: "Routing",
    core: "Coordinator",
    services: "Replica nodes",
    async: "Background",
    storage: "Engine on each node",
  }),
  nodes: [
    { id: "app", label: "Application", sub: "client library", icon: "server", fill: "pastel", x: 105, y: 175, w: 140 },
    {
      id: "lb",
      label: "Load balancer",
      sub: "to any node",
      icon: "load-balancer",
      tone: "blue",
      fill: "pastel",
      step: 2,
      x: 297,
      y: 175,
      w: 150,
    },
    {
      id: "ring",
      label: "Partition map",
      sub: "ring, 128 vnodes each",
      icon: "ring",
      tone: "blue",
      variant: "glyph",
      step: 2,
      x: 297,
      y: 430,
    },
    {
      id: "coord",
      label: "Coordinator",
      sub: "any node; N 3, W 2, R 2",
      icon: "coordinator",
      tone: "green",
      accent: true,
      x: 575,
      y: 175,
      w: 220,
    },
    {
      id: "a",
      label: "Replica A",
      sub: "owner 1",
      icon: "node",
      tone: "teal",
      fill: "pastel",
      step: 3,
      x: 490,
      y: 400,
      w: 130,
    },
    {
      id: "b",
      label: "Replica B",
      sub: "owner 2",
      icon: "node",
      tone: "teal",
      fill: "pastel",
      step: 3,
      x: 660,
      y: 400,
      w: 130,
    },
    {
      id: "c",
      label: "Replica C",
      sub: "owner 3",
      icon: "node",
      tone: "teal",
      fill: "pastel",
      step: 3,
      x: 490,
      y: 560,
      w: 130,
    },
    {
      id: "d",
      label: "Node D",
      sub: "next on ring",
      icon: "node",
      tone: "teal",
      fill: "pastel",
      step: 4,
      x: 660,
      y: 560,
      w: 130,
    },
    {
      id: "gossip",
      label: "Gossip",
      sub: "membership, detector",
      icon: "radar",
      tone: "orange",
      fill: "pastel",
      step: 6,
      x: 879,
      y: 130,
      w: 190,
    },
    {
      id: "merkle",
      label: "Anti-entropy",
      sub: "Merkle tree per range",
      icon: "tree",
      tone: "orange",
      fill: "pastel",
      step: 7,
      x: 879,
      y: 260,
      w: 190,
    },
    {
      id: "snap",
      label: "Snapshots",
      sub: "files to object store",
      icon: "snapshot",
      tone: "orange",
      fill: "pastel",
      step: 7,
      x: 879,
      y: 470,
      w: 190,
    },
    {
      id: "log",
      label: "Commit log",
      sub: "append, fsync",
      icon: "log",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 130,
    },
    {
      id: "mem",
      label: "Memtable",
      sub: "sorted, in memory",
      icon: "cache",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 400,
    },
    {
      id: "files",
      label: "Sorted files",
      sub: "immutable + Bloom",
      icon: "file",
      tone: "violet",
      variant: "glyph",
      x: 1098,
      y: 570,
    },
  ],
  edges: [
    { from: "app", to: "coord", label: "put / get", flow: true, packet: true, until: 1 },
    { from: "coord", to: "log", label: "1 append", flow: true, packet: true, delay: 0.4, until: 2 },
    { from: "coord", to: "mem", label: "2 apply", flow: true, packet: true, delay: 0.8, until: 2 },
    { from: "mem", to: "files", label: "flush when full", dashed: true },

    { from: "app", to: "lb", flow: true, packet: true, step: 2 },
    { from: "lb", to: "coord", label: "any node", flow: true, packet: true, delay: 0.4, step: 2 },
    {
      from: "coord",
      to: "ring",
      label: "owners of k?",
      labelAt: 0.62,
      dashed: true,
      via: [
        [393, 230],
        [393, 430],
      ],
      step: 2,
    },

    { from: "coord", to: "a", label: "write to N = 3", flow: true, packet: true, delay: 0.8, step: 3 },
    { from: "coord", to: "b", flow: true, packet: true, delay: 0.8, step: 3 },
    { from: "coord", to: "c", via: [[575, 480]], step: 3 },
    { from: "b", to: "mem", label: "same engine on every node", dashed: true, step: 3 },

    { from: "coord", to: "b", label: "B down: timeout", labelAt: 0.3, tone: "red", step: 4, until: 4 },
    { from: "coord", to: "d", label: "hint for B", dashed: true, via: [[575, 480]], labelAt: 0.93, step: 4 },
    { from: "d", to: "b", label: "hand back", dashed: true, step: 4 },

    {
      from: "coord",
      to: "app",
      label: "value + version",
      dashed: true,
      via: [
        [540, 255],
        [150, 255],
      ],
      step: 5,
    },

    { from: "gossip", to: "coord", label: "who is up", dashed: true, step: 6 },

    { from: "merkle", to: "b", label: "repair range", dashed: true, step: 7 },
    { from: "snap", to: "files", label: "hard links", dashed: true, step: 7 },
  ],
};

export default spec;
