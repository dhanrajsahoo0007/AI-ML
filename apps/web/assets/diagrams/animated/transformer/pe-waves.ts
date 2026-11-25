import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";

// Three dimensions of the sinusoidal positional encoding from "Attention Is All You Need" (Vaswani et al., 2017),
// drawn as waves over positions 0–7, with the value of each wave at every whole position in a small table below.
//
// Facts checked against arXiv 1706.03762 v7, §3.5:
// - PE(pos, 2i) = sin(pos / 10000^(2i/d_model)), PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model)), d_model = 512.
// - "each dimension of the positional encoding corresponds to a sinusoid. The wavelengths form a geometric
//   progression from 2π to 10000 · 2π."
//
// Which dimensions: the sine dimensions 2i = 0, 64 and 128 of d_model = 512 (i = 0, 32, 64). With 512 dimensions,
// most waves barely move over 8 positions (from 2i ≈ 192 on, a wave covers under a twentieth of a period), so these
// three are picked because their wavelengths read well across positions 0–7. Each step of 64 dimensions multiplies
// the wavelength by 10000^(64/512) = 10^0.5 ≈ 3.16.
//
// Working (divisor = 10000^(2i/512); wavelength = 2π · divisor, in positions):
//   2i = 0:   divisor 1,      wavelength 6.28  → 6.3
//   2i = 64:  divisor 3.1623, wavelength 19.87 → 19.9
//   2i = 128: divisor 10,     wavelength 62.83 → 62.8
// Values sin(pos / divisor) at pos 0…7 (computed below, rounded for display):
//   2i = 0:   0.00  0.84  0.91  0.14 −0.76 −0.96 −0.28  0.66
//   2i = 64:  0.00  0.31  0.59  0.81  0.95  1.00  0.95  0.80
//   2i = 128: 0.00  0.10  0.20  0.30  0.39  0.48  0.56  0.64
// Every column of the table differs from every other, so each position gets its own combination of values.
// Table shading: a value v in −1…1 is drawn at weight (v + 1) / 2.

const D_MODEL = 512;
const POSITIONS = 8;

const WAVES: { dim: number; tone: LayoutTone; speed: string }[] = [
  { dim: 0, tone: "orange", speed: "fast" },
  { dim: 64, tone: "green", speed: "medium" },
  { dim: 128, tone: "blue", speed: "slow" },
];

const divisor = (dim: number) => Math.pow(10000, dim / D_MODEL);
const pe = (pos: number, dim: number) => Math.sin(pos / divisor(dim));
const wavelength = (dim: number) => 2 * Math.PI * divisor(dim);

const round1 = (v: number) => Math.round(v * 10) / 10;
const fmt = (v: number) => (Math.abs(v) < 0.005 ? "0.00" : v.toFixed(2).replace("-", "−"));
const fmtDiv = (d: number) => (Number.isInteger(d) ? String(d) : d.toFixed(2));

// ── Layout ───────────────────────────────────────────────────────────────────────────────────────────────────

const X0 = 260; // x of position 0
const STEP = 76;
const px = (pos: number) => X0 + pos * STEP;
const ROW_Y = [66, 172, 278]; // zero line of each wave
const AMP = 34; // value 1 is drawn 34 px above the zero line
const AXIS_X = X0 - 24;
const POS_Y = 326; // position labels
const TABLE_Y = 358;
const TABLE_ROW = 22;
const CELL_W = 48;
const CELL_H = 20;

const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  h = 20,
  tone: LayoutTone = "neutral"
): LayoutShape => ({ id, type: "text", x, y, w, h, label, tone });

const line = (id: string, points: [number, number][], weight: number, dashed = false): LayoutShape => ({
  id,
  type: "path",
  x: 0,
  y: 0,
  points,
  tone: "neutral",
  weight,
  dashed,
});

const shapes: LayoutShape[] = [];

