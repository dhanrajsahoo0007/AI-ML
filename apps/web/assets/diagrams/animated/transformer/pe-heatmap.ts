import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { matrix } from "@/components/diagrams/presets/transformer";

// The sinusoidal positional encoding of "Attention Is All You Need" (Vaswani et al., 2017) as a heatmap: 16
// positions (rows) × 16 of the 512 dimensions (columns), every value computed with the paper's formula.
//
// Facts checked against arXiv 1706.03762 v7, §3.5:
// - PE(pos, 2i) = sin(pos / 10000^(2i/d_model)), PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model)), d_model = 512.
// - "The wavelengths form a geometric progression from 2π to 10000 · 2π."
//
// Which columns: 8 dimension pairs (2i, 2i + 1) spread evenly over all 512 dimensions, 2i = 0, 64, 128, …, 448, so
// the columns are dimensions 0, 1, 64, 65, 128, 129, …, 448, 449. Each step of 64 multiplies the wavelength by
// 10000^(64/512) = 10^0.5 ≈ 3.16, so the pairs sample the geometric progression evenly.
//
// Working: divisor = 10000^(2i/512) = 10^(2i/128); wavelength = 2π · divisor positions.
//   2i:          0     64     128    192    256     320      384      448
//   divisor:     1     3.162  10     31.62  100     316.2    1000     3162
//   wavelength:  6.3   19.9   62.8   199    628     1,987    6,283    19,869
// Spot values (rounded): pos 1, dims 0/1 = sin 1 / cos 1 = 0.84 / 0.54; pos 15, dims 0/1 = 0.65 / −0.76;
// pos 15, dims 64/65 = sin(4.74) / cos(4.74) = −1.00 / 0.03; pos 15, dims 448/449 = 0.005 / 1.00.
// At pos 0 every sine is 0 and every cosine is 1. Over 16 positions the pairs from 2i = 256 on hardly change.
//
// Shading: one tone, cell weight = (value + 1) / 2, so −1 is paper, 0 is a mid shade and +1 is full blue.
// Shape count: 256 cells + 16 row labels + 8 column labels + 1 column-title + 1 caption + 4 legend + 1 note = 287.

const D_MODEL = 512;
const POSITIONS = 16;
const PAIRS = [0, 64, 128, 192, 256, 320, 384, 448]; // 2i for each sine/cosine pair
const DIMS = PAIRS.flatMap((d) => [d, d + 1]);

const divisor = (twoI: number) => Math.pow(10000, twoI / D_MODEL);
const pe = (pos: number, dim: number) => {
  const angle = pos / divisor(dim - (dim % 2));
  return dim % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
};
const wavelength = (twoI: number) => 2 * Math.PI * divisor(twoI);
const fmtLambda = (v: number) => (v < 100 ? v.toFixed(1) : Math.round(v).toLocaleString("en-US"));

const TONE = "blue";
const CELL = 30;
const PAIR_W = 2 * CELL;
const MX = 150;
const MY = 104;
const SIDE = POSITIONS * CELL;

const values = Array.from({ length: POSITIONS }, (_, pos) =>
  DIMS.map((dim) => Math.min(1, Math.max(0, (pe(pos, dim) + 1) / 2)))
);

const text = (id: string, x: number, y: number, w: number, label: string, h = 20): LayoutShape => ({
  id,
  type: "text",
  x,
  y,
  w,
  h,
  label,
  tone: "neutral",
});

const shapes: LayoutShape[] = [
  text("caption", MX, 26, SIDE, "fast  ←  dimension  →  slow"),
  // One label per sine/cosine pair: its two dimensions and its wavelength.
  text("col-title", MX - 84, MY - 42, 80, "dims\nwavelength", 36),
  ...PAIRS.map((twoI, j) =>
    text(`pair-${j}`, MX + j * PAIR_W, MY - 42, PAIR_W, `${twoI}, ${twoI + 1}\n${fmtLambda(wavelength(twoI))}`, 36)
  ),
  ...matrix("pe", MX, MY, values, TONE, {
    cell: CELL,
    rowLabels: Array.from({ length: POSITIONS }, (_, p) => `pos ${p}`),
  }),
];

// Legend on the right: +1 dark, 0 mid, −1 paper.
const LX = MX + SIDE + 40;
shapes.push(text("legend-title", LX - 15, MY - 26, 60, "value"));
[
  { label: "+1", v: 1 },
  { label: "0", v: 0 },
  { label: "−1", v: -1 },
].forEach(({ label, v }, k) =>
  shapes.push({
    id: `legend-${k}`,
    type: "cell",
    x: LX,
    y: MY + k * CELL,
    w: CELL,
    h: CELL,
    tone: TONE,
    weight: (v + 1) / 2,
    label,
    quiet: true,
  })
);

const NOTE_Y = MY + SIDE + 18;
shapes.push({
  ...text(
    "note",
    20,
    NOTE_Y,
    700,
    "Rows: positions 0–15. Columns: the sine (even) and cosine (odd) dimension of pairs 2i = 0, 64, …, 448\n" +
      "of d_model = 512; each pair's wavelength is about 3.16 times the one before.\n" +
      "Left columns change from row to row; the right ones barely move over 16 positions.",
    50
  ),
});

const spec: LayoutSpec = {
  kind: "layout",
  title: "Sinusoidal positional encoding: 16 positions × 16 dimensions",
  width: 740,
  height: NOTE_Y + 64,
  shapes,
};

export default spec;
