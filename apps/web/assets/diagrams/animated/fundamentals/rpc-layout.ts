import type { LayoutSpec } from "@/components/diagrams/types";

// The same ReserveStock request, { sku: "BK-1042", quantity: 2, order_id: 98765 }, as JSON text and as Protobuf bytes.
// Rows 1 and 2 are drawn to the same scale, 16 px per byte, so their lengths compare honestly:
//   JSON     {"sku":"BK-1042","quantity":2,"order_id":98765}  = 47 bytes (32 of names and punctuation, 15 of values)
//   Protobuf 0A 07 42 4B 2D 31 30 34 32 10 02 18 CD 83 06     = 15 bytes
// Row 3 zooms into the 15 Protobuf bytes at 40 px per byte so the hex fits.
// Orange = bytes that describe the data (names, punctuation, tags, lengths); teal = the values themselves.
const JSON_X = 40;
const BYTE = 16;
const CELL = (i: number) => 84 + 48 * i;

const PROTO_BYTES: { label: string; sub: string; tone: "orange" | "teal" }[] = [
  { label: "0A", sub: "field 1", tone: "orange" },
  { label: "07", sub: "len 7", tone: "orange" },
  { label: "42", sub: "B", tone: "teal" },
  { label: "4B", sub: "K", tone: "teal" },
  { label: "2D", sub: "-", tone: "teal" },
  { label: "31", sub: "1", tone: "teal" },
  { label: "30", sub: "0", tone: "teal" },
  { label: "34", sub: "4", tone: "teal" },
  { label: "32", sub: "2", tone: "teal" },
  { label: "10", sub: "field 2", tone: "orange" },
  { label: "02", sub: "= 2", tone: "teal" },
  { label: "18", sub: "field 3", tone: "orange" },
  { label: "CD", sub: "varint", tone: "teal" },
  { label: "83", sub: "varint", tone: "teal" },
  { label: "06", sub: "varint", tone: "teal" },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "One request as JSON text and as Protobuf bytes",
  width: 880,
  height: 420,
  steps: [
    { title: "JSON: 47 bytes, most of them names and punctuation" },
    { title: "Protobuf: the same values in 15 bytes" },
    { title: "Inside the 15 bytes: tags, a length and varints" },
  ],
  groups: [
    { id: "g-json", title: "JSON text, 47 bytes", tone: "orange", x: 20, y: 36, w: 840, h: 110 },
    { id: "g-proto", title: "Protobuf, 15 bytes, same scale", tone: "teal", x: 20, y: 166, w: 840, h: 100 },
    { id: "g-bytes", title: "The 15 bytes up close", tone: "teal", x: 20, y: 286, w: 840, h: 116 },
  ],
  shapes: [
    // Step 1: JSON, 16 px per byte. Segments touch because they are consecutive bytes.
    { id: "j-sku-key", type: "box", x: JSON_X, y: 72, w: 7 * BYTE, h: 44, label: '{"sku":', tone: "orange" },
    { id: "j-sku-val", type: "box", x: JSON_X + 7 * BYTE, y: 72, w: 9 * BYTE, h: 44, label: '"BK-1042"', tone: "teal" },
    {
      id: "j-qty-key",
      type: "box",
      x: JSON_X + 16 * BYTE,
      y: 72,
      w: 12 * BYTE,
      h: 44,
      label: ',"quantity":',
      tone: "orange",
    },
    { id: "j-qty-val", type: "box", x: JSON_X + 28 * BYTE, y: 72, w: 1 * BYTE, h: 44, label: "2", tone: "teal" },
    {
      id: "j-id-key",
      type: "box",
      x: JSON_X + 29 * BYTE,
      y: 72,
      w: 12 * BYTE,
      h: 44,
      label: ',"order_id":',
      tone: "orange",
    },
    { id: "j-id-val", type: "box", x: JSON_X + 41 * BYTE, y: 72, w: 5 * BYTE, h: 44, label: "98765", tone: "teal" },
    { id: "j-end", type: "box", x: JSON_X + 46 * BYTE, y: 72, w: 1 * BYTE, h: 44, label: "}", tone: "orange" },
    {
      id: "j-note",
      type: "text",
      x: 40,
      y: 122,
      w: 760,
      h: 20,
      label: "Names and punctuation: 32 bytes. Values: 15 bytes.",
      tone: "orange",
    },

    // Step 2: Protobuf at the same 16 px per byte.
    { id: "p-tag1", type: "box", x: JSON_X, y: 202, w: 2 * BYTE, h: 44, tone: "orange", step: 2 },
    {
      id: "p-sku",
      type: "box",
      x: JSON_X + 2 * BYTE,
      y: 202,
      w: 7 * BYTE,
      h: 44,
      label: "BK-1042",
      tone: "teal",
      step: 2,
    },
    { id: "p-tag2", type: "box", x: JSON_X + 9 * BYTE, y: 202, w: 1 * BYTE, h: 44, tone: "orange", step: 2 },
    { id: "p-qty", type: "box", x: JSON_X + 10 * BYTE, y: 202, w: 1 * BYTE, h: 44, label: "2", tone: "teal", step: 2 },
    { id: "p-tag3", type: "box", x: JSON_X + 11 * BYTE, y: 202, w: 1 * BYTE, h: 44, tone: "orange", step: 2 },
    {
      id: "p-id",
      type: "box",
      x: JSON_X + 12 * BYTE,
      y: 202,
      w: 3 * BYTE,
      h: 44,
      label: "98765",
      tone: "teal",
      step: 2,
    },
    {
      id: "p-note",
      type: "text",
      x: 300,
      y: 214,
      w: 540,
      h: 20,
      label: "Same three values in 15 bytes, about a third of the JSON",
      tone: "teal",
      step: 2,
    },

    // Step 3: each Protobuf byte in hex, with what it means underneath.
    ...PROTO_BYTES.map((b, i) => ({
      id: `b${i}`,
      type: "cell" as const,
      x: CELL(i),
      y: 322,
      w: 40,
      h: 44,
      label: b.label,
      sub: b.sub,
      tone: b.tone,
      step: 3,
      ...(i === 0 ? { highlight: true } : {}),
    })),
    { id: "zoom", type: "arrow", x: 0, y: 0, from: "p-tag1", to: "b0", dashed: true, tone: "orange", step: 3 },
    {
      id: "b-note",
      type: "text",
      x: 60,
      y: 374,
      w: 760,
      h: 20,
      label: "A tag byte carries the field number and wire type. Field names never travel.",
      tone: "neutral",
      step: 3,
    },
  ],
};

export default spec;
