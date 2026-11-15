import type { LayoutShape, LayoutSpec } from "@/components/diagrams/types";
import { ROLE_TONE, vector } from "@/components/diagrams/presets/transformer";

// How "I love tea" becomes the input to the first encoder layer, as in "Attention Is All You Need" (Vaswani et al.,
// 2017): token → token id → a row of the embedding table → × √d_model → + positional encoding = block input.
// Every vector is 512 wide; the first 8 values are drawn.
//
// Facts checked against arXiv 1706.03762 v7:
// - §3.4: learned embeddings turn tokens into vectors of dimension d_model = 512, and "in the embedding layers, we
//   multiply those weights by √d_model". √512 = 22.627…, drawn as 22.6.
// - §3.5: the positional encodings have the same dimension d_model and are summed with the embeddings;
//   PE(pos, 2i) = sin(pos / 10000^(2i/d_model)), PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model)).
// - §5.1: the English–German vocabulary is a shared byte-pair encoding of about 37,000 tokens.
//
// Illustrative, not from a trained model: the token ids and the embedding values. The embedding values are kept in
// ±0.04 (the scale of a typical initialisation, about 1/√512 ≈ 0.044), so × 22.6 brings them to about ±0.9, the same
// range as the positional values.
//
// Positional values, computed below with the paper's formula (first 8 of 512 dimensions, i = 0…3):
//   dims 2i, 2i+1 use the angle pos / 10000^(2i/512); the divisors are 1, 1.0366, 1.0746, 1.1140
//   pos 0: 0.000 1.000 0.000 1.000 0.000 1.000 0.000 1.000
//   pos 1: 0.841 0.540 0.822 0.570 0.802 0.597 0.782 0.623
//   pos 2: 0.909 −0.416 0.936 −0.351 0.958 −0.286 0.975 −0.223
// Shading: a value v in −1…1 is drawn at weight (v + 1) / 2 (0 = paper, 1 = full tone), for the scaled embedding
// and the positional vector. The block input is a sum of two such terms, in −2…2, so it is drawn
// at (v + 2) / 4.

const D_MODEL = 512;
const SCALE = Math.sqrt(D_MODEL); // 22.627
const SHOWN = 8;
const CELL = 14;
const VEC_W = SHOWN * CELL;

const TOKENS = [
  { word: "I", id: 87 },
  { word: "love", id: 2104 },
  { word: "tea", id: 9311 },
];

/** Illustrative embedding rows (first 8 of 512 values) for the three tokens. */
const EMB = [
  [0.031, -0.012, 0.024, 0.008, -0.035, 0.017, -0.006, 0.027],
  [-0.022, 0.036, -0.03, 0.014, 0.025, -0.018, 0.033, -0.009],
  [0.012, 0.028, -0.039, -0.024, 0.006, 0.034, -0.015, 0.02],
];

