import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE, n } from "@/components/diagrams/presets/patterns";

// A 64-bit Snowflake id built one field at a time, with where each field comes from (unique-id-generation,
// Architecture stepper).
// Steps: 1 a sign bit of 0 and 41 bits of milliseconds since a custom epoch, read from the server's clock ·
// 2 10 bits of node id, claimed once at start-up · 3 12 bits of sequence, a counter that goes back to 0 each
// millisecond · 4 one Brightpost order id taken apart.
// Working (computed below):
//   2^41 ms = 2,199,023,255,552 ms ÷ 31,557,600,000 ms a year (365.25 days) = 69.7 years: epoch 2026, last id 2095.
//   2^10 = 1,024 node ids. 2^12 = 4,096 ids per millisecond per node = 4,096,000 a second.
//   Example (illustrative date): epoch 1 January 2026 00:00 UTC; a sale-day order at 27 November 2026 12:00:00.000
//   UTC is 330.5 days = 28,555,200,000 ms after it; node 17, sequence 3:
//   (28,555,200,000 << 22) | (17 << 12) | 3 = 119,769,189,580,869,635.
// Layout: the 64 bits as one bar, 11 px a bit (the sign bit drawn 24 px wide), sources above, capacities below.
// Colours (PATTERN_TONE): time pink (a clock counter), node id teal (the server), sequence green (the pattern's own
// counter, highlighted), the example blue (data), text and the sign bit neutral.
// Fact check (2026-11-16, Snowflake README and IdWorker.scala at the snowflake-2010 tag): "time - 41 bits
// (millisecond precision w/ a custom epoch gives us 69 years)", "configured machine id - 10 bits", "sequence number -
// 12 bits - rolls over every 4096 per machine"; the server claims its worker id in ZooKeeper at start-up.

const BIT = 11;
const X0 = 70;
const SIGN_W = 24;
const BAR_Y = 124;
const BAR_H = 44;
const TIME_BITS = 41;
const NODE_BITS = 10;
const SEQ_BITS = 12;

const YEAR_MS = 365.25 * 86_400_000;
const years = 2 ** TIME_BITS / YEAR_MS; // 69.7
const EPOCH_YEAR = 2026;
const nodes = 2 ** NODE_BITS; // 1,024
const perMs = 2 ** SEQ_BITS; // 4,096

const epoch = Date.UTC(EPOCH_YEAR, 0, 1);
const orderAt = Date.UTC(EPOCH_YEAR, 10, 27, 12, 0, 0, 0);
const t = orderAt - epoch; // 28,555,200,000 ms
const NODE = 17;
const SEQ = 3;
const id = (BigInt(t) << BigInt(NODE_BITS + SEQ_BITS)) | (BigInt(NODE) << BigInt(SEQ_BITS)) | BigInt(SEQ);
const idText = id.toLocaleString("en-GB"); // 119,769,189,580,869,635

const signX = X0;
const timeX = signX + SIGN_W;
const timeW = TIME_BITS * BIT;
const nodeX = timeX + timeW;
const nodeW = NODE_BITS * BIT;
const seqX = nodeX + nodeW;
const seqW = SEQ_BITS * BIT;
const barEnd = seqX + seqW;

const shapes: LayoutShape[] = [];

// Step 1: sign bit and time.
shapes.push(
  {
    id: "src-clock",
    type: "box",
    x: timeX + timeW / 2 - 90,
    y: 24,
    w: 180,
    h: 48,
    label: "Server clock",
    sub: `ms since 1 Jan ${EPOCH_YEAR}`,
    tone: PATTERN_TONE.id,
  },
  {
    id: "f-sign",
    type: "box",
    x: signX,
    y: BAR_Y,
    w: SIGN_W,
    h: BAR_H,
    label: "0",
    tone: PATTERN_TONE.infra,
    fill: "pastel",
  },
  {
    id: "f-time",
    type: "box",
    x: timeX,
    y: BAR_Y,
    w: timeW,
    h: BAR_H,
    label: `Timestamp: ${TIME_BITS} bits`,
    tone: PATTERN_TONE.id,
    fill: "pastel",
  },
  { id: "a-clock", type: "arrow", x: 0, y: 0, from: "src-clock", to: "f-time" },
  {
    id: "b-sign",
    type: "text",
    x: signX - 8,
    y: BAR_Y + BAR_H + 6,
    w: SIGN_W + 16,
    h: 16,
    label: "63",
    tone: PATTERN_TONE.infra,
  },
  {
    id: "b-time",
    type: "text",
    x: timeX,
    y: BAR_Y + BAR_H + 6,
    w: timeW,
    h: 16,
    label: "bits 62 to 22",
    tone: PATTERN_TONE.infra,
  },
  {
    id: "c-time",
    type: "text",
    x: timeX,
    y: BAR_Y + BAR_H + 28,
    w: timeW,
    h: 36,
    label: `2⁴¹ ms ≈ ${years.toFixed(1)} years\nfrom ${EPOCH_YEAR} to ${Math.floor(EPOCH_YEAR + years)}`,
    tone: PATTERN_TONE.id,
  }
);

