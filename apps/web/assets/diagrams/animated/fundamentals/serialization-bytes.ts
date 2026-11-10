import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

// The Protobuf and Avro bytes of the same scooter status, one cell per byte, in hex.
// Protobuf schema: string scooter_id = 1; int32 battery = 2; int32 odometer_km = 3; bool locked = 4;
//   tag = field number << 3 | wire type: 0A (1, length-delimited), 10 (2, varint), 18 (3, varint), 20 (4, varint)
//   87 fits in one varint byte (57). 1290 = 10 x 128 + 10, so its varint is 8A 0A.
// Avro schema lists the same four fields in that order. Ints are zigzag varints, which double a positive number:
//   string length 6 -> 12 -> 0C; 87 -> 174 -> AE 01; 1290 -> 2580 -> 94 14; true -> 01.
// "S", "C", "-", "2", "0", "8" are 53 43 2D 32 30 38 in ASCII.
// Orange = bytes that describe the data (tags, lengths); teal = the values.
type Byte = { hex: string; sub: string; tone: "orange" | "teal"; hl?: boolean };

const PROTO: Byte[] = [
  { hex: "0A", sub: "field 1", tone: "orange", hl: true },
  { hex: "06", sub: "len 6", tone: "orange" },
  { hex: "53", sub: "S", tone: "teal" },
  { hex: "43", sub: "C", tone: "teal" },
  { hex: "2D", sub: "-", tone: "teal" },
  { hex: "32", sub: "2", tone: "teal" },
  { hex: "30", sub: "0", tone: "teal" },
  { hex: "38", sub: "8", tone: "teal" },
  { hex: "10", sub: "field 2", tone: "orange" },
  { hex: "57", sub: "87", tone: "teal" },
  { hex: "18", sub: "field 3", tone: "orange" },
  { hex: "8A", sub: "1290", tone: "teal" },
  { hex: "0A", sub: "1290", tone: "teal" },
  { hex: "20", sub: "field 4", tone: "orange" },
  { hex: "01", sub: "true", tone: "teal" },
];

const AVRO: Byte[] = [
  { hex: "0C", sub: "len 6", tone: "orange" },
  { hex: "53", sub: "S", tone: "teal" },
  { hex: "43", sub: "C", tone: "teal" },
  { hex: "2D", sub: "-", tone: "teal" },
  { hex: "32", sub: "2", tone: "teal" },
  { hex: "30", sub: "0", tone: "teal" },
  { hex: "38", sub: "8", tone: "teal" },
  { hex: "AE", sub: "87", tone: "teal", hl: true },
  { hex: "01", sub: "87", tone: "teal" },
  { hex: "94", sub: "1290", tone: "teal" },
  { hex: "14", sub: "1290", tone: "teal" },
  { hex: "01", sub: "true", tone: "teal" },
];

const PITCH = 52;
const row = (bytes: Byte[], prefix: string, y: number, step: number): LayoutShape[] =>
  bytes.map((b, i) => ({
    id: `${prefix}${i}`,
    type: "cell" as const,
    x: 44 + PITCH * i,
    y,
    w: 44,
    h: 48,
    label: b.hex,
    sub: b.sub,
    tone: b.tone,
    step,
    ...(b.hl ? { highlight: true } : {}),
  }));

const spec: LayoutSpec = {
  kind: "layout",
  title: "The same status as Protobuf and Avro bytes",
  width: 880,
  height: 320,
  steps: [
    { title: "Protobuf: a tag byte names each field by number" },
    { title: "Avro: values only, in the order the schema lists them" },
  ],
  groups: [
    { id: "g-pb", title: "Protobuf, 15 bytes", tone: "teal", x: 20, y: 36, w: 840, h: 124 },
    { id: "g-av", title: "Avro, 12 bytes", tone: "violet", x: 20, y: 180, w: 840, h: 124 },
  ],
  shapes: [
    ...row(PROTO, "pb", 72, 1),
    {
      id: "pb-note",
      type: "text",
      x: 40,
      y: 130,
      w: 800,
      h: 20,
      label: "Each tag holds a field number and a wire type. The field names never travel.",
      tone: "neutral",
      step: 1,
    },
    ...row(AVRO, "av", 216, 2),
    {
      id: "av-note",
      type: "text",
      x: 40,
      y: 274,
      w: 800,
      h: 20,
      label: "No tags. Zigzag doubles each int, so 87 is sent as 174 and needs 2 bytes.",
      tone: "neutral",
      step: 2,
    },
  ],
};

export default spec;
