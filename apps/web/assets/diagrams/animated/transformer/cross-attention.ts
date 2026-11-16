import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { ROLE_TONE, miniMap, vector } from "@/components/diagrams/presets/transformer";

// Cross-attention (encoder-decoder attention) on the worked example "I love tea" → "Ich liebe Tee". Two decoder
// positions, "Ich" and "liebe", send queries (blue, from the decoder's own previous sub-layer); the encoder output for
// "I", "love" and "tea" supplies keys (teal) and values (violet). The 2 × 3 weight matrix (green) says how much each
// query reads from each source token, and each output (orange) is the weighted sum of the values. A locator on the
// left rings the decoder's cross-attention block in Figure 1.
//
// Facts, checked against the paper (arXiv 1706.03762 v7):
// - §3.2.3: in "encoder-decoder attention" layers the queries come from the previous decoder layer, and the memory
//   keys and values come from the output of the encoder, so every decoder position can attend over all input
//   positions. No causal mask here: the whole source sentence is known.
// - §3.1, Figure 1: the output of the last encoder layer feeds the cross-attention of every one of the 6 decoder
//   layers.
// - §3.2.1: weights = softmax(Q Kᵀ / √d_k), one softmax per query row, so each row sums to 1.
//
// Working (the scaled scores Q·K / √d_k are made up for the example; the vectors stand for 64-dimensional ones and
// show 4 illustrative dimensions):
//   "Ich":   scores [2.0, 0.3, 0.1] → exp [7.389, 1.350, 1.105], Σ 9.844  → weights [0.751, 0.137, 0.112] → 0.75 0.14 0.11
//   "liebe": scores [0.2, 2.2, 0.6] → exp [1.221, 9.025, 1.822], Σ 12.069 → weights [0.101, 0.748, 0.151] → 0.10 0.75 0.15
//   Values: V(I) = [0.9, 0.2, 0.6, 0.1], V(love) = [0.1, 0.8, 0.3, 0.7], V(tea) = [0.5, 0.4, 0.9, 0.3]
//   out(Ich)   = 0.751·V(I) + 0.137·V(love) + 0.112·V(tea) = [0.745, 0.305, 0.593, 0.205]
//   out(liebe) = 0.101·V(I) + 0.748·V(love) + 0.151·V(tea) = [0.241, 0.679, 0.421, 0.579]
// So "Ich" reads mostly from "I" and "liebe" mostly from "love", and each output looks most like that value.

const SOURCE = ["I", "love", "tea"];
const TARGET = ["Ich", "liebe"];
const SCORES = [
  [2.0, 0.3, 0.1],
  [0.2, 2.2, 0.6],
];
const VALUES = [
  [0.9, 0.2, 0.6, 0.1],
  [0.1, 0.8, 0.3, 0.7],
  [0.5, 0.4, 0.9, 0.3],
];

const softmax = (row: number[]) => {
  const e = row.map(Math.exp);
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
};
const WEIGHTS = SCORES.map(softmax);
const OUTPUTS = WEIGHTS.map((w) => VALUES[0].map((_, d) => w.reduce((acc, wj, j) => acc + wj * VALUES[j][d], 0)));
const round2 = (v: number) => Math.round(v * 100) / 100;

// Geometry: the weight matrix sits in the middle; keys and values stand above its columns, queries left of its rows,
// outputs right of its rows.
const CELL = 56;
const MX = 480;
const MY = 250;
const colX = (c: number) => MX + c * CELL + CELL / 2;
const rowY = (r: number) => MY + r * CELL + CELL / 2;
const V_CELL = 14;
const V_LEN = 4 * V_CELL;
const KV_Y = 104;
const Q_X = 290;
const OUT_X = 770;

const text = (id: string, x: number, y: number, w: number, label: string, tone: LayoutTone = "neutral", h = 20) =>
  ({ id, type: "text", x, y, w, h, label, tone }) as LayoutShape;