// Step 2: node id.
shapes.push(
  {
    id: "src-node",
    type: "box",
    x: nodeX - 70,
    y: 24,
    w: 140,
    h: 48,
    label: "Node id",
    sub: "claimed at start-up",
    tone: PATTERN_TONE.compute,
    step: 2,
  },
  {
    id: "f-node",
    type: "box",
    x: nodeX,
    y: BAR_Y,
    w: nodeW,
    h: BAR_H,
    label: `Node: ${NODE_BITS}`,
    tone: PATTERN_TONE.compute,
    fill: "pastel",
    step: 2,
  },
  { id: "a-node", type: "arrow", x: 0, y: 0, from: "src-node", to: "f-node", step: 2 },
  {
    id: "b-node",
    type: "text",
    x: nodeX,
    y: BAR_Y + BAR_H + 6,
    w: nodeW,
    h: 16,
    label: "21 to 12",
    tone: PATTERN_TONE.infra,
    step: 2,
  },
  {
    id: "c-node",
    type: "text",
    x: nodeX,
    y: BAR_Y + BAR_H + 28,
    w: nodeW,
    h: 36,
    label: `2¹⁰ =\n${n(nodes)} nodes`,
    tone: PATTERN_TONE.compute,
    step: 2,
  }
);

// Step 3: sequence.
shapes.push(
  {
    id: "src-seq",
    type: "box",
    x: seqX + seqW / 2 - 66,
    y: 24,
    w: 140,
    h: 48,
    label: "Counter",
    sub: "back to 0 each ms",
    tone: PATTERN_TONE.pattern,
    step: 3,
  },
  {
    id: "f-seq",
    type: "box",
    x: seqX,
    y: BAR_Y,
    w: seqW,
    h: BAR_H,
    label: `Sequence: ${SEQ_BITS}`,
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    highlight: true,
    step: 3,
  },
  { id: "a-seq", type: "arrow", x: 0, y: 0, from: "src-seq", to: "f-seq", step: 3 },
  {
    id: "b-seq",
    type: "text",
    x: seqX,
    y: BAR_Y + BAR_H + 6,
    w: seqW,
    h: 16,
    label: "11 to 0",
    tone: PATTERN_TONE.infra,
    step: 3,
  },
  {
    id: "c-seq",
    type: "text",
    x: seqX,
    y: BAR_Y + BAR_H + 28,
    w: seqW,
    h: 36,
    label: `2¹² = ${n(perMs)}\nids per ms`,
    tone: PATTERN_TONE.pattern,
    step: 3,
  }
);

// Step 4: one order id taken apart.
const EX_Y = 256;
shapes.push(
  {
    id: "e-time",
    type: "box",
    x: timeX + timeW / 2 - 130,
    y: EX_Y,
    w: 260,
    h: 48,
    label: n(t),
    sub: "27 Nov 12:00 UTC (illustrative)",
    tone: PATTERN_TONE.data,
    fill: "pastel",
    step: 4,
  },
  {
    id: "e-node",
    type: "box",
    x: nodeX + 5,
    y: EX_Y,
    w: nodeW - 10,
    h: 48,
    label: String(NODE),
    sub: "app server",
    tone: PATTERN_TONE.data,
    fill: "pastel",
    step: 4,
  },
  {
    id: "e-seq",
    type: "box",
    x: seqX + 5,
    y: EX_Y,
    w: seqW - 10,
    h: 48,
    label: String(SEQ),
    sub: "4th id that ms",
    tone: PATTERN_TONE.data,
    fill: "pastel",
    step: 4,
  },
  {
    id: "e-sum",
    type: "text",
    x: X0,
    y: EX_Y + 62,
    w: barEnd - X0,
    h: 18,
    label: `(${n(t)} << 22) | (${NODE} << 12) | ${SEQ} = ${idText}`,
    tone: PATTERN_TONE.data,
    step: 4,
  }
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "A 64-bit Snowflake id: 41 bits of time, 10 of node id, 12 of sequence",
  width: barEnd + 60,
  height: EX_Y + 100,
  shapes,
  steps: [
    { title: "41 bits of time" },
    { title: "10 bits of node id" },
    { title: "12 bits of sequence" },
    { title: "One order id taken apart" },
  ],
};

export default spec;
