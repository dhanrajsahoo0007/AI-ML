import type { DiagramSpec, LayoutSpec, SequenceSpec } from "@/components/diagrams/types";

// Small specs shared by the diagram tests.

export const arch: DiagramSpec = {
  title: "Read path",
  width: 800,
  height: 300,
  zones: [{ id: "edge", title: "Edge", tone: "blue", x: 20, y: 40, w: 300, h: 220 }],
  nodes: [
    { id: "client", label: "Client", icon: "phone", x: 100, y: 150 },
    { id: "lb", label: "LB", icon: "load-balancer", x: 250, y: 150 },
    { id: "cache", label: "Cache", icon: "cache", x: 450, y: 80, step: 2 },
    { id: "db", label: "Database", icon: "database", x: 450, y: 220, step: 2 },
  ],
  edges: [
    { from: "client", to: "lb", packet: true, delay: 0 },
    { from: "lb", to: "db", until: 1, step: 1, packet: true, delay: 1 },
    { from: "lb", to: "cache", packet: true, delay: 2 },
    { from: "cache", to: "db", dashed: true, delay: 3, packet: true },
  ],
  steps: [{ title: "Direct reads" }, { title: "Add a cache", covers: "NFR: latency" }],
};

export const seq: SequenceSpec = {
  kind: "sequence",
  title: "Cache-aside read",
  lanes: [
    { id: "app", label: "App", icon: "server", tone: "blue" },
    { id: "cache", label: "Cache", icon: "cache", tone: "orange" },
    { id: "db", label: "Database", icon: "database", tone: "violet" },
  ],
  messages: [
    { from: "app", to: "cache", label: "GET user:42" },
    { from: "cache", to: "app", label: "miss", kind: "return" },
    { from: "app", to: "db", label: "SELECT", step: 2 },
    { from: "db", to: "app", label: "row", kind: "return", step: 2 },
    { from: "app", to: "cache", label: "SET user:42", kind: "async", step: 2, delay: 0.3 },
  ],
  notes: [{ lane: "cache", text: "TTL 5 min", step: 2 }],
  steps: [{ title: "Check the cache" }, { title: "Fill on a miss" }],
};

export const layout: LayoutSpec = {
  kind: "layout",
  title: "Hash buckets",
  width: 520,
  height: 200,
  groups: [{ id: "table", title: "Table", tone: "teal", x: 20, y: 30, w: 220, h: 150 }],
  shapes: [
    { id: "b0", type: "cell", x: 40, y: 60, label: "0" },
    { id: "b1", type: "cell", x: 80, y: 60, label: "1", highlight: true, tone: "orange" },
    { id: "k", type: "box", x: 340, y: 60, label: "key: 42", step: 2 },
    { id: "a1", type: "arrow", x: 0, y: 0, from: "k", to: "b1", label: "hash", step: 2 },
    { id: "t", type: "text", x: 40, y: 130, w: 160, label: "8 buckets" },
  ],
  steps: [{ title: "Empty table" }, { title: "Insert a key" }],
};
