import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { PATTERN_TONE } from "@/components/diagrams/presets/patterns";

// The cost of a point (metrics-and-logging, Deep dive 1): five points of one series, raw and then compressed with
// delta-of-delta timestamps and XOR-ed values (the scheme the Gorilla paper describes).
// Steps: 1 raw: a 64-bit timestamp and a 64-bit float per point, 16 bytes · 2 timestamps: the first point is stored
// whole, the second stores its 10 s delta in 14 bits, then each point stores the change in the delta: 0 is one bit,
// +1 (a point 1 s late) is a 2-bit prefix and 7 bits · 3 values: XOR with the previous value; equal values are one
// bit; 12.0 to 12.5 flips one bit, stored as 2 control bits, 5 bits of leading zeros, 6 bits of length and the 1
// meaningful bit = 14 bits.
// Working: raw 5 × 16 B = 80 B. Compressed: first point 64 + 64 = 128 bits; timestamps of points 2 to 5:
// 14 + 1 + 1 + 9 = 25 bits; values of points 2 to 5: 1 + 1 + 14 + 1 = 17 bits; total 128 + 25 + 17 = 170 bits
// ≈ 21 bytes. Points 2 to 5: 42 bits ÷ 4 = 10.5 bits ≈ 1.3 bytes a point; over a 2-hour block of 720 points at 10 s
// the first point's 16 bytes add 16 ÷ 720 ≈ 0.02 bytes a point.
// XOR check: 12.0 = 0x4028000000000000, 12.5 = 0x4029000000000000, XOR = 0x0001000000000000: 15 leading zeros,
// 1 meaningful bit, 48 trailing zeros.
// Layout: a row-label column (x 20, 150 wide), five 100-wide cells 12 apart from x 190; rows at y 60 (raw
// timestamps), 120 (raw values), 190 (delta of delta), 250 (XOR); totals at y 318 and 342. Colours (PATTERN_TONE):
// raw neutral (infra), timestamps blue (data), values green (the compression this figure is about).
// Fact check (2026-11-17, Gorilla, VLDB 2015): delta-of-delta 0 → '0'; [-63, 64] → '10' + 7 bits; XOR 0 → '0';
// otherwise '1', a control bit, 5 bits of leading zeros, 6 bits of length, the meaningful bits.

const X0 = 190;
const CW = 100;
const GAP = 12;
const cx = (i: number) => X0 + i * (CW + GAP);
const times = ["10:00:00", "10:00:10", "10:00:20", "10:00:30", "10:00:41"];
const values = ["12.0", "12.0", "12.0", "12.5", "12.5"];
const dod = [
  { label: "stored whole", sub: "64 bits" },
  { label: "Δ = 10 s", sub: "14 bits" },
  { label: "0", sub: "1 bit" },
  { label: "0", sub: "1 bit" },
  { label: "+1", sub: "9 bits" },
];
const xor = [
  { label: "stored whole", sub: "64 bits" },
  { label: "same", sub: "1 bit" },
  { label: "same", sub: "1 bit" },
  { label: "1 bit differs", sub: "14 bits" },
  { label: "same", sub: "1 bit" },
];

const shapes: LayoutShape[] = [];
const rowLabel = (id: string, y: number, label: string, step: number) =>
  shapes.push({ id, type: "text", x: 20, y: y + 14, w: 150, h: 20, label, tone: PATTERN_TONE.infra, step });

rowLabel("l-ts", 60, "Timestamp (raw)", 1);
rowLabel("l-val", 120, "Value (raw)", 1);
rowLabel("l-dod", 190, "Delta of delta", 2);
rowLabel("l-xor", 250, "XOR with previous", 3);

times.forEach((t, i) =>
  shapes.push({
    id: `ts${i}`,
    type: "cell",
    x: cx(i),
    y: 60,
    w: CW,
    h: 48,
    label: t,
    sub: "8 bytes",
    tone: PATTERN_TONE.infra,
    quiet: i > 0,
  })
);
values.forEach((v, i) =>
  shapes.push({
    id: `v${i}`,
    type: "cell",
    x: cx(i),
    y: 120,
    w: CW,
    h: 48,
    label: v,
    sub: "8 bytes",
    tone: PATTERN_TONE.infra,
    quiet: i > 0,
  })
);
dod.forEach((d, i) =>
  shapes.push({
    id: `d${i}`,
    type: "cell",
    x: cx(i),
    y: 190,
    w: CW,
    h: 48,
    label: d.label,
    sub: d.sub,
    tone: PATTERN_TONE.data,
    step: 2,
    quiet: i > 0,
  })
);
xor.forEach((d, i) =>
  shapes.push({
    id: `x${i}`,
    type: "cell",
    x: cx(i),
    y: 250,
    w: CW,
    h: 48,
    label: d.label,
    sub: d.sub,
    tone: PATTERN_TONE.pattern,
    fill: "pastel",
    step: 3,
    quiet: i !== 3,
    highlight: i === 3,
  })
);
shapes.push({
  id: "raw-total",
  type: "text",
  x: X0,
  y: 312,
  w: 5 * CW + 4 * GAP,
  h: 20,
  label: "Raw: 5 points × 16 bytes = 80 bytes",
  tone: PATTERN_TONE.infra,
});
shapes.push({
  id: "packed-total",
  type: "text",
  x: X0,
  y: 336,
  w: 5 * CW + 4 * GAP,
  h: 20,
  label: "Packed: 128 + 25 + 17 = 170 bits ≈ 21 bytes; points 2 to 5 take 1.3 bytes each",
  tone: PATTERN_TONE.pattern,
  step: 3,
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "The cost of a point: delta of delta and XOR",
  width: cx(4) + CW + 20,
  height: 370,
  shapes,
  steps: [
    { title: "Raw: 16 bytes a point" },
    { title: "Timestamps: delta of delta" },
    { title: "Values: XOR with the previous" },
  ],
};

export default spec;
