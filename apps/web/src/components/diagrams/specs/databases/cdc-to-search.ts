import type { DiagramSpec } from "../../types";

// Keeping a derived store (here a search index) in sync with the source of truth by change data capture:
// the app writes only to Postgres, a connector tails the WAL into Kafka, and an indexer upserts into
// Elasticsearch. Searches read the index, which trails the database by about a second.
export const cdcToSearch: DiagramSpec = {
  title: "Change data capture from Postgres into a search index",
  width: 960,
  height: 500,
  steps: [
    { title: "The app writes only to the source of truth" },
    { title: "A CDC connector tails the WAL into Kafka" },
    { title: "An indexer upserts documents into the search index" },
    { title: "Searches read the index, about 1 s behind" },
  ],
  zones: [
    { id: "app", title: "Application", tone: "teal", x: 20, y: 50, w: 190, h: 420 },
    { id: "truth", title: "Source of truth", tone: "blue", x: 235, y: 50, w: 210, h: 200 },
    { id: "cdc", title: "Change stream", tone: "orange", x: 235, y: 290, w: 700, h: 180 },
    { id: "search", title: "Derived store", tone: "violet", x: 470, y: 50, w: 465, h: 200 },
  ],
  nodes: [
    { id: "writer", label: "Product service", sub: "INSERT / UPDATE", icon: "server", tone: "teal", x: 115, y: 150, w: 170, h: 64 },
    { id: "pg", label: "PostgreSQL", sub: "products table", icon: "database", tone: "blue", variant: "glyph", x: 340, y: 140 },
    { id: "connector", label: "CDC connector", sub: "Debezium, reads WAL", icon: "workers", tone: "orange", step: 2, x: 340, y: 380, w: 180, h: 64 },
    { id: "kafka", label: "Kafka", sub: "product-changes", icon: "queue", tone: "orange", variant: "glyph", step: 2, x: 590, y: 380, w: 90 },
    { id: "indexer", label: "Indexer", sub: "bulk upserts, idempotent", icon: "workers", tone: "orange", step: 3, x: 830, y: 380, w: 170, h: 64 },
    { id: "es", label: "Elasticsearch", sub: "products index", icon: "database", tone: "violet", variant: "glyph", step: 3, x: 830, y: 140 },
    { id: "searchapi", label: "Search API", sub: "~1 s behind writes", icon: "search", tone: "teal", step: 4, x: 600, y: 150, w: 170, h: 64 },
  ],
  edges: [
    { from: "writer", to: "pg", label: "write", tone: "blue", flow: true, packet: true, delay: 0 },
    { from: "pg", to: "connector", label: "WAL", tone: "orange", flow: true, packet: true, delay: 0.7 },
    { from: "connector", to: "kafka", tone: "orange", flow: true, packet: true, delay: 1.3 },
    { from: "kafka", to: "indexer", tone: "orange", flow: true, packet: true, delay: 1.9 },
    { from: "indexer", to: "es", label: "upsert", tone: "violet", flow: true, packet: true, delay: 2.5 },
    { from: "searchapi", to: "es", label: "query", tone: "violet", dashed: true, flow: true },
  ],
};
