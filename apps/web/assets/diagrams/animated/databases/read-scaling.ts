import type { DiagramSpec } from "@/components/diagrams/types";

// Scaling a read-heavy relational database one layer at a time: a single primary, then read replicas, then a
// cache in front, then a CDN for anything cacheable at the edge.
const spec: DiagramSpec = {
  title: "Scaling reads on a relational database",
  width: 880,
  height: 540,
  steps: [
    { title: "One primary takes every read and write" },
    { title: "Read replicas take the reads", covers: "Reads scale out" },
    { title: "A cache absorbs the hottest keys", covers: "Sub-ms hot reads" },
    { title: "A CDN serves cacheable responses at the edge", covers: "Global reads" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 50, w: 160, h: 460 },
    { id: "edge", title: "Edge", tone: "blue", x: 200, y: 50, w: 160, h: 460 },
    { id: "app", title: "Application", tone: "teal", x: 380, y: 50, w: 200, h: 460 },
    { id: "storage", title: "Storage", tone: "violet", x: 620, y: 50, w: 240, h: 460 },
  ],
  nodes: [
    { id: "client", label: "Users", sub: "100 reads : 1 write", icon: "phone", x: 100, y: 260, w: 140, h: 64 },
    { id: "lb", label: "Load balancer", icon: "load-balancer", tone: "blue", x: 280, y: 260, w: 140, h: 64 },
    { id: "app", label: "App servers", sub: "stateless", icon: "server", tone: "teal", accent: true, x: 480, y: 260, w: 160, h: 64 },
    { id: "primary", label: "Primary", sub: "all writes", icon: "database", tone: "blue", variant: "glyph", x: 740, y: 430 },
    { id: "replicas", label: "Read replicas", sub: "async copies", icon: "database", tone: "violet", variant: "glyph", step: 2, x: 740, y: 270 },
    { id: "cache", label: "Redis cache", sub: "hot keys, TTL", icon: "cache", tone: "red", variant: "glyph", step: 3, x: 740, y: 115 },
    { id: "cdn", label: "CDN", sub: "cacheable GETs", icon: "cdn", tone: "blue", variant: "glyph", step: 4, x: 280, y: 115 },
  ],
  edges: [
    { from: "client", to: "lb", tone: "blue", flow: true, packet: true, delay: 0 },
    { from: "lb", to: "app", tone: "blue", flow: true, packet: true, delay: 0.5 },
    { from: "app", to: "primary", label: "reads + writes", tone: "blue", flow: true, packet: true, delay: 1, via: [[610, 260], [610, 430]], labelAt: 0.75, until: 1 },
    { from: "app", to: "primary", label: "writes", tone: "blue", flow: true, packet: true, delay: 1, via: [[610, 260], [610, 430]], labelAt: 0.75, step: 2 },
    { from: "app", to: "replicas", label: "reads", tone: "violet", flow: true, packet: true, delay: 1.6, via: [[610, 260], [610, 270]], labelAt: 0.9, step: 2 },
    { from: "primary", to: "replicas", label: "replication lag", tone: "violet", dashed: true, flow: true, step: 2 },
    { from: "app", to: "cache", label: "1. GET key", tone: "red", flow: true, packet: true, delay: 1, via: [[610, 260], [610, 115]], labelAt: 0.85 },
    { from: "client", to: "cdn", label: "static / public", tone: "blue", flow: true, packet: true, delay: 0, via: [[100, 115]], labelAt: 0.3 },
  ],
};

export default spec;
