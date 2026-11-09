import type { DiagramSpec } from "@/components/diagrams/types";

// Avro on a Kafka topic with a schema registry, built in three steps.
// 1. The ingest service registers its writer schema (v2), gets an id (42), and sends each status as
//    1 magic byte + 4-byte schema id + 12 Avro bytes = 17 bytes.
// 2. The battery job reads the id from each message, fetches schema 42 once (then caches it) and decodes
//    the bytes with it, resolving them into the reader schema it was built with.
// 3. A deploy that changes battery from int to string is checked against the registry and refused (HTTP 409).
const spec: DiagramSpec = {
  title: "Avro messages with a schema registry",
  width: 880,
  height: 380,
  steps: [
    { title: "Write: register the schema, send its id with the bytes" },
    { title: "Read: fetch the writer's schema by id, then decode" },
    { title: "A breaking change is refused before it ships" },
  ],
  zones: [
    { id: "clients", title: "Scooters", tone: "neutral", x: 20, y: 40, w: 160, h: 180 },
    { id: "app", title: "Ingest", tone: "teal", x: 210, y: 40, w: 170, h: 180 },
    { id: "async", title: "Async pipeline", tone: "orange", x: 410, y: 40, w: 450, h: 180 },
    { id: "deploys", title: "Deploys", tone: "neutral", x: 210, y: 250, w: 170, h: 110 },
    { id: "storage", title: "Schemas", tone: "violet", x: 410, y: 250, w: 450, h: 110 },
  ],
  nodes: [
    { id: "scooters", label: "120k scooters", sub: "1 status / 10 s", icon: "zap", x: 100, y: 130, w: 140 },
    { id: "ingest", label: "Ingest", sub: "Avro writer", icon: "server", tone: "teal", x: 295, y: 130 },
    { id: "kafka", label: "Kafka topic", sub: "17 B / message", icon: "queue", tone: "orange", x: 520, y: 130, w: 130 },
    {
      id: "job",
      label: "Battery job",
      sub: "Avro reader",
      icon: "workers",
      tone: "teal",
      x: 750,
      y: 130,
      w: 130,
      step: 2,
    },
    {
      id: "registry",
      label: "Schema registry",
      sub: "id 42 = v2",
      icon: "registry",
      tone: "violet",
      accent: true,
      x: 635,
      y: 305,
      w: 150,
    },
    { id: "ci", label: "CI check", sub: "v3 schema", icon: "shield", tone: "red", x: 295, y: 305, step: 3 },
  ],
  edges: [
    { from: "scooters", to: "ingest", label: "status", flow: true, packet: true },
    { from: "ingest", to: "registry", label: "register v2", dashed: true, labelAt: 0.35 },
    { from: "ingest", to: "kafka", label: "id 42 + 12 B", flow: true, packet: true, delay: 0.6 },
    { from: "kafka", to: "job", label: "poll", flow: true, packet: true, delay: 1.2 },
    { from: "job", to: "registry", label: "GET id 42", dashed: true, labelAt: 0.4 },
    { from: "ci", to: "registry", label: "409: int to string", tone: "red", dashed: true, step: 3 },
  ],
};

export default spec;