const encoder: LayoutShape[] = [
  text("enc-title", MX - 20, 56, 3 * CELL + 40, "Encoder output (last layer)"),
  ...SOURCE.flatMap((t, c): LayoutShape[] => [
    text(`src-${c}`, colX(c) - CELL / 2, KV_Y - 24, CELL, `"${t}"`),
    ...vector(`k-${c}`, colX(c) - V_CELL - 2, KV_Y, 4, ROLE_TONE.key, { vertical: true }),
    ...vector(`v-${c}`, colX(c) + 2, KV_Y, 4, ROLE_TONE.value, { vertical: true, values: VALUES[c] }),
    text(`k-${c}-name`, colX(c) - V_CELL - 2, KV_Y + V_LEN + 2, V_CELL, "K", ROLE_TONE.key, 16),
    text(`v-${c}-name`, colX(c) + 2, KV_Y + V_LEN + 2, V_CELL, "V", ROLE_TONE.value, 16),
  ]),
  // A bracket under the three columns, then one arrow down into the weight matrix.
  {
    id: "kv-bracket",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [colX(0) - 16, 182],
      [colX(0) - 16, 190],
      [colX(2) + 16, 190],
      [colX(2) + 16, 182],
    ],
  },
  { id: "kv-in", type: "arrow", x: colX(1), y: 190, w: 0, h: MY - 4 - 190, label: "K, V from encoder" },
];

const decoder: LayoutShape[] = [
  text("dec-title", Q_X - 70, rowY(0) - 56, 140, "Decoder queries", ROLE_TONE.query),
  ...TARGET.flatMap((t, r): LayoutShape[] => [
    text(`tgt-${r}`, Q_X - 64, rowY(r) - V_CELL / 2, 60, `"${t}"`, "neutral", V_CELL),
    ...vector(`q-${r}`, Q_X, rowY(r) - V_CELL / 2, 4, ROLE_TONE.query),
  ]),
  {
    id: "q-bracket",
    type: "path",
    x: 0,
    y: 0,
    points: [
      [Q_X + V_LEN + 6, rowY(0) - V_CELL / 2],
      [Q_X + V_LEN + 14, rowY(0) - V_CELL / 2],
      [Q_X + V_LEN + 14, rowY(1) + V_CELL / 2],
      [Q_X + V_LEN + 6, rowY(1) + V_CELL / 2],
    ],
  },
  {
    id: "q-in",
    type: "arrow",
    x: Q_X + V_LEN + 14,
    y: MY + CELL,
    w: MX - 4 - (Q_X + V_LEN + 14),
    h: 0,
    label: "Q from decoder",
  },
];

const weights: LayoutShape[] = [
  ...WEIGHTS.flatMap((row, r) =>
    row.map((w, c): LayoutShape => ({
      id: `w-${r}-${c}`,
      type: "cell",
      x: MX + c * CELL,
      y: MY + r * CELL,
      w: CELL,
      h: CELL,
      tone: ROLE_TONE.weight,
      weight: round2(w),
      label: round2(w).toFixed(2),
    }))
  ),
  text("w-title", MX - 20, MY + 2 * CELL + 8, 3 * CELL + 40, "Weights: each row sums to 1", ROLE_TONE.weight),
];

const outputs: LayoutShape[] = [
  text("out-title", OUT_X - 27, rowY(0) - 64, V_LEN + 54, "Outputs\n(to Add & Norm)", ROLE_TONE.attention, 34),
  ...OUTPUTS.flatMap((o, r) =>
    vector(`out-${r}`, OUT_X, rowY(r) - V_CELL / 2, 4, ROLE_TONE.attention, { values: o.map(round2) })
  ),
  {
    id: "w-out",
    type: "arrow",
    x: MX + 3 * CELL + 4,
    y: MY + CELL,
    w: OUT_X - 10 - (MX + 3 * CELL + 4),
    h: 0,
    label: "weights × V",
  },
];

// Locator: Figure 1 in miniature with the decoder's cross-attention ringed.
const MAP_X = 18;
const MAP_Y = 140;
const locator: LayoutShape[] = [
  ...miniMap("map", MAP_X, MAP_Y, { width: 150, ring: ["dec-xattn"] }),
  text("here", MAP_X - 10, MAP_Y + 180, 170, "you are here:\ndecoder cross-attention", ROLE_TONE.attention, 34),
];

const spec: LayoutSpec = {
  kind: "layout",
  title: "Cross-attention: decoder queries read the encoder output",
  width: 872,
  height: 430,
  groups: [
    {
      id: "zoom",
      title: "Cross-attention in a decoder layer",
      tone: ROLE_TONE.attention,
      x: 200,
      y: 26,
      w: 662,
      h: 390,
    },
  ],
  shapes: [...locator, ...encoder, ...decoder, ...weights, ...outputs],
};

export default spec;
