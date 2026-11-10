import type { DiagramSpec } from "@/components/diagrams/types";

// Where TrailNotes compresses, one place per step.
// Step 1: text to users over HTTP. The app compresses JSON with Brotli; the CDN edge caches the compressed copy and
//         serves about 260 KB instead of 2.4 MB to the phone.
// Step 2: the app publishes hike events to a queue in batches; the producer compresses each batch with zstd, the
//         broker stores it compressed, and consumers unpack it.
// Step 3: data at rest. The database compresses each page with LZ4 as it writes; the archive keeps old events as
//         columnar files compressed with zstd.
//
// Layout check (cards are centre +/- w/2, h 58; glyphs are +/- 38 wide, 27 up, 62 down):
//   phone   38-162  x 101-159     edge  222-346 x 101-159     app 410-534 x 101-159
//   db (glyph)  814-890 x 93-182  queue 598-722 x 271-329     lake (glyph) 814-890 x 263-352
// Card gaps: 60 px between columns. The async zone only covers the lower half (y 220-380), so the app-to-database
// edge at y about 125 crosses empty space. The app-to-queue edge drops down x 472 inside the services zone, then runs
// right along y 300 into the queue. Canvas 960 x 400.
const spec: DiagramSpec = {
  title: "Where a system compresses",
  width: 960,
  height: 400,
  steps: [{ title: "Text to users over HTTP" }, { title: "Batches in the queue" }, { title: "Data at rest" }],
  zones: [
    { id: "clients", title: "Clients", tone: "neutral", x: 20, y: 50, w: 160, h: 330 },
    { id: "edge-zone", title: "Edge", tone: "blue", x: 200, y: 50, w: 168, h: 330 },
    { id: "services", title: "Services", tone: "teal", x: 388, y: 50, w: 168, h: 330 },
    { id: "async", title: "Async pipeline", tone: "orange", x: 576, y: 220, w: 168, h: 160 },
    { id: "storage", title: "Storage", tone: "violet", x: 764, y: 50, w: 176, h: 330 },
  ],
  nodes: [
    { id: "phone", label: "Phone", sub: "unpacks br", icon: "phone", x: 100, y: 130, w: 124 },
    { id: "edge", label: "CDN edge", sub: "keeps br copy", icon: "cdn", tone: "blue", x: 284, y: 130, w: 124 },
    {
      id: "app",
      label: "App server",
      sub: "JSON to br",
      icon: "server",
      tone: "teal",
      accent: true,
      x: 472,
      y: 130,
      w: 124,
    },
    {
      id: "queue",
      label: "Event queue",
      sub: "zstd batches",
      icon: "queue",
      tone: "orange",
      step: 2,
      x: 660,
      y: 300,
      w: 124,
    },
    {
      id: "db",
      label: "Database",
      sub: "LZ4 per page",
      icon: "database",
      tone: "violet",
      variant: "glyph",
      step: 3,
      x: 852,
      y: 120,
    },
    {
      id: "lake",
      label: "Event archive",
      sub: "columns + zstd",
      icon: "blob",
      tone: "violet",
      variant: "glyph",
      step: 3,
      x: 852,
      y: 290,
    },
  ],
  edges: [
    // Step 1: compressed text from the origin, through the edge, to the phone.
    { from: "phone", to: "edge", label: "260 KB", tone: "blue", flow: true, packet: true, bidirectional: true },
    { from: "edge", to: "app", label: "br", tone: "green", flow: true, packet: true, bidirectional: true, delay: 0.6 },

    // Step 2: the producer compresses a whole batch before it leaves the app.
    { from: "app", to: "queue", label: "zstd batch", tone: "orange", flow: true, packet: true, via: [[472, 300]] },

    // Step 3: compression inside the stores.
    { from: "app", to: "db", label: "rows", dashed: true },
    { from: "queue", to: "lake", label: "old events", dashed: true },
  ],
};

export default spec;
