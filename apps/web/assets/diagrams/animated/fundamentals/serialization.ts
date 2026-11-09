import type { LayoutSpec } from "@/components/diagrams/types";

// One scooter status, { scooter_id: "SC-208", battery: 87, odometer_km: 1290, locked: true }, in three encodings.
// All three strips use the same scale, 11 px per byte, so their lengths compare honestly:
//   JSON     {"scooter_id":"SC-208","battery":87,"odometer_km":1290,"locked":true}   = 69 bytes
//            names, quotes, colons, commas and braces 51 bytes; values (strings with their quotes) 18 bytes
//   Protobuf 0A 06 53 43 2D 32 30 38 10 57 18 8A 0A 20 01                            = 15 bytes
//            4 tags + 1 length + 10 bytes of values
//   Avro     0C 53 43 2D 32 30 38 AE 01 94 14 01                                     = 12 bytes
//            1 length + 11 bytes of values; no tags, the schema gives the field order
// Orange = bytes that describe the data (names, punctuation, tags, lengths); teal = the values themselves.
// Boxes of one or two bytes are too narrow for a label; the hex detail is in serialization-bytes.
const X = 40;
const B = 11;

const spec: LayoutSpec = {
  kind: "layout",
  title: "One scooter status in JSON, Protobuf and Avro",
  width: 880,
  height: 380,
  steps: [
    { title: "JSON: 69 bytes, most of them names and punctuation" },
    { title: "Protobuf: 15 bytes, a small tag instead of each name" },
    { title: "Avro: 12 bytes, no tags at all" },
  ],
  groups: [
    { id: "g-json", title: "JSON text: 69 bytes", tone: "orange", x: 20, y: 36, w: 840, h: 112 },
    { id: "g-proto", title: "Protobuf: 15 bytes, same scale", tone: "teal", x: 20, y: 168, w: 840, h: 84 },
    { id: "g-avro", title: "Avro: 12 bytes, same scale", tone: "violet", x: 20, y: 272, w: 840, h: 84 },
  ],
  shapes: [
    // Step 1: JSON. Each segment is as wide as its bytes; the comma before a name counts with that name.
    { id: "j-k1", type: "box", x: X, y: 72, w: 14 * B, h: 44, label: '{"scooter_id":', tone: "orange" },
    { id: "j-v1", type: "box", x: X + 14 * B, y: 72, w: 8 * B, h: 44, label: '"SC-208"', tone: "teal" },
    { id: "j-k2", type: "box", x: X + 22 * B, y: 72, w: 11 * B, h: 44, label: ',"battery":', tone: "orange" },
    { id: "j-v2", type: "box", x: X + 33 * B, y: 72, w: 2 * B, h: 44, label: "87", tone: "teal" },
    {
      id: "j-k3",
      type: "box",
      x: X + 35 * B,
      y: 72,
      w: 15 * B,
      h: 44,
      label: ',"odometer_km":',
      tone: "orange",
      highlight: true,
    },
    { id: "j-v3", type: "box", x: X + 50 * B, y: 72, w: 4 * B, h: 44, label: "1290", tone: "teal" },
    { id: "j-k4", type: "box", x: X + 54 * B, y: 72, w: 10 * B, h: 44, label: ',"locked":', tone: "orange" },
    { id: "j-v4", type: "box", x: X + 64 * B, y: 72, w: 4 * B, h: 44, label: "true", tone: "teal" },
    { id: "j-end", type: "box", x: X + 68 * B, y: 72, w: 1 * B, h: 44, tone: "orange" },
    {
      id: "j-note",
      type: "text",
      x: 40,
      y: 124,
      w: 760,
      h: 20,
      label: "Names, quotes, commas and braces: 51 bytes. Values: 18 bytes.",
      tone: "orange",
    },

    // Step 2: Protobuf at the same 11 px per byte: tag, length, string, then tag + varint per number.
    { id: "p-t1", type: "box", x: X, y: 200, w: B, h: 40, tone: "orange", step: 2 },
    { id: "p-l1", type: "box", x: X + 1 * B, y: 200, w: B, h: 40, tone: "orange", step: 2 },
    { id: "p-v1", type: "box", x: X + 2 * B, y: 200, w: 6 * B, h: 40, label: "SC-208", tone: "teal", step: 2 },
    { id: "p-t2", type: "box", x: X + 8 * B, y: 200, w: B, h: 40, tone: "orange", step: 2 },
    { id: "p-v2", type: "box", x: X + 9 * B, y: 200, w: B, h: 40, tone: "teal", step: 2 },
    { id: "p-t3", type: "box", x: X + 10 * B, y: 200, w: B, h: 40, tone: "orange", step: 2 },
    { id: "p-v3", type: "box", x: X + 11 * B, y: 200, w: 2 * B, h: 40, tone: "teal", step: 2 },
    { id: "p-t4", type: "box", x: X + 13 * B, y: 200, w: B, h: 40, tone: "orange", step: 2 },
    { id: "p-v4", type: "box", x: X + 14 * B, y: 200, w: B, h: 40, tone: "teal", step: 2 },
    {
      id: "p-note",
      type: "text",
      x: 230,
      y: 210,
      w: 610,
      h: 20,
      label: "4 tag bytes, 1 length byte, 10 bytes of values",
      tone: "teal",
      step: 2,
    },

    // Step 3: Avro at the same scale: a length, the string, then each number as a zigzag varint.
    { id: "a-l1", type: "box", x: X, y: 304, w: B, h: 40, tone: "orange", step: 3 },
    { id: "a-v1", type: "box", x: X + 1 * B, y: 304, w: 6 * B, h: 40, label: "SC-208", tone: "teal", step: 3 },
    { id: "a-v2", type: "box", x: X + 7 * B, y: 304, w: 2 * B, h: 40, tone: "teal", step: 3 },
    { id: "a-v3", type: "box", x: X + 9 * B, y: 304, w: 2 * B, h: 40, tone: "teal", step: 3 },
    { id: "a-v4", type: "box", x: X + 11 * B, y: 304, w: B, h: 40, tone: "teal", step: 3 },
    {
      id: "a-note",
      type: "text",
      x: 200,
      y: 314,
      w: 640,
      h: 20,
      label: "1 length byte, 11 bytes of values. The schema says which field comes next.",
      tone: "violet",
      step: 3,
    },
  ],
};

export default spec;
