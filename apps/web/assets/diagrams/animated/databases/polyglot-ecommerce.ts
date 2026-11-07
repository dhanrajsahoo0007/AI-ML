import type { DiagramSpec } from "@/components/diagrams/types";

// An e-commerce backend that uses one store per access pattern, built up one store at a time. Postgres is the
// source of truth; Redis takes hot reads, Elasticsearch and ClickHouse are fed from Postgres by change data
// capture through Kafka, and product images live in S3 behind a CDN.
const spec: DiagramSpec = {
  title: "Polyglot persistence in an e-commerce backend",
  width: 1200,
  height: 790,
  steps: [
    { title: "Orders and payments in PostgreSQL", covers: "Transactions" },
    { title: "Redis for carts, sessions and hot reads", covers: "High reads" },
    { title: "Search index fed by change data capture", covers: "Full-text search" },
    { title: "Images in S3 behind a CDN", covers: "Large files" },
    { title: "Analytics in a columnar store", covers: "Aggregations" },
  ],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 60, w: 170, h: 700 },
    { id: "edge", title: "Edge", tone: "blue", x: 212, y: 60, w: 170, h: 700 },
    { id: "services", title: "Application services", tone: "teal", x: 405, y: 60, w: 340, h: 700 },
    { id: "async", title: "Change data capture", tone: "orange", x: 768, y: 60, w: 222, h: 700 },
    { id: "storage", title: "Storage", tone: "violet", x: 1012, y: 60, w: 172, h: 700 },
  ],
  nodes: [
    { id: "shopper", label: "Shopper", sub: "web / mobile", icon: "phone", x: 105, y: 200, w: 140, h: 64 },
    { id: "gateway", label: "API gateway", sub: "auth, routing", icon: "gateway", tone: "blue", x: 297, y: 200, w: 150, h: 64 },
    { id: "orders", label: "Order service", sub: "checkout, payments", icon: "package", tone: "teal", accent: true, x: 575, y: 110, w: 210, h: 64 },
    { id: "pg", label: "PostgreSQL", sub: "source of truth", icon: "database", tone: "blue", variant: "glyph", x: 1098, y: 110 },

    { id: "cart", label: "Cart service", sub: "carts, sessions", icon: "server", tone: "teal", step: 2, x: 575, y: 250, w: 210, h: 64 },
    { id: "redis", label: "Redis", sub: "in-memory key-value", icon: "cache", tone: "red", variant: "glyph", step: 2, x: 1098, y: 250 },

    { id: "search", label: "Search service", sub: "query, rank, facet", icon: "search", tone: "teal", step: 3, x: 575, y: 390, w: 210, h: 64 },
    { id: "cdc", label: "CDC connector", sub: "reads the WAL", icon: "workers", tone: "orange", step: 3, x: 879, y: 300, w: 190, h: 64 },
    { id: "kafka", label: "Kafka", sub: "change events", icon: "queue", tone: "orange", variant: "glyph", step: 3, x: 879, y: 440, w: 90 },
    { id: "es", label: "Elasticsearch", sub: "inverted index", icon: "database", tone: "orange", variant: "glyph", step: 3, x: 1098, y: 390 },

    { id: "cdn", label: "CDN", sub: "edge cache", icon: "cdn", tone: "blue", variant: "glyph", step: 4, x: 297, y: 670 },
    { id: "s3", label: "S3", sub: "product images", icon: "blob", tone: "violet", variant: "glyph", step: 4, x: 1098, y: 670 },

    { id: "bi", label: "Dashboards", sub: "sales, funnels", icon: "bar-chart", tone: "teal", step: 5, x: 575, y: 530, w: 210, h: 64 },
    { id: "ch", label: "ClickHouse", sub: "columnar OLAP", icon: "database", tone: "teal", variant: "glyph", step: 5, x: 1098, y: 530 },
  ],
  edges: [
    // Step 1: the transactional path.
    { from: "shopper", to: "gateway", tone: "blue", flow: true, packet: true, delay: 0 },
    { from: "gateway", to: "orders", tone: "blue", flow: true, packet: true, delay: 0.6, via: [[390, 200], [390, 110]] },
    { from: "orders", to: "pg", label: "ACID write", tone: "blue", flow: true, packet: true, delay: 1.2 },

    // Step 2: hot key lookups.
    { from: "gateway", to: "cart", tone: "blue", dashed: true, via: [[390, 200], [390, 250]] },
    { from: "cart", to: "redis", label: "GET / SET by key", tone: "red", flow: true, packet: true, delay: 1.2, labelAt: 0.3 },

    // Step 3: Postgres changes stream into the search index.
    { from: "pg", to: "cdc", label: "WAL", tone: "orange", flow: true, packet: true, delay: 1.8, via: [[1000, 110], [1000, 300]], labelAt: 0.35 },
    { from: "cdc", to: "kafka", tone: "orange", flow: true, packet: true, delay: 2.4 },
    { from: "kafka", to: "es", label: "index", tone: "orange", flow: true, packet: true, delay: 3.0, labelAt: 0.4 },
    { from: "gateway", to: "search", tone: "blue", dashed: true, via: [[390, 200], [390, 390]] },
    { from: "search", to: "es", label: "full-text query", tone: "orange", dashed: true, labelAt: 0.3 },

    // Step 4: bytes go around the services.
    { from: "shopper", to: "cdn", label: "images", tone: "blue", flow: true, via: [[105, 670]], labelAt: 0.5 },
    { from: "cdn", to: "s3", label: "cache miss", tone: "violet", dashed: true, labelAt: 0.5 },

    // Step 5: the same change stream feeds analytics.
    { from: "kafka", to: "ch", label: "stream", tone: "teal", flow: true, packet: true, delay: 3.0, labelAt: 0.45 },
    { from: "bi", to: "ch", label: "GROUP BY over billions", tone: "teal", dashed: true, labelAt: 0.3 },
  ],
};

export default spec;
