import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";

// The flagship picture of cloud/resilience/encryption-and-keys: the same piece of data (one Brightpost order) in the
// three states it can be in, the control that protects each state, and who holds the key for that control.
//
// Step 1 draws three columns, one per state: at rest (on a disk or in a bucket), in transit (on the wire) and in use
// (in memory while the processor works on it). Under each heading sits the same parcel, "Order 4127", in plain form.
// Step 2 adds, per column, the control (encryption at rest, TLS, confidential computing), what an outsider sees once
// that control is on, and what the control stops. Step 3 adds the bottom row: who holds the key for each control.
//
// Geometry: three groups of 250 at x 10, 270 and 530, y 34 to 394. Each column's boxes start 10 units in (x 20, 280,
// 540) and are 230 wide. Rows: heading 56 (48 tall), parcel 114 (44), control 176 (48), what an outsider sees 236
// (40), what it stops 288 (40), who holds the key 342 (44). The outsider row is a picture: five scrambled byte cells
// at rest, a phone and the balancer joined by a TLS arrow in transit, the processor beside scrambled memory in use.
// Box labels fit width - 8 at 6.2 px per character: "Stops the host reading memory" (29) needs 180 of 222.

const COLS = [
  { key: "rest", x: 20 },
  { key: "transit", x: 280 },
  { key: "use", x: 540 },
] as const;

const HEADINGS: Record<string, [string, string]> = {
  rest: ["On a disk or in a bucket", "orders, exports, backups"],
  transit: ["On the wire", "phone to balancer to server"],
  use: ["In memory, in the processor", "while the app works on it"],
};

const CONTROLS: Record<string, [string, string]> = {
  rest: ["Encryption at rest", "the store encrypts every block"],
  transit: ["TLS", "a sealed tunnel for each connection"],
  use: ["Confidential computing", "the chip encrypts memory"],
};

const STOPS: Record<string, string> = {
  rest: "Stops a stolen disk or copy",
  transit: "Stops a listener on the wire",
  use: "Stops the host reading memory",
};

const KEYS: Record<string, [string, string]> = {
  rest: ["Key: in the key service", "the provider's or yours"],
  transit: ["Key: made per connection", "gone when the connection closes"],
  use: ["Key: inside the processor", "nobody can export it"],
};

const perColumn = COLS.flatMap(({ key, x }): LayoutShape[] => [
  {
    id: `${key}-head`,
    type: "box",
    x,
    y: 56,
    w: 230,
    h: 48,
    label: HEADINGS[key][0],
    sub: HEADINGS[key][1],
    tone: key === "rest" ? "violet" : key === "transit" ? "blue" : "teal",
  },
  {
    id: `${key}-parcel`,
    type: "box",
    x: x + 35,
    y: 114,
    w: 160,
    h: 44,
    label: "Order 4127",
    sub: "name, home address",
    tone: "neutral",
  },
  {
    id: `${key}-control`,
    type: "box",
    x,
    y: 176,
    w: 230,
    h: 48,
    label: CONTROLS[key][0],
    sub: CONTROLS[key][1],
    tone: "green",
    step: 2,
  },
  { id: `${key}-stops`, type: "box", x, y: 288, w: 230, h: 40, label: STOPS[key], tone: "neutral", step: 2 },
  {
    id: `${key}-key`,
    type: "box",
    x,
    y: 342,
    w: 230,
    h: 44,
    label: KEYS[key][0],
    sub: KEYS[key][1],
    tone: "orange",
    step: 3,
  },
]);

// What an outsider sees once the control is on (step 2).
const BYTES = ["9f", "c2", "7a", "e0", "41"];
const outsider: LayoutShape[] = [
  // At rest: five scrambled bytes on the disk.
  ...BYTES.map((b, i): LayoutShape => ({
    id: `rest-byte${i + 1}`,
    type: "cell",
    x: 30 + i * 44,
    y: 236,
    w: 40,
    h: 40,
    label: b,
    tone: "violet",
    step: 2,
  })),
  // In transit: the phone and the balancer, joined by a sealed tunnel.
  { id: "transit-phone", type: "box", x: 280, y: 236, w: 70, h: 40, label: "Phone", tone: "neutral", step: 2 },
  { id: "transit-lb", type: "box", x: 420, y: 236, w: 90, h: 40, label: "Balancer", tone: "blue", step: 2 },
  {
    id: "transit-tunnel",
    type: "arrow",
    x: 0,
    y: 0,
    from: "transit-phone",
    to: "transit-lb",
    label: "TLS",
    tone: "blue",
    packet: true,
    step: 2,
  },
  // In use: the processor works on plain data; memory, seen from outside the chip, is scrambled.
  { id: "use-cpu", type: "box", x: 540, y: 236, w: 70, h: 40, label: "CPU", tone: "teal", step: 2 },
  {
    id: "use-memory",
    type: "box",
    x: 620,
    y: 236,
    w: 150,
    h: 40,
    label: "Memory: 9f c2 7a",
    tone: "teal",
    step: 2,
  },
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Data at rest, in transit and in use",
  width: 790,
  height: 404,
  groups: [
    { id: "rest", title: "At rest", tone: "violet", x: 10, y: 34, w: 250, h: 360 },
    { id: "transit", title: "In transit", tone: "blue", x: 270, y: 34, w: 250, h: 360 },
    { id: "use", title: "In use", tone: "teal", x: 530, y: 34, w: 250, h: 360 },
  ],
  shapes: [...perColumn, ...outsider],
  steps: [
    { title: "The same order in three places" },
    { title: "A control for each place" },
    { title: "Who holds each key" },
  ],
};

export default spec;
