import type { LayoutShape, LayoutSpec, LayoutTone } from "@/components/diagrams/types";
import { PROD_TONE } from "@/components/diagrams/presets/production";

// Which way to group the numbers when quantising the KV cache (long-context-ring-attention-and-kv-quantization), after
// KIVI (Liu et al., 2024, arXiv 2402.02750). Each panel is a small cache: 8 tokens (rows) × 8 channels (columns), one
// cell per number, stronger colour = larger magnitude. Shape only: the magnitudes are illustrative, not measured.
//
// Fact checks (KIVI §3.2): key cache has a few fixed channels with very large magnitudes, so it should be quantised
// per channel ("group elements along the channel dimension"), which confines the error to each channel; value cache
// has no obvious outlier pattern but should be quantised per token, because the attention output is a weighted sum of
// value rows and attention is sparse, so per-token error stays inside each token and quantising unimportant tokens
// does not hurt the important ones. Group size 32 and residual length 128 are KIVI's settings; the figure uses 8.
//
// Steps: 1 the two caches: keys with two big channels (columns 2 and 5), values with none · 2 grouping keys by token:
// each row's scale is set by its largest number, which the big channels dominate in every row (red) · 3 grouping keys by
// channel: one scale per column, so a big channel only stretches its own scale (green) · 4 grouping values by token:
// one scale per row (green).
//
// Layout (860 × 520): two dotted groups. Left (keys): matrix x 60..300, y 72..312 (30 px cells); row scales x 312;
// column scales y 320. Right (values): matrix x 480..720; row scales x 732. Tones (three plus neutral): the numbers blue
// (data), the grouping that breaks red, the grouping that works green, frames neutral.

const W = 860;
const N = 8;
const CELL = 30;
const text = (
  id: string,
  x: number,
  y: number,
  w: number,
  label: string,
  step: number,
  tone: LayoutTone = "neutral",
  h = 18
) => ({ id, type: "text", x, y, w, h, label, tone, step, quiet: true }) as LayoutShape;

const BIG = new Set([2, 5]);
/** Illustrative magnitude 0..1 of the key at (token r, channel c): two big channels, the rest small and uneven. */
const keyMag = (r: number, c: number) => (BIG.has(c) ? 0.8 + 0.04 * ((r * 3) % 4) : 0.1 + 0.04 * ((r * 5 + c * 3) % 6));
/** Illustrative magnitude of the value at (r, c): no pattern by row or column. */
const valMag = (r: number, c: number) => 0.12 + 0.05 * ((r * 7 + c * 11 + r * c) % 7);

function matrix(id: string, x: number, y: number, mag: (r: number, c: number) => number): LayoutShape[] {
  const out: LayoutShape[] = [];
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      out.push({
        id: `${id}-${r}-${c}`,
        type: "cell",
        x: x + c * CELL,
        y: y + r * CELL,
        w: CELL,
        h: CELL,
        tone: PROD_TONE.data,
        weight: mag(r, c),
        step: 1,
        quiet: true,
      });
  return out;
}

const K = { x: 76, y: 76 };
const V = { x: 496, y: 76 };
const shapes: LayoutShape[] = [
  text("k-title", K.x - 20, 42, N * CELL + 40, "Key cache", 1),
  text("v-title", V.x - 20, 42, N * CELL + 40, "Value cache", 1),
  text("k-tokens", 26, K.y + 100, 40, "tokens", 1),
  text("v-tokens", V.x - 50, V.y + 100, 40, "tokens", 1),
  text("k-chan", K.x, K.y + N * CELL + 4, N * CELL, "channels", 1),
  text("v-chan", V.x, V.y + N * CELL + 4, N * CELL, "channels", 1),
  ...matrix("k", K.x, K.y, keyMag),
  ...matrix("v", V.x, V.y, valMag),
  text(
    "k-s1",
    28,
    372,
    370,
    "Two channels are far larger than the rest,\nin every token (the strong columns).",
    1,
    "neutral",
    36
  ),
  text("v-s1", 448, 372, 370, "No channel stands out.", 1),
];

// Step 2: scales per token (row) on the keys.
for (let r = 0; r < N; r++)
  shapes.push({
    id: `k-rowscale-${r}`,
    type: "cell",
    x: K.x + N * CELL + 12,
    y: K.y + r * CELL,
    w: 44,
    h: CELL,
    label: "scale",
    tone: PROD_TONE.failure,
    fill: "soft",
    step: 2,
    quiet: true,
  });
shapes.push(
  text(
    "k-s2",
    28,
    416,
    370,
    "By token: a big channel sets every row's range,\nso the small channels get only a few levels.",
    2,
    PROD_TONE.failure,
    36
  )
);

// Step 3: scales per channel (column) on the keys.
for (let c = 0; c < N; c++)
  shapes.push({
    id: `k-colscale-${c}`,
    type: "cell",
    x: K.x + c * CELL,
    y: K.y + N * CELL + 26,
    w: CELL,
    h: 22,
    label: "s",
    tone: PROD_TONE.model,
    fill: "pastel",
    step: 3,
    quiet: true,
    highlight: c === 2 ? true : undefined,
  });
shapes.push(
  text(
    "k-s3",
    28,
    460,
    370,
    "By channel (KIVI): each channel has its own scale;\na big channel stretches only its own.",
    3,
    "neutral",
    36
  )
);

// Step 4: scales per token (row) on the values.
for (let r = 0; r < N; r++)
  shapes.push({
    id: `v-rowscale-${r}`,
    type: "cell",
    x: V.x + N * CELL + 12,
    y: V.y + r * CELL,
    w: 44,
    h: CELL,
    label: "scale",
    tone: PROD_TONE.model,
    fill: "pastel",
    step: 4,
    quiet: true,
    highlight: r === 0 ? true : undefined,
  });
shapes.push(
  text(
    "v-s4",
    448,
    416,
    370,
    "By token (KIVI): an error stays inside its token,\nand attention leans on only a few tokens.",
    4,
    "neutral",
    36
  )
);

const spec: LayoutSpec = {
  kind: "layout",
  title: "KIVI: group keys by channel, values by token",
  width: W,
  height: 520,
  steps: [
    { title: "Keys have outlier channels, values do not" },
    { title: "Grouping keys by token lets outliers set every scale" },
    { title: "Grouping keys by channel confines each outlier" },
    { title: "Grouping values by token confines errors to a token" },
  ],
  groups: [
    { id: "keys", title: "8 tokens × 8 channels (shape only)", tone: PROD_TONE.infra, x: 16, y: 16, w: 408, h: 488 },
    { id: "values", title: "8 tokens × 8 channels (shape only)", tone: PROD_TONE.infra, x: 436, y: 16, w: 408, h: 488 },
  ],
  shapes,
};

export default spec;