// Faint guides at each whole position, through all three waves: read a column top to bottom.
for (let p = 0; p < POSITIONS; p++)
  shapes.push(
    line(
      `guide-${p}`,
      [
        [px(p), ROW_Y[0] - AMP - 8],
        [px(p), ROW_Y[2] + AMP + 8],
      ],
      0.06
    )
  );

WAVES.forEach((wave, k) => {
  const cy = ROW_Y[k];
  const yOf = (v: number) => cy - AMP * v;
  const lambda = wavelength(wave.dim);

  // Axes: a zero line and a short vertical axis from −1 to +1.
  shapes.push(
    line(
      `zero-${k}`,
      [
        [AXIS_X, cy],
        [px(POSITIONS - 1) + 28, cy],
      ],
      0.25
    ),
    line(
      `axis-${k}`,
      [
        [AXIS_X, yOf(1)],
        [AXIS_X, yOf(-1)],
      ],
      0.25
    ),
    text(`tick-hi-${k}`, AXIS_X - 30, yOf(1) - 10, 24, "+1"),
    text(`tick-lo-${k}`, AXIS_X - 30, yOf(-1) - 10, 24, "−1")
  );

  // The wave, sampled every 0.05 positions.
  const samples = Math.round((POSITIONS - 1) / 0.05);
  shapes.push({
    id: `wave-${k}`,
    type: "path",
    x: 0,
    y: 0,
    points: Array.from({ length: samples + 1 }, (_, s) => {
      const pos = (s * (POSITIONS - 1)) / samples;
      return [round1(px(pos)), round1(yOf(pe(pos, wave.dim)))] as [number, number];
    }),
    smooth: true,
    tone: wave.tone,
    weight: 0.45,
  });

  // A dot at every whole position.
  for (let p = 0; p < POSITIONS; p++)
    shapes.push({
      id: `dot-${k}-${p}`,
      type: "circle",
      x: px(p),
      y: round1(yOf(pe(p, wave.dim))),
      w: 10,
      tone: wave.tone,
      fill: "pastel",
      quiet: true,
    });

  // Label on the left: which dimension, its formula and its wavelength.
  shapes.push(
    text(
      `label-${k}`,
      24,
      cy - 24,
      176,
      `Dimension ${wave.dim} (${wave.speed})\nsin(pos / ${fmtDiv(divisor(wave.dim))})\nwavelength ≈ ${lambda.toFixed(1)}`,
      48,
      wave.tone
    )
  );

  // Its row of the value table.
  const ty = TABLE_Y + k * TABLE_ROW;
  shapes.push(text(`trow-${k}`, 120, ty, 120, `dim ${wave.dim}`, CELL_H, wave.tone));
  for (let p = 0; p < POSITIONS; p++) {
    const v = pe(p, wave.dim);
    shapes.push({
      id: `val-${k}-${p}`,
      type: "cell",
      x: px(p) - CELL_W / 2,
      y: ty,
      w: CELL_W,
      h: CELL_H,
      tone: wave.tone,
      weight: Math.min(1, Math.max(0, (v + 1) / 2)),
      label: fmt(v),
      quiet: true,
    });
  }
});

// Position labels, shared by the waves above and the table below.
shapes.push(text("pos-title", 120, POS_Y, 120, "position"));
for (let p = 0; p < POSITIONS; p++) shapes.push(text(`pos-${p}`, px(p) - 20, POS_Y, 40, String(p)));

const NOTE_Y = TABLE_Y + 3 * TABLE_ROW + 18;
shapes.push(
  text(
    "note",
    20,
    NOTE_Y,
    820,
    "Read down a column: no two positions share the same three values, so each position gets its own code.\n" +
      "The fast wave tells neighbours apart; the slow one changes little and tells near from far.\n" +
      "Sine dimensions 2i = 0, 64 and 128 of d_model = 512, picked because their wavelengths read well over 8 positions.",
    50
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Sinusoidal positional encoding: three wavelengths",
  width: 860,
  height: NOTE_Y + 64,
  shapes,
};

export default spec;