const pe = (pos: number, dim: number) => {
  const angle = pos / Math.pow(10000, (2 * Math.floor(dim / 2)) / D_MODEL);
  return dim % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const unit = (v: number) => clamp01((v + 1) / 2);

// ── Layout ───────────────────────────────────────────────────────────────────────────────────────────────────

const ROW_Y = [152, 222, 292]; // centre line of each token's row
const TOK_X = 20;
const ID_X = 92;
const ID_W = 60;
const TABLE_X = 196;
const TIMES_X = 352;
const SCALED_X = 384;
const PLUS_X = 522;
const PE_X = 546;
const EQ_X = 684;
const OUT_X = 708;

// The table: 17 rows of 14 px; rows 3, 8 and 13 are the looked-up ones, so each lines up with its token's row.
const TABLE_TOP = ROW_Y[0] - CELL / 2 - 3 * CELL;
const TABLE_ROWS = 17;
const LOOKED_UP = [3, 8, 13];

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

const shapes: LayoutShape[] = [];

// Column headings.
shapes.push(
  text("h-token", TOK_X - 6, 88, 72, "Token", 20),
  text("h-id", ID_X - 6, 88, ID_W + 12, "Token id", 20),
  text("h-scaled", SCALED_X - 10, 80, VEC_W + 20, "Embedding\n× √512 ≈ 22.6", 36),
  text("h-pe", PE_X - 10, 80, VEC_W + 20, "Positional\nencoding", 36),
  text("h-out", OUT_X - 10, 80, VEC_W + 20, "Block input\n(to layer 1)", 36)
);

// The embedding table: plain rows, with the three looked-up rows drawn as shaded cells.
for (let r = 0; r < TABLE_ROWS; r++) {
  const y = TABLE_TOP + r * CELL;
  const hit = LOOKED_UP.indexOf(r);
  if (hit >= 0) {
    // Raw values are tiny (±0.04): on the −1…1 shading scale they would all sit at 0.5, so the row is drawn as plain
    // pastel cells that stand out from the rest of the table.
    shapes.push(...vector(`emb-row-${hit}`, TABLE_X, y, SHOWN, ROLE_TONE.embedding));
  } else {
    shapes.push({
      id: `table-${r}`,
      type: "cell",
      x: TABLE_X,
      y,
      w: VEC_W,
      h: CELL,
      tone: ROLE_TONE.embedding,
      fill: "paper",
    });
  }
}
shapes.push(
  text("table-note", TABLE_X - 16, TABLE_TOP + TABLE_ROWS * CELL + 8, VEC_W + 32, "37,000 rows\n× 512 values", 34)
);

TOKENS.forEach((t, k) => {
  const cy = ROW_Y[k];
  const top = cy - CELL / 2;
  const scaled = EMB[k].map((v) => v * SCALE);
  const pos = Array.from({ length: SHOWN }, (_, d) => pe(k, d));
  const sum = scaled.map((v, d) => v + pos[d]);
  shapes.push(
    text(`tok-${k}`, TOK_X, cy - 17, 60, `"${t.word}"\npos ${k}`, 34),
    {
      id: `id-${k}`,
      type: "box",
      x: ID_X,
      y: cy - 14,
      w: ID_W,
      h: 28,
      label: String(t.id),
      tone: "neutral",
    },
    { id: `tok-${k}>id`, type: "arrow", x: 0, y: 0, from: `tok-${k}`, to: `id-${k}` },
    // The id selects a row: arrow into the left edge of that row.
    { id: `id-${k}>row`, type: "arrow", x: ID_X + ID_W, y: cy, w: TABLE_X - ID_X - ID_W, h: 0 },
    {
      id: `times-${k}`,
      type: "circle",
      x: TIMES_X,
      y: cy,
      w: 22,
      symbol: "times",
      label: "times the square root of 512",
      tone: "neutral",
    },
    { id: `row-${k}>times`, type: "arrow", x: 0, y: 0, from: `emb-row-${k}-${SHOWN - 1}`, to: `times-${k}` },
    {
      id: `times-${k}>scaled`,
      type: "arrow",
      x: 0,
      y: 0,
      from: `times-${k}`,
      to: `scaled-${k}-0`,
    },
    ...vector(`scaled-${k}`, SCALED_X, top, SHOWN, ROLE_TONE.embedding, { values: scaled.map(unit) }),
    { id: `plus-${k}`, type: "circle", x: PLUS_X, y: cy, w: 22, symbol: "plus", label: "plus", tone: "neutral" },
    ...vector(`pe-${k}`, PE_X, top, SHOWN, ROLE_TONE.position, { values: pos.map(unit) }),
    { id: `eq-${k}`, type: "circle", x: EQ_X, y: cy, w: 22, label: "=", tone: "neutral", fill: "paper" },
    ...vector(`out-${k}`, OUT_X, top, SHOWN, "neutral", { values: sum.map((v) => clamp01((v + 2) / 4)) })
  );
});

// The sine circle marks the positional encoding, as in Figure 1 of the paper.
shapes.push({
  id: "pe-sine",
  type: "circle",
  x: PE_X - 24,
  y: 98,
  w: 26,
  symbol: "sine",
  label: "Positional encoding",
  tone: ROLE_TONE.position,
});

shapes.push(
  text(
    "note",
    20,
    406,
    820,
    "8 of 512 values shown in every vector. Token ids and embedding values are illustrative; the positional values come\nfrom the paper's formula, PE(pos, 2i) = sin(pos / 10000^(2i/512)) and PE(pos, 2i+1) = cos(pos / 10000^(2i/512)).",
    36
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "Token to block input: embedding, scale, add position",
  width: 860,
  height: 456,
  groups: [
    {
      id: "g-table",
      title: "Embedding table",
      tone: ROLE_TONE.embedding,
      x: TABLE_X - 22,
      y: 50,
      w: VEC_W + 44,
      h: 344,
    },
  ],
  shapes,
};

export default spec;
